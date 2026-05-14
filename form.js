// ==================== 表單 ====================

function debugLog(context,payload){
  try{
    if(window.__klawsDebugEnabled!==true) return;
    const rt=window.__klawsDebugRuntime;
    if(rt&&typeof rt.append==='function') rt.append('debug',[context,JSON.stringify(payload||{})]);
  }catch(_e){}
}


const FORM_SECTION_DEFAULTS={basic:false,path:false,fields:false,links:false};
let formSectionCollapsed={...FORM_SECTION_DEFAULTS};
let formLinksDrawerOpen=false;
let lastFormSaveStatus='saved';

function isFormOpen(){ return !!g('fp')?.classList.contains('open'); }
function setFormSaveStatus(status='saved'){
  const normalized=['dirty','saving','saved','failed'].includes(status)?status:'saved';
  if(lastFormSaveStatus===normalized) return;
  lastFormSaveStatus=normalized;
  const el=g('fpSaveStatus');
  if(!el) return;
  const label={dirty:'未儲存',saving:'儲存中',saved:'已儲存',failed:'儲存失敗'}[normalized];
  el.dataset.status=normalized;
  el.textContent=label;
}
function closeFormMoreMenu(){
  const wrap=g('fpMoreWrap'),btn=g('fpMoreActionsBtn');
  if(wrap) wrap.classList.remove('open');
  if(btn) btn.setAttribute('aria-expanded','false');
}
function toggleFormMoreMenu(){
  const wrap=g('fpMoreWrap'),btn=g('fpMoreActionsBtn');
  if(!wrap||!btn) return;
  const open=!wrap.classList.contains('open');
  wrap.classList.toggle('open',open);
  btn.setAttribute('aria-expanded',open?'true':'false');
}
function updateFormMoreMenuVisibility(){
  const visible=editMode&&formMode!=='auxnode';
  const wrap=g('fpMoreWrap'),btn=g('fpMoreActionsBtn');
  if(wrap) wrap.style.display=visible?'block':'none';
  if(btn) btn.setAttribute('aria-expanded','false');
  if(!visible) closeFormMoreMenu();
}
function toggleFormSection(sectionKey){
  if(!Object.prototype.hasOwnProperty.call(formSectionCollapsed,sectionKey)) return;
  formSectionCollapsed[sectionKey]=!formSectionCollapsed[sectionKey];
  applyFormSectionState();
}
function updateFormSectionSummary(){
  const pathSummary=g('form-path-summary');
  if(pathSummary){
    const path=resolveInheritedPath(g('fpath')?.value||'');
    pathSummary.textContent=path?`目前路徑：${path}`:'未設定路徑';
  }
  const fieldsSummary=g('form-fields-summary');
  if(fieldsSummary){
    const keys=getTypeFieldKeys(g('ft')?.value||'');
    fieldsSummary.textContent=`${keys.length} 個欄位`;
  }
}
function applyFormSectionState(){
  Object.keys(formSectionCollapsed).forEach(key=>{
    const section=g(`form-section-${key}`)||document.querySelector(`[data-form-section="${key}"]`);
    if(!section) return;
    const collapsed=!!formSectionCollapsed[key];
    section.classList.toggle('is-collapsed',collapsed);
    const btn=section.querySelector('[data-section-toggle]');
    if(btn){
      btn.setAttribute('aria-expanded',collapsed?'false':'true');
      btn.textContent=collapsed?'展開':'收合';
    }
  });
  updateFormSectionSummary();
}
function bindFormPanelChrome(){
  g('fpMoreActionsBtn')?.addEventListener('click',ev=>{ev.stopPropagation();toggleFormMoreMenu();});
  document.addEventListener('click',ev=>{ if(!ev.target.closest?.('#fpMoreWrap')) closeFormMoreMenu(); });
  g('fpMoreActionsMenu')?.addEventListener('click',()=>closeFormMoreMenu());
  g('fp')?.addEventListener('click',ev=>{
    const toggle=ev.target.closest?.('[data-section-toggle]');
    if(!toggle) return;
    toggleFormSection(toggle.dataset.sectionToggle);
  });
  g('formLinksManageBtn')?.addEventListener('click',()=>{
    formLinksDrawerOpen=!formLinksDrawerOpen;
    syncFormLinksDrawer();
    if(formLinksDrawerOpen) g('fl-search')?.focus();
  });
}
function syncFormLinksDrawer(){
  const drawer=g('formLinksDrawer'),btn=g('formLinksManageBtn');
  if(drawer) drawer.hidden=!formLinksDrawerOpen;
  if(btn){
    btn.setAttribute('aria-expanded',formLinksDrawerOpen?'true':'false');
    btn.textContent=formLinksDrawerOpen?'收合關聯管理':'管理關聯';
  }
  if(formLinksDrawerOpen) renderFormLinkSearch();
  else {
    const results=g('fl-results');
    if(results) results.innerHTML='';
    updateFormLinkBulkActions();
  }
}
function markFormDirty(){ if(isFormOpen()) setFormSaveStatus('dirty'); }
function markFormSaving(){ if(isFormOpen()) setFormSaveStatus('saving'); }
function markFormSaved(){ if(isFormOpen()) setFormSaveStatus('saved'); }
function markFormSaveFailed(){ if(isFormOpen()) setFormSaveStatus('failed'); }

