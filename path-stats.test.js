const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const pathsJs = fs.readFileSync('./paths.js','utf8');

test('path stats count unique note paths and managed path entries separately', ()=>{
  assert.match(pathsJs, /const uniqueNotePaths=new Set\(notes\.map\(n=>safeStr\(n\.path\)\.trim\(\)\)\.filter\(Boolean\)\);/);
  assert.match(pathsJs, /const managedPathCount=types\.length\+domains\.length\+groups\.length\+parts\.length;/);
  assert.match(pathsJs, /\$\{uniqueNotePaths\.size\}/);
  assert.match(pathsJs, /\$\{managedPathCount\}/);
});
