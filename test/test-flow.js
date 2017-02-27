"use strict";

const test = require("tape");
const TC = require("..");

  function test1(t) {
    var testid = 'test1';
    //console.log(testid,'start =============================');
    var flow = [];
    
    function B1() {
      function B4() {
        flow.push(this.Id);
        TC().close();
      }
      function B5() {
        function B7() {
          flow.push(this.Id);
          TC().close();
        }
        function B8() {
          function B10() {
            flow.push(this.Id);
            TC().close();
          }
          flow.push(this.Id);
          TC().x('B10')(B10);
          TC().close();
        }
        flow.push(this.Id);
        TC().x('B7')(B7)
            .x('B8')(B8);
        TC().close();    
      }
      flow.push(this.Id);
      TC().x('B4')(B4)
          .x('B5')(B5);
      TC().close();
    }
    function B2() {
      function B6() {
        function B9() {
          flow.push(this.Id);
          TC().close();
        }
        flow.push(this.Id);
        TC().x('B9')(B9);
        TC().close();
      }
      flow.push(this.Id);
      TC().x('B6')(B6);
      TC().close();
    }
    function B3() {
      flow.push(this.Id);
      TC().close();
    }
    TC().x('B1')(B1)
        .x('B2')(B2)
        .x('B3')(B3)
        .finally(function() {
          var expected = 'B1,B4,B5,B7,B8,B10,B2,B6,B9,B3';
          var s = flow.join(',');
          t.equal(s, expected, "nested basic flow");
          t.end();
          /*
          if (s == expected) console.log('passed');
          else consoloe.log('failed');
          console.log('expected:',s);
          console.log('result:',s);
          */
        });
    TC().close();    
    //console.log(testid,'end ===============================');
  }
  
 

test("basic flow", test1);

