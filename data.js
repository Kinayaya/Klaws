
function migratePathOverridesIntoNotes(){
  if(localStorage.getItem('klaws_path_override_migrated_v1')==='1') return false;
  const overrides=readJSON('klaws_note_paths_v1',{});
  if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)) return false;
  let changed=false;
  let migratedCount=0;
  [...notes,...mapRelays].forEach(n=>{
    const key=String(n&&n.id);
    if(!key) return;
    const ov=typeof overrides[key]==='string'?normalizePathText(overrides[key]):'';
    if(!ov) return;
    if((n.path||'')!==ov){
      n.path=ov;
      changed=true;
      migratedCount++;
    }
  });
  if(changed){
    localStorage.removeItem('klaws_note_paths_v1');
    localStorage.setItem('klaws_path_override_migrated_v1','1');
    showToast(`已完成舊路徑遷移：${migratedCount} 筆`);
    console.info('[path-migration] applied overrides',{migratedCount});
  }else{
    localStorage.setItem('klaws_path_override_migrated_v1','1');
  }
  return changed;
}

// ==================== 資料儲存 ====================
function migrateLegacyChapterSectionData(){
  let changed=false;
  const all=[...notes,...mapRelays];
  all.forEach(n=>{
    const legacyCh=Array.isArray(n.chapters)?n.chapters.filter(Boolean):((n.chapter)?[n.chapter]:[]);
    const legacySec=Array.isArray(n.sections)?n.sections.filter(Boolean):((n.section)?[n.section]:[]);
    if((legacyCh.length||legacySec.length)){
      const marker=`【舊章節資料】章: ${legacyCh.join(', ')||'無'}；節: ${legacySec.join(', ')||'無'}`;
      const body=safeStr(n.detail||n.body||'');
      if(!body.includes('【舊章節資料】')){
        n.detail=(safeStr(n.detail).trim()?`${safeStr(n.detail).trim()}\n\n${marker}`:marker);
        changed=true;
      }
    }
    if(n.chapter||n.section||(Array.isArray(n.chapters)&&n.chapters.length)||(Array.isArray(n.sections)&&n.sections.length)){
      n.chapter=''; n.section=''; n.chapters=[]; n.sections=[]; changed=true;
    }
  });
  if(Array.isArray(chapters)&&chapters.length){ chapters=[]; changed=true; }
  if(Array.isArray(sections)&&sections.length){ sections=[]; changed=true; }
  if(mapFilter&&typeof mapFilter==='object'&&(mapFilter.chapter!=='all'||mapFilter.section!=='all')){ mapFilter.chapter='all'; mapFilter.section='all'; changed=true; }
  return changed;
}

