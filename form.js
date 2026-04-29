// ==================== 表單 ====================

function resolveInheritedPath(inputPath=''){
  const raw=resolvePathInput(inputPath||'');
  if(raw) return raw;
  const rootId=currentSubpageRootId();
  if(!rootId) return '';
  const parent=mapNodeById(rootId);
  return resolvePathInput(parent?.path||'');
}
function syncFormModeVisibility(){
  const isAssign=formMode==='mapAssign';
  const isPathEditable=editMode&&!isAssign;
  const setDisplay=(id,v)=>{const el=g(id);if(el)el.style.display=v;};
  setDisplay('mapAssignFormWrap',isAssign?'block':'none');
  setDisplay('dynamicFieldWrap',isAssign?'none':'block');
  setDisplay('form-links-wrap',isAssign?'none':'block');
  setDisplay('fpath-row',isPathEditable?'block':'none');
  setDisplay('fti',isAssign?'none':'block');
  const titleLbl=document.querySelector('label[for="fti"]')||Array.from(document.querySelectorAll('#fp .flbl')).find(el=>el.textContent.trim()==='標題');
  if(titleLbl) titleLbl.style.display=isAssign?'none':'block';
  const saveBtn=g('fpSave');
  if(saveBtn) saveBtn.textContent=isAssign?'加入頁面':'儲存';
}
function openForm(isEdit) {
  editMode=isEdit; buildFormSelects();
  if(formMode==='mapAssign'){
    g('form-title').textContent='加入筆記到頁面';
    syncFormModeVisibility();
    g('fp').classList.add('open');['dp','tp'].forEach(p=>g(p).classList.remove('open'));
    syncSidePanelState();
    return;
  }
  if(!isEdit&&formMode!=='relay') formMode='note';
  syncFormModeVisibility();
  if(editMode) {
    const n=mapNodeById(openId); if(!n) return;
    const relay=isRelayNode(n);
    formMode=relay?'relay':'note';
    g('form-title').textContent=relay?'編輯中繼站':'編輯筆記';
    g('ft').value=n.type;setSelectedValues('fs2',noteSubjects(n));g('fti').value=n.title;g('fpath').value=n.path||'';
    renderDynamicFields(n.type,n);
  } else {
    g('form-title').textContent=formMode==='relay'?'新增中繼站':'新增筆記';
  ['fti','fpath'].forEach(id=>{const el=g(id);if(el)el.value='';});
    const pref=loadFormTaxonomyPref();
    const filterSub=(mapFilter.sub!=='all'&&subjects.some(s=>s.key===mapFilter.sub))?mapFilter.sub:'';
    const defaultSub=(pref.subject&&subjects.some(s=>s.key===pref.subject))
      ?pref.subject
      :(filterSub||(subjects[0]?subjects[0].key:null));
    if(defaultSub){
      setSelectedValues('fs2',[defaultSub]);

    }
    else{setSelectedValues('fs2',[]);}
    renderDynamicFields(g('ft').value,null);
  }
  buildInlineLinksPanel();
  g('fp').classList.add('open');['dp','tp'].forEach(p=>g(p).classList.remove('open'));
  syncSidePanelState();
}
function closeForm() {
  g('fp').classList.remove('open');
  if(_saveTimer){ clearTimeout(_saveTimer); _saveTimer=null; }
  editMode=false;
  formMode='note';
  syncFormModeVisibility();
  syncSidePanelState();
}

