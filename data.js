const utils=(typeof window!=='undefined'&&window.KLawsUtils)||{};
var safeStr=typeof utils.safeStr==='function'?utils.safeStr:(v=>typeof v==='string'?v:'');
const ensureNoteUid=typeof utils.ensureNoteUid==='function'?utils.ensureNoteUid:(note=>{const n=(note&&typeof note==='object')?note:{};const raw=safeStr(n.uid).trim();if(raw) return raw;const legacyId=Number.isFinite(Number(n.id))?String(Number(n.id)):'';return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}${legacyId?`_${legacyId}`:''}`;});
const normalizeNotesList=(window.KLawsCore&&typeof window.KLawsCore.normalizeNotesList==='function')?window.KLawsCore.normalizeNotesList:(list=>Array.isArray(list)?list:[]);

const ARCHIVES_IDB_KEY = 'klaws_archives_idb_v2';
const ARCHIVE_NOISE_EXCLUDE_KEYS = ['nodePos','mapCenterNodeId','mapCenterNodeIds','mapFilter'];
const runtimeState={idbHealthDegraded:false,dataHydrationInProgress:false,queuedSaveAfterHydration:false,lastPersistedRev:0,saveChain:Promise.resolve(),cloudSyncPushDebounceTimer:null,cloudSyncPushInFlight:false,cloudSyncPushLastStartedAt:0,cloudSyncPushRetryCount:0,cloudSyncPushRetryTimer:null,cloudSyncPushPendingPayload:null,lastSavedContentPayloadRaw:'',saveStatus:{state:'idle',lastSuccessAt:0,errorCode:''}};
let idbHealthDegraded=false;
let dataHydrationInProgress=false;
let queuedSaveAfterHydration=false;
let lastPersistedRev=0;
let saveChain=Promise.resolve();
let cloudSyncPushDebounceTimer=null;
let cloudSyncPushInFlight=false;
let cloudSyncPushLastStartedAt=0;
let cloudSyncPushRetryCount=0;
let cloudSyncPushRetryTimer=null;
let cloudSyncPushPendingPayload=null;
let lastSavedContentPayloadRaw='';
let saveStatus={state:'idle',lastSuccessAt:0,errorCode:''};
window.KlawsSaveStatus=saveStatus;
function publishSaveStatus(next){ saveStatus={...saveStatus,...next}; window.KlawsSaveStatus=saveStatus; const getter=(typeof g==='function')?g:null; const el=getter?getter('saveStatusIndicator'):null; if(el){ const m={saving:'儲存中',saved:'已儲存',failed:'儲存失敗',idle:'尚未儲存'}; el.textContent=m[saveStatus.state]||saveStatus.state; el.dataset.state=saveStatus.state; } }
function buildContentPayload(){
  return {notes,mapAuxNodes,links,nid,lid,types,domains,groups,parts,typeFieldConfigs,customFieldDefs,calendarEvents,calendarSettings,examList,rev:Number(window.__klawsDataRev)||0};
}
function buildUiPayload(includeTransient=true){
  // mapCollapsed: 節點卡片折疊（以節點 id 為 key）
  // mapTreeCollapsedPaths: 路徑樹折疊（以路徑字串為 key），兩者用途不同需分開持久化
  const safeMapTreeCollapsedPaths=(mapTreeCollapsedPaths&&typeof mapTreeCollapsedPaths==='object'&&!Array.isArray(mapTreeCollapsedPaths))?mapTreeCollapsedPaths:{};
  const safeMapTreePathOrder=(mapTreePathOrder&&typeof mapTreePathOrder==='object'&&!Array.isArray(mapTreePathOrder))?mapTreePathOrder:{};
  const safeFormSectionCollapsedState=(formSectionCollapsedState&&typeof formSectionCollapsedState==='object'&&!Array.isArray(formSectionCollapsedState))?formSectionCollapsedState:{basic:false,path:false,fields:false,links:false};
  const ui={nodeSizes,sortMode,mapCenterNodeId,mapCenterNodeIds,mapFilter,mapLinkedOnly,mapDepth,mapFocusMode,mapLaneConfigs,mapCollapsed,mapTreeCollapsedPaths:safeMapTreeCollapsedPaths,mapTreePathOrder:safeMapTreePathOrder,mapSubpages,mapPageNotes,mapPageStack:normalizeMapPageStack(mapPageStack),panelDir:getPanelDir(),formSectionCollapsedState:safeFormSectionCollapsedState};
  if(includeTransient){ ui.nodePos=nodePos;ui.mapOffX=mapOffX;ui.mapOffY=mapOffY;ui.mapScale=mapScale; }
  if(typeof mapTreeFilterQ==='string') ui.mapTreeFilterQ=mapTreeFilterQ;
  return ui;
}

let googleSyncLastPushAtIso=safeStr(localStorage.getItem('klaws_cloud_last_push_at')||'').trim();

const parseRev=v=>Number.isFinite(Number(v))?Number(v):0;
const bumpRevision=(minRev=0)=>{
  const next=Math.max(Date.now(),parseRev(window.__klawsDataRev)+1,parseRev(lastPersistedRev)+1,parseRev(minRev));
  window.__klawsDataRev=next;
  return next;
};
const withRevision=(payload,{preserve=false,minRev=0}={})=>{
  const base=(payload&&typeof payload==='object')?payload:{};
  const existingRev=parseRev(base.rev);
  const rev=(preserve&&existingRev)?Math.max(existingRev,minRev):bumpRevision(minRev);
  if(rev>lastPersistedRev) lastPersistedRev=rev;
  return {...base,rev,updatedAt:new Date().toISOString()};
};
window.KlawsDataWriteGate={
  beginHydration(){ dataHydrationInProgress=true; },
  async endHydration(){
    dataHydrationInProgress=false;
    if(!queuedSaveAfterHydration) return;
    queuedSaveAfterHydration=false;
    await saveData();
  }
};

const dataStorageApi=window.KlawsData.createDataStorageApi({
  SKEY,
  storageAdapter,
  readJSON,
  readJSONAsync,
  location,
  localStorage,
  notesRef:{ get value(){ return notes; }, set value(v){ notes=v; } },
  mapAuxNodesRef:{ get value(){ return mapAuxNodes; }, set value(v){ mapAuxNodes=v; } },
  normalizePathText,
  removeLocal:key=>window.KLawsStorage.governedRemoveLocal(key),
  writeLocal:(key,val)=>window.KLawsStorage.governedWriteLocal(key,val,'core'),
  showToast,
  safeStr,
  ensureNoteUid,
  domainsRef:{ get value(){ return domains; }, set value(v){ domains=v; } },
  mapFilterRef:{ get value(){ return mapFilter; }, set value(v){ mapFilter=v; } },
  groupsRef:{ get value(){ return groups; }, set value(v){ groups=v; } },
  partsRef:{ get value(){ return parts; }, set value(v){ parts=v; } }
});


const EMERGENCY_SNAPSHOT_KEY='klaws_emergency_snapshot_v1';
const EMERGENCY_FULL_PAYLOAD_KEY='klaws_emergency_full_payload_v1';
const EMERGENCY_SNAPSHOT_VERSION=2;
const EMERGENCY_FULL_PAYLOAD_VERSION=1;
const EMERGENCY_SNAPSHOT_PAYLOAD_SOFT_LIMIT=350*1024;

function buildEmergencySnapshot(payload){
  const nowIso=new Date().toISOString();
  const src=payload&&typeof payload==='object'?payload:{};
  return {
    version:EMERGENCY_SNAPSHOT_VERSION,
    snapshotAt:nowIso,
    payloadUpdatedAt:typeof src.updatedAt==='string'?src.updatedAt:nowIso,
    notes:Array.isArray(src.notes)?src.notes.map(n=>({uid:safeStr(n.uid),id:n.id,path:safeStr(n.path)})):[],
    mapAuxNodes:Array.isArray(src.mapAuxNodes)?src.mapAuxNodes.map(n=>({uid:safeStr(n.uid),id:n.id,path:safeStr(n.path)})):[],
    payload:removeTransientPayloadFields(src)
  };
}
function isQuotaExceededError(err){
  if(storageAdapter&&typeof storageAdapter.isQuotaErr==='function'){
    try{ if(storageAdapter.isQuotaErr(err)) return true; }catch(_){ }
  }
  const name=safeStr(err&&err.name);
  const msg=safeStr(err&&err.message);
  const code=Number(err&&err.code);
  return name==='QuotaExceededError' || name==='NS_ERROR_DOM_QUOTA_REACHED' || code===22 || code===1014 || /quota/i.test(msg);
}
function writeEmergencySnapshotSync(payload){
  const snapshot=buildEmergencySnapshot(payload);
  const rawPayload=JSON.stringify(snapshot.payload||{});
  const shouldCompact=rawPayload.length>EMERGENCY_SNAPSHOT_PAYLOAD_SOFT_LIMIT;
  const record=shouldCompact?{...snapshot,payload:null,compacted:true}:snapshot;
  try{
    localStorage.setItem(EMERGENCY_SNAPSHOT_KEY,JSON.stringify(record));
    return;
  }catch(e){
    const quota=isQuotaExceededError(e);
    if(quota&&!shouldCompact){
      try{
        const compact={...snapshot,payload:null,compacted:true};
        localStorage.setItem(EMERGENCY_SNAPSHOT_KEY,JSON.stringify(compact));
        console.warn('[emergency-snapshot-write-compacted]',{key:EMERGENCY_SNAPSHOT_KEY,reason:'quota',bytes:rawPayload.length});
        return;
      }catch(compactErr){
        console.error('[emergency-snapshot-write-failed]',{key:EMERGENCY_SNAPSHOT_KEY,quotaError:true,error:compactErr});
        return;
      }
    }
    console.error('[emergency-snapshot-write-failed]',{key:EMERGENCY_SNAPSHOT_KEY,quotaError:quota,error:e});
  }
}
function removeTransientPayloadFields(payload){
  const base=(payload&&typeof payload==='object')?{...payload}:{};
  delete base.nodePos;
  delete base.mapOffX;
  delete base.mapOffY;
  delete base.mapScale;
  return base;
}
function buildEmergencyFullPayloadRecord(payload){
  const fullPayload=removeTransientPayloadFields((payload&&typeof payload==='object')?payload:getPayload({includeTransient:false}));
  const nowIso=new Date().toISOString();
  return {
    version:EMERGENCY_FULL_PAYLOAD_VERSION,
    snapshotAt:nowIso,
    payload:fullPayload&&typeof fullPayload==='object'?{...fullPayload,updatedAt:typeof fullPayload.updatedAt==='string'?fullPayload.updatedAt:nowIso}:fullPayload
  };
}
function writeFullEmergencyPayloadSync(payload){
  try{
    localStorage.setItem(EMERGENCY_FULL_PAYLOAD_KEY,JSON.stringify(buildEmergencyFullPayloadRecord(payload)));
    return true;
  }catch(e){
    const quota=storageAdapter&&typeof storageAdapter.isQuotaErr==='function'&&storageAdapter.isQuotaErr(e);
    console.error('[emergency-full-payload-write-failed]',{key:EMERGENCY_FULL_PAYLOAD_KEY,quotaError:!!quota,error:e});
    if(typeof showToast==='function') showToast(quota?'緊急完整備份失敗：瀏覽器儲存空間不足。請先匯出備份並清理空間。':'緊急完整備份失敗，請手動匯出備份。');
    return false;
  }
}
function readFullEmergencyPayloadSync(){
  const record=readJSON(EMERGENCY_FULL_PAYLOAD_KEY,null);
  if(!record||typeof record!=='object') return null;
  if(record.version===EMERGENCY_FULL_PAYLOAD_VERSION&&record.payload&&typeof record.payload==='object') return record.payload;
  return record.notes||record.links||record.nid?record:null;
}
function payloadFreshnessMeta(payload){
  if(!payload||typeof payload!=='object') return {rev:0,updatedAtMs:0};
  return {rev:parseRev(payload.rev),updatedAtMs:Date.parse(payload.updatedAt||'')||0};
}
function isEmergencyFullPayloadNewer(basePayload,emergencyPayload){
  const emergency=payloadFreshnessMeta(emergencyPayload);
  if(!emergency.rev&&!emergency.updatedAtMs) return false;
  const base=payloadFreshnessMeta(basePayload);
  if(emergency.rev&&base.rev&&emergency.rev!==base.rev) return emergency.rev>base.rev;
  if(emergency.updatedAtMs&&base.updatedAtMs&&emergency.updatedAtMs!==base.updatedAtMs) return emergency.updatedAtMs>base.updatedAtMs;
  return !base.rev&&!base.updatedAtMs;
}
function mergeEmergencyPathSnapshot(payload,snapshot){
  const base=(payload&&typeof payload==='object')?payload:{};
  if(!snapshot||typeof snapshot!=='object') return {payload:base,applied:false};
  const snapshotTs=Date.parse(snapshot.snapshotAt||snapshot.payloadUpdatedAt||'');
  const payloadTs=Date.parse(base.updatedAt||'');
  const snapshotRev=parseRev(snapshot&&snapshot.payload&&snapshot.payload.rev);
  const baseRev=parseRev(base&&base.rev);
  if(snapshot.version>=2&&snapshot.payload&&typeof snapshot.payload==='object'){
    if((snapshotRev&&snapshotRev>baseRev)||(!baseRev&&Number.isFinite(snapshotTs)&&(!Number.isFinite(payloadTs)||snapshotTs>payloadTs))){
      return {payload:{...snapshot.payload},applied:true};
    }
  }
  if(snapshot.version!==1&&snapshot.version!==2) return {payload:base,applied:false};
  if(Number.isFinite(payloadTs)&&Number.isFinite(snapshotTs)&&snapshotTs<=payloadTs) return {payload:base,applied:false};
  const applyPaths=(list,snaps)=>{
    if(!Array.isArray(list)||!Array.isArray(snaps)||!snaps.length) return list;
    const byUid=new Map();
    const byId=new Map();
    snaps.forEach(item=>{
      const nextPath=safeStr(item&&item.path);
      const uidKey=safeStr(item&&item.uid).trim();
      if(uidKey) byUid.set(uidKey,nextPath);
      if(item&&item.id!=null) byId.set(item.id,nextPath);
    });
    return list.map(item=>{
      const uidKey=safeStr(item&&item.uid).trim();
      const nextPath=(uidKey&&byUid.has(uidKey))?byUid.get(uidKey):(byId.has(item.id)?byId.get(item.id):null);
      if(nextPath===null) return item;
      return safeStr(item.path)===nextPath?item:{...item,path:nextPath};
    });
  };
  return {
    payload:{...base,notes:applyPaths(Array.isArray(base.notes)?base.notes:[],snapshot.notes),mapAuxNodes:applyPaths(Array.isArray(base.mapAuxNodes)?base.mapAuxNodes:[],snapshot.mapAuxNodes),updatedAt:snapshot.payloadUpdatedAt||snapshot.snapshotAt||base.updatedAt},
    applied:true
  };
}
function flushCriticalSnapshotSync(){
  const payload=withRevision(getPayload({includeTransient:false}));
  writeFullEmergencyPayloadSync(payload);
  writeEmergencySnapshotSync(payload);
}




// ==================== 資料儲存 ====================


async function loadData() {
  await dataStorageApi.migrateLegacyLocalFallbackToIdb();
  dataStorageApi.clearLegacyLocalFallbackKeys();
  try {
    let d=await dataStorageApi.readShardedPayload();
    let loadedFromLegacyBlob=false;
    if(!d){
      d=await readJSONAsync(SKEY,null);
      loadedFromLegacyBlob=!!d;
    }
    const fallbackRecord=await dataStorageApi.readFallbackPayload();
    const fallbackPayload=(fallbackRecord&&typeof fallbackRecord==='object'&&fallbackRecord.payload&&typeof fallbackRecord.payload==='object')?fallbackRecord.payload:null;
    if((!d||!Object.keys(d).length)&&fallbackPayload){
      d=fallbackPayload;
    }else if(fallbackPayload&&isEmergencyFullPayloadNewer(d,fallbackPayload)){
      d=fallbackPayload;
    }
    const emergencyFullPayload=readFullEmergencyPayloadSync();
    let loadedFromEmergencyFull=false;
    if(isEmergencyFullPayloadNewer(d,emergencyFullPayload)){
      d=emergencyFullPayload;
      loadedFromEmergencyFull=true;
      console.warn('[emergency-full-payload-restored]',{rev:d&&d.rev,updatedAt:d&&d.updatedAt});
    }
    if(d) {
      const emergencySnapshot=readJSON(EMERGENCY_SNAPSHOT_KEY,null);
      const snapshotMerge=mergeEmergencyPathSnapshot(d,emergencySnapshot);
      if(snapshotMerge.applied) d=snapshotMerge.payload;
      const loadedRev=Math.max(parseRev(d&&d.rev),Date.parse(d&&d.updatedAt)||0);
      if(loadedRev){
        window.__klawsDataRev=loadedRev;
        lastPersistedRev=loadedRev;
      }
      notes=normalizeNotesList(Array.isArray(d.notes)?d.notes:DEFAULTS.notes.slice(),{ normalizeNoteSchema:typeof normalizeNoteSchema==='function'?normalizeNoteSchema:(n=>n) });
      mapAuxNodes=[];
      links=Array.isArray(d.links)?d.links:DEFAULTS.links.slice();
      links=links.map(l=>({...l,rel:normalizeRelationType(l.rel),color:relationColor(l.rel),note:normalizeRelationNote(l.note)}));
      nid=Number.isFinite(d.nid)?d.nid:Math.max(10,[...notes].reduce((m,n)=>Math.max(m,n.id||0),0)+1);
      lid=Number.isFinite(d.lid)?d.lid:Math.max(10,links.reduce((m,l)=>Math.max(m,l.id||0),0)+1);
      types=Array.isArray(d.types)?d.types:DEFAULTS.types.slice();
      if(!types.some(t=>t.key==='diary')) types.push({key:'diary',label:'日記',color:'#D85A30'});
      domains=Array.isArray(d.domains)?d.domains:DEFAULTS.domains.slice();
      groups=Array.isArray(d.groups)?d.groups:DEFAULTS.groups.slice();
      parts=Array.isArray(d.parts)?d.parts:DEFAULTS.parts.slice();
      const hasTransientNodePos=d.nodePos&&typeof d.nodePos==='object'&&!Array.isArray(d.nodePos);
      nodePos=hasTransientNodePos?d.nodePos:{};
      nodeSizes=(d.nodeSizes&&typeof d.nodeSizes==='object'&&!Array.isArray(d.nodeSizes))?d.nodeSizes:{};
      if(d.sortMode) sortMode=d.sortMode;
      mapCenterNodeId=d.mapCenterNodeId||null;
      mapCenterNodeIds=(d.mapCenterNodeIds&&typeof d.mapCenterNodeIds==='object'&&!Array.isArray(d.mapCenterNodeIds))?d.mapCenterNodeIds:{};
      if(d.mapFilter&&typeof d.mapFilter==='object') mapFilter={
        sub:typeof d.mapFilter.sub==='string'?d.mapFilter.sub:'all',
        group:typeof d.mapFilter.group==='string'?d.mapFilter.group:'all',
        part:typeof d.mapFilter.part==='string'?d.mapFilter.part:'all',
        q:typeof d.mapFilter.q==='string'?d.mapFilter.q:''
      };
      if(typeof d.mapLinkedOnly==='boolean') mapLinkedOnly=d.mapLinkedOnly;
      if(['all','1','2','3'].includes(d.mapDepth)) mapDepth=d.mapDepth;
      if(typeof d.mapFocusMode==='boolean') mapFocusMode=d.mapFocusMode;
      mapLaneConfigs=(d.mapLaneConfigs&&typeof d.mapLaneConfigs==='object'&&!Array.isArray(d.mapLaneConfigs))?d.mapLaneConfigs:{};
      const rawMapCollapsed=(d.mapCollapsed&&typeof d.mapCollapsed==='object'&&!Array.isArray(d.mapCollapsed))?d.mapCollapsed:{};
      mapCollapsed=normalizeMapCollapsed(rawMapCollapsed);
      const rawMapTreeCollapsedPaths=(d.mapTreeCollapsedPaths&&typeof d.mapTreeCollapsedPaths==='object'&&!Array.isArray(d.mapTreeCollapsedPaths))?d.mapTreeCollapsedPaths:{};
      mapTreeCollapsedPaths={...rawMapTreeCollapsedPaths};
      mapTreeFilterQ=typeof d.mapTreeFilterQ==='string'?d.mapTreeFilterQ:'';
      mapTreePathOrder=(d.mapTreePathOrder&&typeof d.mapTreePathOrder==='object'&&!Array.isArray(d.mapTreePathOrder))?{...d.mapTreePathOrder}:{};
      formSectionCollapsedState=(d.formSectionCollapsedState&&typeof d.formSectionCollapsedState==='object'&&!Array.isArray(d.formSectionCollapsedState))?{basic:!!d.formSectionCollapsedState.basic,path:!!d.formSectionCollapsedState.path,fields:!!d.formSectionCollapsedState.fields,links:!!d.formSectionCollapsedState.links}:{basic:false,path:false,fields:false,links:false};
      const rawMapSubpages=(d.mapSubpages&&typeof d.mapSubpages==='object'&&!Array.isArray(d.mapSubpages))?d.mapSubpages:{};
      mapSubpages=normalizeMapSubpages(rawMapSubpages);
      const rawMapPageNotes=(d.mapPageNotes&&typeof d.mapPageNotes==='object'&&!Array.isArray(d.mapPageNotes))?d.mapPageNotes:null;
      mapPageNotes=normalizeMapPageNotes(rawMapPageNotes||{});
      if(!rawMapPageNotes){
        mapPageNotes.root=notes.map(n=>n.id);
      }
      customFieldDefs=(d.customFieldDefs&&typeof d.customFieldDefs==='object'&&!Array.isArray(d.customFieldDefs))?d.customFieldDefs:{};
      calendarEvents=Array.isArray(d.calendarEvents)?d.calendarEvents:[];
      calendarSettings=(d.calendarSettings&&typeof d.calendarSettings==='object'&&!Array.isArray(d.calendarSettings))?d.calendarSettings:{emails:[]};
      if(!Array.isArray(calendarSettings.emails)) calendarSettings.emails=[];
      if(typeof calendarSettings.smtpToken!=='string') calendarSettings.smtpToken='';
      if(typeof calendarSettings.emailFrom!=='string') calendarSettings.emailFrom='';
      const legacyExamList=readJSON('klaws_exams_v1', null);
      examList=Array.isArray(d.examList)?d.examList:(Array.isArray(legacyExamList)?legacyExamList:[]);
      calendarEvents=normalizeCalendarEventsList(calendarEvents);
      examList=normalizeExamList(examList);
      Object.keys(customFieldDefs).forEach(key=>{
        const item=customFieldDefs[key]||{};
        customFieldDefs[key]={key,label:item.label||key,kind:item.kind==='text'?'text':'textarea',placeholder:item.placeholder||''};
      });
      typeFieldConfigs=(d.typeFieldConfigs&&typeof d.typeFieldConfigs==='object'&&!Array.isArray(d.typeFieldConfigs))?d.typeFieldConfigs:{};
      types.forEach(t=>{ typeFieldConfigs[t.key]=getTypeFieldKeys(t.key); });
      let repaired=false,groupMigrated=false,groupPartMigrated=false,domainCleared=false;
      if(JSON.stringify(rawMapCollapsed)!==JSON.stringify(mapCollapsed)) repaired=true;
      if(JSON.stringify(rawMapSubpages)!==JSON.stringify(mapSubpages)) repaired=true;
      if(rawMapPageNotes&&JSON.stringify(rawMapPageNotes)!==JSON.stringify(mapPageNotes)) repaired=true;
      types.forEach(t=>{if(/^tag_t_/.test(t.key)){let old=t.key;t.key=t.label;notes.forEach(n=>{if(n.type===old)n.type=t.label;});repaired=true;}});
      domains.forEach(s=>{if(/^tag_s_/.test(s.key)){let old=s.key;s.key=s.label;allMapNodes().forEach(n=>{n.domains=noteDomains(n).map(x=>x===old?s.label:x);n.domain=n.domains[0]||'';});repaired=true;}});
      allMapNodes().forEach(n=>{
        if(!noteGroups(n).length){
          const fromTag=noteTags(n).find(t=>groups.some(c=>c.key===t&&(noteDomains(n).includes(c.domain)||c.domain==='all')));
          n.groups=fromTag?[fromTag]:[];
          n.group=n.groups[0]||'';
          groupMigrated=true;
        }
      });
      normalizeNotesTaxonomy();
      groupPartMigrated=dataStorageApi.migrateLegacyGroupPartData();
      domainCleared=dataStorageApi.clearLegacyDomainsFromNotes();
      if(dataStorageApi.backfillNoteUids()) repaired=true;
      const loadInvariant=dataStorageApi.detectIdentityDriftRisk();
      if(loadInvariant&&loadInvariant.ok===false){
        console.warn('[data-invariant][identity-drift-risk]',{stage:'loadData:post-migrations',issues:loadInvariant.issues});
        repaired=false;
      }
      if(dataStorageApi.migratePathOverridesIntoNotes()) repaired=true;
      if(hasInvalidOrDuplicateNoteIds() && normalizeNoteIds()) repaired=true;
      const missingTransientLayout=!hasTransientNodePos||typeof d.mapScale!=='number'||typeof d.mapOffX!=='number'||typeof d.mapOffY!=='number';
      if(missingTransientLayout) nodePos={};
      const autoRepairCheck=dataStorageApi.detectIdentityDriftRisk();
      if(autoRepairCheck&&autoRepairCheck.ok===false){
        console.warn('[data-invariant][identity-drift-risk]',{stage:'loadData:before-auto-repair-save',issues:autoRepairCheck.issues});
      }
      const autoRepairSafe=!autoRepairCheck||autoRepairCheck.ok!==false;
      if((repaired||groupMigrated||groupPartMigrated||domainCleared)&&autoRepairSafe){
        if(groupPartMigrated){
          const migratedNotes=[...notes,...mapAuxNodes].filter(n=>safeStr(n.detail).includes('【舊資料】')).length;
          showToast(`已棄用，請使用路徑（已轉換 ${migratedNotes} 筆）`);
          console.info('[group-part-migration]',{migratedNotes});
        }
        saveData();
      }
      mapPageStack=normalizeMapPageStack(d.mapPageStack);
      applyPanelDir(d.panelDir||getPanelDir());
      lastSavedPayloadRaw=JSON.stringify(getPayload());
      await dataStorageApi.writeLocalFallbackPayload({meta:dataStorageApi.buildFallbackMeta({idbFailed:false}),payload:removeTransientPayloadFields(d)}, true);
      if(loadedFromLegacyBlob||loadedFromEmergencyFull){
        await dataStorageApi.writeShardedPayloadParts(withRevision(getPayload()));
      }
      storageAdapter.primaryStore.get(ARCHIVES_IDB_KEY,[]).then(v=>{ if(Array.isArray(v)) window.__klawsArchivesCache=v; }).catch(()=>{});
      storageAdapter.primaryStore.get(RECYCLE_BIN_KEY,[]).then(v=>{ if(Array.isArray(v)){ window.__klawsRecycleCache=v; recycleBin=v; } }).catch(()=>{});
    } else {
      notes=DEFAULTS.notes.slice();mapAuxNodes=[];links=DEFAULTS.links.slice();types=DEFAULTS.types.slice();domains=DEFAULTS.domains.slice();groups=DEFAULTS.groups.slice();parts=DEFAULTS.parts.slice();nodeSizes={};mapPageNotes={root:notes.map(n=>n.id)};typeFieldConfigs={};customFieldDefs={};calendarEvents=[];calendarSettings={emails:[]};examList=[];types.forEach(t=>{typeFieldConfigs[t.key]=getTypeFieldKeys(t.key);});applyPanelDir(getPanelDir());saveData();
    }
  } catch(e) {
    notes=DEFAULTS.notes.slice();mapAuxNodes=[];links=DEFAULTS.links.slice();types=DEFAULTS.types.slice();domains=DEFAULTS.domains.slice();groups=DEFAULTS.groups.slice();parts=DEFAULTS.parts.slice();nodeSizes={};mapPageNotes={root:notes.map(n=>n.id)};typeFieldConfigs={};customFieldDefs={};calendarEvents=[];calendarSettings={emails:[]};examList=[];types.forEach(t=>{typeFieldConfigs[t.key]=getTypeFieldKeys(t.key);});applyPanelDir(getPanelDir());
    const detail={
      name:e&&e.name?e.name:typeof e,
      message:e&&e.message?e.message:String(e),
      stack:e&&e.stack?String(e.stack):''
    };
    console.error('[loadData-failed]',detail,e);
    showToast('資料載入失敗，請手動匯入備份檔復原。');
  }
}
function pushPayloadToBackend(payload){
  const endpoint=(localStorage.getItem(BACKEND_SYNC_ENDPOINT_KEY)||'').trim();
  if(!endpoint) return false;
  fetch(endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({updatedAt:new Date().toISOString(),payload})
  }).catch(err=>console.warn('[backend-sync-push-failed]',err));
  return true;
}
function hasActiveGoogleDriveSession(){
  return !!googleAccessToken&&Date.now()<googleTokenExpireAt;
}
function persistCloudSyncEnabled(nextEnabled){
  cloudSyncEnabled=!!nextEnabled;
  void window.KLawsStorage.governedWriteLocal(CLOUD_SYNC_ENABLED_KEY,cloudSyncEnabled?'1':'0','core').catch(()=>{});
}

function enterCloudSyncAuthorizationPending(reason=''){
  googleAccessToken='';
  googleTokenExpireAt=0;
  googleSyncLastError=safeStr(reason||'授權已過期，請重新登入 Google 雲端').trim()||'授權已過期，請重新登入 Google 雲端';
  updateCloudSyncStatus();
}
function clearCloudSyncPushRetryTimer(){
  if(!cloudSyncPushRetryTimer) return;
  clearTimeout(cloudSyncPushRetryTimer);
  cloudSyncPushRetryTimer=null;
}

function computeCloudSyncPushRetryDelayMs(retryCount){
  const safeRetry=Math.max(0,Number(retryCount)||0);
  const nextDelay=CLOUD_SYNC_PUSH_RETRY_BASE_MS*(2**safeRetry);
  return Math.min(CLOUD_SYNC_PUSH_RETRY_MAX_DELAY_MS,nextDelay);
}

function triggerCloudSyncPushScheduler(payload){
  if(!CLOUD_SYNC_PUSH_SCHEDULER_ENABLED) return;
  cloudSyncPushPendingPayload=(payload&&typeof payload==='object')?payload:getPayload();
  if(cloudSyncPushDebounceTimer) clearTimeout(cloudSyncPushDebounceTimer);
  cloudSyncPushDebounceTimer=setTimeout(()=>{
    cloudSyncPushDebounceTimer=null;
    void runCloudSyncPushScheduler();
  },Math.max(0,Number(CLOUD_SYNC_PUSH_DEBOUNCE_MS)||0));
}

async function runCloudSyncPushScheduler(){
  if(!CLOUD_SYNC_PUSH_SCHEDULER_ENABLED||cloudSyncPushInFlight) return false;
  clearCloudSyncPushRetryTimer();
  if(!cloudSyncEnabled) return true;
  if(!hasActiveGoogleDriveSession()){
    logCloudSync('info','push scheduler paused: waiting for interactive Google authorization');
    enterCloudSyncAuthorizationPending(googleSyncLastError||'授權已過期，請點擊「登入 Google 雲端」重新授權');
    return true;
  }
  const waitMs=Math.max(0,cloudSyncPushLastStartedAt+CLOUD_SYNC_PUSH_MIN_INTERVAL_MS-Date.now());
  if(waitMs>0){
    cloudSyncPushRetryTimer=setTimeout(()=>{ cloudSyncPushRetryTimer=null; void runCloudSyncPushScheduler(); },waitMs);
    return false;
  }
  cloudSyncPushInFlight=true;
  cloudSyncPushLastStartedAt=Date.now();
  const payload=(cloudSyncPushPendingPayload&&typeof cloudSyncPushPendingPayload==='object')?cloudSyncPushPendingPayload:getPayload();
  try{
    await cloudSyncPushNow({silent:true,payload});
    cloudSyncPushRetryCount=0;
    return true;
  }catch(err){
    cloudSyncPushRetryCount+=1;
    if(cloudSyncPushRetryCount<=CLOUD_SYNC_PUSH_RETRY_MAX){
      const retryDelayMs=computeCloudSyncPushRetryDelayMs(cloudSyncPushRetryCount-1);
      cloudSyncPushRetryTimer=setTimeout(()=>{ cloudSyncPushRetryTimer=null; void runCloudSyncPushScheduler(); },retryDelayMs);
    }else{
      cloudSyncPushRetryCount=0;
    }
    return false;
  }finally{
    cloudSyncPushInFlight=false;
  }
}

async function scheduleCloudSyncAfterLocalSave(opts={}){
  const {
    mode='push',
    force=false,
    silent=true,
    payload=null,
    confirmBeforeApply=false
  }=opts||{};
  if(mode==='pull'){
    return await cloudSyncPullLatest({silent,force,confirmBeforeApply});
  }
  const nextPayload=(payload&&typeof payload==='object')?payload:getPayload();
  pushPayloadToBackend(nextPayload);
  if(force){
    return await cloudSyncPushNow({silent,force,payload:nextPayload});
  }
  triggerCloudSyncPushScheduler(nextPayload);
  return true;
}

async function saveDataCritical(opt={}) {
  const {includeTransient=true}=opt||{};
  const invariant=dataStorageApi.detectIdentityDriftRisk();
  if(invariant&&invariant.ok===false){
    console.warn('[data-invariant][identity-drift-risk]',{stage:'saveDataCritical:preflight',issues:invariant.issues});
    return {ok:false,store:'none',code:'IDENTITY_DRIFT_RISK',issues:invariant.issues};
  }
  let payload=withRevision(getPayload({includeTransient}));
  const emergencyPayload=removeTransientPayloadFields(payload);
  writeFullEmergencyPayloadSync(emergencyPayload);
  const nextContentRaw=JSON.stringify(buildContentPayload());
  writeEmergencySnapshotSync(emergencyPayload);
  const nextRaw=JSON.stringify(payload);
  const saveStartedAt=performance.now();
  try{
    const meta=typeof dataStorageApi.readShardedMeta==='function'?await dataStorageApi.readShardedMeta():null;
    const persistedRev=parseRev(meta&&meta.rev);
    if(persistedRev&&payload.rev<=persistedRev){
      payload=withRevision(payload,{minRev:persistedRev+1});
    }
    await dataStorageApi.writeShardedPayloadParts(payload,{compareAndSet:true});
    lastPersistedRev=Math.max(lastPersistedRev,parseRev(payload.rev));
    idbHealthDegraded=false;
    await dataStorageApi.writeLocalFallbackPayload({meta:dataStorageApi.buildFallbackMeta({idbFailed:false}),payload:removeTransientPayloadFields(payload)});
    lastSavedPayloadRaw=nextRaw;
    lastSavedContentPayloadRaw=nextContentRaw;
    publishSaveStatus({state:'saved',lastSuccessAt:Date.now(),errorCode:''});
    await scheduleCloudSyncAfterLocalSave({mode:'push',payload,silent:true});
    console.debug('[save-metrics]',{store:'primary-idb',bytes:nextRaw.length,latencyMs:Math.round(performance.now()-saveStartedAt)});
    return {ok:true,store:'idb'};
  }catch(err){
    idbHealthDegraded=true;
    const code=err&&err.code?err.code:(storageAdapter.isQuotaErr(err)?'QUOTA_EXCEEDED':'IDB_WRITE_FAILED');
    console.warn('[saveData-idb-failed]',{code,key:SKEY,bytes:nextRaw.length,error:err});
    try{
      await dataStorageApi.writeLocalFallbackPayload({meta:dataStorageApi.buildFallbackMeta({idbFailed:true}),payload:removeTransientPayloadFields(payload)},true);
    }catch(fallbackErr){
      console.warn('[saveData-fallback-failed]',fallbackErr);
    }
    console.debug('[save-metrics]',{store:'fallback-localstorage',bytes:nextRaw.length,quotaError:storageAdapter.isQuotaErr(err)?'global_quota':'idb_error'});
    publishSaveStatus({state:'failed',lastSuccessAt:saveStatus.lastSuccessAt,errorCode:code});
    const result={ok:false,store:'local',error:err,code};
    try{
      window.dispatchEvent(new CustomEvent('klaws:save-failed',{detail:result}));
    }catch(dispatchErr){
      console.error('[saveData-failed-event-dispatch-error]',dispatchErr);
    }
    return result;
  }
}

async function saveData(opt={}) {
  if(dataHydrationInProgress){
    queuedSaveAfterHydration=true;
    return {ok:true,queued:true,store:'none'};
  }
  publishSaveStatus({state:'saving',lastSuccessAt:saveStatus.lastSuccessAt});
  saveChain=saveChain.then(async()=>{
    try {
      if(opt&&opt.contentOnly===true){
        const contentRaw=JSON.stringify(buildContentPayload());
        if(contentRaw===lastSavedContentPayloadRaw) return {ok:true,skipped:true,store:'none'};
      }
      return await saveDataCritical(opt);
    } catch(e){
      const result={ok:false,store:'none',error:e,code:'SAVE_UNKNOWN_ERROR'};
      console.error('[saveData-unknown-error]',e);
      try{
        window.dispatchEvent(new CustomEvent('klaws:save-failed',{detail:result}));
      }catch(dispatchErr){
        console.error('[saveData-failed-event-dispatch-error]',dispatchErr);
      }
      return result;
    }
  });
  try {
    return await saveChain;
  } catch(e){
    const result={ok:false,store:'none',error:e,code:'SAVE_CHAIN_ERROR'};
    console.error('[saveData-chain-error]',e);
    try{
      window.dispatchEvent(new CustomEvent('klaws:save-failed',{detail:result}));
    }catch(dispatchErr){
      console.error('[saveData-failed-event-dispatch-error]',dispatchErr);
    }
    return result;
  }
}
// ==================== 匯入/匯出 ====================
function exportData() {
  const payload={...getPayload({includeTransient:false}),exported:new Date().toISOString()};
  const json=JSON.stringify(payload,null,2);
  const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  const d=new Date();
  a.download=`法律筆記備份_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}.json`;
  a.href=url;a.click();URL.revokeObjectURL(url);showToast(`已匯出備份（筆記 ${notes.length}、提醒 ${calendarEvents.filter(e=>e&&e.type==='reminder').length}、日記 ${notes.filter(n=>n&&n.type==='diary').length}、題目 ${examList.length}）`);
}
function normalizeCalendarEventsList(list=[]){
  return (Array.isArray(list)?list:[])
    .filter(item=>item&&typeof item==='object')
    .map(item=>({
      ...item,
      id:item.id||Date.now()+Math.random(),
      title:safeStr(item.title||item.text||item.name),
      type:safeStr(item.type||'event')||'event',
      date:safeStr(item.date),
      dueHour:Math.min(23,Math.max(0,parseInt(item.dueHour,10)||9)),
      dueMinute:Math.min(59,Math.max(0,parseInt(item.dueMinute,10)||0))
    }))
    .filter(item=>item.date);
}
function normalizeExamList(list=[]){
  return (Array.isArray(list)?list:[])
    .filter(item=>item&&typeof item==='object')
    .map(item=>({
      id:Number(item.id)||Date.now()+Math.random(),
      domain:safeStr(item.domain||'all'),
      question:safeStr(item.question),
      answer:safeStr(item.answer),
      issues:Array.isArray(item.issues)?item.issues.map(v=>safeStr(v)).filter(Boolean):[],
      timeLimit:Math.max(1,parseInt(item.timeLimit,10)||30)
    }))
    .filter(item=>item.question||item.answer);
}
function buildImportPreview(report){
  const lines=[
    '匯入備份預覽',
    `筆記：${report.validNotes}/${report.totalNotes}`,
    `地圖節點：${report.validAuxnodes}/${report.totalAuxnodes}`,
    `關聯：${report.validLinks}/${report.totalLinks}`,
    `日曆項目：${report.validCalendarEvents}/${report.totalCalendarEvents}`,
    `提醒：${report.validReminders}`,
    `日記：${report.validDiaries}`,
    `申論題目：${report.validExamItems}/${report.totalExamItems}`
  ];
  if(report.warnings.length) lines.push('',`修正/略過：${report.warnings.length} 項（詳見 Console）`);
  lines.push('', '按「確定」繼續匯入，按「取消」停止。');
  return lines.join('\n');
}
function portableTextHash(str=''){
  const text=safeStr(str);
  let hash=2166136261;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash+=(hash<<1)+(hash<<4)+(hash<<7)+(hash<<8)+(hash<<24);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}
function portableFrontmatter(note){
  const n=normalizeNoteSchema(note||{});
  const lines=[
    '---',
    `id: ${n.id}`,
    `title: "${safeStr(n.title).replace(/"/g,'\\"')}"`,
    `question: "${safeStr(n.question).replace(/"/g,'\\"')}"`,
    `application: "${safeStr(n.application).replace(/"/g,'\\"')}"`,
    `date: ${n.date||''}`,
    `type: ${n.type||''}`,
    `domains: [${noteDomains(n).join(', ')}]`,
    `groups: [${noteGroups(n).join(', ')}]`,
    `parts: [${noteParts(n).join(', ')}]`,
    `tags: [${noteTags(n).join(', ')}]`,
    '---'
  ];
  return lines.join('\n');
}
function portableNoteMarkdown(note){
  const n=normalizeNoteSchema(note||{});
  const fm=portableFrontmatter(n);
  const detail=safeStr(n.detail).trim();
  const body=safeStr(n.body).trim();
  const question=safeStr(n.question).trim();
  const answer=safeStr(n.answer).trim();
  const prompt=safeStr(n.prompt).trim();
  const application=safeStr(n.application).trim();
  const todos=(Array.isArray(n.todos)?n.todos:[]).map(t=>`- [${t.done?'x':' '}] ${safeStr(t.text).trim()}`).filter(Boolean);
  return `${fm}\n\n# ${safeStr(n.title)||'Untitled'}\n\n${question?`## Question\n\n${question}\n\n`:''}${prompt?`## Prompt\n\n${prompt}\n\n`:''}${answer?`## Answer\n\n${answer}\n\n`:''}${application?`## Application\n\n${application}\n\n`:''}${body||''}${detail?`\n\n## Detail\n\n${detail}`:''}${todos.length?`\n\n## Todos\n\n${todos.join('\n')}`:''}\n`;
}
function buildPortableExportPackage(){
  const noteItems=notes.map(n=>{
    const markdown=portableNoteMarkdown(n);
    return {
      id:n.id,
      title:safeStr(n.title),
      markdown,
      hash:portableTextHash(markdown),
      meta:{
        type:n.type||'',
        domains:noteDomains(n),
        groups:noteGroups(n),
        parts:noteParts(n),
        tags:noteTags(n),
        date:n.date||''
      }
    };
  });
  const auxnodeItems=mapAuxNodes.map(n=>{
    const markdown=portableNoteMarkdown(n);
    return {
      id:n.id,
      title:safeStr(n.title),
      markdown,
      hash:portableTextHash(markdown),
      meta:{
        nodeKind:'auxnode',
        type:n.type||'',
        domains:noteDomains(n),
        groups:noteGroups(n),
        parts:noteParts(n),
        tags:noteTags(n),
        date:n.date||''
      }
    };
  });
  const relationItems=links.map(l=>({id:l.id,from:l.from,to:l.to,type:normalizeRelationType(l.rel)}));
  const checksumSource=[
    ...noteItems.map(x=>x.hash),
    ...auxnodeItems.map(x=>x.hash),
    ...relationItems.map(x=>`${x.from}->${x.to}`)
  ].join('|');
  return {
    schemaVersion:PORTABLE_EXPORT_SCHEMA_VERSION,
    exportedAt:new Date().toISOString(),
    sourceApp:'KLaws',
    taxonomy:{types,domains,groups,parts},
    notes:noteItems,
    auxnodes:auxnodeItems,
    relations:relationItems,
    manifest:{
      noteCount:noteItems.length,
      auxnodeCount:auxnodeItems.length,
      relationCount:relationItems.length,
      contentChecksum:portableTextHash(checksumSource)
    }
  };
}
function exportPortablePackage(){
  try{
    const pkg=buildPortableExportPackage();
    const json=JSON.stringify(pkg,null,2);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const d=new Date();
    a.download=`klaws_portable_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}.json`;
    a.href=url;
    a.style.display='none';
    a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`已匯出通用包（${pkg.manifest.noteCount} 筆筆記）`);
  }catch(e){
    showToast('通用包匯出失敗');
  }
}
function parseImportPayload(rawText){
  const report={errors:[],warnings:[],totalNotes:0,validNotes:0,totalAuxnodes:0,validAuxnodes:0,totalLinks:0,validLinks:0,totalCalendarEvents:0,validCalendarEvents:0,validReminders:0,totalExamItems:0,validExamItems:0,validDiaries:0};
  let parsed=null;
  try{
    parsed=JSON.parse(rawText);
  }catch(e){
    report.errors.push('JSON 解析失敗，請確認檔案內容為有效 JSON');
    return {ok:false,report,data:null};
  }
  if(!parsed||typeof parsed!=='object'){
    report.errors.push('匯入資料格式錯誤：根點必須為物件');
    return {ok:false,report,data:null};
  }
  const noteList=Array.isArray(parsed.notes)?parsed.notes:[];
  const auxNodeList=Array.isArray(parsed.mapAuxNodes)?parsed.mapAuxNodes:[];
  if(!Array.isArray(parsed.notes)){
    report.warnings.push('匯入資料缺少 notes 陣列，將只匯入其他可用內容');
  }
  report.totalNotes=noteList.length;
  report.totalAuxnodes=auxNodeList.length;
  const normalizedNotes=[];
  noteList.forEach((item,idx)=>{
    if(!item||typeof item!=='object'){
      report.warnings.push(`第 ${idx+1} 筆 notes 非物件，已略過`);
      return;
    }
    const normalized=normalizeNoteSchema(item);
    if(!safeStr(normalized.title).trim()&&!safeStr(normalized.body).trim()&&!safeStr(normalized.detail).trim()){
      report.warnings.push(`第 ${idx+1} 筆 notes 沒有標題與內容，已略過`);
      return;
    }
    if(!Number.isFinite(Number(item.id))){
      report.warnings.push(`第 ${idx+1} 筆 notes 缺少有效 id，匯入時將自動重編`);
    }
    normalizedNotes.push(normalized);
  });
  report.validNotes=normalizedNotes.length;
  const normalizedAuxnodes=[];
  auxNodeList.forEach((item,idx)=>{
    if(!item||typeof item!=='object'){
      report.warnings.push(`第 ${idx+1} 筆 mapAuxNodes 非物件，已略過`);
      return;
    }
    const backupType=safeStr(item&&item.noteTypeBackup)||safeStr(item&&item.type)||'article';
    const normalized=normalizeNoteSchema({...item,isAuxnode:false,noteTypeBackup:'',type:backupType});
    if(!safeStr(normalized.title).trim()&&!safeStr(normalized.body).trim()&&!safeStr(normalized.detail).trim()){
      report.warnings.push(`第 ${idx+1} 筆 mapAuxNodes 沒有標題與內容，已略過`);
      return;
    }
    if(!Number.isFinite(Number(item.id))){
      report.warnings.push(`第 ${idx+1} 筆 mapAuxNodes 缺少有效 id，匯入時將自動重編`);
    }
    normalizedAuxnodes.push(normalized);
  });
  report.validAuxnodes=normalizedAuxnodes.length;
  const links=Array.isArray(parsed.links)?parsed.links:[];
  report.totalLinks=links.length;
  const normalizedLinks=[];
  links.forEach((item,idx)=>{
    if(!item||typeof item!=='object'){
      report.warnings.push(`第 ${idx+1} 筆 links 非物件，已略過`);
      return;
    }
    const from=Number(item.from),to=Number(item.to);
    if(!Number.isFinite(from)||!Number.isFinite(to)||from===to){
      report.warnings.push(`第 ${idx+1} 筆 links from/to 無效，已略過`);
      return;
    }
    const rel=normalizeRelationType(item.rel||item.type);
    normalizedLinks.push({id:Number(item.id),from,to,rel,color:relationColor(rel),note:normalizeRelationNote(item.note)});
  });
  report.validLinks=normalizedLinks.length;
  const normalizedCalendarEvents=normalizeCalendarEventsList(parsed.calendarEvents);
  report.totalCalendarEvents=Array.isArray(parsed.calendarEvents)?parsed.calendarEvents.length:0;
  report.validCalendarEvents=normalizedCalendarEvents.length;
  report.validReminders=normalizedCalendarEvents.filter(item=>item.type==='reminder').length;
  const normalizedExamList=normalizeExamList(parsed.examList);
  report.totalExamItems=Array.isArray(parsed.examList)?parsed.examList.length:0;
  report.validExamItems=normalizedExamList.length;
  report.validDiaries=normalizedNotes.filter(item=>item.type==='diary').length;
  if(report.validNotes===0&&report.validAuxnodes===0&&report.validCalendarEvents===0&&report.validExamItems===0){
    report.errors.push('匯入資料沒有可用的筆記、日曆或題庫內容');
    return {ok:false,report,data:null};
  }
  return {
    ok:true,
    report,
    data:{
      raw:parsed,
      notes:normalizedNotes,
      auxnodes:normalizedAuxnodes,
      links:normalizedLinks,
      calendarEvents:normalizedCalendarEvents,
      examList:normalizedExamList
    }
  };
}

