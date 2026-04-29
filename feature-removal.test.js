const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const indexHtml = fs.readFileSync('./index.html', 'utf8');
const initJs = fs.readFileSync('./init.js', 'utf8');
const utilsAppJs = fs.readFileSync('./utils-app.js', 'utf8');
const dataJs = fs.readFileSync('./data.js', 'utf8');
const configJs = fs.readFileSync('./config.js', 'utf8');
const stateJs = fs.readFileSync('./state.js', 'utf8');
const styleCss = fs.readFileSync('./style.css', 'utf8');

test('dark mode and undo entry points are completely removed', ()=>{
  assert.doesNotMatch(indexHtml, /id="themeToggleBtn"/);
  assert.doesNotMatch(indexHtml, /id="undoBtn"/);

  assert.doesNotMatch(initJs, /themeToggleBtn/);
  assert.doesNotMatch(initJs, /undoBtn/);

  assert.doesNotMatch(utilsAppJs, /function applyThemeMode\(/);
  assert.doesNotMatch(utilsAppJs, /function toggleThemeMode\(/);

  assert.doesNotMatch(dataJs, /function undoLastAction\(/);
  assert.doesNotMatch(dataJs, /undoSnapshotRaw/);
  assert.doesNotMatch(dataJs, /isUndoApplying/);

  assert.doesNotMatch(configJs, /THEME_MODE_KEY/);
  assert.doesNotMatch(stateJs, /undoSnapshotRaw/);

  assert.doesNotMatch(styleCss, /body\.dark-mode/);
});
