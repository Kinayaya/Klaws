const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const utilsApp = fs.readFileSync('./utils-app.js','utf8');
const renderUi = fs.readFileSync('./render-ui.js','utf8');

test('debug runtime identifier is not redeclared across classic scripts', ()=>{
  assert.match(utilsApp,/const\s+debugRuntime\s*=/);
  assert.doesNotMatch(renderUi,/\bconst\s+debugRuntime\s*=/);
});
