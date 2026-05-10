const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function createMemoryLocalStorage(initial={}){
  const map=new Map(Object.entries(initial));
  return {
    getItem:k=>map.has(k)?map.get(k):null,
    setItem(k,v){ map.set(k,String(v)); },
    removeItem:k=>map.delete(k),
    key:i=>Array.from(map.keys())[i]??null,
    get length(){ return map.size; }
  };
}

function basePayload({title,detail,rev,updatedAt}){
  return {
    notes:[{id:1,uid:'n1',title,detail,path:'root',type:'diary',domains:[],groups:[],parts:[]}],
    mapAuxNodes:[],
    links:[],
    nid:2,
    lid:1,
    types:[{key:'diary',label:'日記',color:'#D85A30'}],
    domains:[],
    groups:[],
    parts:[],
    nodeSizes:{},
    sortMode:'',
    panelDir:'',
    mapCenterNodeId:null,
    mapCenterNodeIds:{},
    mapFilter:{sub:'all',group:'all',part:'all',q:''},
    mapLinkedOnly:false,
    mapDepth:'all',
    mapFocusMode:false,
    mapLaneConfigs:{},
    mapCollapsed:{},
    mapSubpages:{},
    mapPageNotes:{root:[1]},
    mapPageStack:[],
    typeFieldConfigs:{},
    customFieldDefs:{},
    calendarEvents:[],
    calendarSettings:{emails:[]},
    levelSystem:{skills:[],tasks:[],settings:{xpByDifficulty:{E:30,N:55,H:90},xpBoost150Applied:true}},
    rev,
    updatedAt
  };
}

test('loadData restores newer emergency full payload and writes it back to shards', async ()=>{
  const stale=basePayload({title:'stale indexeddb note',detail:'old content',rev:10,updatedAt:'2026-05-01T00:00:00.000Z'});
  const emergency=basePayload({title:'emergency localStorage note',detail:'latest content before unload',rev:20,updatedAt:'2026-05-02T00:00:00.000Z'});
  let shardWrite=null;
  const localStorage=createMemoryLocalStorage({
    klaws_emergency_full_payload_v1:JSON.stringify({version:1,snapshotAt:'2026-05-02T00:00:01.000Z',payload:emergency})
  });
  const dataStorageApi={
    migrateLegacyLocalFallbackToIdb:async()=>{},
    clearLegacyLocalFallbackKeys:()=>{},
    readShardedPayload:async()=>stale,
    writeLocalFallbackPayload:async()=>true,
    buildFallbackMeta:meta=>meta,
    writeShardedPayloadParts:async payload=>{ shardWrite=payload; },
    detectIdentityDriftRisk:()=>({ok:true}),
    migrateLegacyGroupPartData:()=>false,
    clearLegacyDomainsFromNotes:()=>false,
    backfillNoteUids:()=>false,
    migratePathOverridesIntoNotes:()=>false
  };
  const context={
    console,
    Date,
    Promise,
    JSON,
    Math,
    Number,
    String,
    Array,
    Object,
    Map,
    Set,
    localStorage,
    location:{host:'klaws.test'},
    SKEY:'klaws_data',
    RECYCLE_BIN_KEY:'klaws_recycle_bin_v1',
    BACKEND_SYNC_ENDPOINT_KEY:'backend_sync_endpoint',
    CLOUD_SYNC_PUSH_SCHEDULER_ENABLED:false,
    storageAdapter:{isQuotaErr:()=>false,primaryStore:{get:async()=>[]}},
    readJSON:(key,fallback)=>{ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; } },
    readJSONAsync:async()=>null,
    showToast:()=>{},
    safeStr:v=>typeof v==='string'?v:String(v??''),
    ensureNoteUid:n=>n.uid||`uid_${n.id}`,
    normalizePathText:v=>v,
    DEFAULTS:{notes:[],links:[],types:[],domains:[],groups:[],parts:[]},
    notes:[],mapAuxNodes:[],links:[],nid:0,lid:0,types:[],domains:[],groups:[],parts:[],
    nodePos:{},nodeSizes:{},sortMode:'',mapCenterNodeId:null,mapCenterNodeIds:{},mapFilter:{sub:'all',group:'all',part:'all',q:''},mapLinkedOnly:false,mapDepth:'all',mapFocusMode:false,mapLaneConfigs:{},mapCollapsed:{},mapSubpages:{},mapPageNotes:{},mapPageStack:[],typeFieldConfigs:{},customFieldDefs:{},calendarEvents:[],calendarSettings:{emails:[]},levelSystem:{},recycleBin:[],
    mergeAuxNodesIntoNotes:(notes)=>notes,
    normalizeRelationType:v=>v||'',
    relationColor:()=>'',
    normalizeRelationNote:v=>v||'',
    normalizeMapCollapsed:v=>v||{},
    normalizeMapSubpages:v=>v||{},
    normalizeMapPageNotes:v=>v||{},
    normalizeMapPageStack:v=>Array.isArray(v)?v:[],
    normalizeLevelSystem:()=>{},
    applySkillDecay:()=>{},
    normalizeNotesTaxonomy:()=>{},
    getTypeFieldKeys:()=>[],
    allMapNodes:()=>context.notes.concat(context.mapAuxNodes),
    noteGroups:()=>[],
    noteDomains:()=>[],
    noteParts:()=>[],
    noteTags:()=>[],
    uniq:arr=>[...new Set((Array.isArray(arr)?arr:[]).filter(Boolean))],
    hasInvalidOrDuplicateNoteIds:()=>false,
    normalizeNoteIds:()=>false,
    getPanelDir:()=>'',
    applyPanelDir:()=>{},
    saveData:()=>{},
    getPayload:()=>({...emergency,notes:context.notes,mapAuxNodes:context.mapAuxNodes,links:context.links,nid:context.nid,lid:context.lid,types:context.types,domains:context.domains,groups:context.groups,parts:context.parts,nodeSizes:context.nodeSizes,sortMode:context.sortMode,mapCenterNodeId:context.mapCenterNodeId,mapCenterNodeIds:context.mapCenterNodeIds,mapFilter:context.mapFilter,mapLinkedOnly:context.mapLinkedOnly,mapDepth:context.mapDepth,mapFocusMode:context.mapFocusMode,mapLaneConfigs:context.mapLaneConfigs,mapSubpages:context.mapSubpages,mapPageNotes:context.mapPageNotes,mapPageStack:context.mapPageStack,typeFieldConfigs:context.typeFieldConfigs,customFieldDefs:context.customFieldDefs,calendarEvents:context.calendarEvents,calendarSettings:context.calendarSettings,levelSystem:context.levelSystem,panelDir:'',updatedAt:emergency.updatedAt,rev:emergency.rev}),
    performance:{now:()=>0},
    CustomEvent:function(type,init){ this.type=type; this.detail=init&&init.detail; },
    window:null
  };
  context.window={
    __klawsDataRev:0,
    KLawsUtils:{safeStr:context.safeStr,ensureNoteUid:context.ensureNoteUid},
    KlawsData:{createDataStorageApi:()=>dataStorageApi},
    KLawsStorage:{governedWriteLocal:async()=>true,governedRemoveLocal:()=>{}},
    dispatchEvent:()=>{}
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('data.js','utf8'),context,{filename:'data.js'});

  await context.loadData();

  assert.equal(context.notes[0].title,'emergency localStorage note');
  assert.equal(context.notes[0].detail,'latest content before unload');
  assert.ok(shardWrite, 'emergency payload should be written back to IndexedDB shards');
  assert.equal(shardWrite.notes[0].detail,'latest content before unload');
});
