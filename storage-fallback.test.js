const test=require('node:test');
const assert=require('node:assert/strict');
const { createFallbackStorageApi }=require('./data/fallback.js');

function createMemoryLocalStorage(initial={}){
  const map=new Map(Object.entries(initial));
  return {
    getItem(k){ return map.has(k)?map.get(k):null; },
    setItem(k,v){ map.set(k,String(v)); },
    removeItem(k){ map.delete(k); },
    key(i){ return Array.from(map.keys())[i]??null; },
    get length(){ return map.size; }
  };
}

test('writeLocalFallbackPayload falls back to local store when IDB write fails', async ()=>{
  const idb=new Map();
  const local=new Map();
  const storageAdapter={
    primaryStore:{
      get:async()=>{ throw new Error('idb unavailable'); },
      set:async()=>{ throw new Error('idb unavailable'); }
    },
    fallbackStore:{
      set:async(k,v)=>{ local.set(k,v); return true; },
      remove:async(k)=>local.delete(k)
    }
  };
  const api=createFallbackStorageApi({
    location:{host:'klaws.test'},
    localStorage:createMemoryLocalStorage(),
    storageAdapter,
    readJSON:(k,d)=>local.has(k)?local.get(k):d,
    buildNow:()=>123,
    writeLocal:()=>{},
    removeLocal:()=>{}
  });

  const written=await api.writeLocalFallbackPayload(api.buildFallbackMeta({idbFailed:true}),true);
  assert.equal(written,true);
  assert.deepEqual(local.get('klaws_payload_backup_v1::klaws.test'),{
    version:1,
    lastSaveAt:123,
    idbFailed:true,
    requiresManualRestore:true
  });
  const payload=await api.readFallbackPayload();
  assert.equal(payload.idbFailed,true);
});

test('migrateLegacyLocalFallbackToIdb restores legacy local payload into IDB metadata', async ()=>{
  const idb=new Map();
  const localStorage=createMemoryLocalStorage();
  const legacyPayload={version:1,lastSaveAt:456,idbFailed:false,requiresManualRestore:false};
  const legacyKey='klaws_payload_backup_v1::example.com';

  const api=createFallbackStorageApi({
    location:{host:'example.com'},
    localStorage,
    storageAdapter:{
      primaryStore:{
        get:async(k,d)=>idb.has(k)?idb.get(k):d,
        set:async(k,v)=>{ idb.set(k,v); }
      },
      fallbackStore:{
        set:async()=>true,
        remove:async()=>{ localStorage.removeItem(legacyKey); }
      }
    },
    readJSON:(k,d)=>k===legacyKey?legacyPayload:d,
    buildNow:()=>999,
    writeLocal:(k,v)=>localStorage.setItem(k,v),
    removeLocal:(k)=>localStorage.removeItem(k)
  });

  await api.migrateLegacyLocalFallbackToIdb();
  const meta=idb.get(api.constants.FALLBACK_IDB_META_KEY);
  assert.deepEqual(meta[legacyKey],legacyPayload);
  assert.equal(localStorage.getItem(api.constants.FALLBACK_META_MIGRATION_KEY),'1');
});
