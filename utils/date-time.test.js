const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDateKey, formatDateKey, relativeDayLabel, startOfLocalDay } = require('./date-time.js');

test('parseDateKey accepts YYYY-MM-DD and ISO with timezone', ()=>{
  assert.equal(formatDateKey('2026-05-09'), '2026-05-09');
  assert.equal(formatDateKey('2026-05-09T23:30:00+08:00'), '2026-05-09');
  assert.equal(formatDateKey('2026-05-08T22:30:00-05:00'), '2026-05-09');
});

test('relativeDayLabel handles midnight boundary with explicit date keys', ()=>{
  const now = new Date('2026-05-09T00:10:00');
  assert.equal(relativeDayLabel('2026-05-09', { now }), '今天');
  assert.equal(relativeDayLabel('2026-05-08', { now }), '1 天前');
});

test('invalid date strings are rejected', ()=>{
  assert.equal(parseDateKey('2026/05/09'), null);
  assert.equal(parseDateKey('05-09-2026'), null);
  assert.equal(parseDateKey('2026-02-30'), null);
  assert.equal(relativeDayLabel('not-a-date'), '');
  assert.equal(formatDateKey(''), null);
});

test('startOfLocalDay returns local midnight or null', ()=>{
  const d = startOfLocalDay('2026-05-09T12:34:56Z');
  assert.ok(d instanceof Date);
  assert.equal(d.getHours(), 0);
  assert.equal(startOfLocalDay('bad'), null);
});
