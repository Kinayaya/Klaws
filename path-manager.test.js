const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const levelJs = fs.readFileSync('./level.js','utf8');

test('path manager defines renderPathLists for init and path actions', ()=>{
  assert.match(levelJs, /function renderPathLists\(\)\{/);
  assert.match(levelJs, /renderPathList\('typeTagList',types,'type'\)/);
});

test('renderPathLists falls back to type panel when active category panel is absent', ()=>{
  assert.match(levelJs, /if\(!activePathCategory\|\|!panelExists\) activePathCategory='type';/);
});
