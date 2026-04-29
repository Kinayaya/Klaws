const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeAuxNodesIntoNotes } = require('./klaws-core.js');

const deps = {
  normalizeNoteSchema: (n={})=>({ id:Number(n.id), type:n.type || 'article', title:n.title || '' })
};

test('mergeAuxNodesIntoNotes keeps normalized notes only and ignores auxnode input', ()=>{
  const notes = [{ id:1, type:'case', title:'A' }];
  const auxnodes = [{ id:2, type:'auxnodeType', noteTypeBackup:'article', title:'B' }];
  const merged = mergeAuxNodesIntoNotes(notes, auxnodes, deps);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged.map(n=>n.id), [1]);
});

test('mergeAuxNodesIntoNotes removes invalid and duplicate ids', ()=>{
  const notes = [{ id:1, type:'case' }, { id:'not-number', type:'x' }, { id:1, type:'article' }];

  const merged = mergeAuxNodesIntoNotes(notes, [{ id:3, type:'auxnode' }], deps);
  assert.deepEqual(merged.map(n=>n.id), [1]);
});

test('mergeAuxNodesIntoNotes handles non-array input safely', ()=>{
  const merged = mergeAuxNodesIntoNotes(null, undefined, deps);
  assert.deepEqual(merged, []);
});