function resolveInheritedPath(inputPath=''){
  const raw=resolvePathInput(inputPath||'');
  if(raw) return raw;
  const rootId=currentSubpageRootId();
  if(!rootId) return '';
  const parent=mapNodeById(rootId);
  return resolvePathInput(parent?.path||'');
}
function syncFormModeVisibility(){
  const setDisplay=(id,v)=>{const el=g(id);if(el)el.style.display=v;};
  setDisplay('dynamicFieldWrap','block');
  setDisplay('form-links-wrap','block');
  setDisplay('fpath-row','block');
  setDisplay('fti','block');
  setDisplay('titleTriggerBtn','inline');
  setDisplay('typeTriggerBtn','inline');
  const saveBtn=g('fpSave');
  if(saveBtn) saveBtn.textContent='儲存';
  const actionIds=['fpDuplicateBtn','fpCopyBtn','fpDeleteBtn'];
  const showActions=editMode&&formMode!=='auxnode';
  actionIds.forEach(id=>{const el=g(id);if(el) el.style.display=showActions?'flex':'none';});
  updateFormMoreMenuVisibility();
}
function syncFormHeaderLabels(){
  const typeSelect=g('ft'),typeBtn=g('typeTriggerBtn'),titleInput=g('fti'),titleMeta=g('titleMeta');
  if(typeBtn&&typeSelect){
    const opt=typeSelect.options[typeSelect.selectedIndex];
    typeBtn.textContent=(opt?.textContent||'選擇').trim()||'選擇';
  }
  if(titleMeta&&titleInput){
    titleMeta.textContent=(titleInput.value||'').trim()?'已命名':'必填';
  }
  updateFormSectionSummary();
}
function inheritedParentPath(){
  const rootId=currentSubpageRootId();
  if(!rootId) return '';
  const parent=mapNodeById(rootId);
  return resolvePathInput(parent?.path||'');
}
function updatePathInheritanceUI(){
  const toggle=g('fpathInheritToggle');
  const hint=g('fpath-inherit-hint');
  const preview=g('fpath-final-preview');
  const input=g('fpath');
  if(!toggle||!hint||!preview||!input) return;
  const inherited=inheritedParentPath();
  hint.textContent=inherited?`將繼承父路徑：${inherited}`:'目前無可繼承的父路徑';
  if(toggle.checked&&inherited) input.value=inherited;
  input.disabled=!!(toggle.checked&&inherited);
  const finalPath=resolvePathInput((toggle.checked&&inherited)?inherited:(input.value||''));
  preview.textContent=finalPath?`儲存後路徑：${finalPath}`:'儲存後路徑：（空）';
}

