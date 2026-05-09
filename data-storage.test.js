const test=require('node:test');
const assert=require('node:assert/strict');
const { migratePathOverridesIntoNotes, clearLegacyDomainsFromNotes, migrateLegacyGroupPartData }=require('./data/migrations.js');
const { createShardStorageApi }=require('./data/shards.js');

test('migrations are idempotent on rerun', ()=>{
  const local={m:new Map(),getItem(k){return this.m.get(k)||null;},setItem(k,v){this.m.set(k,String(v));}};
  const notes=[{id:1,path:'',domain:'d',domains:['d'],group:'g',part:'p',groups:['g'],parts:['p'],detail:''}];
  const ctx={localStorage:local,readJSON:(k,d)=>k==='klaws_note_paths_v1'?{'1':'A>B'}:d,notesRef:{value:notes},mapAuxNodesRef:{value:[]},normalizePathText:s=>s,removeLocal:()=>{},writeLocal:(k,v)=>local.setItem(k,v),showToast:()=>{},safeStr:v=>String(v||''),domainsRef:{value:['d']},mapFilterRef:{value:{sub:'x',group:'x',part:'x'}},groupsRef:{value:['g']},partsRef:{value:['p']}};
  assert.equal(migratePathOverridesIntoNotes(ctx),true);
  assert.equal(migratePathOverridesIntoNotes(ctx),false);
  assert.equal(clearLegacyDomainsFromNotes(ctx),true);
  assert.equal(clearLegacyDomainsFromNotes(ctx),false);
  assert.equal(migrateLegacyGroupPartData(ctx),true);
  assert.equal(migrateLegacyGroupPartData(ctx),false);
});

test('shard checksum mismatch returns null', async ()=>{
  const db=new Map();
  const storageAdapter={primaryStore:{set:async(k,v)=>db.set(k,v)}};
  const readJSONAsync=async(k,d)=>db.has(k)?db.get(k):d;
  const api=createShardStorageApi({SKEY:'k',storageAdapter,readJSONAsync});
  const payload={notes:[],mapAuxNodes:[],nid:1,links:[],lid:1,types:[],domains:[],groups:[],parts:[],typeFieldConfigs:{},customFieldDefs:{},nodePos:{},nodeSizes:{},sortMode:'',panelDir:'',mapCenterNodeId:null,mapCenterNodeIds:{},mapFilter:{},mapLinkedOnly:false,mapDepth:'all',mapFocusMode:false,mapLaneConfigs:{},mapCollapsed:{},mapSubpages:{},mapPageNotes:{},mapPageStack:[],calendarEvents:[],calendarSettings:{},levelSystem:{}};
  await api.writeShardedPayloadParts(payload);
  db.set('k__parts_v1::notes',{notes:[{id:1}],mapAuxNodes:[],nid:1});
  const out=await api.readShardedPayload();
  assert.equal(out,null);
});


test('emergency snapshot hooks exist for sync flush and merge recovery', ()=>{
  const dataJs=require('node:fs').readFileSync('./data.js','utf8');
  const initJs=require('node:fs').readFileSync('./init.js','utf8');
  assert.match(dataJs,/const EMERGENCY_SNAPSHOT_KEY='klaws_emergency_snapshot_v1';/);
  assert.match(dataJs,/writeEmergencySnapshotSync\(payload\);/);
  assert.match(dataJs,/mergeEmergencyPathSnapshot\(d,emergencySnapshot\)/);
  assert.match(initJs,/flushCriticalSnapshotSync\(\);\s*saveData\(\);/);
});
