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

test('only switches to eruda mode when show succeeds', ()=>{
  assert.match(renderUi, /const erudaShown=safeErudaCall\(er,'show'\);/);
  assert.match(renderUi, /if\(erudaShown\)\{[\s\S]*debugMode='eruda';[\s\S]*\}/);
});

test('safeErudaCall swallows eruda runtime errors', ()=>{
  assert.match(renderUi, /function safeErudaCall\(eruda,method\)\{[\s\S]*try\{[\s\S]*eruda\[method\]\(\);[\s\S]*\}catch\(err\)\{[\s\S]*return false;[\s\S]*\}/);
});
