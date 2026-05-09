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
      const payload={};
      for(const n of shardNames){
        const part=await readJSONAsync(key(n),null); if(!part||typeof part!=='object'||Array.isArray(part)) return null;
        if(checksum(JSON.stringify(part))!==meta.checksumByShard[n]) return null;
        Object.assign(payload,part);
      }
      return payload;
    }
    async function writeShardedPayloadParts(payload,options={}){
      const expectedRev=Number.isFinite(options.expectedRev)?options.expectedRev:null;
      const incomingRev=Number.isFinite(payload&&payload.rev)?payload.rev:null;
      if(expectedRev!==null||incomingRev!==null){
        const currentMeta=await readJSONAsync(metaKey(),null);
        const currentRev=Number.isFinite(currentMeta&&currentMeta.rev)?currentMeta.rev:null;
        if(expectedRev!==null&&currentRev!==null&&currentRev!==expectedRev){
          const err=new Error('Shard payload compare-and-set failed (expected rev mismatch)');
          err.code='REV_MISMATCH';
          err.currentRev=currentRev;
          err.expectedRev=expectedRev;
          throw err;
        }
        if(incomingRev!==null&&currentRev!==null&&incomingRev<currentRev){
          const err=new Error('Shard payload compare-and-set failed (stale rev)');
          err.code='REV_STALE';
          err.currentRev=currentRev;
          err.incomingRev=incomingRev;
          throw err;
        }
      }
      const next=buildMap(payload); const prev=(global.__klawsLastSavedShards&&typeof global.__klawsLastSavedShards==='object')?global.__klawsLastSavedShards:{};
      const writes=[]; const checksumByShard={};
      names.forEach(n=>{ const raw=JSON.stringify(next[n]); checksumByShard[n]=checksum(raw); if(raw===JSON.stringify(prev[n])) return; writes.push(storageAdapter.primaryStore.set(key(n),next[n])); });
      writes.push(storageAdapter.primaryStore.set(metaKey(),{version:2,shards:names,checksumByShard,updatedAt:new Date().toISOString(),rev:incomingRev}));
      await Promise.all(writes); global.__klawsLastSavedShards=next;
    }
    return { readShardedPayload, writeShardedPayloadParts };
  }
  const api={ createShardStorageApi };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  global.KlawsDataShards=api;
})(typeof globalThis!=='undefined'?globalThis:window);
