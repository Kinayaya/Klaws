const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const dataJs = fs.readFileSync('./data.js','utf8');
const utilsAppJs = fs.readFileSync('./utils-app.js','utf8');

test('download backup uses the full persisted payload for calendar and exam data', () => {
  assert.match(dataJs, /getPayload\(\{includeTransient:false\}\)/);
  assert.match(utilsAppJs, /calendarEvents,calendarSettings,examList/);
  assert.doesNotMatch(utilsAppJs, /levelSystem/);
});

test('backup import preview reports calendar reminders, diaries, and essay questions', () => {
  assert.match(dataJs, /function buildImportPreview\(report\)/);
  assert.match(dataJs, /提醒：\$\{report\.validReminders\}/);
  assert.match(dataJs, /日記：\$\{report\.validDiaries\}/);
  assert.match(dataJs, /申論題目：\$\{report\.validExamItems\}\/\$\{report\.totalExamItems\}/);
  assert.match(dataJs, /if\(!confirm\(buildImportPreview\(parsed\.report\)\)\) return;/);
});

test('backup import accepts calendar or exam only payloads and normalizes them', () => {
  assert.match(dataJs, /normalizeCalendarEventsList\(parsed\.calendarEvents\)/);
  assert.match(dataJs, /normalizeExamList\(parsed\.examList\)/);
  assert.match(dataJs, /validNotes===0&&report\.validAuxnodes===0&&report\.validCalendarEvents===0&&report\.validExamItems===0/);
});
