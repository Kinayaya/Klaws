(function(global){
  const DB_NAME = 'klaws_storage_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'kv';

  let dbPromise=null;
  const normalizeIdbError = err => err instanceof Error ? err : new Error(err==null?'indexedDB request failed':String(err));
  const openDb = () => {
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(normalizeIdbError(req.error));
    });
    return dbPromise;
  };

  const idbGet = async key => {
    const db=await openDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readonly');
      const store=tx.objectStore(STORE_NAME);
      const req=store.get(key);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(normalizeIdbError(req.error));
    });
  };

  const idbSet = async (key, value) => {
    const db=await openDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite');
      const store=tx.objectStore(STORE_NAME);
      const req=store.put(value,key);
      req.onsuccess=()=>resolve(true);
      req.onerror=()=>reject(normalizeIdbError(req.error));
    });
  };

  const isQuotaErr = err => {
    const name=err&&err.name?String(err.name):'';
    return name==='QuotaExceededError' || name==='NS_ERROR_DOM_QUOTA_REACHED';
  };

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    } catch(e) {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    const res=governedWrite({kind:'core',store:'localStorage',key,value,serializer:v=>JSON.stringify(v)});
    return !!res.ok;
  };

  const readJSONAsync = async (key, fallback) => {
    try{
      const data=await idbGet(key);
      return data===undefined?fallback:data;
    }catch(e){
      return fallback;
    }
  };

  const writeJSONAsync = async (key, value) => {
    const res=await governedWrite({kind:'core',store:'indexedDB',key,value});
    if(!res.ok) throw res.error;
  };

  const POLICY_WEIGHT={core:3,rebuildable:2,ephemeral:1};
  const estimateUsage = async () => {
    if(!navigator.storage||typeof navigator.storage.estimate!=='function') return {quota:0,usage:0,available:0,ratio:0};
    const est=await navigator.storage.estimate();
    const quota=Number(est&&est.quota)||0;
    const usage=Number(est&&est.usage)||0;
    const available=Math.max(0,quota-usage);
    return {quota,usage,available,ratio:quota?usage/quota:0};
  };
  const cleanupRebuildableCaches = async () => {
    if(typeof caches==='undefined'||!caches.keys) return {deleted:[],count:0};
    const names=await caches.keys();
    const deleted=[];
    await Promise.all(names.map(async name=>{
      const ok=await caches.delete(name);
      if(ok) deleted.push(name);
    }));
    return {deleted,count:deleted.length};
  };
  const enforceWritePolicy = async kind => {
    const usage=await estimateUsage();
    if(kind==='core') return {allow:true,usage};
    if(kind==='rebuildable'&&usage.ratio>=0.95){
      await cleanupRebuildableCaches();
      return {allow:false,usage,code:'REBUILDABLE_BLOCKED'};
    }
    if(kind==='ephemeral'&&usage.ratio>=0.9) return {allow:false,usage,code:'EPHEMERAL_BLOCKED'};
    return {allow:true,usage};
  };
  const makeStorageError=(code,message,meta={})=>({name:'StorageGovernedError',code,message,meta});
  const handleQuotaExceeded = async ctx => {
    if(ctx.kind!=='core') await cleanupRebuildableCaches();
    return makeStorageError('QUOTA_EXCEEDED','儲存空間不足，請清理快取後再試。',ctx);
  };
  const governedWrite = async ({kind='core',store='localStorage',key,value,serializer=null}) => {
    const policy=await enforceWritePolicy(kind);
    if(!policy.allow){
      return {ok:false,error:makeStorageError(policy.code,'目前儲存策略不允許此寫入。',{kind,store,key,usage:policy.usage}),hint:'storage_policy_blocked'};
    }
    try{
      if(store==='indexedDB'){
        await idbSet(key,value);
      }else if(store==='localStorage'){
        const payload=serializer?serializer(value):value;
        localStorage.setItem(key,payload);
      }
      return {ok:true};
    }catch(err){
      if(isQuotaErr(err)) return {ok:false,error:await handleQuotaExceeded({kind,store,key,cause:err}),hint:'quota_exceeded'};
      return {ok:false,error:makeStorageError('WRITE_FAILED','儲存失敗，請稍後再試。',{kind,store,key,cause:err}),hint:'write_failed'};
    }
  };
  const governedWriteLocal = (key,value,kind='core') => governedWrite({kind,store:'localStorage',key,value,serializer:v=>typeof v==='string'?v:JSON.stringify(v)});
  const governedRemoveLocal = async key => {
    try{ localStorage.removeItem(key); return {ok:true}; }
    catch(err){ return {ok:false,error:makeStorageError('REMOVE_FAILED','刪除失敗，請稍後再試。',{key,cause:err}),hint:'remove_failed'}; }
  };


  const createStoreAdapter = () => {
    const primaryStore={
      get: async (key,fallback=null)=> readJSONAsync(key,fallback),
      set: async (key,value,kind='core')=> {
        const res=await governedWrite({kind,store:'indexedDB',key,value});
        if(!res.ok) throw res.error;
      }
    };
    const fallbackStore={
      get: key => readJSON(key,null),
      set: (key,value,kind='core')=> governedWrite({kind,store:'localStorage',key,value,serializer:v=>JSON.stringify(v)}).then(res=>!!res.ok),
      remove: key => { governedRemoveLocal(key); }
    };
    const snapshotStore={...primaryStore};
    return { primaryStore, fallbackStore, snapshotStore, isQuotaErr };
  };

  global.KLawsStorage = { readJSON, writeJSON, readJSONAsync, writeJSONAsync, createStoreAdapter, estimateUsage, cleanupRebuildableCaches, enforceWritePolicy, handleQuotaExceeded, governedWrite, governedWriteLocal, governedRemoveLocal };
})(window);
