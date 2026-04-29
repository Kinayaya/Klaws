const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('./index.html','utf8');

test('path manager UI replaces tag manager labels', ()=>{
  assert.doesNotMatch(html, /管理標籤/);
  assert.match(html, /管理路徑/);
  assert.doesNotMatch(html, /搜尋標籤/);
  assert.match(html, /搜尋路徑/);
});
