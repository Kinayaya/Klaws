const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderUi = fs.readFileSync('./render-ui.js','utf8');

test('debug toggle does not call eruda.hide without init guard', ()=>{
  const unsafeHide = /window\.eruda\)\s*window\.eruda\.hide\(\)/;
  assert.doesNotMatch(renderUi, unsafeHide);
  assert.match(renderUi, /safeErudaCall\(window\.eruda,'hide'\)/);
});

test('debug toggle uses guarded eruda show call', ()=>{
  assert.match(renderUi, /safeErudaCall\(er,'show'\)/);
});
