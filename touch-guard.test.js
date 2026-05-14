const test = require('node:test');
const assert = require('node:assert/strict');
const { isInteractiveTouchTarget, installDefaultGuards } = require('./touch-guard.js');

test('interactive controls are treated as interactive touch targets', ()=>{
  const button={ closest:(sel)=>sel.includes('button')?{}:null };
  assert.equal(isInteractiveTouchTarget(button), true);
});

test('text node target can still resolve to parent interactive element', ()=>{
  const parentButton={ closest:(sel)=>sel.includes('button')?{}:null };
  const textNode={ parentElement:parentButton };
  assert.equal(isInteractiveTouchTarget(textNode), true);
});

test('installDefaultGuards does not block dblclick default on normal area', ()=>{
  const listeners={};
  const mockDocument={
    addEventListener:(type, handler)=>{ listeners[type]=handler; }
  };
  const oldDocument=global.document;
  delete require.cache[require.resolve('./touch-guard.js')];
  global.document=mockDocument;
  const { installDefaultGuards:install } = require('./touch-guard.js');
  install();
  let prevented=false;
  listeners.dblclick({ target:{ closest:()=>null }, preventDefault:()=>{ prevented=true; } });
  assert.equal(prevented, false);
  global.document=oldDocument;
});

test('installDefaultGuards blocks dblclick default inside map canvas', ()=>{
  const listeners={};
  const mockDocument={
    addEventListener:(type, handler)=>{ listeners[type]=handler; }
  };
  const oldDocument=global.document;
  delete require.cache[require.resolve('./touch-guard.js')];
  global.document=mockDocument;
  const { installDefaultGuards:install } = require('./touch-guard.js');
  install();
  let prevented=false;
  const mapTarget={ closest:(selector)=>selector.includes('#mapCanvas')?{}:null };
  listeners.dblclick({ target:mapTarget, preventDefault:()=>{ prevented=true; } });
  assert.equal(prevented, true);
  global.document=oldDocument;
});
