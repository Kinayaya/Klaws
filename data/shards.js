(function(global){
  const DATA_SHARD_SUFFIX='__parts_v1';
  function createShardStorageApi({ SKEY, storageAdapter, readJSONAsync }){
    const DATA_SHARD_KEY_PREFIX=`${SKEY}${DATA_SHARD_SUFFIX}`;
    const DATA_SHARD_KEYS={notes:'notes',links:'links',taxonomy:'taxonomy',layout:'layout',uiState:'uiState',mapState:'mapState',calendar:'calendar',level:'level'};
    const DATA_SHARD_GETTERS={
      [DATA_SHARD_KEYS.notes]:p=>({notes:p.notes,mapAuxNodes:p.mapAuxNodes,nid:p.nid}),
      [DATA_SHARD_KEYS.links]:p=>({links:p.links,lid:p.lid}),
      [DATA_SHARD_KEYS.taxonomy]:p=>({types:p.types,domains:p.domains,groups:p.groups,parts:p.parts,typeFieldConfigs:p.typeFieldConfigs,customFieldDefs:p.customFieldDefs}),
      [DATA_SHARD_KEYS.layout]:p=>({nodePos:p.nodePos,nodeSizes:p.nodeSizes}),
      [DATA_SHARD_KEYS.uiState]:p=>({sortMode:p.sortMode,panelDir:p.panelDir}),
      [DATA_SHARD_KEYS.mapState]:p=>({mapCenterNodeId:p.mapCenterNodeId,mapCenterNodeIds:p.mapCenterNodeIds,mapFilter:p.mapFilter,mapLinkedOnly:p.mapLinkedOnly,mapDepth:p.mapDepth,mapFocusMode:p.mapFocusMode,mapLaneConfigs:p.mapLaneConfigs,mapCollapsed:p.mapCollapsed,mapSubpages:p.mapSubpages,mapPageNotes:p.mapPageNotes,mapPageStack:p.mapPageStack}),
      [DATA_SHARD_KEYS.calendar]:p=>({calendarEvents:p.calendarEvents,calendarSettings:p.calendarSettings}),
      [DATA_SHARD_KEYS.level]:p=>({levelSystem:p.levelSystem})
    };
    const names=Object.values(DATA_SHARD_KEYS);
    const key=n=>`${DATA_SHARD_KEY_PREFIX}::${n}`; const metaKey=()=>`${DATA_SHARD_KEY_PREFIX}::meta`;
    const checksum=s=>{ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h.toString(16); };
    const buildMap=p=>names.reduce((a,n)=>{a[n]=DATA_SHARD_GETTERS[n](p); return a;},{});
    async function readShardedPayload(){
      const meta=await readJSONAsync(metaKey(),null);
      const shardNames=Array.isArray(meta&&meta.shards)?meta.shards.filter(n=>DATA_SHARD_GETTERS[n]):[];
      if(!shardNames.length||!meta.version||!meta.checksumByShard) return null;
      if(meta.pending){
        const pendingAt=Date.parse(meta.pendingAt||meta.updatedAt||'')||0;
        if(!pendingAt||Date.now()-pendingAt<15000) return null;
      }
      const payload={};
      for(const n of shardNames){
        const part=await readJSONAsync(key(n),null); if(!part||typeof part!=='object'||Array.isArray(part)) return null;
        if(checksum(JSON.stringify(part))!==meta.checksumByShard[n]) return null;
        Object.assign(payload,part);
      }
      if(meta.updatedAt&&!payload.updatedAt) payload.updatedAt=meta.updatedAt;
      if(meta.rev&&!payload.rev) payload.rev=meta.rev;
      return payload;
    }
    const parseRev=v=>Number.isFinite(Number(v))?Number(v):0;
    async function readShardedMeta(){
      return await readJSONAsync(metaKey(),null);
    }
    async function writeShardedPayloadParts(payload,options={}){
      const incomingRev=parseRev(payload&&payload.rev);
      const meta=await readShardedMeta();
      const currentRev=parseRev(meta&&meta.rev);
      if(options.compareAndSet!==false&&currentRev&&incomingRev&&incomingRev<=currentRev){
        const err=new Error('REVISION_CONFLICT');
        err.code='REVISION_CONFLICT';
        err.currentRev=currentRev;
        err.incomingRev=incomingRev;
        throw err;
      }
      const next=buildMap(payload); const prev=(global.__klawsLastSavedShards&&typeof global.__klawsLastSavedShards==='object')?global.__klawsLastSavedShards:{};
      const writes=[]; const checksumByShard={};
      names.forEach(n=>{ const raw=JSON.stringify(next[n]); checksumByShard[n]=checksum(raw); if(raw===JSON.stringify(prev[n])) return; writes.push({key:key(n),value:next[n]}); });
      const writerId=(global.__klawsShardWriterId||(global.__klawsShardWriterId=`w_${Math.random().toString(36).slice(2,8)}`));
      const writeToken=`t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
      const pendingMeta={version:3,pending:true,pendingAt:new Date().toISOString(),writerId,writeToken,shards:names,checksumByShard,updatedAt:new Date().toISOString(),rev:incomingRev||Date.now()};
      await storageAdapter.primaryStore.set(metaKey(),pendingMeta);
      if(storageAdapter.primaryStore&&typeof storageAdapter.primaryStore.setMany==='function') await storageAdapter.primaryStore.setMany(writes);
      else await Promise.all(writes.map(w=>storageAdapter.primaryStore.set(w.key,w.value)));
      const latestMeta=await readShardedMeta();
      if(!latestMeta||latestMeta.writeToken!==writeToken){
        const err=new Error('SHARD_WRITE_TOKEN_MISMATCH');
        err.code='SHARD_WRITE_TOKEN_MISMATCH';
        throw err;
      }
      await storageAdapter.primaryStore.set(metaKey(),{...pendingMeta,pending:false,pendingAt:null});
      global.__klawsLastSavedShards=next;
    }
    return { readShardedPayload, writeShardedPayloadParts, readShardedMeta };
  }
  const api={ createShardStorageApi };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  global.KlawsDataShards=api;
})(typeof globalThis!=='undefined'?globalThis:window);
