const test = require('node:test');
const assert = require('node:assert/strict');
const { getViewToggles } = require('./view-state.js');

test('getViewToggles returns null for missing handlers without throwing', ()=>{
  const toggles=getViewToggles({});
  assert.equal(toggles.toggleMapView,null);
  assert.equal(toggles.toggleCalendarView,null);
  assert.equal(toggles.toggleLevelSystemView,null);
});
