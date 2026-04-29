const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('./index.html','utf8');
const initJs = fs.readFileSync('./init.js','utf8');
const mapLogic = fs.readFileSync('./map-logic.js','utf8');
const formJs = fs.readFileSync('./form.js','utf8');

test('map view no longer exposes taxonomy filter controls', ()=>{
  assert.doesNotMatch(html,/id="mapFilterSub"/);
  assert.doesNotMatch(initJs,/on\('mapFilterSub','change'/);
  assert.doesNotMatch(mapLogic,/mapFilterSub/);
});

test('saveNote no longer blocks when domain select is absent', ()=>{
  assert.doesNotMatch(formJs,/請至少選擇一個/);
  assert.match(formJs,/const fallbackDomain=/);
});
