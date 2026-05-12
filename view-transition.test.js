const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadCreateAppState(){
  const code = fs.readFileSync('./state.js','utf8');
  const sandbox={
    console,
    KLawsCore:{normalizeNotesList:(n)=>n},
    normalizeNoteSchema:(x)=>x,
    safeStr:(v)=>typeof v==='string'?v:String(v??''),
    localStorage:{getItem:()=>null},
    SCOPE_LINKED_TOGGLE_KEY:'k',
    window:{},
    module:{exports:{}},
    exports:{}
  };
  vm.createContext(sandbox);
  vm.runInContext(code,sandbox);
  return sandbox.module.exports.createAppState;
}

test('view transitions keep view state consistent for notes/map/calendar/level', ()=>{
  const createAppState=loadCreateAppState();
  const state=createAppState();

  state.setView('notes',{mapOpen:false});
  assert.equal(state.currentView,'notes');
  assert.equal(state.isMapOpen,false);

  state.setView('map',{mapOpen:true});
  assert.equal(state.currentView,'map');
  assert.equal(state.isMapOpen,true);

  state.setView('calendar',{mapOpen:false});
  assert.equal(state.currentView,'calendar');
  assert.equal(state.isMapOpen,false);

  state.setView('level');
  assert.equal(state.currentView,'level');
  assert.equal(state.isMapOpen,false);
});

test('mapFilter and searchQ interleaving operations are regression-safe', ()=>{
  const createAppState=loadCreateAppState();
  const state=createAppState();

  state.setSearchQuery('contract');
  state.updateMapFilter({group:'g-1'});
  state.setSearchQuery('tort');
  state.updateMapFilter({part:'p-2',q:'graph'});

  assert.equal(state.searchQ,'tort');
  assert.equal(state.gridPage,1);
  assert.equal(state.mapFilter.group,'g-1');
  assert.equal(state.mapFilter.part,'p-2');
  assert.equal(state.mapFilter.q,'graph');
  assert.equal(state.mapFilter.sub,'all');
});
