(function(global){
  const LOCAL_FALLBACK_PREFIX='klaws_payload_backup_v1';
  const FALLBACK_META_VERSION = 1;
  const FALLBACK_META_MIGRATION_KEY = 'klaws_fallback_meta_migration_v1';
  const FALLBACK_IDB_META_KEY = 'klaws_fallback_meta_idb_v1';
  const FALLBACK_WRITE_INTERVAL_MS = 5*60*1000;
  function createFallbackStorageApi({ location, localStorage, storageAdapter, readJSON, buildNow=()=>Date.now(), writeLocal, removeLocal }){
    let lastFallbackWriteAt=0; let idbHealthDegraded=false;
    const fallbackStorageKey=()=>`${LOCAL_FALLBACK_PREFIX}::${(location&&location.host)?location.host:'unknown-host'}`;
    async function readFallbackPayload(){ const k=fallbackStorageKey(); try{ const m=await storageAdapter.primaryStore.get(FALLBACK_IDB_META_KEY,null); const p=m&&m[k]; if(p&&typeof p==='object'&&!Array.isArray(p)) return p; }catch(e){} return readJSON(k,null); }
    function buildFallbackMeta({idbFailed=false,lastSaveAt=buildNow()}={}){ return {version:FALLBACK_META_VERSION,lastSaveAt,idbFailed:Boolean(idbFailed),requiresManualRestore:Boolean(idbFailed)}; }
    async function writeLocalFallbackPayload(meta,force=false){ const now=buildNow(); if(!force&&(now-lastFallbackWriteAt)<FALLBACK_WRITE_INTERVAL_MS&&!idbHealthDegraded) return false; const k=fallbackStorageKey(); const payload=(meta&&typeof meta==='object'&&!Array.isArray(meta))?meta:buildFallbackMeta(); try{ const m=await storageAdapter.primaryStore.get(FALLBACK_IDB_META_KEY,{}); const n=(m&&typeof m==='object'&&!Array.isArray(m))?{...m}:{}; n[k]=payload; await storageAdapter.primaryStore.set(FALLBACK_IDB_META_KEY,n); try{ await storageAdapter.fallbackStore.remove(k);}catch(e){} lastFallbackWriteAt=now; return true;}catch(e){ try{ const ok=await storageAdapter.fallbackStore.set(k,payload); if(ok) lastFallbackWriteAt=now; return ok;}catch(_e){return false;} } }
    async function migrateLegacyLocalFallbackToIdb(){ if(localStorage.getItem(FALLBACK_META_MIGRATION_KEY)==='1') return; const k=fallbackStorageKey(); const legacy=readJSON(k,null); if(!legacy||typeof legacy!=='object'||Array.isArray(legacy)){ writeLocal(FALLBACK_META_MIGRATION_KEY,'1'); return; } try{ const m=await storageAdapter.primaryStore.get(FALLBACK_IDB_META_KEY,{}); const n=(m&&typeof m==='object'&&!Array.isArray(m))?{...m}:{}; n[k]=legacy; await storageAdapter.primaryStore.set(FALLBACK_IDB_META_KEY,n); await storageAdapter.fallbackStore.remove(k); writeLocal(FALLBACK_META_MIGRATION_KEY,'1'); }catch(e){} }
    function clearLegacyLocalFallbackKeys(){ if(localStorage.getItem(FALLBACK_META_MIGRATION_KEY)==='1') return; try{ const stale=[]; const current=fallbackStorageKey(); for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(typeof k==='string'&&k.startsWith(`${LOCAL_FALLBACK_PREFIX}::`)&&k!==current) stale.push(k);} stale.forEach(removeLocal); writeLocal(FALLBACK_META_MIGRATION_KEY,'1'); }catch(e){} }
    return { readFallbackPayload, buildFallbackMeta, writeLocalFallbackPayload, migrateLegacyLocalFallbackToIdb, clearLegacyLocalFallbackKeys, constants:{FALLBACK_IDB_META_KEY,FALLBACK_META_MIGRATION_KEY} };
  }
  const api={ createFallbackStorageApi };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  global.KlawsDataFallback=api;
})(typeof globalThis!=='undefined'?globalThis:window);
