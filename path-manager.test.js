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


test('path manager shows all category panels during search to avoid hidden matches', ()=>{
  assert.match(levelJs, /const hasSearch=!!pathSearchQ;/);
  assert.match(levelJs, /panel\.hidden=hasSearch\?false:!isActive;/);
});

test('group and part path search can bypass panel pre-filter', ()=>{
  assert.match(levelJs, /const hasSearch=!!pathSearchQ;/);
  assert.match(levelJs, /if\(!groupDomainFilter&&!hasSearch\)/);
  assert.match(levelJs, /if\(!hasSearch\) list=list\.filter\(item=>item\.domain===groupDomainFilter\|\|item\.domain==='all'\);/);
  assert.match(levelJs, /if\(!partGroupFilter&&!hasSearch\)/);
  assert.match(levelJs, /if\(!hasSearch\) list=list\.filter\(item=>item\.group===partGroupFilter\|\|item\.group==='all'\);/);
});


test('path search also matches path keys to avoid empty results for key-based queries', ()=>{
  assert.match(levelJs, /`\$\{item\.label\|\|''\} \$\{item\.key\|\|''\}`\.toLowerCase\(\)\.includes\(pathSearchQ\)/);
  assert.match(levelJs, /`\$\{item\.label\|\|''\} \$\{item\.key\|\|''\} \$\{subByKey\(item\.domain\)\.label\}`\.toLowerCase\(\)\.includes\(pathSearchQ\)/);
  assert.match(levelJs, /`\$\{item\.label\|\|''\} \$\{item\.key\|\|''\} \$\{groupByKey\(item\.group\)\.label\}`\.toLowerCase\(\)\.includes\(pathSearchQ\)/);
});