function renderMapAssignSearch(){
  const result=g('mapAssignSearchResult'),sel=g('mapAssignPageSel'),input=g('mapAssignSearchInput');
  if(!result||!sel||!input) return;
  const pageId=(sel.value||'root');
  mapAssignTargetPageId=pageId;
  const q=(input.value||'').trim().toLowerCase();
  const assigned=getMapPageAssignedIds(pageId);
  const pool=[...notes,...mapRelays].filter(n=>{
    if(assigned.has(n.id)) return false;
    if(pageId!=='root'&&String(n.id)===pageId) return false;
    if(!q) return true;
    const hay=`${n.title||''} ${noteSubjectText(n)} ${noteTags(n).join(' ')}`.toLowerCase();
    return hay.includes(q);
  }).slice(0,24);
  if(!pool.length){ result.innerHTML='<div class="dp-link-empty">找不到可加入的筆記</div>'; return; }
  result.innerHTML=pool.map(n=>`<button class="fl-result-item ${mapAssignSelectedNoteIds[n.id]?'selected':''}" data-map-assign-note-id="${n.id}" type="button"><input type="checkbox" ${mapAssignSelectedNoteIds[n.id]?'checked':''}><span class="fl-result-title">${escapeHtml(n.title||'（未命名）')}</span></button>`).join('');
  result.querySelectorAll('[data-map-assign-note-id]').forEach(row=>row.addEventListener('click',()=>{
    const noteId=parseInt(row.dataset.mapAssignNoteId,10);
    mapAssignSelectedNoteIds[noteId]=!mapAssignSelectedNoteIds[noteId];
    if(!mapAssignSelectedNoteIds[noteId]) delete mapAssignSelectedNoteIds[noteId];
    renderMapAssignSearch();
  }));
}
function openMapPageAssignForm(){
  formMode='mapAssign';
  mapAssignTargetPageId=currentSubpageRootId()?String(currentSubpageRootId()):'root';
  mapAssignSelectedNoteIds={};
  openForm(false);
  const sel=g('mapAssignPageSel');
  const pages=mapPageRootOptions();
  if(sel){
    sel.innerHTML=pages.map(p=>`<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
    sel.value=mapAssignTargetPageId;
    sel.onchange=()=>{mapAssignSelectedNoteIds={};renderMapAssignSearch();};
  }
  const input=g('mapAssignSearchInput');
  if(input){input.value='';input.oninput=debounce(renderMapAssignSearch,160);}
  renderMapAssignSearch();
  setTimeout(()=>input?.focus(),0);
}

function detachSidePanelsFromNotesView(){
  const host=document.body;
  ['dp','fp','tp','ap'].forEach(id=>{
    const panel=g(id);
    if(panel&&panel.parentElement!==host) host.appendChild(panel);
  });
}
function syncSidePanelState(){
  const hasOpen=['dp','fp','tp','ap'].some(id=>g(id)?.classList.contains('open'));
  document.body.classList.toggle('side-panel-open',hasOpen);
}

function buildInlineLinksPanel() {
  formLinkSelections={};
  renderFormLinks();
  const relTypeEl=g('fl-relation-type'),relNoteEl=g('fl-relation-note');
  const refreshRelNoteState=()=>{
    const relType=relTypeEl?.value||'cause';
    if(!relNoteEl) return;
    relNoteEl.placeholder=relationNotePlaceholder(relType);
    relNoteEl.style.display=relationNeedsNote(relType)?'block':'none';
  };
  if(relTypeEl) relTypeEl.onchange=refreshRelNoteState;
  if(relNoteEl) relNoteEl.value='';
  refreshRelNoteState();
  const searchEl=g('fl-search');
  if(searchEl){searchEl.value='';searchEl.oninput=debounce(renderFormLinkSearch,200);}
  const selAllBtn=g('flSelectAllBtn'),addSelBtn=g('flAddSelectedBtn');
  if(selAllBtn) selAllBtn.onclick=()=>{
    g('fl-results')?.querySelectorAll('.fl-result-item').forEach(item=>{formLinkSelections[parseInt(item.dataset.nid,10)]=true;item.classList.add('selected');});
    updateFormLinkBulkActions();
  };
  if(addSelBtn) addSelBtn.onclick=addSelectedFormLinks;
  renderFormLinkSearch();
}
function renderFormLinks() {
  const el=g('form-links-list');
  if(!el||!openId){if(el)el.innerHTML='';return;}
  const related=links.filter(l=>l.from===openId||l.to===openId);
  if(!related.length){el.innerHTML='<span style="font-size:12px;color:#bbb">尚無關聯</span>';return;}
  el.innerHTML=related.map(l=>{const otherId=l.from===openId?l.to:l.from,other=mapNodeById(otherId),tag=isRelayNode(other)?'<span class="chip" style="margin-right:6px;background:#F2E8FF;color:#7A34B0;border-color:#D4B5EF">中繼站</span>':'',relNote=normalizeRelationNote(l.note);return `<div class="fl-item">${tag}<span class="chip" style="margin-right:6px;background:${relationColor(l.rel)};color:#fff;border-color:${relationColor(l.rel)}">${relationLabel(l.rel)}</span><span class="fl-item-title">${other?other.title:'（已刪除）'}</span>${relNote?`<span class="chip" title="${escapeHtml(relNote)}">${escapeHtml(relNote)}</span>`:''}<button class="fl-del" data-lid="${l.id}">✕</button></div>`;}).join('');
  el.querySelectorAll('.fl-del').forEach(btn=>btn.addEventListener('click',()=>{links=links.filter(l=>l.id!==parseInt(btn.dataset.lid));saveData();renderFormLinks();if(isMapOpen)scheduleMapRedraw(100);showToast('關聯已刪除');}));
}
function renderFormLinkSearch() {
  const el=g('fl-results'); if(!el) return;
  const q=(val('fl-search')||'').toLowerCase().trim();
  if(!q){el.innerHTML='';updateFormLinkBulkActions();return;}
  const existIds=new Set(links.filter(l=>openId&&(l.from===openId||l.to===openId)).map(l=>l.from===openId?l.to:l.from));
  const pool=findMapNodesByKeyword(q,openId).filter(n=>!existIds.has(n.id)&&(!isRelayNode(n)||isNodeInCurrentMapPage(n.id)));
  if(!pool.length){el.innerHTML='<div style="font-size:12px;color:#bbb;padding:4px 0;">找不到符合的筆記</div>';updateFormLinkBulkActions();return;}
  el.innerHTML=pool.map(n=>{const tp=isRelayNode(n)?{label:'中繼站',color:'#A855F7'}:typeByKey(n.type);return `<div class="fl-result-item ${formLinkSelections[n.id]?'selected':''}" data-nid="${n.id}"><input type="checkbox" ${formLinkSelections[n.id]?'checked':''}><span class="fl-result-type" style="background:${tp.color}">${tp.label}</span><span class="fl-result-title">${n.title}</span></div>`;}).join('');
  el.querySelectorAll('.fl-result-item').forEach(item=>{
    item.addEventListener('click',()=>{
      const toId=parseInt(item.dataset.nid);
 formLinkSelections[toId]=!formLinkSelections[toId];
      item.classList.toggle('selected',!!formLinkSelections[toId]);
      const cb=item.querySelector('input[type="checkbox"]'); if(cb) cb.checked=!!formLinkSelections[toId];
      updateFormLinkBulkActions();
    });
  });
updateFormLinkBulkActions();
}
function updateFormLinkBulkActions(){
  const wrap=g('fl-bulk-actions'),btn=g('flAddSelectedBtn');
  if(!wrap||!btn) return;
  const count=Object.keys(formLinkSelections).filter(id=>formLinkSelections[id]).length;
  wrap.style.display=g('fl-results')?.children.length?'flex':'none';
  btn.textContent=`建立 ${count} 筆關聯`;
  btn.disabled=count===0;
}
function addSelectedFormLinks(){
  if(!openId){showToast('請先儲存筆記，再新增關聯');return;}
  const targetIds=Object.keys(formLinkSelections).filter(id=>formLinkSelections[id]).map(Number);
  if(!targetIds.length){showToast('請先選擇要關聯的筆記');return;}
  let added=0;
  const relType=g('fl-relation-type')?.value||'cause';
  const relNote=normalizeRelationNote(g('fl-relation-note')?.value||'');
  if(relationNeedsNote(relType)&&!relNote){showToast('此關聯類型需要輸入關聯說明');return;}
  targetIds.forEach(toId=>{ if(createRelationLink(openId,toId,relType,relNote)) added++; });
  const relNoteEl=g('fl-relation-note'); if(relNoteEl) relNoteEl.value='';
  formLinkSelections={};saveData();renderFormLinks();renderFormLinkSearch();showToast(`已建立 ${added} 筆關聯`);if(isMapOpen)scheduleMapRedraw(100);
}

function collectFormValuesByType(typeKey){
  const result={question:'',answer:'',prompt:'',application:'',body:'',detail:'',todos:[],extraFields:{}};
  getTypeFieldKeys(typeKey).forEach(key=>{
    const el=g(`f-field-${key}`);
    if(!el) return;
    const raw=(el.value||'').trim();
    if(key==='question') result.question=raw;
    else if(key==='answer') result.answer=raw;
    else if(key==='prompt') result.prompt=raw;
    else if(key==='application') result.application=raw;
    else if(key==='body') result.body=raw;
    else if(key==='detail') result.detail=raw;
    else if(key==='todos') result.todos=parseTodos(raw);
    else result.extraFields[key]=raw;
  });
  return result;
}
function renderDynamicFields(typeKey,note=null){
  const wrap=g('dynamicFields'); if(!wrap) return;
  const keys=getTypeFieldKeys(typeKey);
  wrap.innerHTML=keys.map(key=>{
    const def=getFieldDef(key);
    const isText=def.kind==='text';
    const value=note?noteFieldValueForEdit(note,key):'';
    return `<div class="type-field-item"><div class="type-field-title"><label class="type-field-label" for="f-field-${key}">${def.label}</label>${!BUILTIN_FIELD_DEFS[key]?`<button class="type-field-remove" data-remove-custom="${key}" type="button">刪除此自訂欄位</button>`:''}</div>${isText?`<input class="fi" id="f-field-${key}" placeholder="${def.placeholder||''}" value="${value.replace(/"/g,'&quot;')}">`:`<textarea class="ft" id="f-field-${key}" placeholder="${def.placeholder||''}" ${key==='todos'?'style="min-height:96px;"':''}>${value}</textarea>`}</div>`;
  }).join('');
  wrap.querySelectorAll('[data-remove-custom]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.removeCustom;
    const typeCfg=getTypeFieldKeys(typeKey).filter(k=>k!==key);
    typeFieldConfigs[typeKey]=typeCfg;
    saveData();
    renderDynamicFields(typeKey,note);
    showToast('已刪除欄位');
  }));
}
function addTypeFieldForCurrentType(){
  const typeKey=g('ft')?.value;
  if(!typeKey) return;
  const current=getTypeFieldKeys(typeKey);
  const builtins=Object.keys(BUILTIN_FIELD_DEFS).filter(k=>!current.includes(k));
  const guide=builtins.map(k=>`${k}: ${BUILTIN_FIELD_DEFS[k].label}`).join('\n');
  const input=prompt(`輸入要新增的欄位 key（可輸入內建 key 或自訂名稱）\n${guide||'（目前內建欄位已全加入）'}`,'detail');
  if(input===null) return;
  const raw=input.trim();
  if(!raw){showToast('欄位名稱不能空白');return;}
  let key=raw;
  if(!BUILTIN_FIELD_DEFS[key]&&!customFieldDefs[key]){
    const label=prompt('請輸入欄位顯示名稱：',raw);
    if(!label) return;
    const kindRaw=prompt('欄位型態（text / textarea）：','textarea');
    if(kindRaw===null) return;
    const kind=kindRaw.trim()==='text'?'text':'textarea';
    customFieldDefs[key]={key,label:label.trim()||raw,kind,placeholder:''};
  }
  if(current.includes(key)){showToast('此欄位已存在');return;}
  typeFieldConfigs[typeKey]=[...current,key];
  saveData();
  renderDynamicFields(typeKey,editMode&&openId?noteById(openId):null);
  showToast('欄位已新增');
}
function removeTypeFieldForCurrentType(){
  const typeKey=g('ft')?.value;
  if(!typeKey) return;
  const current=getTypeFieldKeys(typeKey);
  if(current.length<=1){showToast('至少需保留一個欄位');return;}
  const guide=current.map(k=>`${k}: ${getFieldDef(k).label}`).join('\n');
  const input=prompt(`輸入要刪除的欄位 key\n${guide}`,current[current.length-1]||'');
  if(input===null) return;
  const key=input.trim();
  if(!current.includes(key)){showToast('找不到該欄位');return;}
  typeFieldConfigs[typeKey]=current.filter(k=>k!==key);
  saveData();
  renderDynamicFields(typeKey,editMode&&openId?noteById(openId):null);
  showToast('欄位已刪除');
}
function saveNote() {
  if(formMode==='mapAssign'){
    const selectedNoteIds=Object.keys(mapAssignSelectedNoteIds).filter(id=>mapAssignSelectedNoteIds[id]).map(Number);
    if(!selectedNoteIds.length){showToast('請先選擇要加入的筆記');return;}
    let addedCount=0;
    selectedNoteIds.forEach(noteId=>{ if(addNoteToMapPage(mapAssignTargetPageId,noteId)) addedCount++; });
    if(addedCount>0){
      mapAssignSelectedNoteIds={};
      saveData();
      if(isMapOpen) scheduleMapRedraw(80);
      renderMapAssignSearch();
      showToast(`已加入 ${addedCount} 筆筆記`);
    }
    return;
  }
  const title=(g('fti').value||'').trim();
  if(!title){g('fti').style.borderColor='#FF3B30';showToast('請輸入標題');return;}
  g('fti').style.borderColor='';
  const typeKey=g('ft').value;
  const path=resolveInheritedPath(g('fpath').value||'');
  const fieldData=collectFormValuesByType(typeKey);
  const typeFieldKeys=getTypeFieldKeys(typeKey);
  const requiresApplication=typeFieldKeys.includes('application');
  if(requiresApplication&&!fieldData.application.trim()){
    showToast('Application 為必填：請填「你會在何處使用這個知識」');
    const appInput=g('f-field-application');
    if(appInput){
      appInput.focus();
      appInput.style.borderColor='#FF3B30';
      setTimeout(()=>{appInput.style.borderColor='';},1800);
    }
    return;
  }
  if((fieldData.question.length+fieldData.answer.length)>600){
    showToast('提示：請保持原子化（單一概念、精簡問答）');
  }
  const selectedSubs=selectedValues('fs2').slice(0,1);
  if(!selectedSubs.length){showToast('請至少選擇一個科目');return;}
  const primarySubject=selectedSubs[0]||'';
  saveFormTaxonomyPref(primarySubject,'','');
  if(editMode&&openId) {
    const isRelay=formMode==='relay';
    const source=isRelay?mapRelays:notes;
    const idx=source.findIndex(n=>n.id===openId);
    const selectedIdNums=Object.keys(selectedIds||{}).map(Number).filter(id=>selectedIds[id]);
    const shouldSyncMeta=multiSelMode&&selectedIds[openId]&&selectedIdNums.length>1;
    const prevDone=idx!==-1?doneTodoCount(source[idx].todos):0;
    if(idx!==-1){
      const updated=normalizeNoteSchema({...source[idx],type:typeKey,subject:primarySubject,subjects:selectedSubs,chapter:'',chapters:[],section:'',sections:[],title,path,question:fieldData.question,answer:fieldData.answer,prompt:fieldData.prompt,application:fieldData.application,body:fieldData.body,detail:fieldData.detail,todos:fieldData.todos,extraFields:fieldData.extraFields});
      source[idx]=isRelay?{...updated,isRelay:true,pageRootId:relayPageRootId(source[idx]),noteTypeBackup:typeKey}:updated;
    }
    const mentionAdded=idx!==-1?autoLinkMentionsForNote(source[idx]):0;
    const nextDone=idx!==-1?doneTodoCount(source[idx].todos):0;
    if(nextDone>prevDone&&levelSystem.tasks.length&&levelSystem.skills.length){
      completeLevelTask(levelSystem.tasks[0].id,levelSystem.skills[0].id);
    }
    refreshAchievementProgress();
    if(shouldSyncMeta){
      selectedIdNums.forEach(id=>{
        if(id===openId) return;
        const target=noteById(id);
        if(!target) return;
        Object.assign(target,{type:typeKey,subject:primarySubject,subjects:[...selectedSubs],chapter:'',chapters:[],section:'',sections:[]});
      });
    }
    saveData();closeForm();render();if(isMapOpen) scheduleMapRedraw(0);showToast(`${isRelay?'中繼站':'筆記'}已更新！${mentionAdded?`（@ 自動建立 ${mentionAdded} 筆關聯）`:''}`);
    setTimeout(()=>openNote(openId),150);
  } else {
    const d=new Date(),dt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const nowIso=new Date().toISOString();
    const newNote=normalizeNoteSchema({id:nid++,type:typeKey,subject:primarySubject,subjects:selectedSubs,chapter:'',chapters:[],section:'',sections:[],title,path,question:fieldData.question,answer:fieldData.answer,prompt:fieldData.prompt,application:fieldData.application,body:fieldData.body,detail:fieldData.detail,date:dt,created_at:nowIso,last_reviewed:'',next_review:nowIso,todos:fieldData.todos,extraFields:fieldData.extraFields});
    if(doneTodoCount(newNote.todos)>0&&levelSystem.tasks.length&&levelSystem.skills.length){
      completeLevelTask(levelSystem.tasks[0].id,levelSystem.skills[0].id);
    }
    refreshAchievementProgress();
    const isRelay=formMode==='relay';
    const relayRoot=currentSubpageRootId();
    const created=isRelay?{...newNote,isRelay:true,pageRootId:relayRoot||null,noteTypeBackup:typeKey}:newNote;
    if(isRelay) mapRelays.push(created);
    else {
      notes.unshift(created);
      if(isMapOpen) assignNoteToMapPage(created.id,currentSubpageRootId()?String(currentSubpageRootId()):'root');
    }
    openId=created.id;
    const mentionAdded=autoLinkMentionsForNote(created);
    saveData();closeForm();render();if(isMapOpen) scheduleMapRedraw(0);showToast(`${isRelay?'中繼站':'筆記'}已儲存！${mentionAdded?`（@ 自動建立 ${mentionAdded} 筆關聯）`:''}`);
    if(isMapOpen) setTimeout(()=>openNote(created.id),120);
    else setTimeout(()=>{window.scrollTo(0,0);setTimeout(()=>openNote(notes[0].id),300);},100);
  }
}
function saveNoteDraftFromForm(){
  if(!(editMode&&openId)) return;
  const target=mapNodeById(openId);
  if(!target) return;
  const title=(g('fti').value||'').trim();
  if(!title) return;
  const typeKey=g('ft').value;
  const path=resolveInheritedPath(g('fpath').value||'');
  const fieldData=collectFormValuesByType(typeKey);
  const selectedSubs=selectedValues('fs2').slice(0,1);
  Object.assign(target,normalizeNoteSchema({...target,type:typeKey,subject:selectedSubs[0]||'',subjects:selectedSubs,chapter:'',chapters:[],section:'',sections:[],title,path,question:fieldData.question,answer:fieldData.answer,prompt:fieldData.prompt,application:fieldData.application,body:fieldData.body,detail:fieldData.detail,todos:fieldData.todos,extraFields:fieldData.extraFields}));
  saveDataDeferred();
}
function duplicateNote(targetId=openId) {
  if(!targetId){showToast('請先開啟要複製的筆記');return;}
  const src=noteById(targetId);
  if(!src){showToast('找不到要複製的筆記');return;}
  const d=new Date(),dt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const copyTitle=`${src.title}（複製）`;
  const newNote=normalizeNoteSchema({
    id:nid++,
    type:src.type,
    subject:src.subject,
    subjects:[...noteSubjects(src)],
    chapter:'',
    chapters:[],
    section:'',
    sections:[],
    title:copyTitle,
    path:src.path||'',
    question:src.question||'',
    answer:src.answer||'',
    prompt:src.prompt||'',
    application:src.application||'',
    body:src.body||'',
    detail:src.detail||'',
    date:dt,
    todos:Array.isArray(src.todos)?src.todos.map(t=>({text:t.text||'',done:!!t.done})):[],
    extraFields:{...noteExtraFields(src)}
  });
  notes.unshift(newNote);
  openId=newNote.id;
  saveData();
  render();
  showToast('已複製筆記');
  setTimeout(()=>{window.scrollTo(0,0);setTimeout(()=>openNote(newNote.id),220);},80);
}
async function copyNoteToClipboard(targetId=openId) {
  if(!targetId){showToast('請先開啟要複製的筆記');return;}
  const n=mapNodeById(targetId);
  if(!n){showToast('找不到要複製的筆記');return;}
  const text=[
    n.title||'（未命名）',
    n.question?`Q: ${n.question}`:'',
    n.answer?`A: ${n.answer}`:'',
    n.prompt?`Hint: ${n.prompt}`:'',
    n.application?`Application: ${n.application}`:'',
    n.body||'',
    n.detail||''
  ].filter(v=>safeStr(v).trim()).join('\n\n');
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const ta=document.createElement('textarea');
      ta.value=text;
      ta.setAttribute('readonly','');
      ta.style.position='fixed';
      ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast('已複製筆記內容');
  }catch(_err){
    showToast('複製失敗，請稍後再試');
  }
}
function duplicateMapNode(targetId=openId){
  const node=mapNodeById(targetId);
  if(!node){showToast('找不到要複製的節點');return;}
  if(isRelayNode(node)){
    const d=new Date(),dt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const copy=normalizeNoteSchema({...node,id:nid++,title:`${node.title}（複製）`,date:dt});
    mapRelays.push({...copy,isRelay:true,pageRootId:relayPageRootId(node)});
    openId=copy.id;
    saveData();render();if(isMapOpen) scheduleMapRedraw(0);showToast('已複製中繼站');
    return;
  }
  duplicateNote(targetId);
}
function deleteMapNode(targetId=openId){
  const node=mapNodeById(targetId);
  if(!node) return;
  if(isRelayNode(node)){ deleteMapRelay(targetId); return; }
  deleteNote(targetId);
}
function deleteNote(targetId=openId) {
  if(!targetId||!confirm('確定刪除這筆筆記？可到回收區復原（保留 5 天）。')) return;
  const removed=removeNotesToRecycle([targetId]);
  if(!removed) return;
  const recycleId=recycleBin[0]?.id;
  saveData();
  if(openId===targetId) closeDetail();
  renderArchivePanel();
  render();
  showActionToast('已移至回收區',recycleId?()=>restoreRecycleItem(recycleId):null);
}