function loadData() {
  try {
    const d=readJSON(SKEY,null);
    if(d) {
      notes=mergeRelaysIntoNotes(Array.isArray(d.notes)?d.notes:DEFAULTS.notes.slice(),Array.isArray(d.mapRelays)?d.mapRelays:[]);
      mapRelays=[];
      links=Array.isArray(d.links)?d.links:DEFAULTS.links.slice();
      links=links.map(l=>({...l,rel:normalizeRelationType(l.rel),color:relationColor(l.rel),note:normalizeRelationNote(l.note)}));
      nid=Number.isFinite(d.nid)?d.nid:Math.max(10,[...notes].reduce((m,n)=>Math.max(m,n.id||0),0)+1);
      lid=Number.isFinite(d.lid)?d.lid:Math.max(10,links.reduce((m,l)=>Math.max(m,l.id||0),0)+1);
      types=Array.isArray(d.types)?d.types:DEFAULTS.types.slice();
      if(!types.some(t=>t.key==='diary')) types.push({key:'diary',label:'日記',color:'#D85A30'});
      subjects=Array.isArray(d.subjects)?d.subjects:DEFAULTS.subjects.slice();
      chapters=Array.isArray(d.chapters)?d.chapters:DEFAULTS.chapters.slice();
      sections=Array.isArray(d.sections)?d.sections:DEFAULTS.sections.slice();
      nodePos=(d.nodePos&&typeof d.nodePos==='object'&&!Array.isArray(d.nodePos))?d.nodePos:{};
      nodeSizes=(d.nodeSizes&&typeof d.nodeSizes==='object'&&!Array.isArray(d.nodeSizes))?d.nodeSizes:{};
      if(d.sortMode) sortMode=d.sortMode;
      mapCenterNodeId=d.mapCenterNodeId||null;
      mapCenterNodeIds=(d.mapCenterNodeIds&&typeof d.mapCenterNodeIds==='object'&&!Array.isArray(d.mapCenterNodeIds))?d.mapCenterNodeIds:{};
      if(d.mapFilter&&typeof d.mapFilter==='object') mapFilter={
        sub:typeof d.mapFilter.sub==='string'?d.mapFilter.sub:'all',
        chapter:typeof d.mapFilter.chapter==='string'?d.mapFilter.chapter:'all',
        section:typeof d.mapFilter.section==='string'?d.mapFilter.section:'all',
        q:typeof d.mapFilter.q==='string'?d.mapFilter.q:''
      };
      if(typeof d.mapLinkedOnly==='boolean') mapLinkedOnly=d.mapLinkedOnly;
      if(['all','1','2','3'].includes(d.mapDepth)) mapDepth=d.mapDepth;
      if(typeof d.mapFocusMode==='boolean') mapFocusMode=d.mapFocusMode;
      mapLaneConfigs=(d.mapLaneConfigs&&typeof d.mapLaneConfigs==='object'&&!Array.isArray(d.mapLaneConfigs))?d.mapLaneConfigs:{};
      const rawMapCollapsed=(d.mapCollapsed&&typeof d.mapCollapsed==='object'&&!Array.isArray(d.mapCollapsed))?d.mapCollapsed:{};
      mapCollapsed=normalizeMapCollapsed(rawMapCollapsed);
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
      achievements=(d.achievements&&typeof d.achievements==='object'&&!Array.isArray(d.achievements))?d.achievements:{points:0,taskCompletions:0,unlocked:{},lastUsageMinuteReward:0};
      levelSystem=(d.levelSystem&&typeof d.levelSystem==='object'&&!Array.isArray(d.levelSystem))?d.levelSystem:{skills:[],tasks:[],achievements:[],settings:{xpByDifficulty:{E:30,N:55,H:90},xpBoost150Applied:true}};
      normalizeLevelSystem();
      migrateLegacyAchievements();
      applySkillDecay();
      normalizeAchievements();
      calendarEvents=calendarEvents.map(ev=>({ ...ev, dueHour:Math.min(23,Math.max(0,parseInt(ev.dueHour,10)||9)), dueMinute:Math.min(59,Math.max(0,parseInt(ev.dueMinute,10)||0)) }));
      Object.keys(customFieldDefs).forEach(key=>{
        const item=customFieldDefs[key]||{};
        customFieldDefs[key]={key,label:item.label||key,kind:item.kind==='text'?'text':'textarea',placeholder:item.placeholder||''};
      });
      typeFieldConfigs=(d.typeFieldConfigs&&typeof d.typeFieldConfigs==='object'&&!Array.isArray(d.typeFieldConfigs))?d.typeFieldConfigs:{};
      types.forEach(t=>{ typeFieldConfigs[t.key]=getTypeFieldKeys(t.key); });
      let repaired=false,chapterMigrated=false,chapterSectionMigrated=false;
      if(JSON.stringify(rawMapCollapsed)!==JSON.stringify(mapCollapsed)) repaired=true;
      if(JSON.stringify(rawMapSubpages)!==JSON.stringify(mapSubpages)) repaired=true;
      if(rawMapPageNotes&&JSON.stringify(rawMapPageNotes)!==JSON.stringify(mapPageNotes)) repaired=true;
      types.forEach(t=>{if(/^tag_t_/.test(t.key)){let old=t.key;t.key=t.label;notes.forEach(n=>{if(n.type===old)n.type=t.label;});repaired=true;}});
      subjects.forEach(s=>{if(/^tag_s_/.test(s.key)){let old=s.key;s.key=s.label;allMapNodes().forEach(n=>{n.subjects=noteSubjects(n).map(x=>x===old?s.label:x);n.subject=n.subjects[0]||'';});repaired=true;}});
      allMapNodes().forEach(n=>{
        if(!noteChapters(n).length){
          const fromTag=noteTags(n).find(t=>chapters.some(c=>c.key===t&&(noteSubjects(n).includes(c.subject)||c.subject==='all')));
          n.chapters=fromTag?[fromTag]:[];
          n.chapter=n.chapters[0]||'';
          chapterMigrated=true;
        }
      });
      normalizeNotesTaxonomy();
      chapterSectionMigrated=migrateLegacyChapterSectionData();
      if(migratePathOverridesIntoNotes()) repaired=true;
      if(normalizeNoteIds(true)) repaired=true;
      if(repaired||chapterMigrated||chapterSectionMigrated){
        if(chapterSectionMigrated){
          const migratedNotes=[...notes,...mapRelays].filter(n=>safeStr(n.detail).includes('【舊章節資料】')).length;
          showToast(`章節已棄用，請使用路徑（已轉換 ${migratedNotes} 筆）`);
          console.info('[chapter-section-migration]',{migratedNotes});
        }
        saveData();
      }
      mapPageStack=normalizeMapPageStack(d.mapPageStack);
      applyPanelDir(d.panelDir||getPanelDir());
      lastSavedPayloadRaw=JSON.stringify(getPayload());
    } else {
      notes=DEFAULTS.notes.slice();mapRelays=[];links=DEFAULTS.links.slice();types=DEFAULTS.types.slice();subjects=DEFAULTS.subjects.slice();chapters=DEFAULTS.chapters.slice();sections=DEFAULTS.sections.slice();nodeSizes={};mapPageNotes={root:notes.map(n=>n.id)};typeFieldConfigs={};customFieldDefs={};calendarEvents=[];calendarSettings={emails:[]};achievements={points:0,taskCompletions:0,unlocked:{},lastUsageMinuteReward:0};levelSystem={skills:[],tasks:[],achievements:[],settings:{xpByDifficulty:{E:30,N:55,H:90},xpBoost150Applied:true}};types.forEach(t=>{typeFieldConfigs[t.key]=getTypeFieldKeys(t.key);});applyPanelDir(getPanelDir());saveData();
    }
  } catch(e) {
    notes=DEFAULTS.notes.slice();mapRelays=[];links=DEFAULTS.links.slice();types=DEFAULTS.types.slice();subjects=DEFAULTS.subjects.slice();chapters=DEFAULTS.chapters.slice();sections=DEFAULTS.sections.slice();nodeSizes={};mapPageNotes={root:notes.map(n=>n.id)};typeFieldConfigs={};customFieldDefs={};calendarEvents=[];calendarSettings={emails:[]};achievements={points:0,taskCompletions:0,unlocked:{},lastUsageMinuteReward:0};levelSystem={skills:[],tasks:[],achievements:[],settings:{xpByDifficulty:{E:30,N:55,H:90},xpBoost150Applied:true}};types.forEach(t=>{typeFieldConfigs[t.key]=getTypeFieldKeys(t.key);});applyPanelDir(getPanelDir());
  }
}
function saveData() {
  try {
    const nextRaw=JSON.stringify(getPayload());
    if(!isUndoApplying&&lastSavedPayloadRaw&&lastSavedPayloadRaw!==nextRaw) undoSnapshotRaw=lastSavedPayloadRaw;
    writeJSON(SKEY,getPayload());
    lastSavedPayloadRaw=nextRaw;
  } catch(e){}
}
function applySnapshotRaw(raw){
  if(!raw) return false;
  try{
    isUndoApplying=true;
    localStorage.setItem(SKEY,raw);
    loadData();
    rebuildUI();
    render();
    if(isMapOpen){buildMapFilters();forceLayout();drawMap();}
    return true;
  }catch(e){
    return false;
  }finally{
    isUndoApplying=false;
  }
}
function undoLastAction(){
  if(!undoSnapshotRaw){showToast('目前沒有可恢復的上一步');return;}
  const currentRaw=lastSavedPayloadRaw||localStorage.getItem(SKEY)||'';
  if(applySnapshotRaw(undoSnapshotRaw)){
    undoSnapshotRaw=currentRaw;
    showToast('已恢復上一步');
  }else showToast('恢復失敗');
}

