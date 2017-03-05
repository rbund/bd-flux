"use strict";

const test = require("tape");
const TC = require("..");

  function test1(t) {
    var testid = 'test1';
    //console.log(testid,'start =============================');
    var flow = [];
    var fl = new TC();
    
    function B1() {
      function B4() {
        flow.push("B4");
      }
      function B5() {
        function B7() {
          flow.push("B7");
        }
        function B8() {
          function B10() {
            flow.push("B10");
          }
          flow.push("B8");
          fl.ex(B10);
        }
        flow.push("B5");
        fl.ex(B7, B8);
      }
      flow.push("B1");
      fl.ex(B4, B5);
    }
    function B2() {
      function B6() {
        function B9() {
          flow.push("B9");
        }
        flow.push("B6");
        fl.ex(B9);
      }
      flow.push("B2");
      fl.ex(B6);
    }
    function B3() {
      flow.push("B3");
    }    
    fl.ex(B1)
    .ex(B2)
    .ex(B3)
    .ex(() => {
          var expected = 'B1,B4,B5,B7,B8,B10,B2,B6,B9,B3';
          var s = flow.join(',');
          t.equal(s, expected, "nested basic flow");
          t.end();
        });
    fl.run();
  }
  
 

test("basic flow", test1);