function formDraftHasContent(note){
  if(!note) return false;
  const extra=note.extraFields&&typeof note.extraFields==='object'&&!Array.isArray(note.extraFields)?note.extraFields:{};
  return !!(safeStr(note.title).trim()
    ||safeStr(note.question).trim()
    ||safeStr(note.answer).trim()
    ||safeStr(note.prompt).trim()
    ||safeStr(note.application).trim()
    ||safeStr(note.body).trim()
    ||safeStr(note.detail).trim()
    ||Object.values(extra).some(v=>safeStr(v).trim())
    ||(Array.isArray(note.todos)&&note.todos.length));
}
function currentFormHasDraftContent(){
  const title=(g('fti')?.value||'').trim();
  const typeKey=g('ft')?.value||'';
  const fieldData=collectFormValuesByType(typeKey);
  return formDraftHasContent({title,...fieldData});
}
function removeDraftNoteById(id){
  notes=notes.filter(n=>n.id!==id);
  mapAuxNodes=mapAuxNodes.filter(n=>n.id!==id);
  links=links.filter(l=>l.from!==id&&l.to!==id);
  Object.keys(mapPageNotes||{}).forEach(key=>{
    mapPageNotes[key]=(mapPageNotes[key]||[]).filter(noteId=>Number(noteId)!==Number(id));
  });
  if(openId===id) openId=null;
}
function createFormDraftNote(){
  const typeKey=g('ft')?.value||types[0]?.key||'';
  const fallbackDomain=domains[0]?.key||'';
  const selectedSubs=selectedValues('fs2').slice(0,1);
  const effectiveDomain=selectedSubs[0]||fallbackDomain;
  const normalizedSubs=effectiveDomain?[effectiveDomain]:[];
  const d=new Date(),dt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const nowIso=new Date().toISOString();
  const path=resolveInheritedPath(g('fpath')?.value||'');
  const draft=normalizeNoteSchema({id:nid++,isDraft:true,type:typeKey,domain:effectiveDomain,domains:normalizedSubs,group:'',groups:[],part:'',parts:[],title:'',path,question:'',answer:'',prompt:'',application:'',body:'',detail:'',date:dt,created_at:nowIso,last_reviewed:'',next_review:nowIso,todos:[],extraFields:{}});
  notes.unshift(draft);
  draftNoteId=draft.id;
  openId=draft.id;
  if(isMapOpen) assignNoteToMapPage(draft.id,currentSubpageRootId()?String(currentSubpageRootId()):'root');
  savePathChange({mode:'draft'});
  return draft;
}

