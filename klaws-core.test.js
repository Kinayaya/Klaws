const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeNotesList } = require('./klaws-core.js');

const deps = {
  normalizeNoteSchema: (n={})=>({ id:Number(n.id), type:n.type || 'article', title:n.title || '' })
};

test('normalizeNotesList keeps normalized notes only', ()=>{
  const notes = [{ id:1, type:'case', title:'A' }];
  const merged = normalizeNotesList(notes, deps);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged.map(n=>n.id), [1]);
});

test('normalizeNotesList removes invalid and duplicate ids', ()=>{
  const notes = [{ id:1, type:'case' }, { id:'not-number', type:'x' }, { id:1, type:'article' }];

  const merged = normalizeNotesList(notes, deps);
  assert.deepEqual(merged.map(n=>n.id), [1]);
});

test('normalizeNotesList handles non-array input safely', ()=>{
  const merged = normalizeNotesList(null, deps);
  assert.deepEqual(merged, []);
});
