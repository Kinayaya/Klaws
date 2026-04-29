const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeRelaysIntoNotes } = require('./klaws-core.js');

const deps = {
  safeStr: (v)=>typeof v === 'string' ? v : '',
  normalizeNoteSchema: (n={})=>({ id:Number(n.id), type:n.type || 'article', title:n.title || '' })
};

test('mergeRelaysIntoNotes merges note and relay with relay backup type', ()=>{
  const notes = [{ id:1, type:'case', title:'A' }];
  const relays = [{ id:2, type:'relayType', noteTypeBackup:'article', title:'B' }];
  const merged = mergeRelaysIntoNotes(notes, relays, deps);

  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map(n=>n.id), [1,2]);
  assert.equal(merged[1].type, 'article');
});

test('mergeRelaysIntoNotes removes invalid and duplicate ids', ()=>{
  const notes = [{ id:1, type:'case' }, { id:'not-number', type:'x' }];
  const relays = [{ id:1, type:'relay' }, { id:3, type:'relay' }];

  const merged = mergeRelaysIntoNotes(notes, relays, deps);
  assert.deepEqual(merged.map(n=>n.id), [1,3]);
});

test('mergeRelaysIntoNotes handles non-array input safely', ()=>{
  const merged = mergeRelaysIntoNotes(null, undefined, deps);
  assert.deepEqual(merged, []);
});