function applySnapshotRaw(rawText){
  const parsed=parseImportPayload(rawText);
  if(!parsed.ok) return false;
  const d=parsed.data.raw;
  const importNotes=parsed.data.notes;
  const importAuxnodes=parsed.data.auxnodes;
  const importLinks=parsed.data.links;
  notes=normalizeNotesList(importNotes,{ normalizeNoteSchema:typeof normalizeNoteSchema==='function'?normalizeNoteSchema:(n=>n) });
  links=importLinks;
  calendarEvents=parsed.data.calendarEvents;
  calendarSettings=(d.calendarSettings&&typeof d.calendarSettings==='object'&&!Array.isArray(d.calendarSettings))?d.calendarSettings:{emails:[]};
  if(!Array.isArray(calendarSettings.emails)) calendarSettings.emails=[];
  examList=parsed.data.examList;
  if(typeof saveExams==='function') saveExams();
  mapAuxNodes=[];
  nodeSizes=d.nodeSizes||{};
  mapCenterNodeId=d.mapCenterNodeId||null;
  mapCenterNodeIds=(d.mapCenterNodeIds&&typeof d.mapCenterNodeIds==='object')?d.mapCenterNodeIds:{};
  mapCollapsed=(d.mapCollapsed&&typeof d.mapCollapsed==='object')?d.mapCollapsed:{};
  mapTreeCollapsedPaths=(d.mapTreeCollapsedPaths&&typeof d.mapTreeCollapsedPaths==='object'&&!Array.isArray(d.mapTreeCollapsedPaths))?{...d.mapTreeCollapsedPaths}:{};
  mapTreeFilterQ=typeof d.mapTreeFilterQ==='string'?d.mapTreeFilterQ:'';
  mapTreePathOrder=(d.mapTreePathOrder&&typeof d.mapTreePathOrder==='object'&&!Array.isArray(d.mapTreePathOrder))?{...d.mapTreePathOrder}:{};
  formSectionCollapsedState=(d.formSectionCollapsedState&&typeof d.formSectionCollapsedState==='object'&&!Array.isArray(d.formSectionCollapsedState))?{basic:!!d.formSectionCollapsedState.basic,path:!!d.formSectionCollapsedState.path,fields:!!d.formSectionCollapsedState.fields,links:!!d.formSectionCollapsedState.links}:{basic:false,path:false,fields:false,links:false};
  mapSubpages=(d.mapSubpages&&typeof d.mapSubpages==='object')?d.mapSubpages:{};
  mapPageNotes=(d.mapPageNotes&&typeof d.mapPageNotes==='object')?normalizeMapPageNotes(d.mapPageNotes):{root:notes.map(n=>n.id)};
  nid=d.nid||Math.max([...notes,...mapAuxNodes].reduce((m,n)=>Math.max(m,n.id||0),0)+1,10);
  lid=d.lid||10;
  notes.sort((a,b)=>b.id-a.id);
  normalizeNoteIds(true);
  saveData();
  rebuildUI();
  render();
  return true;
}
function importData(file) {
  const reader=new FileReader();
  reader.onload=e=>{
    try {
      const parsed=parseImportPayload(e.target.result||'');
      if(!parsed.ok){
        showToast(parsed.report.errors[0]||'匯入失敗，請確認檔案格式');
        return;
      }
      const d=parsed.data.raw;
      const importNotes=parsed.data.notes;
      const importAuxnodes=parsed.data.auxnodes;
      const importLinks=parsed.data.links;
      const importCalendarEvents=parsed.data.calendarEvents;
      const importExamList=parsed.data.examList;
      if(!confirm(buildImportPreview(parsed.report))) return;
      if(parsed.report.warnings.length){
        console.warn('[importData warnings]',parsed.report.warnings);
      }
      if(confirm('確定 = 完整覆蓋（取代現有筆記、日曆與題庫）\n取消 = 合併（加入備份內容）')) {
        const ok=applySnapshotRaw(JSON.stringify(d));
        if(ok) showToast(`已覆蓋，共 ${notes.length} 筆筆記`);
        else showToast('匯入失敗，請確認檔案格式');
      } else {
        const existing=new Set(notes.map(n=>n.id));let added=0;
        let maxNoteId=[...notes].reduce((m,x)=>Math.max(m,x.id||0),0);
        const importedIdMap={};
        importNotes.forEach(n=>{
          const oldId=Number(n.id);
          let nextId=oldId;
          if(existing.has(nextId)||!Number.isFinite(nextId)){
            nextId=Math.max(nid,maxNoteId+1);
          }
          existing.add(nextId);
          if(Number.isFinite(oldId)) importedIdMap[oldId]=nextId;
          if(nextId>maxNoteId) maxNoteId=nextId;
          notes.push({...n,id:nextId});
          added++;
          if(nextId>=nid) nid=nextId+1;
        });
        importAuxnodes.forEach(r=>{
          const oldId=Number(r.id);
          let nextId=oldId;
          if(existing.has(nextId)||!Number.isFinite(nextId)) nextId=Math.max(nid,maxNoteId+1);
          existing.add(nextId);
          if(Number.isFinite(oldId)) importedIdMap[oldId]=nextId;
          if(nextId>maxNoteId) maxNoteId=nextId;
          notes.push({...r,id:nextId});
          if(nextId>=nid) nid=nextId+1;
          added++;
        });
        if(importLinks.length){
          const edgeSet=new Set(links.map(l=>`${Math.min(l.from,l.to)}-${Math.max(l.from,l.to)}`));
          importLinks.forEach(l=>{
            const from=importedIdMap[Number(l.from)],to=importedIdMap[Number(l.to)];
            if(!Number.isFinite(from)||!Number.isFinite(to)||from===to) return;
            const edgeKey=`${Math.min(from,to)}-${Math.max(from,to)}`;
            if(edgeSet.has(edgeKey)) return;
            const rel='link';
            links.push({id:lid++,from,to,rel,color:relationColor(rel)});
            edgeSet.add(edgeKey);
          });
        }
        if(d.nodeSizes&&typeof d.nodeSizes==='object'){
          const remappedSizes={};
          Object.keys(d.nodeSizes).forEach(k=>{
            const nk=importedIdMap[Number(k)];
            if(nk!==undefined&&remappedSizes[nk]===undefined) remappedSizes[nk]=d.nodeSizes[k];
          });
          nodeSizes={...nodeSizes,...remappedSizes};
        }
        if(d.mapCenterNodeId&&importedIdMap[Number(d.mapCenterNodeId)]!==undefined) mapCenterNodeId=importedIdMap[Number(d.mapCenterNodeId)];
        if(d.mapCenterNodeIds&&typeof d.mapCenterNodeIds==='object'){
          const remappedCenters={};
          Object.keys(d.mapCenterNodeIds).forEach(k=>{
            const nk=importedIdMap[Number(d.mapCenterNodeIds[k])];
            if(nk!==undefined) remappedCenters[k]=nk;
          });
          mapCenterNodeIds={...mapCenterNodeIds,...remappedCenters};
        }
        if(d.mapCollapsed&&typeof d.mapCollapsed==='object'){
          const remappedCollapsed={};
          Object.keys(d.mapCollapsed).forEach(k=>{
            const nk=importedIdMap[Number(k)];
            if(nk!==undefined) remappedCollapsed[nk]=d.mapCollapsed[k];
          });
          mapCollapsed={...mapCollapsed,...remappedCollapsed};
        }
        if(d.mapTreeCollapsedPaths&&typeof d.mapTreeCollapsedPaths==='object'&&!Array.isArray(d.mapTreeCollapsedPaths)){
          mapTreeCollapsedPaths={...mapTreeCollapsedPaths,...d.mapTreeCollapsedPaths};
        }
        if(typeof d.mapTreeFilterQ==='string') mapTreeFilterQ=d.mapTreeFilterQ;
        if(d.mapTreePathOrder&&typeof d.mapTreePathOrder==='object'&&!Array.isArray(d.mapTreePathOrder)) mapTreePathOrder={...mapTreePathOrder,...d.mapTreePathOrder};
        if(d.formSectionCollapsedState&&typeof d.formSectionCollapsedState==='object'&&!Array.isArray(d.formSectionCollapsedState)) formSectionCollapsedState={basic:!!d.formSectionCollapsedState.basic,path:!!d.formSectionCollapsedState.path,fields:!!d.formSectionCollapsedState.fields,links:!!d.formSectionCollapsedState.links};
        if(d.mapSubpages&&typeof d.mapSubpages==='object'){
          const remappedSubpages={};
          Object.keys(d.mapSubpages).forEach(k=>{
            const parentId=importedIdMap[Number(k)];
            const arr=Array.isArray(d.mapSubpages[k])?d.mapSubpages[k]:[];
            if(parentId===undefined) return;
            remappedSubpages[parentId]=arr.map(v=>importedIdMap[Number(v)]).filter(Number.isFinite);
          });
          mapSubpages={...mapSubpages,...remappedSubpages};
        }
        const calendarExisting=new Set(calendarEvents.map(e=>String(e.id)));
        let calendarAdded=0;
        importCalendarEvents.forEach(ev=>{
          let next={...ev};
          if(calendarExisting.has(String(next.id))) next.id=`${Date.now()}_${Math.random().toString(16).slice(2)}`;
          calendarExisting.add(String(next.id));
          calendarEvents.push(next);
          calendarAdded++;
        });
        const examExisting=new Set(examList.map(q=>String(q.id)));
        let examAdded=0;
        importExamList.forEach(q=>{
          let next={...q};
          if(examExisting.has(String(next.id))) next.id=Date.now()+Math.random();
          examExisting.add(String(next.id));
          examList.push(next);
          examAdded++;
        });
        if(typeof saveExams==='function') saveExams();
        notes.sort((a,b)=>b.id-a.id);normalizeNoteIds(true);saveData();rebuildUI();render();
        const skipped=Math.max(0,(parsed.report.totalNotes+parsed.report.totalAuxnodes)-added);
        showToast(`已合併，新增筆記 ${added} 筆、日曆 ${calendarAdded} 筆、題目 ${examAdded} 筆${skipped?`，略過 ${skipped} 筆`:''}`);
      }
      if(parsed.report.warnings.length){
        showToast(`匯入完成（含 ${parsed.report.warnings.length} 項修正/略過，詳見 Console）`);
      }
    } catch(ex){showToast('匯入失敗，請確認檔案格式');}
  };
  reader.readAsText(file);
}
function normalizeArchiveRecord(item){
  if(!item||typeof item!=='object'||!item.payload) return null;
  return {
    ...item,
    id:item.id||(`${Date.now()}_${Math.random().toString(16).slice(2)}`),
    name:item.name||'未命名存檔',
    createdAt:item.createdAt||new Date().toISOString()
  };
}
function loadArchives(){
  const raw=window.__klawsArchivesCache||readJSON(ARCHIVES_KEY,[]);
  const fromArray=Array.isArray(raw)?raw:
    (Array.isArray(raw?.archives)?raw.archives:
      (Array.isArray(raw?.items)?raw.items:
        (raw&&typeof raw==='object'&&!raw.payload?Object.values(raw):[])));
  const normalized=fromArray.map(normalizeArchiveRecord).filter(Boolean);
  if(normalized.length) return normalized;
  if(raw&&typeof raw==='object'&&raw.payload){
    return [normalizeArchiveRecord(raw)].filter(Boolean);
  }
  return [];
}

