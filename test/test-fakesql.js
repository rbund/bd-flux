"use strict";

const test = require("tape");
const TC = require("..");

// preparation, fake sql query object

  function random(x) { return(Math.floor(Math.random() * x)); }
  
  var testobj = {    
    map: {
      'BEGIN' : 'transaction started',
      'INSERT RETURN' : 1709,
      'INSERT 1709' : 'inserted',
      'ROLLBACK': 'transaction dismissed',
      'COMMIT' : 'transaction done',
      'ERROR' : 'query error'
    },
    status : 0,
    getWaitTime : function(command) {
      var waittime, ch = command[0];
      switch (ch) {
        case 'B': waittime = (random(2) * 100) + 200; break;
        case 'I': waittime = (random(20) * 100) + 200; break;
        case 'R': waittime = (random(5) * 100) + 200; break;
        case 'C': waittime = (random(10) * 100) + 200; break;
        default : waittime = (random(2) * 100) + 200;
      }
      return(waittime);
    },
    checkCommand : function(command) {
      var cmd = this.map[command] ? command : 'ERROR', ch = cmd[0];
      switch (ch) {
        case 'B': if (this.status !== 0) cmd = 'ERROR'; else this.status = 1; break;
        case 'I':
          if (cmd === 'INSERT RETURN') {
            if (this.status === 1) this.status = 2;
            else cmd = 'ERROR';
          } else {
            if (this.status === 2) this.status = 3;
            if (this.status !== 3) cmd = 'ERROR'
          }
          break;
        case 'C':
        case 'R': if (this.status !== 3) cmd = 'ERROR'; else this.status = 0; break;
      }
      return(cmd);
    },
    query : function(t,command, cb) {
      var $in = command;
      var $this = this, cmd = this.checkCommand(command);
      setTimeout(function() {
        t.comment('query, in: "'+ $in + '", result:' + $this.map[cmd]); 
        if (cmd !== 'ERROR') cb(null, $this.map[cmd]);
        else cb($this.map[cmd]);
      }, this.getWaitTime(cmd));
    },
    reset : function() { this.status = 0; }
  };
  
  // scenario:
  // do query(BEGIN)
  // then do query(INSERT RETURN)
  // then store returning <id> of INSERT RETURN
  // then do several times query(INSERT <id>)
  // then when no error occurred do query(COMMIT)
  // on any error do query(ROLLBACK)

  function test1(t) { // simple functionality test of the query object
    var testid = 'test1';
    //console.log(testid,'start =============================');
    
    t.ok(testobj.checkCommand('BEGIN') !== 'ERROR', "Step 1: BEGIN");
    t.ok(testobj.checkCommand('INSERT RETURN') !== 'ERROR', "Step 2: INSERT RETURN");
    t.ok(testobj.checkCommand('INSERT 1709') !== 'ERROR',"Step 3: INSERT 1709");
    t.ok(testobj.checkCommand('INSERT 1709') !== 'ERROR',"Step 4: INSERT 1709");
    t.ok(testobj.checkCommand('INSERT 1709') !== 'ERROR',"Step 5: INSERT 1709");
    t.ok(testobj.checkCommand('COMMIT') !== 'ERROR',"Step 6: COMMIT");
    testobj.reset();
    t.end();
    //console.log(testid, 'passed');
    //console.log(testid,'end ===============================');    
  }

  // fake sql, happy path
  function test2(t) {
    var testid = 'test2';
    //console.log(testid,'start =============================');
    TC()
    .setValue('lastcommand','COMMIT')
    .on('error','check2', function(e) { t.error(e); this.setValue('lastcommand','ROLLBACK'); this.cancel(); })
  //  .finally(function(s) { t.end(); })
    .x()( function() { testobj.query(t,'BEGIN', TC().cbES()); TC().close(); })
    .on('callbackresult','key', function(key) { TC().setValue('key', key);})
    .on('callbackresult', function(r) { t.pass(r); })
    .x()( function() { testobj.query(t,'INSERT RETURN', TC().cbES('key')); TC().close();})
    .x('check2')( function() {
        testobj.query(t,'INSERT ' + TC().getValue('key'), TC().cbES());
        testobj.query(t,'INSERT ' + TC().getValue('key'), TC().cbES());
        testobj.query(t,'INSERT ' + TC().getValue('key'), TC().cbES());
        TC().close();
    })
    .x()( function() { testobj.query(t,this.getValue('lastcommand'), TC().cbES()); TC().close();})
    .x()(function() { t.end(); });
    TC().close();

    //console.log(testid,'end ===============================');
  }  

  // fake sql, on error path test
  function test3(t) {
    var testid = 'test3';
    var onerror = false;
    //console.log(testid,'start =============================');
    
    TC()
    .setValue('lastcommand','COMMIT')
    .on('error', 'check3', function(e) { 
      if (onerror) t.error(e); else { onerror = true; t.pass('expected error: '+e); }
      this.setValue('lastcommand','ROLLBACK'); 
      this.cancel(); 
    })
    //.finally(function(s) { t.end(); })
    .x()( function() { testobj.query(t,'BEGIN', TC().cbES()); TC().close(); })
    .on('callbackresult','key', function(key) { TC().setValue('key', key);})
    .on('callbackresult', function(r) { t.pass(r); })
    .x()( function() { testobj.query(t,'INSERT RETURN', TC().cbES('key')); TC().close();})
    .x('check3')( function() {
        testobj.query(t,'INSERT ' + TC().getValue('key'), TC().cbES());
        testobj.query(t,'INSERT x' + TC().getValue('key'), TC().cbES());
        testobj.query(t,'INSERT ' + TC().getValue('key'), TC().cbES());
        TC().close();
    })
    .x()( function() { testobj.query(t,this.getValue('lastcommand'), TC().cbES()); TC().close();})
    .x()(function() { t.end(); });
    TC().close();

    //console.log(testid,'end ===============================');
  }  

  
  test("testobj happy path test",test1);
  test("happy path test",test2);
  test("error path test",test3);
  