// ==================== 匯入/匯出 ====================
function exportData() {
  const json=JSON.stringify({notes,mapRelays:[],links,nid,lid,types,subjects,chapters,sections,nodeSizes,mapCenterNodeId,mapCenterNodeIds,mapCollapsed,mapSubpages,mapPageNotes,exported:new Date().toISOString()},null,2);
  const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  const d=new Date();
  a.download=`法律筆記備份_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}.json`;
  a.href=url;a.click();URL.revokeObjectURL(url);showToast('已匯出！');
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
    `subjects: [${noteSubjects(n).join(', ')}]`,
    `chapters: [${noteChapters(n).join(', ')}]`,
    `sections: [${noteSections(n).join(', ')}]`,
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
        subjects:noteSubjects(n),
        chapters:noteChapters(n),
        sections:noteSections(n),
        tags:noteTags(n),
        date:n.date||''
      }
    };
  });
  const relayItems=mapRelays.map(n=>{
    const markdown=portableNoteMarkdown(n);
    return {
      id:n.id,
      title:safeStr(n.title),
      markdown,
      hash:portableTextHash(markdown),
      meta:{
        nodeKind:'relay',
        type:n.type||'',
        subjects:noteSubjects(n),
        chapters:noteChapters(n),
        sections:noteSections(n),
        tags:noteTags(n),
        date:n.date||''
      }
    };
  });
  const relationItems=links.map(l=>({id:l.id,from:l.from,to:l.to,type:normalizeRelationType(l.rel)}));
  const checksumSource=[
    ...noteItems.map(x=>x.hash),
    ...relayItems.map(x=>x.hash),
    ...relationItems.map(x=>`${x.from}->${x.to}`)
  ].join('|');
  return {
    schemaVersion:PORTABLE_EXPORT_SCHEMA_VERSION,
    exportedAt:new Date().toISOString(),
    sourceApp:'KLaws',
    taxonomy:{types,subjects,chapters,sections},
    notes:noteItems,
    relays:relayItems,
    relations:relationItems,
    manifest:{
      noteCount:noteItems.length,
      relayCount:relayItems.length,
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
  const report={errors:[],warnings:[],totalNotes:0,validNotes:0,totalRelays:0,validRelays:0,totalLinks:0,validLinks:0};
  let parsed=null;
  try{
    parsed=JSON.parse(rawText);
  }catch(e){
    report.errors.push('JSON 解析失敗，請確認檔案內容為有效 JSON');
    return {ok:false,report,data:null};
  }
  if(!parsed||typeof parsed!=='object'){
    report.errors.push('匯入資料格式錯誤：根節點必須為物件');
    return {ok:false,report,data:null};
  }
  const noteList=Array.isArray(parsed.notes)?parsed.notes:[];
  const relayList=Array.isArray(parsed.mapRelays)?parsed.mapRelays:[];
  if(!Array.isArray(parsed.notes)){
    report.errors.push('匯入資料缺少 notes 陣列');
    return {ok:false,report,data:null};
  }
  report.totalNotes=noteList.length;
  report.totalRelays=relayList.length;
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
  const normalizedRelays=[];
  relayList.forEach((item,idx)=>{
    if(!item||typeof item!=='object'){
      report.warnings.push(`第 ${idx+1} 筆 mapRelays 非物件，已略過`);
      return;
    }
    const backupType=safeStr(item&&item.noteTypeBackup)||safeStr(item&&item.type)||'article';
    const normalized=normalizeNoteSchema({...item,isRelay:false,noteTypeBackup:'',type:backupType});
    if(!safeStr(normalized.title).trim()&&!safeStr(normalized.body).trim()&&!safeStr(normalized.detail).trim()){
      report.warnings.push(`第 ${idx+1} 筆 mapRelays 沒有標題與內容，已略過`);
      return;
    }
    if(!Number.isFinite(Number(item.id))){
      report.warnings.push(`第 ${idx+1} 筆 mapRelays 缺少有效 id，匯入時將自動重編`);
    }
    normalizedRelays.push(normalized);
  });
  report.validRelays=normalizedRelays.length;
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
  if(report.validNotes===0&&report.validRelays===0){
    report.errors.push('匯入資料沒有可用的筆記內容');
    return {ok:false,report,data:null};
  }
  return {
    ok:true,
    report,
    data:{
      raw:parsed,
      notes:normalizedNotes,
      relays:normalizedRelays,
      links:normalizedLinks
    }
  };
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
      const importRelays=parsed.data.relays;
      const importLinks=parsed.data.links;
      if(parsed.report.warnings.length){
        console.warn('[importData warnings]',parsed.report.warnings);
      }
      if(confirm('確定 = 完整覆蓋（取代所有現有筆記，保留現有科目/章設定）\n取消 = 合併（只加入新筆記）')) {
        notes=mergeRelaysIntoNotes(importNotes,importRelays);
        links=importLinks;
        mapRelays=[];
        nodeSizes=d.nodeSizes||{};mapCenterNodeId=d.mapCenterNodeId||null;mapCenterNodeIds=(d.mapCenterNodeIds&&typeof d.mapCenterNodeIds==='object')?d.mapCenterNodeIds:{};mapCollapsed=(d.mapCollapsed&&typeof d.mapCollapsed==='object')?d.mapCollapsed:{};
        mapSubpages=(d.mapSubpages&&typeof d.mapSubpages==='object')?d.mapSubpages:{};
        mapPageNotes=(d.mapPageNotes&&typeof d.mapPageNotes==='object')?normalizeMapPageNotes(d.mapPageNotes):{root:notes.map(n=>n.id)};
        nid=d.nid||Math.max([...notes,...mapRelays].reduce((m,n)=>Math.max(m,n.id||0),0)+1,10);lid=d.lid||10;notes.sort((a,b)=>b.id-a.id);
        normalizeNoteIds(true);
        saveData();rebuildUI();render();showToast(`已覆蓋，共 ${notes.length} 筆筆記`);
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
        importRelays.forEach(r=>{
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
            const rel='cause';
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
        notes.sort((a,b)=>b.id-a.id);normalizeNoteIds(true);saveData();rebuildUI();render();
        const skipped=Math.max(0,(parsed.report.totalNotes+parsed.report.totalRelays)-added);
        showToast(`已合併，新增 ${added} 筆${skipped?`，略過 ${skipped} 筆`:''}`);
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
  const raw=readJSON(ARCHIVES_KEY,[]);
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

function saveArchives(arr){
  const next=(Array.isArray(arr)?arr:[])
    .map(normalizeArchiveRecord)
    .filter(Boolean)
    .slice(0,ARCHIVE_SNAPSHOT_LIMIT);
  try{
    writeJSON(ARCHIVES_KEY,next);
    return {ok:true, kept:next.length, trimmed:0};
  }catch(err){
    const quotaExceeded=!!(err&&(
      err.name==='QuotaExceededError'||
      err.name==='NS_ERROR_DOM_QUOTA_REACHED'||
      err.code===22||err.code===1014
    ));
    if(!quotaExceeded){
      return {ok:false, reason:'unknown', error:err, kept:0, trimmed:0};
    }
    const trimmed=next.slice();
    while(trimmed.length>1){
      trimmed.pop();
      try{
        writeJSON(ARCHIVES_KEY,trimmed);
        return {ok:true, kept:trimmed.length, trimmed:next.length-trimmed.length, quotaRecovered:true};
      }catch(innerErr){
        const stillQuota=!!(innerErr&&(
          innerErr.name==='QuotaExceededError'||
          innerErr.name==='NS_ERROR_DOM_QUOTA_REACHED'||
          innerErr.code===22||innerErr.code===1014
        ));
        if(!stillQuota){
          return {ok:false, reason:'unknown', error:innerErr, kept:0, trimmed:0};
        }
      }
    }
    return {ok:false, reason:'quota', kept:0, trimmed:next.length};
  }
}
function loadRecycleBin(){
  const arr=readJSON(RECYCLE_BIN_KEY,[]);
  recycleBin=Array.isArray(arr)?arr:[];
}
function saveRecycleBin(){
  writeJSON(RECYCLE_BIN_KEY,recycleBin);
}
function purgeRecycleBin(){
  const now=Date.now();
  const before=recycleBin.length;
  recycleBin=recycleBin.filter(item=>now-Date.parse(item.deletedAt||0)<RECYCLE_RETENTION_MS);
  if(before!==recycleBin.length) saveRecycleBin();
}
function normalizeNotesTaxonomy(){
  const tSet=new Set(types.map(t=>t.key));
  const sSet=new Set(subjects.map(s=>s.key));
  const cSet=new Set(chapters.map(c=>c.key));
  const secSet=new Set(sections.map(s=>s.key));
  const chapterByKeyMap={};
  chapters.forEach(ch=>{ if(ch&&ch.key) chapterByKeyMap[ch.key]=ch; });
  const sectionByKeyMap={};
  sections.forEach(sec=>{ if(sec&&sec.key) sectionByKeyMap[sec.key]=sec; });
  const normalizeSingleNote=n=>{
    if(!tSet.has(n.type)) n.type='';
    let subjectsList=noteSubjects(n).filter(k=>sSet.has(k));
    let chaptersList=noteChapters(n).filter(k=>cSet.has(k));
    let sectionsList=noteSections(n).filter(k=>secSet.has(k));

    sectionsList.forEach(secKey=>{
      const sec=sectionByKeyMap[secKey];
      if(!sec||!sec.chapter||sec.chapter==='all') return;
      if(!chaptersList.includes(sec.chapter)&&cSet.has(sec.chapter)) chaptersList.push(sec.chapter);
    });

    chaptersList=uniq(chaptersList.filter(chKey=>{
      const ch=chapterByKeyMap[chKey];
      if(!ch) return false;
      if(!subjectsList.length) return true;
      return ch.subject==='all'||subjectsList.includes(ch.subject);
    }));

    const derivedSubjects=chaptersList
      .map(chKey=>chapterByKeyMap[chKey]?.subject)
      .filter(subjectKey=>subjectKey&&subjectKey!=='all'&&sSet.has(subjectKey));
    if(derivedSubjects.length) subjectsList=uniq([...subjectsList,...derivedSubjects]);
    subjectsList=uniq(subjectsList.filter(k=>sSet.has(k)));

    const chapterSet=new Set(chaptersList);
    sectionsList=uniq(sectionsList.filter(secKey=>{
      const sec=sectionByKeyMap[secKey];
      if(!sec) return false;
      return sec.chapter==='all'||chapterSet.has(sec.chapter);
    }));

    n.subjects=subjectsList;
    n.subject=subjectsList[0]||'';
    n.chapters=chaptersList;
    n.chapter=chaptersList[0]||'';
    n.sections=sectionsList;
    n.section=sectionsList[0]||'';
  };
  notes.forEach(normalizeSingleNote);
  mapRelays.forEach(normalizeSingleNote);
}
function createArchiveSnapshot(){
  const name=(prompt('請輸入存檔名稱：',`存檔 ${new Date().toLocaleString('zh-TW')}`)||'').trim();
  if(!name){showToast('存檔名稱不可空白');return;}
  const archives=loadArchives();
  const payload=getPayload();
  const archivePayload={...payload,nodePos:{}};
  archives.unshift({
    id:`${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    createdAt:new Date().toISOString(),
    payload:archivePayload
  });
  const saved=saveArchives(archives);
  if(!saved?.ok){
    showToast('存檔失敗：裝置儲存空間不足。請先刪除舊存檔，或使用「下載備份」。');
    return;
  }
  renderArchivePanel();
  if(saved.trimmed>0){
    showToast(`已儲存存檔（空間不足，已自動移除最舊 ${saved.trimmed} 筆）`);
    return;
  }
  showToast('已儲存存檔');
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
  if(googleSyncBusy){
    el.textContent='雲端同步：處理中...';
    return;
  }
  const loggedIn=!!googleAccessToken&&Date.now()<googleTokenExpireAt;
  const reason=safeStr(extra||googleSyncLastError||'').trim();
  const suffix=reason?`（${reason}）`:'';
  el.textContent=loggedIn?`雲端同步：已登入${suffix}`:`雲端同步：未登入${suffix}`;
}
function cloudSyncErrorText(err){
  const msg=safeStr(err&&err.message||err||'').trim();
  if(!msg) return '未知錯誤';
  if(msg.includes('popup_closed')) return '登入視窗被關閉';
  if(msg.includes('popup_failed_to_open')) return '無法開啟 Google 登入視窗';
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
function askGoogleDriveClientId(){
  const current=getGoogleDriveClientId();
  const next=(prompt('請輸入 Google OAuth Client ID（Web Application）',current)||'').trim();
  if(!next) return '';
  localStorage.setItem(GOOGLE_DRIVE_CLIENT_ID_KEY,next);
  return next;
}
async function ensureGoogleAccessToken(forcePrompt=false){
  ensureCloudRuntimeSupported();
  const now=Date.now();
  if(googleAccessToken&&now<googleTokenExpireAt-5000) return googleAccessToken;
  const ready=await ensureGoogleIdentityClient();
  if(!ready){showToast('Google SDK 載入失敗');return '';}
  let clientId=getGoogleDriveClientId();
  if(!clientId) clientId=askGoogleDriveClientId();
  if(!clientId){showToast('未設定 Google Client ID');return '';}
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
        updateCloudSyncStatus();
      }else{
        logCloudSync('warn','token callback without access_token',resp||'');
      }
      settled=true;
      resolve('');
    };
    tokenClient.error_callback=err=>{
      if(!settled){
        googleSyncLastError=cloudSyncErrorText(err);
        logCloudSync('error','token error callback:',err);
        updateCloudSyncStatus();
        resolve('');
      }
    };
    logCloudSync('info','requestAccessToken', { prompt: promptValue||'(silent)' });
    tokenClient.requestAccessToken({prompt:promptValue,hint:''});
  });
  if(forcePrompt) return await requestToken('consent');
  const silentToken=await requestToken('');
  if(silentToken) return silentToken;
  return await requestToken('consent');
}
async function driveApiRequest(path,opt={}){
  logCloudSync('info','Drive request',opt.method||'GET',path);
  const token=await ensureGoogleAccessToken(false);
  if(!token) throw new Error(googleSyncLastError||'no token');
  let res=null;
  try{
    res=await fetch(`https://www.googleapis.com/drive/v3/${path}`,{
      method:opt.method||'GET',
      headers:{
        Authorization:`Bearer ${token}`,
        ...(opt.headers||{})
      },
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
  const token=await ensureGoogleAccessToken(false);
  if(!token) throw new Error(googleSyncLastError||'no token');
  let res=null;
  try{
    res=await fetch(baseUrl,{
      method:fileId?'PATCH':'POST',
      headers:{
        Authorization:`Bearer ${token}`,
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
  const token=await ensureGoogleAccessToken(false);
  if(!token) throw new Error(googleSyncLastError||'no token');
  let res=null;
  try{
    res=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,{
      headers:{Authorization:`Bearer ${token}`}
    });
  }catch(fetchErr){
    throw new Error(`Download fetch failed: ${cloudSyncErrorText(fetchErr)} / ${cloudSyncErrorDetail(fetchErr)}`);
  }
  if(!res.ok){
    const txt=await res.text().catch(()=>'');
    throw new Error(`Download failed: ${res.status}${txt?` ${txt}`:''}`);
  }
  return await res.json();
}
async function cloudSyncPullLatest(opts={}){
  const {silent=false}=opts||{};
  try{
    logCloudSync('info','pull start', { silent });
    googleSyncBusy=true;updateCloudSyncStatus();
    const remote=await downloadPayloadFromDrive();
    if(!remote){ if(!silent) showToast('雲端沒有可下載資料'); return false; }
    const localPayload=getPayload();
    const remoteUpdatedAt=parseUpdatedAt(remote.updatedAt||'');
    const localUpdatedAt=parseUpdatedAt(localPayload.updatedAt||'');
    if(remoteUpdatedAt<localUpdatedAt&&!silent){
      if(!confirm('雲端資料比本機舊，仍要覆蓋本機嗎？')) return false;
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
  const {silent=false}=opts||{};
  try{
    logCloudSync('info','push start', { silent });
    googleSyncBusy=true;updateCloudSyncStatus();
    const payload=getPayload();
    payload.updatedAt=new Date().toISOString();
    await uploadPayloadToDrive(payload);
    googleSyncLastError='';
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
  const token=await ensureGoogleAccessToken(false);
  if(!token) return false;
  const pulled=await cloudSyncPullLatest({silent:true});
  if(pulled){
    showToast('已登入並自動載入最新雲端紀錄');
  }else{
    showToast('已登入 Google 雲端');
  }
  return true;
}
function logoutGoogleDriveSync(){
  googleAccessToken='';
  googleTokenExpireAt=0;
  googleSyncLastError='';
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
  syncSidePanelState();
}