async function saveArchives(arr){
  const next=(Array.isArray(arr)?arr:[])
    .map(normalizeArchiveRecord)
    .filter(Boolean)
    .slice(0,ARCHIVE_SNAPSHOT_LIMIT);

  const estimateBytes=value=>{
    try{return new TextEncoder().encode(JSON.stringify(value)).length;}catch(e){return 0;}
  };
  const debugLog=(phase,extra={})=>{
    console.debug('[archive-save]',{
      phase,
      archiveCount:next.length,
      bytes:estimateBytes(next),
      trimmed:false,
      ...extra
    });
  };

  debugLog('initial-write');
  if(await writeJSON(ARCHIVES_KEY,next)){ storageAdapter.primaryStore.set(ARCHIVES_IDB_KEY,next).catch(()=>{}); window.__klawsArchivesCache=next; return {ok:true, kept:next.length, trimmed:0}; }

  if(next.length<=1){
    debugLog('initial-write-failed',{reason:'quota_global_or_non_archive'});
    return {ok:false, reason:'quota_global_or_non_archive', kept:0, trimmed:0};
  }

  const trimmed=next.slice();
  debugLog('retry-before-trim',{trimmed:true, retryCount:trimmed.length});
  while(trimmed.length>1){
    trimmed.pop();
    const trimmedBytes=estimateBytes(trimmed);
    console.debug('[archive-save]',{
      phase:'retry-after-trim',
      archiveCount:trimmed.length,
      bytes:trimmedBytes,
      trimmed:true,
      trimmedCount:next.length-trimmed.length
    });
    if(await writeJSON(ARCHIVES_KEY,trimmed)){ storageAdapter.primaryStore.set(ARCHIVES_IDB_KEY,trimmed).catch(()=>{}); window.__klawsArchivesCache=trimmed;
      return {ok:true, kept:trimmed.length, trimmed:next.length-trimmed.length, quotaRecovered:true};
    }
  }
  console.debug('[archive-save]',{
    phase:'retry-failed',
    archiveCount:trimmed.length,
    bytes:estimateBytes(trimmed),
    trimmed:true
  });
  return {ok:false, reason:'quota_archive_only', kept:0, trimmed:next.length-1};
}
function loadRecycleBin(){
  const arr=window.__klawsRecycleCache||readJSON(RECYCLE_BIN_KEY,[]);
  recycleBin=Array.isArray(arr)?arr:[];
  storageAdapter.primaryStore.get(RECYCLE_BIN_KEY,[]).then(v=>{ if(Array.isArray(v)){ recycleBin=v; window.__klawsRecycleCache=v; renderArchivePanel(); } }).catch(()=>{});
}
async function saveRecycleBin(){
  await writeJSON(RECYCLE_BIN_KEY,recycleBin); storageAdapter.primaryStore.set(RECYCLE_BIN_KEY,recycleBin).catch(()=>{}); window.__klawsRecycleCache=recycleBin;
}
function normalizeNotesTaxonomy(){
  const tSet=new Set(types.map(t=>t.key));
  const sSet=new Set(domains.map(s=>s.key));
  const cSet=new Set(groups.map(c=>c.key));
  const secSet=new Set(parts.map(s=>s.key));
  const groupByKeyMap={};
  groups.forEach(ch=>{ if(ch&&ch.key) groupByKeyMap[ch.key]=ch; });
  const partByKeyMap={};
  parts.forEach(sec=>{ if(sec&&sec.key) partByKeyMap[sec.key]=sec; });
  const normalizeSingleNote=n=>{
    if(!tSet.has(n.type)) n.type='';
    let domainsList=noteDomains(n).filter(k=>sSet.has(k));
    let groupsList=noteGroups(n).filter(k=>cSet.has(k));
    let partsList=noteParts(n).filter(k=>secSet.has(k));

    partsList.forEach(secKey=>{
      const sec=partByKeyMap[secKey];
      if(!sec||!sec.group||sec.group==='all') return;
      if(!groupsList.includes(sec.group)&&cSet.has(sec.group)) groupsList.push(sec.group);
    });

    groupsList=uniq(groupsList.filter(chKey=>{
      const ch=groupByKeyMap[chKey];
      if(!ch) return false;
      if(!domainsList.length) return true;
      return ch.domain==='all'||domainsList.includes(ch.domain);
    }));

    const derivedDomains=groupsList
      .map(chKey=>groupByKeyMap[chKey]?.domain)
      .filter(domainKey=>domainKey&&domainKey!=='all'&&sSet.has(domainKey));
    if(derivedDomains.length) domainsList=uniq([...domainsList,...derivedDomains]);
    domainsList=uniq(domainsList.filter(k=>sSet.has(k)));

    const groupSet=new Set(groupsList);
    partsList=uniq(partsList.filter(secKey=>{
      const sec=partByKeyMap[secKey];
      if(!sec) return false;
      return sec.group==='all'||groupSet.has(sec.group);
    }));

    n.domains=domainsList;
    n.domain=domainsList[0]||'';
    n.groups=groupsList;
    n.group=groupsList[0]||'';
    n.parts=partsList;
    n.part=partsList[0]||'';
  };
  notes.forEach(normalizeSingleNote);
  mapAuxNodes.forEach(normalizeSingleNote);
}
function createArchiveSnapshot(){
  const name=(prompt('請輸入存檔名稱：',`存檔 ${new Date().toLocaleString('zh-TW')}`)||'').trim();
  if(!name){showToast('存檔名稱不可空白');return;}
  const archives=loadArchives();
  const payload=getPayload();
  const archivePayload=Object.keys(payload||{}).reduce((acc,key)=>{ if(ARCHIVE_NOISE_EXCLUDE_KEYS.includes(key)) return acc; acc[key]=payload[key]; return acc; },{});
  archives.unshift({
    id:`${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    createdAt:new Date().toISOString(),
    payload:archivePayload
  });
  const saved=saveArchives(archives);
  if(!saved?.ok){
    if(saved.reason==='quota_archive_only'){
      showToast('存檔失敗：存檔空間不足。建議先刪除較舊存檔，再重試；清理前請先執行「下載備份」。');
      return;
    }
    if(saved.reason==='quota_global_or_non_archive'){
      showToast('存檔失敗：裝置/瀏覽器儲存已接近上限，非僅存檔資料造成。請先「下載備份」，再清理大型資料或瀏覽器儲存後重試。');
      return;
    }
    showToast('存檔失敗：儲存空間不足。請先「下載備份」，再清理資料後重試。');
    return;
  }
  renderArchivePanel();
  if(saved.trimmed>0){
    showToast(`已儲存存檔（空間不足，已自動移除最舊 ${saved.trimmed} 筆）`);
    return;
  }
  showToast('已儲存存檔');
}
function formatStorageBytes(bytes=0){
  const n=Math.max(0,Number(bytes)||0);
  if(n<1024) return `${n} B`;
  const units=['KB','MB','GB','TB'];
  let value=n/1024;
  let i=0;
  while(value>=1024&&i<units.length-1){ value/=1024; i++; }
  return `${value.toFixed(value>=10?1:2)} ${units[i]}`;
}
function updateStorageCleanupStatus(text=''){
  const el=g('storageCleanupStatus');
  if(el) el.textContent=`儲存清理：${text||'尚未執行'}`;
}
async function refreshStorageQuotaStatus(){
  const el=g('storageQuotaStatus');
  if(!el) return;
  const storageApi=window.KLawsStorage;
  if(!storageApi||typeof storageApi.readStorageHealth!=='function'){
    el.textContent='儲存用量：目前環境不支援配額估算';
    return;
  }
  try{
    const health=await storageApi.readStorageHealth(true);
    const percent=Math.round((health?.ratio||0)*100);
    el.textContent=`儲存用量：已使用 ${formatStorageBytes(health?.usage||0)} / 總容量 ${formatStorageBytes(health?.quota||0)}（${percent}%）`;
  }catch(_){
    el.textContent='儲存用量：讀取失敗，請稍後再試';
  }
}
async function runStorageCleanupFlow(){
  const storageApi=window.KLawsStorage;
  if(!storageApi||typeof storageApi.cleanupRebuildableData!=='function'){
    showToast('目前環境不支援儲存清理');
    return;
  }
  if(!confirm('建議先匯出完整備份，是否立即匯出？')) return;
  exportData();
  const scopeText='可清理項目：\n• cache（可重建）\n• archive 存檔快照（不可逆刪除）\n• recycle 回收區（不可逆刪除）\n• 暫存資料（可重建）';
  if(!confirm(`${scopeText}\n\n確認後將立即執行清理。`)) return;
  updateStorageCleanupStatus('清理中...');
  try{
    const result=await storageApi.cleanupRebuildableData();
    renderArchivePanel();
    const before=result&&result.before?result.before:{usage:0,quota:0,ratio:0};
    const after=result&&result.after?result.after:{usage:0,quota:0,ratio:0};
    const ratioText=`${Math.round((after.ratio||0)*100)}%`;
    const summary=`已清理：cache ${result?.cache?.count||0} 筆、archive ${result?.archivesRemoved||0} 筆、recycle ${result?.recycleRemoved||0} 筆；使用量 ${formatStorageBytes(before.usage)} → ${formatStorageBytes(after.usage)}（${ratioText}）`;
    updateStorageCleanupStatus(summary);
    await refreshStorageQuotaStatus();
    showToast('儲存清理完成，已重新估算容量');
    if((after.ratio||0)>=0.9){
      alert('清理後儲存壓力仍偏高。\n建議：\n1) 刪除大型筆記附件/歷史資料（若有）\n2) 分批整理舊筆記與關聯資料\n3) 定期匯出後移除不必要快照');
    }
  }catch(err){
    updateStorageCleanupStatus('清理失敗，請稍後再試');
    showToast('儲存清理失敗');
  }
}
function removeNotesToRecycle(noteIds){
  const idSet=new Set((noteIds||[]).map(Number).filter(Number.isFinite));
  if(!idSet.size) return 0;
  const removedNotes=notes.filter(n=>idSet.has(n.id));
  if(!removedNotes.length) return 0;
  const removedLinks=links.filter(l=>idSet.has(l.from)||idSet.has(l.to));
  const now=Date.now();
  const latest=recycleBin[0];
  const withinGroupWindow=latest&&(now-Date.parse(latest.groupStartedAt||latest.deletedAt||0)<RECYCLE_GROUP_WINDOW_MS);
  if(withinGroupWindow){
    const originalStartedAt=latest.groupStartedAt||latest.deletedAt;
    const noteMap=new Map((latest.notes||[]).map(n=>[n.id,n]));
    removedNotes.forEach(n=>noteMap.set(n.id,n));
    const linkMap=new Map((latest.links||[]).map(l=>[l.id,l]));
    removedLinks.forEach(l=>linkMap.set(l.id,l));
    latest.notes=[...noteMap.values()];
    latest.links=[...linkMap.values()];
    latest.deletedAt=new Date().toISOString();
    latest.groupStartedAt=originalStartedAt;
  }else{
    const nowIso=new Date().toISOString();
    recycleBin.unshift({
      id:Date.now()+Math.floor(Math.random()*1000),
      deletedAt:nowIso,
      groupStartedAt:nowIso,
      notes:removedNotes,
      links:removedLinks
    });
  }
  recycleBin=recycleBin.slice(0,200);
  notes=notes.filter(n=>!idSet.has(n.id));
  links=links.filter(l=>!idSet.has(l.from)&&!idSet.has(l.to));
  saveRecycleBin();
  return removedNotes.length;
}
function restoreRecycleItem(itemId){
  const idx=recycleBin.findIndex(x=>String(x.id)===String(itemId));
  if(idx<0) return;
  const item=recycleBin[idx];
  const idMap={};
  (item.notes||[]).forEach(n=>{
    const newId=nid++;
    idMap[n.id]=newId;
    notes.push(normalizeNoteSchema({...n,id:newId}));
  });
  (item.links||[]).forEach(l=>{
    const from=idMap[l.from]??l.from;
    const to=idMap[l.to]??l.to;
    if(!noteById(from)||!noteById(to)||from===to) return;
    const rel=normalizeRelationType(l.rel);
    links.push({id:lid++,from,to,rel,color:relationColor(rel)});
  });
  recycleBin.splice(idx,1);
  normalizeNotesTaxonomy();
  saveRecycleBin();
  saveData();
  renderArchivePanel();
  rebuildUI();
  render();
  showToast('已復原筆記');
}
function deleteRecycleItem(itemId){
  recycleBin=recycleBin.filter(x=>String(x.id)!==String(itemId));
  saveRecycleBin();
  renderArchivePanel();
}
function renderArchivePanel(){
  const archiveRoot=g('archiveList'), recycleRoot=g('recycleList');
  if(!archiveRoot||!recycleRoot) return;
  const archives=loadArchives();
  archiveRoot.innerHTML=archives.length?archives.map(a=>`<div class="archive-item"><div class="archive-item-title">${escapeHtml(a.name||'未命名存檔')}</div><div class="archive-item-sub">${new Date(a.createdAt||Date.now()).toLocaleString('zh-TW')}</div><div class="archive-item-actions"><button class="tool-btn" data-archive-load="${a.id}">載入</button><button class="tool-btn" data-archive-del="${a.id}">刪除</button></div></div>`).join(''):'<div class="archive-empty">目前沒有存檔</div>';
  recycleRoot.innerHTML=recycleBin.length?recycleBin.map(r=>`<div class="archive-item"><div class="archive-item-title">${(r.notes||[]).length} 筆筆記</div><div class="archive-item-sub">刪除於 ${new Date(r.deletedAt||Date.now()).toLocaleString('zh-TW')}</div><div class="archive-item-actions"><button class="tool-btn" data-recycle-restore="${r.id}">復原</button><button class="tool-btn" data-recycle-del="${r.id}">清除此項</button></div></div>`).join(''):'<div class="archive-empty">回收區是空的</div>';
  archiveRoot.querySelectorAll('[data-archive-load]').forEach(btn=>btn.addEventListener('click',()=>{
    const pick=archives.find(a=>String(a.id)===String(btn.dataset.archiveLoad));
    if(!pick) return;
    if(!confirm(`確定載入「${pick.name}」？\n載入後會完整取代目前所有筆記資料。`)) return;
    if(applySnapshotRaw(JSON.stringify(pick.payload||{}))) showToast('已載入存檔');
    else showToast('載入存檔失敗');
  }));
  archiveRoot.querySelectorAll('[data-archive-del]').forEach(btn=>btn.addEventListener('click',()=>{
    const filtered=archives.filter(a=>String(a.id)!==String(btn.dataset.archiveDel));
    saveArchives(filtered);
    renderArchivePanel();
  }));
  recycleRoot.querySelectorAll('[data-recycle-restore]').forEach(btn=>btn.addEventListener('click',()=>restoreRecycleItem(btn.dataset.recycleRestore)));
  recycleRoot.querySelectorAll('[data-recycle-del]').forEach(btn=>btn.addEventListener('click',()=>deleteRecycleItem(btn.dataset.recycleDel)));
  updateCloudSyncStatus();
}
function updateCloudSyncStatus(extra=''){
  const el=g('cloudSyncStatus');
  if(!el) return;
  const backendEndpoint=safeStr(localStorage.getItem(BACKEND_SYNC_ENDPOINT_KEY)||'').trim();
  const backendStatus=backendEndpoint?'已設定 endpoint':'未設定 endpoint';
  const syncModeLabel=cloudSyncEnabled?'已啟用自動同步':'目前僅手動同步';
  const pushAtLabel=googleSyncLastPushAtIso?new Date(googleSyncLastPushAtIso).toLocaleString('zh-TW'):'尚未上傳';
  if(googleSyncBusy){
    el.innerHTML=`Google Drive：處理中…｜最後 push：${pushAtLabel}<br>Backend mirror：${backendStatus}｜${syncModeLabel}`;
    return;
  }
  const loggedIn=hasActiveGoogleDriveSession();
  const reason=safeStr(extra||googleSyncLastError||'').trim();
  const loginLabel=cloudSyncEnabled&&!loggedIn?'待授權':(loggedIn?'已登入':'未登入');
  const errLabel=reason?`｜錯誤：${reason}`:'';
  el.innerHTML=`Google Drive：${loginLabel}｜最後 push：${pushAtLabel}${errLabel}<br>Backend mirror：${backendStatus}｜${syncModeLabel}`;
}
function cloudSyncErrorText(err){
  const msg=safeStr(err&&err.message||err||'').trim();
  if(!msg) return '未知錯誤';
  if(msg.includes('popup_closed')) return '登入視窗被關閉';
  if(msg.includes('popup_failed_to_open')) return '無法開啟 Google 登入視窗';
  if(msg.includes('waiting for interactive Google authorization')) return '等待重新授權 Google 雲端';
  if(msg.includes('origin_mismatch')) return 'Client ID 的授權來源不符';
  if(msg.includes('invalid_client')) return 'Google Client ID 無效';
  if(msg.includes('access_denied')) return 'Google 權限被拒絕';
  if(/Drive API 401|Upload failed: 401|Download failed: 401/.test(msg)) return '登入已失效，請重新登入';
  if(/Drive API 403|Upload failed: 403|Download failed: 403/.test(msg)) return 'Google 權限不足（請確認 Drive API 與 scope）';
  if(/Failed to fetch|NetworkError|Load failed|Network request failed/.test(msg)) return '網路或 CORS 阻擋（請確認不是用 file:// 開啟）';
  return msg.length>70?`${msg.slice(0,70)}…`:msg;
}
function cloudSyncErrorDetail(err){
  if(err instanceof Error){
    const msg=safeStr(err.message||'').trim();
    if(msg) return msg;
  }
  if(typeof err==='string') return err;
  try{
    const raw=JSON.stringify(err);
    if(raw&&raw!=='{}') return raw;
  }catch(_){}
  return 'unknown error object';
}
function ensureCloudRuntimeSupported(){
  if(location&&location.protocol==='file:'){
    throw new Error('目前以 file:// 開啟，Google 雲端同步需使用 http(s) 網址（例如 localhost）。');
  }
}
function logCloudSync(level='log',...args){
  const fn=(console&&typeof console[level]==='function')?console[level]:console.log;
  fn('[CloudSync]',...args);
}
async function ensureScriptLoaded(src){
  if(document.querySelector(`script[src="${src}"]`)) return true;
  return new Promise(resolve=>{
    const sc=document.createElement('script');
    sc.src=src;
    sc.async=true;
    sc.defer=true;
    sc.onload=()=>resolve(true);
    sc.onerror=()=>resolve(false);
    document.head.appendChild(sc);
  });
}
async function ensureGoogleIdentityClient(){
  if(window.google&&window.google.accounts&&window.google.accounts.oauth2) return true;
  const ok=await ensureScriptLoaded('https://accounts.google.com/gsi/client');
  return !!(ok&&window.google&&window.google.accounts&&window.google.accounts.oauth2);
}
function getGoogleDriveClientId(){
  return safeStr(localStorage.getItem(GOOGLE_DRIVE_CLIENT_ID_KEY)||'').trim();
}
async function askGoogleDriveClientId(){
  const current=getGoogleDriveClientId();
  const next=(prompt('請輸入 Google OAuth Client ID（Web Application）',current)||'').trim();
  if(!next) return '';
  await window.KLawsStorage.governedWriteLocal(GOOGLE_DRIVE_CLIENT_ID_KEY,next,'core');
  return next;
}
async function ensureGoogleAccessToken(forcePrompt=false){
  ensureCloudRuntimeSupported();
  const now=Date.now();
  if(googleAccessToken&&now<googleTokenExpireAt-5000) return googleAccessToken;
  if(!forcePrompt){
    googleSyncLastError='授權已過期，請點擊「登入 Google 雲端」重新授權';
    updateCloudSyncStatus();
    return '';
  }
  const ready=await ensureGoogleIdentityClient();
  if(!ready){
    googleSyncLastError='Google SDK 載入失敗';
    updateCloudSyncStatus();
    if(forcePrompt) showToast(googleSyncLastError);
    return '';
  }
  let clientId=getGoogleDriveClientId();
  if(!clientId&&forcePrompt) clientId=await askGoogleDriveClientId();
  if(!clientId){
    googleSyncLastError='未設定 Google Client ID';
    updateCloudSyncStatus();
    if(forcePrompt) showToast(googleSyncLastError);
    return '';
  }
  const tokenClient=google.accounts.oauth2.initTokenClient({
    client_id:clientId,
    scope:'https://www.googleapis.com/auth/drive.file',
    callback:()=>{}
  });
  const requestToken=(promptValue='')=>new Promise(resolve=>{
    let settled=false;
    tokenClient.callback=resp=>{
      if(resp&&resp.access_token){
        googleAccessToken=resp.access_token;
        const expiresIn=parseInt(resp.expires_in,10)||3600;
        googleTokenExpireAt=Date.now()+expiresIn*1000;
        googleSyncLastError='';
        updateCloudSyncStatus();
        settled=true;
        resolve(googleAccessToken);
        return;
      }
      if(resp&&resp.error){
        googleSyncLastError=cloudSyncErrorText(resp.error_description||resp.error);
        logCloudSync('error','token callback error:',resp);
      }else{
        googleSyncLastError='授權已過期，請重新登入 Google 雲端';
        logCloudSync('warn','token callback without access_token',resp||'');
      }
      updateCloudSyncStatus();
      settled=true;
      resolve('');
    };
    tokenClient.error_callback=err=>{
      if(!settled){
        googleSyncLastError=cloudSyncErrorText(err);
        logCloudSync('error','token error callback:',err);
        updateCloudSyncStatus();
        settled=true;
        resolve('');
      }
    };
    logCloudSync('info','requestAccessToken', { prompt: promptValue||'(silent)' });
    try{
      tokenClient.requestAccessToken({prompt:promptValue,hint:''});
    }catch(err){
      if(!settled){
        googleSyncLastError=cloudSyncErrorText(err);
        logCloudSync('error','token request failed:',err);
        updateCloudSyncStatus();
        settled=true;
        resolve('');
      }
    }
  });
  return await requestToken(forcePrompt?'consent':'');
}
async function fetchGoogleDriveWithAuth(url,opt={}){
  const token=await ensureGoogleAccessToken(false);
  if(!token) throw new Error(googleSyncLastError||'no token');
  return await fetch(url,{
    ...opt,
    headers:{
      Authorization:`Bearer ${token}`,
      ...(opt.headers||{})
    }
  });
}
async function driveApiRequest(path,opt={}){
  logCloudSync('info','Drive request',opt.method||'GET',path);
  let res=null;
  try{
    res=await fetchGoogleDriveWithAuth(`https://www.googleapis.com/drive/v3/${path}`,{
      method:opt.method||'GET',
      headers:opt.headers||{},
      body:opt.body
    });
  }catch(fetchErr){
    throw new Error(`Drive request fetch failed: ${cloudSyncErrorText(fetchErr)} / ${cloudSyncErrorDetail(fetchErr)}`);
  }
  if(!res.ok){
    const txt=await res.text().catch(()=>'');
    throw new Error(`Drive API ${res.status}: ${txt||res.statusText}`);
  }
  if(opt.raw) return res;
  return await res.json();
}
async function findDriveSyncFileId(){
  const q=encodeURIComponent(`name='${GOOGLE_DRIVE_SYNC_FILE_NAME}' and trashed=false`);
  const fields='files(id,name,modifiedTime,parents)';
  const mainData=await driveApiRequest(`files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=1`);
  if(mainData&&Array.isArray(mainData.files)&&mainData.files[0]) return mainData.files[0].id;
  return '';
}
async function uploadPayloadToDrive(payload){
  ensureCloudRuntimeSupported();
  const q=encodeURIComponent(`name='${GOOGLE_DRIVE_SYNC_FILE_NAME}' and trashed=false`);
  const visible=await driveApiRequest(`files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`);
  const fileId=visible&&Array.isArray(visible.files)&&visible.files[0]?visible.files[0].id:'';
  const boundary='klaws_boundary_'+Date.now();
  const metadata={name:GOOGLE_DRIVE_SYNC_FILE_NAME,mimeType:GOOGLE_DRIVE_SYNC_MIME};
  const crlf='\r\n';
  const body=[
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(payload),
    `--${boundary}--`,
    ''
  ].join(crlf);
  const baseUrl=fileId
    ?`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    :'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let res=null;
  try{
    res=await fetchGoogleDriveWithAuth(baseUrl,{
      method:fileId?'PATCH':'POST',
      headers:{
        'Content-Type':`multipart/related; boundary=${boundary}`
      },
      body
    });
  }catch(fetchErr){
    throw new Error(`Upload fetch failed: ${cloudSyncErrorText(fetchErr)} / ${cloudSyncErrorDetail(fetchErr)}`);
  }
  if(!res.ok){
    const txt=await res.text().catch(()=>'');
    throw new Error(`Upload failed: ${res.status}${txt?` ${txt}`:''}`);
  }
}
async function downloadPayloadFromDrive(){
  ensureCloudRuntimeSupported();
  const fileId=await findDriveSyncFileId();
  if(!fileId) return null;
  let res=null;
  try{
    res=await fetchGoogleDriveWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  }catch(fetchErr){
    throw new Error(`Download fetch failed: ${cloudSyncErrorText(fetchErr)} / ${cloudSyncErrorDetail(fetchErr)}`);
  }
  if(!res.ok){
    const txt=await res.text().catch(()=>'');
    throw new Error(`Download failed: ${res.status}${txt?` ${txt}`:''}`);
  }
  return await res.json();
}
function requestCloudLoadConfirmation(){
  const modal=g('cloudLoadConfirmModal');
  const yesBtn=g('cloudLoadConfirmYesBtn');
  const noBtn=g('cloudLoadConfirmNoBtn');
  if(!modal||!yesBtn||!noBtn) return Promise.resolve(confirm('是否要載入雲端存檔？\n載入後會以雲端資料取代目前本機筆記資料。'));
  return new Promise(resolve=>{
    const finish=answer=>{
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
      yesBtn.onclick=null;
      noBtn.onclick=null;
      modal.onclick=null;
      document.removeEventListener('keydown',onKeydown);
      resolve(!!answer);
    };
    const onKeydown=e=>{ if(e.key==='Escape') finish(false); };
    yesBtn.onclick=()=>finish(true);
    noBtn.onclick=()=>finish(false);
    modal.onclick=e=>{ if(e.target===modal) finish(false); };
    document.addEventListener('keydown',onKeydown);
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('open');
    setTimeout(()=>yesBtn.focus(),0);
  });
}
async function cloudSyncPullLatest(opts={}){
  const {silent=false,confirmBeforeApply=false}=opts||{};
  try{
    logCloudSync('info','pull start', { silent, confirmBeforeApply });
    googleSyncBusy=true;updateCloudSyncStatus();
    const remote=await downloadPayloadFromDrive();
    if(!remote){ if(!silent) showToast('雲端沒有可下載資料'); return false; }
    const localPayload=getPayload();
    const remoteUpdatedAt=parseUpdatedAt(remote.updatedAt||'');
    const localUpdatedAt=parseUpdatedAt(localPayload.updatedAt||'');
    if(remoteUpdatedAt<localUpdatedAt&&!silent){
      if(!confirm('雲端資料比本機舊，仍要覆蓋本機嗎？')) return false;
    }
    if(confirmBeforeApply){
      const accepted=await requestCloudLoadConfirmation();
      if(!accepted){
        logCloudSync('info','pull cancelled by user before apply');
        if(!silent) showToast('已取消載入雲端存檔');
        return false;
      }
    }
    const ok=applySnapshotRaw(JSON.stringify(remote));
    if(ok) googleSyncLastError='';
    if(ok&&!silent) showToast('已自動載入最新雲端紀錄');
    return ok;
  }catch(e){
    googleSyncLastError=cloudSyncErrorText(e);
    logCloudSync('error','pull failed:',cloudSyncErrorDetail(e),e);
    if(!silent) showToast(`雲端下載失敗：${googleSyncLastError}`);
    return false;
  }finally{
    googleSyncBusy=false;updateCloudSyncStatus();
  }
}
async function cloudSyncPushNow(opts={}){
  const {silent=false,payload=null}=opts||{};
  try{
    logCloudSync('info','push start', { silent });
    googleSyncBusy=true;updateCloudSyncStatus();
    const nextPayload=(payload&&typeof payload==='object')?{...payload}:getPayload();
    nextPayload.updatedAt=new Date().toISOString();
    await uploadPayloadToDrive(nextPayload);
    googleSyncLastError='';
    googleSyncLastPushAtIso=nextPayload.updatedAt;
    void window.KLawsStorage.governedWriteLocal('klaws_cloud_last_push_at',googleSyncLastPushAtIso,'core').catch(()=>{});
    if(!silent) showToast('已上傳到 Google 雲端');
    return true;
  }catch(e){
    googleSyncLastError=cloudSyncErrorText(e);
    logCloudSync('error','push failed:',cloudSyncErrorDetail(e),e);
    if(!silent) showToast(`雲端上傳失敗：${googleSyncLastError}`);
    return false;
  }finally{
    googleSyncBusy=false;updateCloudSyncStatus();
  }
}
async function loginGoogleDriveAndSync(){
  const token=await ensureGoogleAccessToken(true);
  if(!token) return false;
  persistCloudSyncEnabled(true);
  const pulled=await scheduleCloudSyncAfterLocalSave({mode:'pull',force:true,silent:true,confirmBeforeApply:true});
  if(pulled){
    showToast('已登入並自動載入最新雲端紀錄');
  }else{
    showToast('已登入 Google 雲端');
  }
  return true;
}
function logoutGoogleDriveSync(){
  persistCloudSyncEnabled(false);
  googleAccessToken='';
  googleTokenExpireAt=0;
  googleSyncLastError='';
  if(cloudSyncPushDebounceTimer){
    clearTimeout(cloudSyncPushDebounceTimer);
    cloudSyncPushDebounceTimer=null;
  }
  clearCloudSyncPushRetryTimer();
  cloudSyncPushPendingPayload=null;
  cloudSyncPushRetryCount=0;
  cloudSyncPushInFlight=false;
  updateCloudSyncStatus();
  showToast('已登出 Google 雲端');
}
function manageArchives(){
  if(isMapOpen){
    if(typeof leaveMapSubpage==='function') leaveMapSubpage();
    toggleMapView(false);
  }
  g('ap')?.classList.add('open');
  ['dp','fp','tp'].forEach(p=>g(p)?.classList.remove('open'));
  renderArchivePanel();
  refreshStorageQuotaStatus();
  syncSidePanelState();
}
