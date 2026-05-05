const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTreePathLabel, collectTreePathSegments } = require('./map-tree-index.js');

test('buildTreePathLabel joins parent and child paths', ()=>{
  assert.equal(buildTreePathLabel('A>B','C'),'A>B>C');
  assert.equal(buildTreePathLabel('','A'),'A');
  assert.equal(buildTreePathLabel('A',''),'A');
});

test('collectTreePathSegments returns every prefix of note paths', ()=>{
  const notes=[{path:'A>B>C>D>E'}];
  assert.deepEqual(
    collectTreePathSegments(notes, n=>String(n.path||'').split('>').filter(Boolean)),
    [['A'],['A','B'],['A','B','C'],['A','B','C','D'],['A','B','C','D','E']]
  );
});
