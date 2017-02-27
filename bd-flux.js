/**
 * (c) 2017 Rüdiger Bund
 * Lizenz/License: BSL.TXT / http://www.bundnetz.de/BSL.TXT
 *
 */

// global definition in case of not beeing "required"

var fl = (function() {

  "use strict";
 
  // private variables and functions, scope: Class
  
  // simply copies an array like object into a new array
  function copyArray(arr) { var i = 0, len = arr.length, res = new Array(len); for(; i < len; i++) res[i] = arr[i]; return(res); } // macro
  
  /***
   * Returns a more exact type of the given argument 'what'.
   * Possible results: 'object','string','array','function','null','undefined','number' and possibly more.
   * Compares the type of 'what' with any additional parameter and returns
   * true when it's found, otherwise false.
   */
  function typeOfEx(what) { // macro
    var s = Object.prototype.toString.call(what);
    s = s.slice(8,s.length-1).toLowerCase(); 
    if (arguments.length == 1) return(s);
    for (var i = 1, len = arguments.length; i < len; i++) if (s == arguments[i]) return(true);
    return(false);
  }
  
  // Returns all property values of given argument 'source' as array.
  function objectValues(source) { // macro
     var list = Object.getOwnPropertyNames(source), res = new Array(list.length);
     for (var i = 0, len = list.length; i < len; i++) res[i] = source[list[i]];
     return(res);
  }
  
  // constants
  
  var 
    // possible block status
    STATUS = {READY: 0, RUNNING: 1, CLOSED: 2, DONE: 4, CANCELED: 5},
    // possible block results
    RESULT = {SUCCESS: 0, ERROR: 1},
    // triggered message types
    MESSAGES = { 
      RUN: 'run', ERROR: 'error', CLOSE: 'close', DONE: 'done', CANCEL: 'cancel', FINAL: 'final',
      CALLBACKSTART: 'callbackStart', CALLBACKEND: 'callbackEnd', CALLBACKRESULT: 'callbackresult'
    }
    ;
  // global variables
  var
    MessageHandler = SimpleMessenger(), // global message dispatcher
    Storage = {}, // global data storage
    BlockCounter = 0, // global block id counter (when not defined)
    BlockHistory = []; // call history of blocks, the last element is the current one
    
  // helper objects
  
  // name says all
  function SimpleIterator() {
    if (! (this instanceof SimpleIterator)) return new SimpleIterator();
    var items = [], index = 0;
    this.add = function(item) { items.push(item); };
    this.current = function() { if (index < items.length) return(items[index]); };
    this.next = function() { if (index < items.length) return(items[index++]); };
    this.empty = function() { return(index >= items.length); };
  }
  /**
   * Stores message listeners and calls them on demand.
   * Messages are organized by sections and keys. Since there might be several
   * listeners for a message section/key, all are stored in an array.
   * A special key is '*'. Any listener stored under that key is called for all 
   * messages of the section.
   */
  function SimpleMessenger(allowduplicates) {
    if (! (this instanceof SimpleMessenger)) return new SimpleMessenger(allowduplicates);
    var store = {};
    this.addListener = function(section, key, fn) {
      var k = key || '*';
      if (!store[section]) store[section] = {};
      if (!store[section][k]) store[section][k] = [];
      if (allowduplicates || store[section][k].indexOf(fn) < 0) store[section][k].push(fn);
    };
    this.send = function($this, section, key, data) {
    var mstore = store[section]||{}, 
        kstore = key ? (mstore['*']||[]).concat( (key === '*'|| !mstore[key]) ? [] : mstore[key]) : Array.prototype.concat.apply([], objectValues(mstore)||[]);
    for (var i = 0, len = kstore.length; i < len; i++) kstore[i].apply($this, data);
    }
  }
  // class helper functions
  function sendMessage($this, msgtype, msgkey, data) {
    var args = (Array.isArray(data)) ? data : [data];
    //console.log('message:', msgtype, msgkey, data);
    MessageHandler.send($this, msgtype, msgkey, args);
  }
  
  // creates an execution descriptor.
  function createDesc($this, id, $args) {
    var args = copyArray($args), t, name = id;
    if (args.length && typeof args[0] == 'string') name = args.shift(); // first argument: name
    if (args.length && typeOfEx(args[0],'object','null','undefined','function')) t = args.shift(); // second or first argument: this
    return({ 'Args': args, 'Id': name, '$this': t });
  }
  
  // finishes a blocks execution with the given status and sends out
  // the given message.
  function finishBlock($this, newstatus, message) {
    $this.Status = newstatus;
    sendMessage($this, message, $this.Id, $this);
    BlockHistory.pop();
    if ($this.Parent) checkIfDone($this.Parent);
    else {
      sendMessage($this, MESSAGES.FINAL,null, Storage);
      //throw "PROGRAMM END";
    }
  }
  
  // checks if a block could be finished.
  function checkIfDone($this) {
    if ($this.OpenCallbacks === 0) {
      if ($this.Status === STATUS.CLOSED) {
        if ($this.BlockQueue.empty()) {
          finishBlock($this, STATUS.DONE, MESSAGES.DONE);
        }
        else {
          var block = $this.BlockQueue.next();
          block.run();
        }
      }
      else if ($this.Status === STATUS.CANCELED) {
        finishBlock($this, STATUS.CANCELED, MESSAGES.CANCEL);
      }
    }
  }
  
  // class prototype
  var $proto = {
    run : function() {
      var fndesc = this.FnDesc;
      if (this.Status === STATUS.READY) {
        this.Status = STATUS.RUNNING;
        sendMessage(this, MESSAGES.RUN, this.Id, this);
        BlockHistory.push(this);
        //console.log('BlockHistory.length =', BlockHistory.length);
        fndesc.Fn.apply(fndesc.$this, fndesc.Args);
      }
    },
    x: function() {
      var fndesc = createDesc(this, BlockCounter, arguments), $this = this,
          fn = function(fn) {
           if (arguments.length == 0) throw new TypeError('no function specified'); // assert
           if (typeof fn !== 'function') throw new TypeError(fn + ' is not a function'); // assert
           fndesc.Fn = fn;
           var block = new $constructor(fndesc, $this);
           $this.BlockQueue.add(block);
           BlockCounter++;
           if (typeOfEx(fndesc.$this,'null','undefined')) fndesc.$this = block;
           return($this);
          };
      return(fn);
    },
    cbStart: function(id) {
      if (this.Status === STATUS.RUNNING || true) {
        this.OpenCallbacks++;
        sendMessage(this, MESSAGES.CALLBACKSTART, this.Id, arguments);
      }
      else {
        //MERKE: stattdessen im hauptblock eintragen lasssen?
        throw 'callback started on closed block';
      }
      return(this);
    },
    cbEnd: function(id) {
      if (this.OpenCallbacks > 0) {
        this.OpenCallbacks--;
        sendMessage(this, MESSAGES.CALLBACKEND, this.Id, arguments);
        checkIfDone(this);
      }
      else {
        // MERKE: dies an den Hauptblock weitergeben
        throw "MERKE: dies an den Hauptblock weitergeben"
      }
      return(this);
    },
    error: function(err, section) {
      this.Errors++;
      this.ResultStatus = RESULT.ERROR;
      this.LastError = err;
      sendMessage(this, MESSAGES.ERROR, section||this.id, err);
      return(this);
    },
    close: function() {
      if (this.Status == STATUS.RUNNING) {
        this.Status = STATUS.CLOSED;
        sendMessage(this, MESSAGES.CLOSE, this.Id, this);
        checkIfDone(this);
      }
      return(this);
    },
    cancel: function() {
      if (this.Status !== STATUS.CANCELED && this.Status !== STATUS.DONE) {
        this.Status = STATUS.CANCELED;
        checkIfDone(this);
      }
      return(this);
    },
    'on': function() {
      var section, key, fn, args = copyArray(arguments);
      if (args.length < 2) throw new TypeError('at least section and function must be given');
      section = args.shift();
      key = args.shift();
      if (args.length > 0) fn = args.shift();
      else { fn = key; key = '*'; }
      if (typeof fn !== 'function') throw new TypeError(fn + ' is not a function');
      MessageHandler.addListener(section, key, fn);
      return(this);
    },
    finally : function(fn) {
      if (arguments.length == 0) throw new TypeError('no function specified'); // assert
      if (typeof fn !== 'function') throw new TypeError(fn + ' is not a function'); // assert
      MessageHandler.addListener(MESSAGES.FINAL, null, fn);
      return(this);
    },
    setValue: function(key, value) { Storage[key||'*'] = value; return(this); },
    getValue: function(key) { return(Storage[key||'*']); },
    cbUser: function() {
      var cbdesc = createDesc(this, this.CallbackCounter++, arguments), $this = this,
          fn = function(fn) {
           if (arguments.length == 0) throw new TypeError('no function specified'); // assert
           if (typeof fn !== 'function') throw new TypeError(fn + ' is not a function'); // assert
           var res = fn.apply(cbdesc.$this, arguments/*cbdesc.Args*/);
           $this.cbEnd([cbdesc.Id, res]);
           //return($this);
          };
      this.cbStart(cbdesc.Id);
      return(fn);
    },
    cbES : function() {
      var cbdesc = createDesc(this, this.CallbackCounter++, arguments), $this = this,
          fn = function(error, result) {
            if (error) 
              $this.error(error, cbdesc.Id);
            else 
              sendMessage($this, MESSAGES.CALLBACKRESULT, cbdesc.Id, result);
            $this.cbEnd([cbdesc.Id]);
          };
      this.cbStart(cbdesc.Id);
      return(fn);
    },
    cbS : function() {
      var cbdesc = createDesc(this, this.CallbackCounter++, arguments), $this = this,
          fn = function() {
            sendMessage($this, MESSAGES.CALLBACKRESULT, cbdesc.Id, arguments);
            $this.cbEnd([cbdesc.Id]);
          };
      this.cbStart(cbdesc.Id);
      return(fn);
    }
  };
  $constructor.prototype = $proto;
  
  // constructor
  function $constructor(fndesc, parent) {
    if (! (this instanceof $constructor)) return new $constructor(fndesc, parent);
    if (!fndesc) {
      if (BlockHistory.length) return(BlockHistory[BlockHistory.length-1]);
      this.Id = BlockCounter++;
      this.Status = STATUS.RUNNING;
      BlockHistory.push(this);
    } 
    else {
      this.Id = fndesc.Id;
      this.FnDesc = fndesc;
      this.Parent = parent;
      this.Status = STATUS.READY;
    }
    this.BlockQueue = new SimpleIterator();
    this.CallbackCounter = 1;
    this.OpenCallbacks = 0;
    this.LastError = "";
    this.Errors = 0;
    this.ResultStatus = RESULT.SUCCESS;
  }
  
  $constructor.STATUS = STATUS;
  $constructor.RESULT = RESULT;
  $constructor.MESSAGES = MESSAGES;

  // the end:
  return($constructor);
})();


// support for require
if (typeof require !== "undefined" && typeof module !== "undefined") module.exports = fl;