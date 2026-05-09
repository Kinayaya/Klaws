(function(global){
  function createDataStorageApi(deps){
    const migrations=global.KlawsDataMigrations;
    const shardApi=global.KlawsDataShards.createShardStorageApi(deps);
    const fallbackApi=global.KlawsDataFallback.createFallbackStorageApi(deps);
    return {
      ...shardApi,
      ...fallbackApi,
      backfillNoteUids:()=>migrations.backfillNoteUids(deps),
      migratePathOverridesIntoNotes:()=>migrations.migratePathOverridesIntoNotes(deps),
      detectIdentityDriftRisk:()=>migrations.detectIdentityDriftRisk(deps),
      clearLegacyDomainsFromNotes:()=>migrations.clearLegacyDomainsFromNotes(deps),
      migrateLegacyGroupPartData:()=>migrations.migrateLegacyGroupPartData(deps)
    };
  }
  const api={ createDataStorageApi };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  global.KlawsData=api;
})(typeof globalThis!=='undefined'?globalThis:window);
