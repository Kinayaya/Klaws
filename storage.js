(function(global){
  const DB_NAME = 'klaws_storage_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'kv';

  let dbPromise=null;
  const openDb = () => {
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
      req.onerror=()=>reject(req.error);
    });
  };

  const idbSet = async (key, value) => {
    const db=await openDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite');
      const store=tx.objectStore(STORE_NAME);
      const req=store.put(value,key);
      req.onsuccess=()=>resolve(true);
      req.onerror=()=>reject(req.error);
    });
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
    localStorage.setItem(key, JSON.stringify(value));
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
    await idbSet(key, value);
  };

  global.KLawsStorage = { readJSON, writeJSON, readJSONAsync, writeJSONAsync };
})(window);
