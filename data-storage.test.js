const test=require('node:test');
const assert=require('node:assert/strict');
const { migratePathOverridesIntoNotes, clearLegacyDomainsFromNotes, migrateLegacyGroupPartData }=require('./data/migrations.js');
const { createShardStorageApi }=require('./data/shards.js');

test('migrations are idempotent on rerun', ()=>{
  const local={m:new Map(),getItem(k){return this.m.get(k)||null;},setItem(k,v){this.m.set(k,String(v));}};
  const notes=[{id:1,uid:'uid_1',path:'',domain:'d',domains:['d'],group:'g',part:'p',groups:['g'],parts:['p'],detail:''}];
  const ctx={localStorage:local,readJSON:(k,d)=>k==='klaws_note_paths_v1'?{'1':'A>B','uid_1':'X>Y'}:d,notesRef:{value:notes},mapAuxNodesRef:{value:[]},normalizePathText:s=>s,removeLocal:()=>{},writeLocal:(k,v)=>local.setItem(k,v),showToast:()=>{},safeStr:v=>String(v||''),ensureNoteUid:n=>n.uid||`uid_${n.id}`,domainsRef:{value:['d']},mapFilterRef:{value:{sub:'x',group:'x',part:'x'}},groupsRef:{value:['g']},partsRef:{value:['p']}};
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
  const payload={notes:[],mapAuxNodes:[],nid:1,links:[],lid:1,types:[],domains:[],groups:[],parts:[],typeFieldConfigs:{},customFieldDefs:{},nodePos:{},nodeSizes:{},sortMode:'',panelDir:'',mapCenterNodeId:null,mapCenterNodeIds:{},mapFilter:{},mapLinkedOnly:false,mapDepth:'all',mapFocusMode:false,mapLaneConfigs:{},mapCollapsed:{},mapSubpages:{},mapPageNotes:{},mapPageStack:[],calendarEvents:[],calendarSettings:{},examList:[],levelSystem:{}};
  await api.writeShardedPayloadParts(payload);
  db.set('k__parts_v1::notes',{notes:[{id:1}],mapAuxNodes:[],nid:1});
  const out=await api.readShardedPayload();
  assert.equal(out,null);
});




test('createDataStorageApi composes migration/fallback/shard APIs', async ()=>{
  global.KlawsDataMigrations=require('./data/migrations.js');
  global.KlawsDataShards=require('./data/shards.js');
  global.KlawsDataFallback=require('./data/fallback.js');
  const { createDataStorageApi }=require('./data/index.js');

  const localStore=new Map();
  const idbStore=new Map();
  const localStorage={
    getItem:k=>localStore.has(k)?localStore.get(k):null,
    setItem:(k,v)=>localStore.set(k,String(v)),
    removeItem:k=>localStore.delete(k),
    key:i=>Array.from(localStore.keys())[i]??null,
    get length(){ return localStore.size; }
  };
  const deps={
    SKEY:'klaws_data',
    storageAdapter:{
      primaryStore:{
        get:async(k,d)=>idbStore.has(k)?idbStore.get(k):d,
        set:async(k,v)=>{ idbStore.set(k,v); }
      },
      fallbackStore:{
        set:async(k,v)=>{ localStore.set(k,v); return true; },
        remove:async(k)=>localStore.delete(k)
      }
    },
    readJSON:(k,d)=>localStore.has(k)?localStore.get(k):d,
    readJSONAsync:async(k,d)=>idbStore.has(k)?idbStore.get(k):d,
    location:{host:'klaws.test'},
    localStorage,
    notesRef:{value:[{id:1,uid:'dup',path:'A'}]},
    mapAuxNodesRef:{value:[{id:9,uid:'dup',path:'B'}]},
    linksRef:{value:[{id:1,from:1,to:99}]},
    normalizePathText:v=>v,
    removeLocal:k=>localStore.delete(k),
    writeLocal:(k,v)=>localStore.set(k,String(v)),
    showToast:()=>{},
    safeStr:v=>typeof v==='string'?v:String(v??''),
    ensureNoteUid:n=>n.uid||`uid_${n.id}`,
    domainsRef:{value:[]},
    mapFilterRef:{value:{sub:'all',group:'all',part:'all'}},
    groupsRef:{value:[]},
    partsRef:{value:[]}
  };

  const api=createDataStorageApi(deps);
  const drift=api.detectIdentityDriftRisk();
  assert.equal(drift.ok,false);
  assert.equal(drift.issues.some(i=>i.type==='uid-conflict'),true);

  const wrote=await api.writeLocalFallbackPayload({meta:api.buildFallbackMeta({idbFailed:false}),payload:{notes:[]}},true);
  assert.equal(wrote,true);

  const payload={notes:[],mapAuxNodes:[],nid:1,links:[],lid:1,types:[],domains:[],groups:[],parts:[],typeFieldConfigs:{},customFieldDefs:{},nodePos:{},nodeSizes:{},sortMode:'',panelDir:'',mapCenterNodeId:null,mapCenterNodeIds:{},mapFilter:{},mapLinkedOnly:false,mapDepth:'all',mapFocusMode:false,mapLaneConfigs:{},mapCollapsed:{},mapSubpages:{},mapPageNotes:{},mapPageStack:[],calendarEvents:[],calendarSettings:{},examList:[],levelSystem:{},rev:10};
  await api.writeShardedPayloadParts(payload);
  const meta=await api.readShardedMeta();
  assert.equal(Array.isArray(meta.shards),true);
});


test('readShardedPayload ignores pending meta revisions', async ()=>{
  const db=new Map();
  const storageAdapter={primaryStore:{set:async(k,v)=>db.set(k,v)}};
  const readJSONAsync=async(k,d)=>db.has(k)?db.get(k):d;
  const api=createShardStorageApi({SKEY:'k2',storageAdapter,readJSONAsync});
  const payload={notes:[],mapAuxNodes:[],nid:1,links:[],lid:1,types:[],domains:[],groups:[],parts:[],typeFieldConfigs:{},customFieldDefs:{},nodePos:{},nodeSizes:{},sortMode:'',panelDir:'',mapCenterNodeId:null,mapCenterNodeIds:{},mapFilter:{},mapLinkedOnly:false,mapDepth:'all',mapFocusMode:false,mapLaneConfigs:{},mapCollapsed:{},mapSubpages:{},mapPageNotes:{},mapPageStack:[],calendarEvents:[],calendarSettings:{},examList:[],levelSystem:{}};
  await api.writeShardedPayloadParts(payload);
  const metaKey='k2__parts_v1::meta';
  db.set(metaKey,{...db.get(metaKey),pending:true});
  const out=await api.readShardedPayload();
  assert.equal(out,null);
});
