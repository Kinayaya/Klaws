const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderUi = fs.readFileSync('./render-ui.js','utf8');

test('buildFormSelects guards missing type and subject selects', ()=>{
  assert.match(renderUi, /const typeSelect=g\('ft'\);/);
  assert.match(renderUi, /if\(typeSelect\) typeSelect\.innerHTML=/);
  assert.match(renderUi, /const subjectSelect=g\('fs2'\);/);
  assert.match(renderUi, /if\(subjectSelect\) subjectSelect\.innerHTML=/);
});
