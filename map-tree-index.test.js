const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTreePathLabel } = require('./map-tree-index.js');

test('buildTreePathLabel builds nested labels with >', ()=>{
  assert.equal(buildTreePathLabel('', '民法'), '民法');
  assert.equal(buildTreePathLabel('民法', '法律行為'), '民法>法律行為');
  assert.equal(buildTreePathLabel('法律行為', '意思表示'), '法律行為>意思表示');
});

test('buildTreePathLabel trims whitespace and tolerates empty child', ()=>{
  assert.equal(buildTreePathLabel(' 民法 ', ' 法律行為 '), '民法>法律行為');
  assert.equal(buildTreePathLabel('民法', ''), '民法');
});
