(function(global){

  function backfillNoteUids(ctx){
    const { notesRef, mapAuxNodesRef, ensureNoteUid } = ctx;
    if(typeof ensureNoteUid!=='function') return false;
    let changed=false;
    [...notesRef.value,...mapAuxNodesRef.value].forEach(n=>{
      if(!n||typeof n!=='object') return;
      const nextUid=ensureNoteUid(n);
      if(n.uid!==nextUid){ n.uid=nextUid; changed=true; }
    });
    return changed;
  }

  function migratePathOverridesIntoNotes(ctx){
    const { localStorage, readJSON, notesRef, mapAuxNodesRef, normalizePathText, removeLocal, writeLocal, showToast } = ctx;
    if(localStorage.getItem('klaws_path_override_migrated_v1')==='1') return false;
    const overrides=readJSON('klaws_note_paths_v1',{});
    if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)) return false;
    let changed=false; let migratedCount=0;
    [...notesRef.value,...mapAuxNodesRef.value].forEach(n=>{
      const uidKey=String(n&&n.uid||'').trim();
      const idKey=String(n&&n.id);
      const raw=(uidKey&&typeof overrides[uidKey]==='string')?overrides[uidKey]:(typeof overrides[idKey]==='string'?overrides[idKey]:'');
      const ov=raw?normalizePathText(raw):'';
      if(!ov) return;
      if((n.path||'')!==ov){ n.path=ov; changed=true; migratedCount++; }
    });
    writeLocal('klaws_path_override_migrated_v1','1');
    if(changed){
      removeLocal('klaws_note_paths_v1');
      showToast(`已完成舊路徑遷移：${migratedCount} 筆`);
      console.info('[path-migration] applied overrides',{migratedCount});
    }
    return changed;
  }

  function clearLegacyDomainsFromNotes(ctx){
    const { notesRef, mapAuxNodesRef, safeStr, domainsRef, mapFilterRef } = ctx;
    let changed=false;
    [...notesRef.value,...mapAuxNodesRef.value].forEach(n=>{ const hadDomain=safeStr(n.domain).trim().length>0; const hadDomains=Array.isArray(n.domains)&&n.domains.length>0; if(hadDomain||hadDomains){ n.domain=''; n.domains=[]; changed=true; } });
    if(Array.isArray(domainsRef.value)&&domainsRef.value.length){ domainsRef.value=[]; changed=true; }
    if(mapFilterRef.value&&typeof mapFilterRef.value==='object'&&mapFilterRef.value.sub!=='all'){ mapFilterRef.value.sub='all'; changed=true; }
    return changed;
  }

  function migrateLegacyGroupPartData(ctx){
    const { notesRef, mapAuxNodesRef, groupsRef, partsRef, mapFilterRef, safeStr } = ctx;
    let changed=false;
    [...notesRef.value,...mapAuxNodesRef.value].forEach(n=>{
      const legacyCh=Array.isArray(n.groups)?n.groups.filter(Boolean):((n.group)?[n.group]:[]);
      const legacySec=Array.isArray(n.parts)?n.parts.filter(Boolean):((n.part)?[n.part]:[]);
      if(legacyCh.length||legacySec.length){
        const marker=`【舊資料】: ${legacyCh.join(', ')||'無'}；: ${legacySec.join(', ')||'無'}`;
        const body=safeStr(n.detail||n.body||'');
        if(!body.includes('【舊資料】')){ n.detail=(safeStr(n.detail).trim()?`${safeStr(n.detail).trim()}\n\n${marker}`:marker); changed=true; }
      }
      if(n.group||n.part||(Array.isArray(n.groups)&&n.groups.length)||(Array.isArray(n.parts)&&n.parts.length)){ n.group=''; n.part=''; n.groups=[]; n.parts=[]; changed=true; }
    });
    if(Array.isArray(groupsRef.value)&&groupsRef.value.length){ groupsRef.value=[]; changed=true; }
    if(Array.isArray(partsRef.value)&&partsRef.value.length){ partsRef.value=[]; changed=true; }
    if(mapFilterRef.value&&typeof mapFilterRef.value==='object'&&(mapFilterRef.value.group!=='all'||mapFilterRef.value.part!=='all')){ mapFilterRef.value.group='all'; mapFilterRef.value.part='all'; changed=true; }
    return changed;
  }

  const api={ backfillNoteUids, migratePathOverridesIntoNotes, clearLegacyDomainsFromNotes, migrateLegacyGroupPartData };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  global.KlawsDataMigrations=api;
})(typeof globalThis!=='undefined'?globalThis:window);
