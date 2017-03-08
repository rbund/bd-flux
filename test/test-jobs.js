"use strict";

const test = require("tape");
const TC = require("..");


// sequentiell job test #1
function test1_1(e,d) {
  d.result = e*10;
}

function test1_2(d) {
  var result = d.calc.result;
  var t = d.t;
  if (d.arr.length) {
    t.equal(result.length, d.arr.length, "number of results");
    for (var i = 0; i < result.length; i++) t.equal(result[i], i*10, "result #"+(i+1));
  } else {
    // empty array processed
    t.equal(Object.keys(d.calc).length, 0, "empty result set")
  }
  t.end();
}

function test1(t) {
  var fl = new TC();
  var arr = [0,1,2,3,4,5,6,7,8,9];
  fl.d("arr", arr)
  fl.d("t", t);
  fl.sjob(arr, test1_1, 'calc');
  fl.run(test1_2);
}


// parallel job test #1
function test2_1(e,d) {
  d.result = e*11;
}

function test2_2(d) {
  var result = d.calc.result;
  var t = d.t;
  if (d.arr.length) {
    t.equal(result.length, d.arr.length, "number of results");
    for (var i = 0; i < result.length; i++) t.equal(result[i], i*11, "result #"+(i+1));
  } else {
    // empty array processed
    t.equal(Object.keys(d.calc).length, 0, "empty result set")
  }
  t.end();
}

function test2(t) {
  var fl = new TC();
  var arr = [0,1,2,3,4,5,6,7,8,9];
  fl.d("t", t);
  fl.d("arr", arr);
  fl.pjob(arr, test2_1, 'calc');
  fl.run(test2_2);
}


// empty sequentiell jobs
function test3(t) {
  var fl = new TC();
  var arr = [];
  fl.d("arr", arr)
  fl.d("t", t);
  fl.sjob(arr, test1_1, 'calc');
  fl.run(test1_2);  
}


// empty parallel jobs
function test4(t) {
  var fl = new TC();
  var arr = [];
  fl.d("arr", arr)
  fl.d("t", t);
  fl.pjob(arr, test1_1, 'calc');
  fl.run(test1_2);  
}

test("basic sequential jobs", test1);
test("basic parallel jobs", test2);
test("empty sequentiell jobs", test3);
test("empty parallel jobs", test4);