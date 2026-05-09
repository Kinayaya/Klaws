const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadCreateAppState(){
  const code = fs.readFileSync('./state.js','utf8');
  const sandbox={
    console,
    KLawsCore:{mergeAuxNodesIntoNotes:(n)=>n},
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

test('view switch and map filter updates do not overwrite each other',()=>{
  const createAppState=loadCreateAppState();
  const state=createAppState();
  state.updateMapFilter({group:'g1',part:'p1'});
  state.setView('calendar',{mapOpen:false});
  assert.equal(state.currentView,'calendar');
  assert.equal(state.isMapOpen,false);
  assert.equal(state.mapFilter.group,'g1');
  assert.equal(state.mapFilter.part,'p1');
});

test('map filter patch keeps existing fields',()=>{
  const createAppState=loadCreateAppState();
  const state=createAppState();
  state.updateMapFilter({group:'g2'});
  state.updateMapFilter({part:'p2'});
  assert.equal(state.mapFilter.group,'g2');
  assert.equal(state.mapFilter.part,'p2');
  assert.equal(state.mapFilter.sub,'all');
});
