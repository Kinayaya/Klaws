const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const indexHtml = fs.readFileSync('./index.html','utf8');
const initJs = fs.readFileSync('./init.js','utf8');

test('tag manager entrypoints are removed', ()=>{
  assert.doesNotMatch(indexHtml, /tags\.js/);
  assert.match(indexHtml, /paths\.js/);
  assert.doesNotMatch(initJs, /openTagMgr|bindTagManagerNav|renderTagLists|clearUnusedTags|addTag\(/);
  assert.match(initJs, /openPathMgr|bindPathManagerNav|renderPathLists|clearUnusedPaths|addPath\(/);
});