function openForm(isEdit) {
  editMode=isEdit; buildFormSelects();
  if(isEdit) draftNoteId=null;
  if(!isEdit&&formMode!=='auxnode') formMode='note';
  syncFormModeVisibility();
  if(editMode) {
    const n=mapNodeById(openId); if(!n) return;
    if(n.isDraft) draftNoteId=n.id;
    const auxnode=isAuxnodeNode(n);
    formMode=auxnode?'auxnode':'note';
    g('form-title').textContent=n.isDraft?'編輯草稿':(auxnode?'編輯':'編輯筆記');
    g('ft').value=n.type;setSelectedValues('fs2',noteDomains(n));g('fti').value=n.title;g('fpath').value=n.path||'';
    if(g('fpathInheritToggle')) g('fpathInheritToggle').checked=false;
    renderDynamicFields(n.type,n);
  } else {
    g('form-title').textContent=formMode==='auxnode'?'新增':'新增筆記';
  ['fti','fpath'].forEach(id=>{const el=g(id);if(el)el.value='';});
    const inherited=inheritedParentPath();
    const inheritToggle=g('fpathInheritToggle');
    if(inheritToggle){
      inheritToggle.checked=!!inherited;
      if(inherited) g('fpath').value=inherited;
    }
    const pref=loadFormTaxonomyPref();
    const filterSub=(mapFilter.sub!=='all'&&domains.some(s=>s.key===mapFilter.sub))?mapFilter.sub:'';
    const defaultSub=(pref.domain&&domains.some(s=>s.key===pref.domain))
      ?pref.domain
      :(filterSub||(domains[0]?domains[0].key:null));
    if(defaultSub){
      setSelectedValues('fs2',[defaultSub]);

    }
    else{setSelectedValues('fs2',[]);}
    renderDynamicFields(g('ft').value,null);
    createFormDraftNote();
  }
  syncFormHeaderLabels();
  formLinksDrawerOpen=false;
  formSectionCollapsed={...FORM_SECTION_DEFAULTS,path:false,links:false};
  applyFormSectionState();
  syncFormLinksDrawer();
  setFormSaveStatus('saved');
  buildInlineLinksPanel();
  const inheritToggle=g('fpathInheritToggle'),pathInput=g('fpath');
  if(inheritToggle) inheritToggle.onchange=updatePathInheritanceUI;
  if(pathInput) pathInput.oninput=()=>{updatePathInheritanceUI();updateFormSectionSummary();saveNoteDraftFromForm();};
  updatePathInheritanceUI();
  syncFormModeVisibility();
  g('fp').classList.add('open');['dp','tp'].forEach(p=>g(p).classList.remove('open'));
  syncSidePanelState();
}
function closeForm() {
  const closingDraftId=draftNoteId;
  if(closingDraftId){
    if(currentFormHasDraftContent()) saveNoteDraftFromForm();
    else { removeDraftNoteById(closingDraftId); savePathChange({mode:'draft'}); }
    draftNoteId=null;
  }
  closeFormMoreMenu();
  g('fp').classList.remove('open');
  editMode=false;
  formMode='note';
  syncFormModeVisibility();
  syncSidePanelState();
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

function clearFormFieldValue(targetId){
  const el=g(targetId);
  if(!el) return;
  if(el.tagName==='SELECT'){
    if(el.multiple) Array.from(el.options).forEach(opt=>opt.selected=false);
    else el.selectedIndex=0;
  }else el.value='';
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  if(targetId==='fti'||targetId==='ft') syncFormHeaderLabels();
}

function bindFormClearButtons(){
  document.querySelectorAll('#fp [data-clear-target]').forEach(btn=>btn.onclick=()=>{
    clearFormFieldValue(btn.dataset.clearTarget);
    if(btn.dataset.clearTarget==='fl-search') renderFormLinkSearch();
    if(btn.dataset.clearTarget==='fpath') updatePathInheritanceUI();
  });
}
async function copyFieldValueToClipboard(targetId){
  const el=g(targetId);
  if(!el){showToast('找不到欄位');return;}
  const text=safeStr(el.value).trim();
  if(!text){showToast('欄位目前是空的');return;}
  try{
    if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else{
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
    showToast('已複製欄位內容');
  }catch(_err){showToast('複製失敗，請稍後再試');}
}
function renameFieldLabel(typeKey,fieldKey,note){
  const def=getFieldDef(fieldKey);
  const nextLabel=prompt(`修改欄位名稱（key: ${fieldKey}）`,def.label||fieldKey);
  if(nextLabel===null) return;
  const label=nextLabel.trim();
  if(!label){showToast('欄位名稱不能空白');return;}
  const baseDef=def||{key:fieldKey,label:fieldKey,kind:'textarea',placeholder:''};
  customFieldDefs[fieldKey]={...baseDef,key:fieldKey,label};
  saveData();
  renderDynamicFields(typeKey,note);
  showToast('欄位名稱已更新');
}

function buildInlineLinksPanel() {
  formLinkSelections={};
  renderFormLinks();

  const searchEl=g('fl-search');
  if(searchEl){searchEl.value='';searchEl.oninput=debounce(renderFormLinkSearch,200);}
  const selAllBtn=g('flSelectAllBtn'),addSelBtn=g('flAddSelectedBtn');
  if(selAllBtn) selAllBtn.onclick=()=>{
    g('fl-results')?.querySelectorAll('.fl-result-item').forEach(item=>{formLinkSelections[parseInt(item.dataset.nid,10)]=true;item.classList.add('selected');});
    updateFormLinkBulkActions();
  };
  if(addSelBtn) addSelBtn.onclick=addSelectedFormLinks;
  renderFormLinkSearch();
  bindFormClearButtons();
}
function renderFormLinks() {
  const el=g('form-links-list'),summary=g('form-links-summary');
  if(!el||!openId){
    if(el) el.innerHTML='';
    if(summary) summary.textContent='請先儲存筆記後再新增關聯';
    return;
  }
  const related=links.filter(l=>l.from===openId||l.to===openId);
  if(summary){
    const preview=related.slice(0,2).map(l=>{
      const otherId=l.from===openId?l.to:l.from;
      return mapNodeById(otherId)?.title||'（已刪除）';
    }).filter(Boolean).join('、');
    summary.textContent=related.length?`${related.length} 筆關聯${preview?`：${preview}${related.length>2?'…':''}`:''}`:'尚無關聯';
  }
  if(!related.length){el.innerHTML='<span class="form-empty-text">尚無關聯</span>';return;}
  el.innerHTML=related.map(l=>{const otherId=l.from===openId?l.to:l.from,other=mapNodeById(otherId),tag=isAuxnodeNode(other)?'<span class="chip" style="margin-right:6px;background:#F2E8FF;color:#7A34B0;border-color:#D4B5EF"></span>':'',relNote=normalizeRelationNote(l.note);return `<div class="fl-item">${tag}<button class="fl-item-title fl-item-open" type="button" data-open-note-id="${otherId}">${other?escapeHtml(other.title):'（已刪除）'}</button>${relNote?`<span class="chip" title="${escapeHtml(relNote)}">${escapeHtml(relNote)}</span>`:''}<button class="fl-del" data-lid="${l.id}">✕</button></div>`;}).join('');
  el.querySelectorAll('[data-open-note-id]').forEach(btn=>btn.addEventListener('click',()=>{
    const targetId=parseInt(btn.dataset.openNoteId,10);
    if(!mapNodeById(targetId)) return;
    openId=targetId;
    openForm(true);
  }));
  el.querySelectorAll('.fl-del').forEach(btn=>btn.addEventListener('click',()=>{links=links.filter(l=>l.id!==parseInt(btn.dataset.lid));saveData();renderFormLinks();if(isMapOpen)scheduleMapRedraw(100);showToast('關聯已刪除');}));
}
function renderFormLinkSearch() {
  const el=g('fl-results'); if(!el) return;
  if(!formLinksDrawerOpen){el.innerHTML='';updateFormLinkBulkActions();return;}
  const q=(val('fl-search')||'').toLowerCase().trim();
  if(!q){el.innerHTML='';updateFormLinkBulkActions();return;}
  const existIds=new Set(links.filter(l=>openId&&(l.from===openId||l.to===openId)).map(l=>l.from===openId?l.to:l.from));
  const pool=findMapNodesByKeyword(q,openId).filter(n=>!existIds.has(n.id)&&(!isAuxnodeNode(n)||isNodeInCurrentMapPage(n.id)));
  if(!pool.length){el.innerHTML='<div style="font-size:12px;color:#bbb;padding:4px 0;">找不到符合的筆記</div>';updateFormLinkBulkActions();return;}
  el.innerHTML=pool.map(n=>`<div class="fl-result-item ${formLinkSelections[n.id]?'selected':''}" data-nid="${n.id}"><input type="checkbox" ${formLinkSelections[n.id]?'checked':''}><span class="fl-result-title">${escapeHtml(n.title)}</span></div>`).join('');
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
  wrap.style.display=(formLinksDrawerOpen&&g('fl-results')?.children.length)?'flex':'none';
  btn.textContent=`建立 ${count} 筆關聯`;
  btn.disabled=count===0;
}
function addSelectedFormLinks(){
  if(!openId){showToast('請先儲存筆記，再新增關聯');return;}
  const targetIds=Object.keys(formLinkSelections).filter(id=>formLinkSelections[id]).map(Number);
  if(!targetIds.length){showToast('請先選擇要關聯的筆記');return;}
  let added=0;
  const relNote='';
  targetIds.forEach(toId=>{ if(createRelationLink(openId,toId,'',relNote)) added++; });
  formLinkSelections={};saveData();renderFormLinks();renderFormLinkSearch();showToast(`已建立 ${added} 筆關聯`);if(isMapOpen)scheduleMapRedraw(100);
}


function getCurrentFormSnapshot(){
  const typeKey=g('ft')?.value||'';
  const snapshot={
    title:(g('fti')?.value||''),
    path:(g('fpath')?.value||''),
    type:typeKey,
    domain:selectedValues('fs2').slice(0,1)[0]||'',
    fields:{}
  };
  const keys=getTypeFieldKeys(typeKey);
  keys.forEach(key=>{ const el=g(`f-field-${key}`); if(el) snapshot.fields[key]=el.value||''; });
  return snapshot;
}
function applyFormSnapshot(snapshot){
  if(!snapshot||typeof snapshot!=='object') return;
  if(g('fti')) g('fti').value=snapshot.title||'';
  if(g('fpath')) g('fpath').value=snapshot.path||'';
  if(snapshot.domain) setSelectedValues('fs2',[snapshot.domain]);
  Object.entries(snapshot.fields||{}).forEach(([key,val])=>{ const el=g(`f-field-${key}`); if(el) el.value=val; });
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
function renderDynamicFields(typeKey,note=null,snapshot=null){
  const wrap=g('dynamicFields'); if(!wrap) return;
  const keys=getTypeFieldKeys(typeKey);
  wrap.innerHTML=keys.map(key=>{
    const def=getFieldDef(key);
    const isText=def.kind==='text';
    const snapValue=snapshot&&snapshot.fields&&Object.prototype.hasOwnProperty.call(snapshot.fields,key)?snapshot.fields[key]:null;
    const value=snapValue!==null?safeStr(snapValue):(note?noteFieldValueForEdit(note,key):'');
    const label=escapeHtml(def.label||key);
    const placeholder=escapeHtml(def.placeholder||'');
    const safeValue=escapeHtml(value);
    const fieldActions=`<div class="type-field-actions"><button class="tool-btn mini-btn clear-field-btn" data-clear-target="f-field-${key}" type="button">清空</button><button class="tool-btn mini-btn copy-field-btn" data-copy-target="f-field-${key}" type="button">複製</button><button class="tool-btn mini-btn rename-field-btn" data-rename-field="${key}" type="button">改名</button>${!BUILTIN_FIELD_DEFS[key]?`<button class="type-field-remove" data-remove-custom="${key}" type="button">刪除此自訂欄位</button>`:''}</div>`;
    return `<div class="type-field-item"><div class="type-field-title"><label class="type-field-label" for="f-field-${key}">${label}</label>${fieldActions}</div>${isText?`<input class="fi" id="f-field-${key}" placeholder="${placeholder}" value="${safeValue.replace(/"/g,'&quot;')}">`:`<textarea class="ft field-textarea" id="f-field-${key}" placeholder="${placeholder}" ${key==='todos'?'style="min-height:96px;"':''}>${safeValue}</textarea>`}</div>`;
  }).join('');
  bindFormClearButtons();
  wrap.querySelectorAll('[data-copy-target]').forEach(btn=>btn.addEventListener('click',()=>copyFieldValueToClipboard(btn.dataset.copyTarget)));
  wrap.querySelectorAll('[data-rename-field]').forEach(btn=>btn.addEventListener('click',()=>renameFieldLabel(typeKey,btn.dataset.renameField,note)));
  wrap.querySelectorAll('[data-remove-custom]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.removeCustom;
    const typeCfg=getTypeFieldKeys(typeKey).filter(k=>k!==key);
    typeFieldConfigs[typeKey]=typeCfg;
    saveNoteDraftFromForm();
    saveData();
    renderDynamicFields(typeKey,note,getCurrentFormSnapshot());
    showToast('已刪除欄位');
  }));
}
function addTypeFieldForCurrentType(){
  saveNoteDraftFromForm();
  const snapshot=getCurrentFormSnapshot();
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
  renderDynamicFields(typeKey,editMode&&openId?noteById(openId):null,snapshot);
  applyFormSnapshot(snapshot);
  showToast('欄位已新增');
}
function editTypeFieldsForCurrentType(){
  const typeKey=g('ft')?.value;
  if(!typeKey) return;
  const current=getTypeFieldKeys(typeKey);
  const action=prompt('欄位設定：輸入 add 新增欄位，或輸入 remove 刪除欄位','add');
  if(action===null) return;
  const mode=action.trim().toLowerCase();
  if(mode==='add') addTypeFieldForCurrentType();
  else if(mode==='remove') removeTypeFieldForCurrentType();
  else showToast('請輸入 add 或 remove');
}
function removeTypeFieldForCurrentType(){
  saveNoteDraftFromForm();
  const snapshot=getCurrentFormSnapshot();
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
  renderDynamicFields(typeKey,editMode&&openId?noteById(openId):null,snapshot);
  applyFormSnapshot(snapshot);
  showToast('欄位已刪除');
}
async function saveNote() {
  const saveBtn=g('fpSave');
  if(saveBtn&&saveBtn.disabled) return;
  if(saveBtn) saveBtn.disabled=true;
  markFormSaving();
  try{
  const title=(g('fti').value||'').trim();
  if(!title){g('fti').style.borderColor='#FF3B30';showToast('請輸入標題');markFormDirty();return;}
  g('fti').style.borderColor='';
  const typeKey=g('ft').value;
  const useInherited=!!g('fpathInheritToggle')?.checked;
  const inherited=inheritedParentPath();
  const path=resolvePathInput((useInherited&&inherited)?inherited:(g('fpath').value||''));
  const fieldData=collectFormValuesByType(typeKey);
  const typeFieldKeys=getTypeFieldKeys(typeKey);
  const requiresApplication=typeFieldKeys.includes('application');
  if(requiresApplication&&!fieldData.application.trim()){
    markFormDirty();
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
  const fallbackDomain=domains[0]?.key||'';
  const selectedSubs=selectedValues('fs2').slice(0,1);
  const effectiveDomain=selectedSubs[0]||fallbackDomain;
  const normalizedSubs=effectiveDomain?[effectiveDomain]:[];
  const primaryDomain=effectiveDomain;
  saveFormTaxonomyPref(primaryDomain,'','');
  const draftTarget=openId?mapNodeById(openId):null;
  if(draftTarget&&draftTarget.isDraft){
    const source=isAuxnodeNode(draftTarget)?mapAuxNodes:notes;
    const idx=source.findIndex(n=>n.id===openId);
    const prevDone=idx!==-1?doneTodoCount(source[idx].todos):0;
    if(idx!==-1){
      const oldPath=source[idx]?.path||'';
      const updated=normalizeNoteSchema({...source[idx],isDraft:false,type:typeKey,domain:primaryDomain,domains:normalizedSubs,group:'',groups:[],part:'',parts:[],title,path,question:fieldData.question,answer:fieldData.answer,prompt:fieldData.prompt,application:fieldData.application,body:fieldData.body,detail:fieldData.detail,todos:fieldData.todos,extraFields:fieldData.extraFields});
      delete updated.isDraft;
      debugLog('[saveNote][finalize-draft]',{noteId:source[idx]?.id,oldPath,newPath:updated.path});
      source[idx]=isAuxnodeNode(source[idx])?{...updated,isAuxnode:true,pageRootId:auxnodePageRootId(source[idx]),noteTypeBackup:typeKey}:updated;
    }
    const saved=idx!==-1?source[idx]:draftTarget;
    const mentionAdded=idx!==-1?autoLinkMentionsForNote(saved):0;
    const nextDone=idx!==-1?doneTodoCount(saved.todos):0;
    refreshAchievementProgress();
    draftNoteId=null;
    const result=await savePathChange();
    if(!result||result.ok===false){ markFormSaveFailed(); showToast('儲存失敗，請稍後重試'); return; }
    markFormSaved();
    closeForm();render();if(isMapOpen) scheduleMapRedraw(0);showToast(`筆記已儲存！${mentionAdded?`（@ 自動建立 ${mentionAdded} 筆關聯）`:''}`);
    if(isMapOpen) setTimeout(()=>openNote(saved.id),120);
    else setTimeout(()=>{window.scrollTo(0,0);setTimeout(()=>openNote(saved.id),300);},100);
    return;
  }
  if(editMode&&openId) {
    const isAuxnode=formMode==='auxnode';
    const source=isAuxnode?mapAuxNodes:notes;
    const idx=source.findIndex(n=>n.id===openId);
    const selectedIdNums=Object.keys(selectedIds||{}).map(Number).filter(id=>selectedIds[id]);
    const shouldSyncMeta=multiSelMode&&selectedIds[openId]&&selectedIdNums.length>1;
    const prevDone=idx!==-1?doneTodoCount(source[idx].todos):0;
    if(idx!==-1){
      const oldPath=source[idx]?.path||'';
      const updated=normalizeNoteSchema({...source[idx],type:typeKey,domain:primaryDomain,domains:normalizedSubs,group:'',groups:[],part:'',parts:[],title,path,question:fieldData.question,answer:fieldData.answer,prompt:fieldData.prompt,application:fieldData.application,body:fieldData.body,detail:fieldData.detail,todos:fieldData.todos,extraFields:fieldData.extraFields});
      debugLog('[saveNote][update]',{noteId:source[idx]?.id,oldPath,newPath:updated.path});
      source[idx]=isAuxnode?{...updated,isAuxnode:true,pageRootId:auxnodePageRootId(source[idx]),noteTypeBackup:typeKey}:updated;
    }
    const mentionAdded=idx!==-1?autoLinkMentionsForNote(source[idx]):0;
    const nextDone=idx!==-1?doneTodoCount(source[idx].todos):0;
    refreshAchievementProgress();
    if(shouldSyncMeta){
      selectedIdNums.forEach(id=>{
        if(id===openId) return;
        const target=noteById(id);
        if(!target) return;
        Object.assign(target,{type:typeKey,domain:primaryDomain,domains:[...normalizedSubs],group:'',groups:[],part:'',parts:[]});
      });
    }
    const result=await savePathChange();
    if(!result||result.ok===false){ markFormSaveFailed(); showToast('儲存失敗，請稍後重試'); return; }
    markFormSaved();
    closeForm();render();if(isMapOpen) scheduleMapRedraw(0);showToast(`${isAuxnode?'':'筆記'}已更新！${mentionAdded?`（@ 自動建立 ${mentionAdded} 筆關聯）`:''}`);
    setTimeout(()=>openNote(openId),150);
  } else {
    const d=new Date(),dt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const nowIso=new Date().toISOString();
    const newNote=normalizeNoteSchema({id:nid++,type:typeKey,domain:primaryDomain,domains:normalizedSubs,group:'',groups:[],part:'',parts:[],title,path,question:fieldData.question,answer:fieldData.answer,prompt:fieldData.prompt,application:fieldData.application,body:fieldData.body,detail:fieldData.detail,date:dt,created_at:nowIso,last_reviewed:'',next_review:nowIso,todos:fieldData.todos,extraFields:fieldData.extraFields});
    debugLog('[saveNote][create]',{noteId:newNote.id,oldPath:'',newPath:newNote.path});
    refreshAchievementProgress();
    const isAuxnode=formMode==='auxnode';
    const auxnodeRoot=currentSubpageRootId();
    const created=isAuxnode?{...newNote,isAuxnode:true,pageRootId:auxnodeRoot||null,noteTypeBackup:typeKey}:newNote;
    if(isAuxnode) mapAuxNodes.push(created);
    else {
      notes.unshift(created);
      if(isMapOpen) assignNoteToMapPage(created.id,currentSubpageRootId()?String(currentSubpageRootId()):'root');
    }
    openId=created.id;
    const mentionAdded=autoLinkMentionsForNote(created);
    const result=await savePathChange();
    if(!result||result.ok===false){ markFormSaveFailed(); showToast('儲存失敗，請稍後重試'); return; }
    markFormSaved();
    closeForm();render();if(isMapOpen) scheduleMapRedraw(0);showToast(`${isAuxnode?'':'筆記'}已儲存！${mentionAdded?`（@ 自動建立 ${mentionAdded} 筆關聯）`:''}`);
    if(isMapOpen) setTimeout(()=>openNote(created.id),120);
    else setTimeout(()=>{window.scrollTo(0,0);setTimeout(()=>openNote(notes[0].id),300);},100);
  }
  } catch(err){
    markFormSaveFailed();
    console.error('[form-save-error]',err);
    showToast('儲存失敗，請稍後重試');
  } finally {
    if(saveBtn) saveBtn.disabled=false;
  }
}
function saveNoteDraftFromForm(){
  if(!((editMode||draftNoteId)&&openId)) return;
  const target=mapNodeById(openId);
  if(!target) return;
  const rawTitle=(g('fti').value||'');
  const title=rawTitle.trim();
  if(target.isDraft&&!currentFormHasDraftContent()) return;
  const typeKey=g('ft').value;
  const path=resolveInheritedPath(g('fpath').value||'');
  const fieldData=collectFormValuesByType(typeKey);
  const fallbackDomain=domains[0]?.key||'';
  const selectedSubs=selectedValues('fs2').slice(0,1);
  const effectiveDomain=selectedSubs[0]||fallbackDomain;
  const normalizedSubs=effectiveDomain?[effectiveDomain]:[];
  const updated=normalizeNoteSchema({...target,type:typeKey,domain:effectiveDomain,domains:normalizedSubs,group:'',groups:[],part:'',parts:[],title:title||'',path,question:fieldData.question,answer:fieldData.answer,prompt:fieldData.prompt,application:fieldData.application,body:fieldData.body,detail:fieldData.detail,todos:fieldData.todos,extraFields:fieldData.extraFields});
  Object.assign(target,updated);
  if(target.isDraft) target.isDraft=true; else delete target.isDraft;
  markFormSaving();
  const savePromise=savePathChange({mode:'draft'});
  if(savePromise&&typeof savePromise.then==='function'){
    savePromise.then(result=>{
      if(result&&result.ok===false) markFormSaveFailed();
      else markFormSaved();
    }).catch(()=>markFormSaveFailed());
  }else markFormSaved();
}
async function flushNoteDraftSnapshot(){
  if(!((editMode||draftNoteId)&&openId)) return;
  saveNoteDraftFromForm();
  markFormSaving();
  await flushDeferredSave();
  const result=await flushDraftSave();
  if(result&&result.ok===false) markFormSaveFailed();
  else markFormSaved();
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
    domain:src.domain,
    domains:[...noteDomains(src)],
    group:'',
    groups:[],
    part:'',
    parts:[],
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
  if(!node){showToast('找不到要複製的點');return;}
  if(isAuxnodeNode(node)){
    const d=new Date(),dt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const copy=normalizeNoteSchema({...node,id:nid++,title:`${node.title}（複製）`,date:dt});
    mapAuxNodes.push({...copy,isAuxnode:true,pageRootId:auxnodePageRootId(node)});
    openId=copy.id;
    saveData();render();if(isMapOpen) scheduleMapRedraw(0);showToast('已複製');
    return;
  }
  duplicateNote(targetId);
}
function deleteMapNode(targetId=openId){
  const node=mapNodeById(targetId);
  if(!node) return;
  if(isAuxnodeNode(node)){ deleteMapAuxnode(targetId); return; }
  deleteNote(targetId);
}
function deleteNote(targetId=openId) {
  if(!targetId||!confirm('確定刪除這筆筆記？可到回收區復原。')) return;
  const removed=removeNotesToRecycle([targetId]);
  if(!removed) return;
  const recycleId=recycleBin[0]?.id;
  saveData();
  if(openId===targetId) closeDetail();
  renderArchivePanel();
  render();
  showActionToast('已移至回收區',recycleId?()=>restoreRecycleItem(recycleId):null);
}
