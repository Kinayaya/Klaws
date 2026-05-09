const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const utilsJs = fs.readFileSync('./utils-app.js','utf8');
const formJs = fs.readFileSync('./form.js','utf8');
const mapJs = fs.readFileSync('./map-logic.js','utf8');

test('path structural changes use immediate persistence helper', ()=>{
  assert.match(utilsJs,/const savePathChange = \(\{isDraft=false\}=\{\}\) => \{/);
  assert.match(utilsJs,/if\(isDraft\)\{\s*saveDataDeferred\(\);/);
  assert.match(utilsJs,/flushDeferredSave\(\);\s*saveData\(\);/);
});

test('form path draft updates are deferred and provide flush snapshot hook', ()=>{
  assert.match(formJs,/savePathChange\(\{isDraft:true\}\);/);
  assert.match(formJs,/function flushNoteDraftSnapshot\(\)\{/);
  assert.match(formJs,/pathInput\.oninput=\(\)=>\{updatePathInheritanceUI\(\);saveNoteDraftFromForm\(\);\};/);
});

test('map path rename and delete prompt share same persistence api', ()=>{
  assert.match(mapJs,/function persistPathStructureChange\(changed,successMsg\)\{/);
  assert.match(mapJs,/persistPathStructureChange\(changed,count=>`已刪除路徑，更新 \$\{count\} 筆筆記`\);/);
  assert.match(mapJs,/persistPathStructureChange\(changed,count=>`路徑已更新，共 \$\{count\} 筆`\);/);
});
