const test = require('node:test');
const assert = require('node:assert/strict');
const { isInteractiveTouchTarget } = require('./touch-guard.js');

test('interactive controls are treated as interactive touch targets', ()=>{
  const button={ closest:(sel)=>sel.includes('button')?{}:null };
  assert.equal(isInteractiveTouchTarget(button), true);
});

test('text node target can still resolve to parent interactive element', ()=>{
  const parentButton={ closest:(sel)=>sel.includes('button')?{}:null };
  const textNode={ parentElement:parentButton };
  assert.equal(isInteractiveTouchTarget(textNode), true);
});
