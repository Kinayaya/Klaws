const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { registerSettingsBindings } = require('./ui/bindings/settings-bindings.js');

test('assistToolsBtn can register click binding', ()=>{
  const calls=[];
  registerSettingsBindings({ on:(id,ev)=>calls.push(`${id}:${ev}`), g:()=>null });
  assert.ok(calls.includes('assistToolsBtn:click'));
});

test('mapBackBtn can register click binding', ()=>{
  const calls=[];
  global.debounce=fn=>fn;
  global.mapFilter={};
  global.isMapOpen=false;
  global.leaveMapSubpage=()=>false;
  global.toggleMapView=()=>{};
  global.openForm=()=>{};
  global.saveDataDeferred=()=>{};
  global.drawMap=()=>{};
  global.formMode='';
  global.g=()=>({ value:'' });
  global.on=(id,ev)=>calls.push(`${id}:${ev}`);
  require('./ui/bindings/map-bindings.js');
  global.registerMapBindings();
  assert.ok(calls.includes('mapBackBtn:click'));
});

test('reviewNowBtn binding remains in init entry', ()=>{
  const initSrc = fs.readFileSync('./init.js','utf8');
  assert.match(initSrc, /on\('reviewNowBtn','click'/);
});
