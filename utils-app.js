// ==================== 工具函數 ====================
const g = id => document.getElementById(id);
const loadDebugToolkit = (() => {
  let pending = null;
  return () => {
    if (window.KLawsDebug) return Promise.resolve(window.KLawsDebug);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'debug-tool.js';
      s.onload = () => resolve(window.KLawsDebug || null);
      s.onerror = () => reject(new Error('load debug-tool.js failed'));
      document.head.appendChild(s);
    }).finally(() => { pending = null; });
    return pending;
  };
})();
const debugRuntime = (window.KLawsDebug&&window.KLawsDebug.createDebugRuntime)
  ? window.KLawsDebug.createDebugRuntime({maxLines:600, sink:(line)=>{ if(window.__KLawsDebugPushLine) window.__KLawsDebugPushLine(line); }})
  : null;
window.__KLawsDebugRuntime=debugRuntime;
window.enableKlawsDebugTool = async (options = {}) => {
  const persist = options && options.persist === true;
  await loadDebugToolkit();
  if (persist) localStorage.setItem('klaws_debug_tool', '1');
  if (typeof window.bindDebugToggleButton === 'function') window.bindDebugToggleButton();
  const btn = g('debugToggle');
  if (btn) btn.click();
  return { loaded: !!window.KLawsDebug, persisted: persist };
};
window.disableKlawsDebugTool = () => {
  localStorage.removeItem('klaws_debug_tool');
  return { persisted: false };
};
window.KLawsDiagnostics = Object.freeze({
  enableDebugTool: window.enableKlawsDebugTool,
  disableDebugTool: window.disableKlawsDebugTool,
  hasDebugRuntime: () => !!window.__KLawsDebugRuntime,
  hasDebugToolkit: () => !!window.KLawsDebug
});
const safeEventHandler=(fn,label='event-handler')=>{
  if(typeof fn!=='function') return fn;
  return function wrappedEventHandler(...args){
    try{
      return fn.apply(this,args);
    }catch(err){
      if(debugRuntime) debugRuntime.reportError(label,err);
      throw err;
    }
  };
};

const on = (id, evt, fn) => { const el=g(id); if(el) el.addEventListener(evt,safeEventHandler(fn,`${id}:${evt}`)); return el; };
const val = id => { const el=g(id); return el?el.value:''; };
const debounce = (fn,ms) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
window.g=g;
window.on=on;
window.val=val;
window.debounce=debounce;
const showToast = m => { let t=g('toast'); t.textContent=m; t.style.display='block'; setTimeout(()=>t.style.display='none',2200); };
function showActionToast(msg, undoFn=null){
  const wrap=g('actionToast'),txt=g('actionToastText'),undoBtn=g('actionToastUndoBtn');
  if(!wrap||!txt||!undoBtn){showToast(msg);return;}
  txt.textContent=msg;
  undoBtn.style.display=undoFn?'inline-flex':'none';
  undoBtn.onclick=()=>{
    if(typeof undoFn==='function') undoFn();
    wrap.classList.remove('open');
    clearTimeout(actionUndoTimer);
  };
  wrap.classList.add('open');
  clearTimeout(actionUndoTimer);
  actionUndoTimer=setTimeout(()=>wrap.classList.remove('open'),3200);
}

window.addEventListener('error',evt=>{
  if(window.KLawsDebug&&typeof window.KLawsDebug.shouldIgnoreRuntimeError==='function'&&window.KLawsDebug.shouldIgnoreRuntimeError({
    message:evt.message,
    filename:evt.filename
  })) return;
  if(debugRuntime) debugRuntime.reportError('window.error',evt.error||new Error(evt.message||'Unknown window error'));
});
window.addEventListener('unhandledrejection',evt=>{
  if(window.KLawsDebug&&typeof window.KLawsDebug.shouldIgnoreRuntimeError==='function'&&window.KLawsDebug.shouldIgnoreRuntimeError(evt.reason)) return;
  if(debugRuntime) debugRuntime.reportError('window.unhandledrejection',evt.reason||new Error('Unhandled rejection'));
});
let hasShownSaveFailedToast=false;
window.addEventListener('klaws:save-failed',()=>{
  if(hasShownSaveFailedToast) return;
  hasShownSaveFailedToast=true;
  showToast('儲存失敗，請稍後重試');
  setTimeout(()=>{ hasShownSaveFailedToast=false; },5000);
});

function loadFormTaxonomyPref(){
  try{
    const raw=JSON.parse(localStorage.getItem(FORM_TAXONOMY_PREF_KEY)||'{}');
    const domain=typeof raw.domain==='string'?raw.domain:'';
    const group=typeof raw.group==='string'?raw.group:'';
    const part=typeof raw.part==='string'?raw.part:'';
    return {domain,group,part};
  }catch(e){
    return {domain:'',group:'',part:''};
  }
}
function saveFormTaxonomyPref(domain='', group='', part=''){
  window.KLawsStorage.governedWriteLocal(FORM_TAXONOMY_PREF_KEY,JSON.stringify({
    domain:safeStr(domain),
    group:safeStr(group),
    part:safeStr(part)
  }));
}
function saveLastViewState(){
  const view=(currentView==='map'||currentView==='calendar'||currentView==='level')?currentView:'notes';
  const mapStack=(view==='map')?normalizeMapPageStack(mapPageStack):[];
  window.KLawsStorage.governedWriteLocal(LAST_VIEW_STATE_KEY,JSON.stringify({view,mapPageStack:mapStack}),'ephemeral');
}
function updateNotesHomeVisibility(){
  if(currentView!=='notes') return;
  const hasSearch=!!searchQ.trim()||reviewMode;
  const notesView=g('notesView');
  if(notesView) notesView.style.display=hasSearch?'block':'none';
  const subbar=g('subbar');
  if(subbar) subbar.style.display=hasSearch?'flex':'none';
  const advanced=g('filterAdvanced');
  if(advanced) advanced.style.display=hasSearch?'block':'none';
  const sb=g('search-results-bar');
  if(sb&&!hasSearch){
    sb.style.display='block';
    sb.textContent='請先使用上方搜尋欄查找筆記。';
  }
}
function restoreLastViewState(){
  let state={view:'notes',mapPageStack:[]};
  try{
    const raw=JSON.parse(localStorage.getItem(LAST_VIEW_STATE_KEY)||'{}');
    if(['notes','map','calendar','level'].includes(raw.view)) state.view=raw.view;
    if(Array.isArray(raw.mapPageStack)) state.mapPageStack=normalizeMapPageStack(raw.mapPageStack);
  }catch(e){}
  const toggles=(window.KLawsViewState&&window.KLawsViewState.getViewToggles)
    ? window.KLawsViewState.getViewToggles(window)
    : {
      toggleMapView: typeof window.toggleMapView==='function'?window.toggleMapView:null,
      toggleCalendarView: typeof window.toggleCalendarView==='function'?window.toggleCalendarView:null,
      toggleLevelSystemView: typeof window.toggleLevelSystemView==='function'?window.toggleLevelSystemView:null
    };
  if(state.view==='map'){
    if(!toggles.toggleMapView) return;
    toggles.toggleMapView(true);
    if(state.mapPageStack.length){
      mapPageStack=state.mapPageStack.slice();
      updateMapPagePath();
      nodePos={};
      forceLayout();
      drawMap();
      saveLastViewState();
    }
    return;
  }
  if(state.view==='calendar'){
    if(toggles.toggleCalendarView) toggles.toggleCalendarView(true);
    return;
  }
  if(state.view==='level'){
    if(toggles.toggleLevelSystemView) toggles.toggleLevelSystemView(true);
    return;
  }
  if(toggles.toggleMapView) toggles.toggleMapView(false);
}
function playFocusTimerAlarm(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx) return;
    const ctx=new Ctx();
    const now=ctx.currentTime;
    [0,0.18,0.36].forEach((offset,idx)=>{
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type='sine';osc.frequency.value=idx%2===0?880:660;
      gain.gain.setValueAtTime(0.0001,now+offset);
      gain.gain.exponentialRampToValueAtTime(0.18,now+offset+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+offset+0.15);
      osc.connect(gain);gain.connect(ctx.destination);
      osc.start(now+offset);osc.stop(now+offset+0.16);
    });
    setTimeout(()=>ctx.close(),1200);
  }catch(e){}
}
function updateFocusTimerDisplay(){
  const m=Math.floor(focusTimerRemainingSec/60),s=focusTimerRemainingSec%60;
  const display=g('focusTimerDisplay');
  if(display) display.textContent=`${pad2(m)}:${pad2(s)}`;
}
function stopFocusTimer(){
  clearInterval(focusTimerInterval);
  focusTimerInterval=null;
  focusTimerRunning=false;
}
function parseFocusTimerInput(raw){
  const value=safeStr(raw).trim();
  if(!value) return 25*60;
  const mmss=value.match(/^(\d{1,3}):([0-5]?\d)$/);
  if(mmss){
    const min=parseInt(mmss[1],10)||0;
    const sec=parseInt(mmss[2],10)||0;
    return Math.max(1,Math.min(180*60,min*60+sec));
  }
  const minOnly=parseInt(value,10);
  if(Number.isNaN(minOnly)) return 25*60;
  return Math.max(1,Math.min(180*60,minOnly*60));
}
function resetFocusTimer(){
  stopFocusTimer();
  focusTimerRemainingSec=parseFocusTimerInput(g('focusTimerMinutes')?.value);
  const input=g('focusTimerMinutes');
  if(input){
    const min=Math.floor(focusTimerRemainingSec/60),sec=focusTimerRemainingSec%60;
    input.value=`${min}:${pad2(sec)}`;
    input.dataset.appliedValue=input.value;
  }
  updateFocusTimerDisplay();
}
function startFocusTimer(){
  if(focusTimerRunning) return;
  const input=g('focusTimerMinutes');
  if(input&&input.value!==input.dataset.appliedValue){
    focusTimerRemainingSec=parseFocusTimerInput(input.value);
    const min=Math.floor(focusTimerRemainingSec/60),sec=focusTimerRemainingSec%60;
    input.value=`${min}:${pad2(sec)}`;
    input.dataset.appliedValue=input.value;
    updateFocusTimerDisplay();
  }
  if(focusTimerRemainingSec<=0) resetFocusTimer();
  focusTimerRunning=true;
  focusTimerInterval=setInterval(()=>{
    focusTimerRemainingSec--;
    updateFocusTimerDisplay();
    if(focusTimerRemainingSec<=0){
      stopFocusTimer();
      const alertBox=g('focusTimerAlert');
      if(alertBox) alertBox.classList.add('open');
      playFocusTimerAlarm();
      showToast('⏰ 計時結束');
    }
  },1000);
}
function clampFocusTimerPosition(x,y){
  const box=g('focusTimerBox');
  if(!box) return {x:18,y:80};
  const rect=box.getBoundingClientRect();
  const maxX=Math.max(8,window.innerWidth-rect.width-8);
  const maxY=Math.max(8,window.innerHeight-rect.height-8);
  return {
    x:Math.max(8,Math.min(maxX,x)),
    y:Math.max(8,Math.min(maxY,y))
  };
}
function applyFocusTimerPosition(x,y){
  const box=g('focusTimerBox');
  if(!box) return;
  const clamped=clampFocusTimerPosition(x,y);
  focusTimerPos.x=clamped.x;
  focusTimerPos.y=clamped.y;
  box.style.left=`${clamped.x}px`;
  box.style.top=`${clamped.y}px`;
}
function ensureFocusTimerPosition(){
  const box=g('focusTimerBox');
  if(!box) return;
  if(!focusTimerPos.initialized){
    const pad=18;
    const rect=box.getBoundingClientRect();
    const initX=Math.max(8,window.innerWidth-rect.width-pad);
    const initY=Math.max(8,80);
    applyFocusTimerPosition(initX,initY);
    focusTimerPos.initialized=true;
    return;
  }
  applyFocusTimerPosition(focusTimerPos.x??18,focusTimerPos.y??80);
}
function bindFocusTimerDrag(){
  const handle=g('focusTimerDragHandle'),box=g('focusTimerBox');
  if(!handle||!box||handle.dataset.dragBound==='1') return;
  handle.dataset.dragBound='1';
  const onPointerMove=e=>{
    if(!focusTimerDragState.active||e.pointerId!==focusTimerDragState.pointerId) return;
    e.preventDefault();
    const nextX=focusTimerDragState.originX+(e.clientX-focusTimerDragState.startX);
    const nextY=focusTimerDragState.originY+(e.clientY-focusTimerDragState.startY);
    applyFocusTimerPosition(nextX,nextY);
  };
  const endDrag=e=>{
    if(!focusTimerDragState.active||e.pointerId!==focusTimerDragState.pointerId) return;
    focusTimerDragState.active=false;
    focusTimerDragState.pointerId=null;
    handle.classList.remove('dragging');
    try{handle.releasePointerCapture(e.pointerId);}catch(_e){}
  };
  handle.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType!=='touch') return;
    ensureFocusTimerPosition();
    focusTimerDragState.active=true;
    focusTimerDragState.pointerId=e.pointerId;
    focusTimerDragState.startX=e.clientX;
    focusTimerDragState.startY=e.clientY;
    focusTimerDragState.originX=focusTimerPos.x??box.getBoundingClientRect().left;
    focusTimerDragState.originY=focusTimerPos.y??box.getBoundingClientRect().top;
    handle.classList.add('dragging');
    try{handle.setPointerCapture(e.pointerId);}catch(_e){}
    e.preventDefault();
  });
  handle.addEventListener('pointermove',onPointerMove);
  handle.addEventListener('pointerup',endDrag);
  handle.addEventListener('pointercancel',endDrag);
  window.addEventListener('resize',()=>{ if(g('focusTimerModal')?.classList.contains('open')) ensureFocusTimerPosition(); });
}
function openFocusTimer(){
  bindFocusTimerDrag();
  ensureFocusTimerPosition();
  resetFocusTimer();
  g('focusTimerModal')?.classList.add('open');
}
function renderHeaderDatetime(){
  const btn=g('headerDatetimeBtn');
  if(!btn) return;
  const now=new Date();
  btn.textContent=`${now.getFullYear()}/${pad2(now.getMonth()+1)}/${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}
function startHeaderDatetimeTicker(){
  renderHeaderDatetime();
  clearInterval(headerDatetimeTimer);
  headerDatetimeTimer=setInterval(renderHeaderDatetime,1000);
}
const getPanelDir = () => localStorage.getItem('klaws_panel_dir')==='bottom'?'bottom':'side';
const applyPanelDir = dir => {
  const next=dir==='bottom'?'bottom':'side';
  document.body.classList.toggle('panel-dir-bottom',next==='bottom');
  window.KLawsStorage.governedWriteLocal('klaws_panel_dir',next,'ephemeral');
  const btn=g('panelDirBtn');
  if(btn) btn.textContent=next==='bottom'?'↥ 底部展開':'↤ 右側展開';
};
const togglePanelDir = () => {
  const next=getPanelDir()==='side'?'bottom':'side';
  const openPanelIds=['dp','fp','tp'].filter(id=>g(id)?.classList.contains('open'));
  applyPanelDir(next);
  if(openPanelIds.length){
    openPanelIds.forEach(id=>g(id)?.classList.remove('open'));
    requestAnimationFrame(()=>{
      openPanelIds.forEach(id=>g(id)?.classList.add('open'));
      syncSidePanelState();
    });
  }
  showToast(next==='bottom'?'已切換為底部展開':'已切換為右側展開');
};
let _saveDeferredPromise=null;
const saveDataDeferred = () => {
  clearTimeout(_saveTimer);
  _saveDeferredPromise=null;
  _saveTimer=setTimeout(()=>{
    const runSave=async()=>{
      if(JSON.stringify({notes,links}).length>4500000) showToast('⚠️ 資料接近儲存上限');
      return saveData();
    };
    _saveDeferredPromise=runSave().finally(()=>{ _saveDeferredPromise=null; });
  },500);
};
const flushDeferredSave = async () => {
  if(_saveTimer){
    clearTimeout(_saveTimer);
    _saveTimer=null;
    const runSave=async()=>saveData();
    _saveDeferredPromise=runSave().finally(()=>{ _saveDeferredPromise=null; });
  }
  if(_saveDeferredPromise) return _saveDeferredPromise;
  return null;
};
const DRAFT_SAVE_THROTTLE_MS = 100;
let _draftSaveTimer = null;
let _draftSavePromise = null;
let _draftSaveResolve = null;
const runDraftSave = async () => {
  try {
    const result=await saveData({includeTransient:false});
    if(result&&result.ok===false) showToast('草稿尚未寫入，請勿關閉');
    return result;
  } catch(err){
    showToast('草稿尚未寫入，請勿關閉');
    console.error('[draft-save-error]',err);
    return {ok:false,store:'none',error:err,code:'DRAFT_SAVE_ERROR'};
  }
};
const clearDraftSavePromise = promise => {
  if(_draftSavePromise===promise){
    _draftSavePromise=null;
    _draftSaveResolve=null;
  }
};
const resolveDraftSaveWith = savePromise => {
  const pending=_draftSavePromise;
  const resolve=_draftSaveResolve;
  savePromise.then(result=>{ if(resolve) resolve(result); })
    .finally(()=>clearDraftSavePromise(pending));
  return pending||savePromise;
};
const queueDraftImmediateSave = () => {
  if(_draftSaveTimer) return _draftSavePromise;
  if(_draftSavePromise){
    let promise;
    promise=_draftSavePromise.then(()=>runDraftSave()).finally(()=>clearDraftSavePromise(promise));
    _draftSavePromise=promise;
    return promise;
  }
  let promise;
  promise=new Promise(resolve=>{
    _draftSaveResolve=resolve;
    _draftSaveTimer=setTimeout(()=>{
      _draftSaveTimer=null;
      resolveDraftSaveWith(runDraftSave());
    },DRAFT_SAVE_THROTTLE_MS);
  });
  _draftSavePromise=promise;
  return promise;
};
const flushDraftSave = async () => {
  if(_draftSaveTimer){
    clearTimeout(_draftSaveTimer);
    _draftSaveTimer=null;
    resolveDraftSaveWith(runDraftSave());
  }
  if(_draftSavePromise) return _draftSavePromise;
  return null;
};
const savePathChange = async ({mode='final'}={}) => {
  if(mode==='draft'){
    return queueDraftImmediateSave();
  }
  await flushDeferredSave();
  return await saveData();
};
const typeByKey = k => k?(types.find(t=>t.key===k)||{key:k,label:k,color:'#888'}):{key:'',label:'無',color:'#888'};
const subByKey = k => k?(domains.find(s=>s.key===k)||{key:k,label:k,color:'#888'}):{key:'',label:'無',color:'#888'};
const groupByKey = k => k?(groups.find(c=>c.key===k)||{key:k,label:k,domain:'all'}):{key:'',label:'無',domain:'all'};
const partByKey = k => k?(parts.find(s=>s.key===k)||{key:k,label:k,group:'all'}):{key:'',label:'無',group:'all'};
const noteScopeKeys = (n,arrKey,singleKey) => {
  const arr=Array.isArray(n&&n[arrKey])?n[arrKey].filter(Boolean):[];
  return uniq(arr.length?arr:((n&&n[singleKey])?[n[singleKey]]:[]));
};
const notePathSegments = n => safeStr(n&&n.path).split(/[/>＞，、。]/).map(x=>x.trim()).filter(Boolean);
const notePathKey = n => notePathSegments(n).join('>');
const isPathPrefixMatch = (parentPath, childPath) => {
  const parentSegs=notePathSegments({path:parentPath});
  const childSegs=notePathSegments({path:childPath});
  if(!parentSegs.length||childSegs.length<=parentSegs.length) return false;
  return parentSegs.every((seg,idx)=>seg===childSegs[idx]);
};
const noteDomains = n => {
  const legacy=noteScopeKeys(n,'domains','domain');
  if(legacy.length) return legacy;
  const segs=notePathSegments(n);
  return segs[0]?[segs[0]]:[];
};
const noteGroups = n => {
  const legacy=noteScopeKeys(n,'groups','group');
  if(legacy.length) return legacy;
  const segs=notePathSegments(n);
  return segs[1]?[segs[1]]:[];
};
const noteParts = n => {
  const legacy=noteScopeKeys(n,'parts','part');
  if(legacy.length) return legacy;
  const segs=notePathSegments(n);
  return segs[2]?[segs[2]]:[];
};
const noteDomainText = n => noteDomains(n).join(' ');
const noteGroupText = n => noteGroups(n).join(' ');
const notePartText = n => noteParts(n).join(' ');
const mapHasTaxonomyFilter = () => (mapFilter.sub!=='all'||mapFilter.group!=='all'||mapFilter.part!=='all');
const intersects = (arr1,arr2) => arr1.some(x=>arr2.includes(x));
const TAG_COLLECTIONS = {type:()=>types, sub:()=>domains, domain:()=>domains, group:()=>groups, part:()=>parts};
const tagCollection = kind => (TAG_COLLECTIONS[kind]||(()=>[]))();
const tagUsageCount = (kind,key) => {
  if(kind==='type') return notes.filter(n=>n.type===key).length;
  if(kind==='sub') return [...notes,...mapAuxNodes].filter(n=>noteDomains(n).includes(key)).length;
  if(kind==='part') return [...notes,...mapAuxNodes].filter(n=>noteParts(n).includes(key)).length;
  return [...notes,...mapAuxNodes].filter(n=>noteGroups(n).includes(key)).length;
};
const noteById = id => notes.find(n=>n.id===id);
const auxnodeById = id => mapAuxNodes.find(n=>n.id===id);
const mapNodeById = id => noteById(id)||auxnodeById(id);
const allMapNodes = () => [...notes,...mapAuxNodes];
const isAuxnodeNode = n => !!(n&&n.kind==='auxnode');
const noteTags = _n => [];
const noteHasVisibleContent = n => !!(safeStr(n.question).trim()||safeStr(n.answer).trim()||safeStr(n.application).trim()||safeStr(n.body).trim()||safeStr(n.detail).trim()||noteTags(n).length||(Array.isArray(n.todos)&&n.todos.length));
const noteExtraFields = n => (n&&n.extraFields&&typeof n.extraFields==='object'&&!Array.isArray(n.extraFields))?n.extraFields:{};
const getFieldDef = key => {
  const builtin=BUILTIN_FIELD_DEFS[key];
  const custom=customFieldDefs[key];
  if(builtin&&custom) return {...builtin,...custom,key};
  return builtin||custom||{key,label:key,kind:'text',placeholder:''};
};
const getTypeFieldKeys = typeKey => {
  const base=Array.isArray(typeFieldConfigs[typeKey])&&typeFieldConfigs[typeKey].length?typeFieldConfigs[typeKey]:(DEFAULT_TYPE_FIELD_KEYS[typeKey]||DEFAULT_NORMAL_FIELD_KEYS);
  return uniq(base.filter(k=>getFieldDef(k)));
};
const renderFieldValue = (n,key) => {
  if(key==='question') return n.question||'';
  if(key==='answer') return n.answer||'';
  if(key==='prompt') return n.prompt||'';
  if(key==='application') return n.application||'';
  if(key==='body') return n.body||'';
  if(key==='detail') return n.detail||'';
  if(key==='todos') return renderTodoHtml(n.todos);
  return noteExtraFields(n)[key]||'';
};
const mapCardFieldText = (n,key) => {
  if(key==='todos'){
    const list=(Array.isArray(n&&n.todos)?n.todos:[]).filter(t=>t&&safeStr(t.text).trim());
    return list.map(t=>`${t.done?'✅':'⬜'} ${safeStr(t.text).trim()}`).join('\n');
  }
  return safeStr(renderFieldValue(n,key)).trim();
};
const renderMapCardPreview = n => {
  const keys=getTypeFieldKeys(n.type).filter(key=>key!=='tags');
  const parts=keys.map(key=>mapCardFieldText(n,key)).filter(text=>!!text);
  if(!parts.length) return '';
  return parts.map(text=>`<div class="map-card-body-segment"><div class="map-card-body-text">${escapeHtml(text)}</div></div>`).join('');
};
const noteFieldValueForEdit = (n,key) => {
  if(key==='question') return n.question||'';
  if(key==='answer') return n.answer||'';
  if(key==='prompt') return n.prompt||'';
  if(key==='application') return n.application||'';
  if(key==='body') return n.body||'';
  if(key==='detail') return n.detail||'';
  if(key==='todos') return formatTodosForEdit(n.todos);
  return noteExtraFields(n)[key]||'';
};
const relationMetaByKey = key => RELATION_TYPE_META[key]||{label:key||'cause',color:LINK_COLOR};
const normalizeRelationType = key => RELATION_TYPE_META[key]?key:'cause';
const relationLabel = key => relationMetaByKey(normalizeRelationType(key)).label;
const relationColor = key => relationMetaByKey(normalizeRelationType(key)).color;
const relationNeedsNote = key => !!relationMetaByKey(normalizeRelationType(key)).needsNote;
const relationNotePlaceholder = key => relationMetaByKey(normalizeRelationType(key)).notePlaceholder||'請輸入關聯說明';
const normalizeRelationNote = value => safeStr(value).trim();
const splitNotePath = raw => safeStr(raw).split(/[>＞，、。]/).map(x=>x.trim()).filter(Boolean);
const normalizePathText = raw => splitNotePath(raw).join(' > ');
const normalizeMapPageStack = stack => {
  if(!Array.isArray(stack)) return [];
  const deduped=[];
  const seen=new Set();
  stack.forEach(v=>{
    const id=parseInt(v,10);
    if(!Number.isFinite(id)||seen.has(id)||!mapNodeById(id)) return;
    deduped.push(id);
    seen.add(id);
  });
  return deduped.slice(-12);
};
const buildPathAliasMap = () => {
  const map={};
  [...notes,...mapAuxNodes].forEach(n=>{
    const full=normalizePathText(n.path||'');
    if(!full) return;
    const parts=splitNotePath(full);
    const leaf=parts[parts.length-1];
    if(leaf) map[leaf]=full;
  });
  return map;
};
const resolvePathInput = raw => {
  const normalized=normalizePathText(raw);
  if(!normalized) return '';
  const parts=splitNotePath(raw);
  if(parts.length>1) return normalized;
  const aliases=buildPathAliasMap();
  return aliases[normalized]||normalized;
};
const nextReviewDateISO = (status='knew', now=new Date()) => {
  const day=REVIEW_INTERVALS_DAYS[status]||REVIEW_INTERVALS_DAYS.knew;
  const ts=now.getTime()+day*24*60*60*1000;
  return new Date(ts).toISOString();
};
const isNoteDueForReview = (n, now=new Date()) => {
  if(!n) return false;
  const nextTs=new Date(n.next_review||0).getTime();
  if(Number.isNaN(nextTs)) return true;
  return nextTs<=now.getTime();
};
const dueReviewNotes = (now=new Date()) => notes.filter(n=>isNoteDueForReview(n,now)).sort((a,b)=>new Date(a.next_review||0)-new Date(b.next_review||0));
const hexRgb = hex => { if(hex.length===4) hex='#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3]; return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]; };
const lightC = hex => `rgba(${hexRgb(hex).join(',')},0.12)`;
const darkC = hex => { let r=hexRgb(hex); return `rgb(${Math.round(r[0]*.55)},${Math.round(r[1]*.55)},${Math.round(r[2]*.55)})`; };
const getAiKey = () => localStorage.getItem('klaws_ai_key')||'';
const saveAiKey = k => window.KLawsStorage.governedWriteLocal('klaws_ai_key',k,'core');
const getAiModel = () => localStorage.getItem('klaws_ai_model')||'openrouter/free';
const saveAiModel = m => window.KLawsStorage.governedWriteLocal('klaws_ai_model',m,'ephemeral');
const getAiProvider = () => localStorage.getItem('klaws_ai_provider')||'openrouter';
const saveAiProvider = p => window.KLawsStorage.governedWriteLocal('klaws_ai_provider',p,'ephemeral');
const getMapScopeContextKey = () => {
  const pageRoot=mapPageStack.length?mapPageStack[mapPageStack.length-1]:'root';
  return `${mapFilter.sub||'all'}::${mapFilter.group||'all'}::${mapFilter.part||'all'}::${pageRoot}`;
};
const getMapCenterContextKey = () => {
  const pageRoot=mapPageStack.length?mapPageStack[mapPageStack.length-1]:'root';
  return String(pageRoot);
};
const getMapCollapseContextKey = getMapScopeContextKey;
const mapCollapseKey = noteId => `${getMapCollapseContextKey()}::${noteId}`;
const getCollapsedNodesForCurrentContext = () => {
  const keyPrefix=`${getMapCollapseContextKey()}::`, collapsed={};
  Object.keys(mapCollapsed||{}).forEach(key=>{
    if(!mapCollapsed[key]||typeof key!=='string'||!key.startsWith(keyPrefix)) return;
    const id=parseInt(key.slice(keyPrefix.length),10);
    if(Number.isFinite(id)) collapsed[id]=true;
  });
  return collapsed;
};
const isMapNodeCollapsed = noteId => !!mapCollapsed[mapCollapseKey(noteId)];
const mapSubpageContextKey = () => 'global';
const mapSubpageKey = noteId => `${mapSubpageContextKey()}::${noteId}`;
const mapPageNoteKey = rootId => {
  if(rootId===undefined||rootId===null||rootId==='root') return 'root';
  if(isPathPageKey(rootId)) return String(rootId);
  const numericRootId=parseInt(rootId,10);
  return Number.isFinite(numericRootId)?String(numericRootId):'root';
};
const findSubpageKeyByNoteId = noteId => {
  const exactKey=mapSubpageKey(noteId);
  if(mapSubpages[exactKey]) return exactKey;
  const suffix=`::${noteId}`;
  return Object.keys(mapSubpages||{}).find(key=>key.endsWith(suffix))||null;
};
const hasSubpageForNode = noteId => {
  const node=mapNodeById(noteId);
  const path=notePathKey(node);
  if(!path) return false;
  return notes.some(n=>n.id!==noteId&&isPathPrefixMatch(path,n.path||''));
};
const removeSubpageForNode = noteId => {
  const key=findSubpageKeyByNoteId(noteId);
  if(!key) return false;
  delete mapSubpages[key];
  return true;
};
const normalizeMapSubpages = raw => {
  const src=(raw&&typeof raw==='object'&&!Array.isArray(raw))?raw:{}, next={};
  Object.keys(src).forEach(key=>{
    const noteId=parseInt(String(key).split('::').pop(),10);
    if(!Number.isFinite(noteId)) return;
    const item=(src[key]&&typeof src[key]==='object'&&!Array.isArray(src[key]))?src[key]:{};
    const normalizedKey=mapSubpageKey(noteId);
    if(next[normalizedKey]) return;
    const noteIdsRaw=Array.isArray(item.noteIds)?item.noteIds:[];
    const noteIds=[...new Set(noteIdsRaw.map(v=>parseInt(v,10)).filter(Number.isFinite).filter(v=>v!==noteId))];
    next[normalizedKey]={...item,rootId:noteId,createdAt:item.createdAt||new Date().toISOString(),noteIds};
  });
  return next;
};
const normalizeMapPageNotes = raw => {
  const src=(raw&&typeof raw==='object'&&!Array.isArray(raw))?raw:{}, next={root:[]};
  Object.keys(src).forEach(key=>{
    const normalizedKey=mapPageNoteKey(key);
    const noteIdsRaw=Array.isArray(src[key])?src[key]:[];
    next[normalizedKey]=[...new Set(noteIdsRaw.map(v=>parseInt(v,10)).filter(Number.isFinite))];
  });
  return next;
};
const getMapPageAssignedIds = rootId => {
  const resolvedRootId=rootId===undefined?currentSubpageRootId():rootId;
  const rootNode=mapNodeById(resolvedRootId);
  const rootPath=notePathKey(rootNode);
  if(rootPath){
    const rootSegs=notePathSegments({path:rootPath});
    const rootDepth=rootSegs.length;
    const pathIds=notes
      .filter(n=>{
        const segs=notePathSegments(n);
        if(!segs.length) return false;
        const isSelf=n.id===resolvedRootId;
        const isPrefix=rootSegs.every((seg,idx)=>segs[idx]===seg);
        const withinOneLevel=segs.length<=rootDepth+1;
        return isSelf||(isPrefix&&withinOneLevel);
      })
      .map(n=>n.id);
    return new Set(pathIds);
  }
  const key=mapPageNoteKey(resolvedRootId);
  const arr=Array.isArray(mapPageNotes[key])?mapPageNotes[key]:[];
  const ids=new Set(arr.map(v=>parseInt(v,10)).filter(Number.isFinite));
  const numericRootId=parseInt(key,10);
  if(Number.isFinite(numericRootId)&&mapNodeById(numericRootId)) ids.add(numericRootId);
  const queue=[...ids];
  while(queue.length){
    const parentId=queue.shift();
    links.forEach(link=>{
      if(link.from!==parentId) return;
      const childId=parseInt(link.to,10);
      if(!Number.isFinite(childId)||!mapNodeById(childId)||ids.has(childId)) return;
      ids.add(childId);
      queue.push(childId);
    });
  }
  return ids;
};
const setMapPageAssignedIds = (rootId,noteIds=[]) => {
  const key=mapPageNoteKey(rootId===undefined?currentSubpageRootId():rootId);
  const ids=new Set((noteIds||[]).map(v=>parseInt(v,10)).filter(Number.isFinite));
  const numericRootId=parseInt(key,10);
  if(Number.isFinite(numericRootId)&&mapNodeById(numericRootId)) ids.add(numericRootId);
  mapPageNotes[key]=[...ids];
};
const assignNoteToMapPage = (noteId,rootId) => {
  const nid=parseInt(noteId,10);
  if(!Number.isFinite(nid)||!mapNodeById(nid)) return false;
  const ids=getMapPageAssignedIds(rootId);
  if(ids.has(nid)) return false;
  ids.add(nid);
  setMapPageAssignedIds(rootId,[...ids]);
  return true;
};
const unassignNoteFromMapPage = (noteId,rootId) => {
  const nid=parseInt(noteId,10);
  if(!Number.isFinite(nid)) return false;
  const resolvedRootId=rootId===undefined?currentSubpageRootId():rootId;
  const key=mapPageNoteKey(resolvedRootId);
  const numericRootId=parseInt(key,10);
  if(Number.isFinite(numericRootId)&&numericRootId===nid) return false;
  const ids=getMapPageAssignedIds(resolvedRootId);
  if(!ids.has(nid)) return false;
  ids.delete(nid);
  setMapPageAssignedIds(resolvedRootId,[...ids]);
  return true;
};
const normalizeMapCollapsed = raw => {
  const src=(raw&&typeof raw==='object'&&!Array.isArray(raw))?raw:{}, next={};
  const legacyPrefix='all::all::all::root::';
  Object.keys(src).forEach(key=>{
    if(!src[key]) return;
    let normalizedKey=String(key);
    if(/^\d+$/.test(normalizedKey)) normalizedKey=`${legacyPrefix}${normalizedKey}`;
    const noteId=parseInt(normalizedKey.split('::').pop(),10);
    if(!Number.isFinite(noteId)) return;
    if(!normalizedKey.includes('::')) return;
    next[normalizedKey]=true;
  });
  return next;
};
const currentSubpageRootId = () => mapPageStack.length?mapPageStack[mapPageStack.length-1]:null;
const isInMapSubpage = () => !!currentSubpageRootId();
const auxnodePageRootId = auxnode => {
  const raw=(auxnode&&auxnode.pageRootId!==undefined&&auxnode.pageRootId!==null)?parseInt(auxnode.pageRootId,10):NaN;
  return Number.isFinite(raw)?raw:null;
};
function isNodeInCurrentMapPage(nodeId){
  const node=mapNodeById(nodeId);
  if(!node) return false;
  return getMapPageAssignedIds().has(nodeId);
}
const isNodeInCurrentSubpage = noteId => {
  return isNodeInCurrentMapPage(noteId);
};
const mapTitleMarkers = noteId => {
  const marks=[];
  if(getMapCentersFromScopes().includes(noteId)) marks.push('⭐️');
  if(hasSubpageForNode(noteId)) marks.push('△');
  return marks.join('');
};
const normalizeCenterIds = raw => {
  if(Array.isArray(raw)) return uniq(raw.map(v=>parseInt(v,10)).filter(id=>Number.isFinite(id)&&!!mapNodeById(id)));
  const single=parseInt(raw,10);
  return Number.isFinite(single)&&!!mapNodeById(single)?[single]:[];
};
const getMapCentersFromScopes = () => {
  const key=getMapCenterContextKey();
  const scopedIds=normalizeCenterIds(mapCenterNodeIds[key]);
  if(scopedIds.length) return scopedIds;
  return normalizeCenterIds(mapCenterNodeId);
};
const getMapCenterFromScopes = () => getMapCentersFromScopes()[0]||null;
const setMapCenterForCurrentScope = (id,opt={}) => {
  if(!Number.isFinite(id)) return;
  const {updateGlobal=false,append=false}=opt||{};
  const key=getMapCenterContextKey();
  const next=append?uniq([...normalizeCenterIds(mapCenterNodeIds[key]),id]):[id];
  mapCenterNodeIds[key]=next;
  if(updateGlobal) mapCenterNodeId=id;
};
const toggleMapCenterForCurrentScope = (id,opt={}) => {
  if(!Number.isFinite(id)) return false;
  const {updateGlobal=false}=opt||{};
  const key=getMapCenterContextKey();
  const prev=normalizeCenterIds(mapCenterNodeIds[key]);
  const exists=prev.includes(id);
  const next=exists?prev.filter(v=>v!==id):uniq([...prev,id]);
  mapCenterNodeIds[key]=next.length?next:[id];
  if(updateGlobal) mapCenterNodeId=id;
  return !exists;
};
const setMapCenterForSubpageScope = (subpageRootId,id,opt={}) => {
  const root=parseInt(subpageRootId,10),target=parseInt(id,10);
  if(!Number.isFinite(root)||!Number.isFinite(target)) return;
  const prevStack=[...mapPageStack];
  mapPageStack=[...prevStack.filter(Number.isFinite),root];
  setMapCenterForCurrentScope(target,opt);
  mapPageStack=prevStack;
};
const getPayload = (opt={}) => {
  const {includeTransient=true}=opt||{};
  const payload={notes,mapAuxNodes,links,nid,lid,types,domains,groups,parts,nodeSizes,sortMode,mapCenterNodeId,mapCenterNodeIds,mapFilter,mapLinkedOnly,mapDepth,mapFocusMode,mapLaneConfigs,mapSubpages,mapPageNotes,mapPageStack:normalizeMapPageStack(mapPageStack),typeFieldConfigs,customFieldDefs,calendarEvents,calendarSettings,levelSystem,panelDir:getPanelDir(),rev:Number(window.__klawsDataRev)||0,updatedAt:new Date().toISOString()};
  if(includeTransient){
    payload.nodePos=nodePos;
    payload.mapOffX=mapOffX;
    payload.mapOffY=mapOffY;
    payload.mapScale=mapScale;
    payload.mapCollapsed=mapCollapsed;
  }
  return payload;
};
const persistMapCriticalState = async () => {
  await flushDeferredSave();
  return saveData({includeTransient:false});
};
const parseUpdatedAt = raw => {
  const n=Date.parse(raw||'');
  return Number.isFinite(n)?n:0;
};
const laneContextKey = () => `${mapFilter.sub||'all'}`;
const getLaneConfig = () => {
  const key=laneContextKey();
const raw=mapLaneConfigs[key]||{};
  const count=normalizeLaneCount(raw.count||((Array.isArray(raw.names)&&raw.names.length)||DEFAULT_LANE_NAMES.length));
  const names=Array.from({length:count},(_,idx)=>((raw.names&&raw.names[idx])||'').trim()||defaultLaneNameAt(idx));
  mapLaneConfigs[key]={count,names};
  return {key,count,names};
};
const estimateMapTextLines = (text, charsPerLine) => {
  const rows=safeStr(text).split('\n');
  return rows.reduce((sum,row)=>sum+Math.max(1,Math.ceil((row.length||1)/charsPerLine)),0);
};
const mapCardBoxCache = {};
let mapCardMeasureHost = null;
const clearMapCardBoxCache = () => {
  Object.keys(mapCardBoxCache).forEach(key=>delete mapCardBoxCache[key]);
};
const ensureMapCardMeasureHost = () => {
  if(typeof document==='undefined'||!document.body) return null;
  if(mapCardMeasureHost&&mapCardMeasureHost.isConnected) return mapCardMeasureHost;
  mapCardMeasureHost=document.createElement('div');
  mapCardMeasureHost.setAttribute('aria-hidden','true');
  mapCardMeasureHost.style.cssText='position:absolute;left:-99999px;top:-99999px;visibility:hidden;pointer-events:none;z-index:-1;';
  document.body.appendChild(mapCardMeasureHost);
  return mapCardMeasureHost;
};
const mapCardMeasurementSignature = () => {
  if(typeof window==='undefined'||typeof document==='undefined') return 'default';
  const rootFont=window.getComputedStyle(document.documentElement).fontSize||'';
  const bodyFont=document.body?window.getComputedStyle(document.body).fontSize:'';
  return `${rootFont}|${bodyFont}|${window.devicePixelRatio||1}`;
};
const measureMapCardHeight = (note,width,markedTitle,previewHtml) => {
  const host=ensureMapCardMeasureHost();
  if(!host) return null;
  host.innerHTML=`<div class="map-card-inner" style="width:${width}px">
    <div class="map-card-head"><span class="map-card-title">${escapeHtml(markedTitle)}</span></div>
    ${previewHtml}
  </div>`;
  const cardEl=host.firstElementChild;
  if(!cardEl) return null;
  const rect=cardEl.getBoundingClientRect();
  if(!rect||!Number.isFinite(rect.height)) return null;
  return Math.ceil(rect.height);
};
const getMapCardBox = id => {
  const scale=Math.max(0.7,Math.min(2.3,getNodeRadius(id)/MAP_NODE_RADIUS_DEFAULT));
  const width=Math.round(420*0.7*scale);
  const note=mapNodeById(id)||{};
  const markedTitle=`${mapTitleMarkers(id)}${note.title||'（未命名）'}`;
  const previewHtml=renderMapCardPreview(note);
  const measureSig=mapCardMeasurementSignature();
  const cacheKey=`${width}::${markedTitle}::${previewHtml}::${measureSig}`;
  if(mapCardBoxCache[id]&&mapCardBoxCache[id].key===cacheKey) return mapCardBoxCache[id].value;
  if(previewHtml){
    const measuredHeight=measureMapCardHeight(note,width,markedTitle,previewHtml);
    if(Number.isFinite(measuredHeight)){
      const value={width,height:Math.max(60,Math.round(measuredHeight)),bodyLines:0};
      mapCardBoxCache[id]={key:cacheKey,value};
      return value;
    }
  }
  const keys=getTypeFieldKeys(note.type).filter(key=>key!=='tags');
  const previewTexts=keys.map(key=>mapCardFieldText(note,key)).filter(text=>!!text);
  if(!previewTexts.length){
    const value={width,height:60,bodyLines:0};
    mapCardBoxCache[id]={key:cacheKey,value};
    return value;
  }
  const charsPerLine=Math.max(9,Math.floor((width-24)/10));
  const bodyLines=previewTexts.reduce((sum,text)=>sum+estimateMapTextLines(text,charsPerLine),0);
  const segmentExtra=Math.max(0,previewTexts.length-1)*9;
  const height=Math.round(86+bodyLines*18+segmentExtra);
  const value={width,height,bodyLines};
  mapCardBoxCache[id]={key:cacheKey,value};
  return value;
};
const ensureUsageStart = () => {
  const raw=localStorage.getItem(USAGE_START_KEY);
  if(raw&&Number.isFinite(Date.parse(raw))) return raw;
  const now=new Date().toISOString();
  window.KLawsStorage.governedWriteLocal(USAGE_START_KEY,now,'ephemeral');
  return now;
};
const formatUsageDuration = (startRaw,endRaw=new Date()) => {
  const start=new Date(startRaw),end=new Date(endRaw);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start) return '0分鐘';
  const mins=Math.floor((end-start)/60000);
  if(mins<60) return `${mins}分鐘`;
  const years=end.getFullYear()-start.getFullYear();
  const months=end.getMonth()-start.getMonth();
  const days=end.getDate()-start.getDate();
  const hours=end.getHours()-start.getHours();
  const minutes=end.getMinutes()-start.getMinutes();
  let y=years,m=months,d=days,h=hours,min=minutes;
  if(min<0){min+=60;h--;}
  if(h<0){h+=24;d--;}
  if(d<0){
    const prevMonthEnd=new Date(end.getFullYear(),end.getMonth(),0).getDate();
    d+=prevMonthEnd;m--;
  }
  if(m<0){m+=12;y--;}
  const parts=[];
  if(y>0) parts.push(`${y}年`);
  if(m>0) parts.push(`${m}月`);
  if(d>0) parts.push(`${d}天`);
  if(!parts.length&&h>0) parts.push(`${h}小時`);
  if(!parts.length&&min>=0) parts.push(`${min}分鐘`);
  return parts.join('');
};

const usageMinutesSinceStart = () => Math.max(0,Math.floor((new Date()-new Date(ensureUsageStart()))/60000));
const doneTodoCount = todos => (Array.isArray(todos)?todos:[]).filter(t=>t&&t.done&&safeStr(t.text).trim()).length;
const difficultyRank=d=>({E:1,N:2,H:3}[d]||1);
const skillXpRequired=level=>Math.round(28+Math.max(1,level)*10);
const getSkillStage=(lvl=0)=>LEVEL_STAGES.find(s=>lvl>=s.min&&lvl<=s.max)?.rank||'E';

function normalizeLevelSystem(){
  const fallbackSettings={xpByDifficulty:{E:30,N:55,H:90},xpBoost150Applied:true};
  if(!levelSystem||typeof levelSystem!=='object'||Array.isArray(levelSystem)) levelSystem={skills:[],tasks:[],settings:{...fallbackSettings}};
  if(!Array.isArray(levelSystem.skills)) levelSystem.skills=[];
  if(!Array.isArray(levelSystem.tasks)) levelSystem.tasks=[];
  if(!levelSystem.settings||typeof levelSystem.settings!=='object'||Array.isArray(levelSystem.settings)) levelSystem.settings={...fallbackSettings};
  const xpByDifficulty=(levelSystem.settings.xpByDifficulty&&typeof levelSystem.settings.xpByDifficulty==='object'&&!Array.isArray(levelSystem.settings.xpByDifficulty))
    ? levelSystem.settings.xpByDifficulty
    : {};
  levelSystem.settings.xpByDifficulty={
    E:Math.max(1,parseInt(xpByDifficulty.E,10)||fallbackSettings.xpByDifficulty.E),
    N:Math.max(1,parseInt(xpByDifficulty.N,10)||fallbackSettings.xpByDifficulty.N),
    H:Math.max(1,parseInt(xpByDifficulty.H,10)||fallbackSettings.xpByDifficulty.H)
  };
  if(typeof levelSystem.settings.xpBoost150Applied!=='boolean') levelSystem.settings.xpBoost150Applied=true;
  levelSystem.skills=levelSystem.skills.filter(skill=>skill&&typeof skill==='object').map((skill,idx)=>({
    ...skill,
    id:(skill.id===undefined||skill.id===null)?`skill_${idx}_${Date.now()}`:skill.id,
    name:safeStr(skill.name||'未命名技能').trim()||'未命名技能',
    level:Math.max(1,Math.min(100,parseInt(skill.level,10)||1)),
    xp:Math.max(0,parseInt(skill.xp,10)||0),
    lastDoneByDiff:(skill.lastDoneByDiff&&typeof skill.lastDoneByDiff==='object'&&!Array.isArray(skill.lastDoneByDiff))?skill.lastDoneByDiff:{},
    lastDecayAt:(typeof skill.lastDecayAt==='string'&&skill.lastDecayAt)?skill.lastDecayAt:new Date().toISOString()
  }));
  levelSystem.tasks=levelSystem.tasks.filter(task=>task&&typeof task==='object').map((task,idx)=>({
    ...task,
    id:(task.id===undefined||task.id===null)?`task_${idx}_${Date.now()}`:task.id,
    title:safeStr(task.title||'未命名任務').trim()||'未命名任務',
    difficulty:['E','N','H'].includes(task.difficulty)?task.difficulty:'N',
    completions:Math.max(0,parseInt(task.completions,10)||0),
    repeatCycle:TASK_REPEAT_OPTIONS.some(opt=>opt.key===task.repeatCycle)?task.repeatCycle:'daily',
    subtasks:Array.isArray(task.subtasks)?task.subtasks.filter(sub=>sub&&typeof sub==='object').map(sub=>({
      ...sub,
      title:safeStr(sub.title||'').trim(),
      done:!!sub.done,
      difficulty:['E','N','H'].includes(sub.difficulty)?sub.difficulty:'N'
    })):[]
  }));
}



const getTaskRepeatLabel=cycle=>TASK_REPEAT_OPTIONS.find(opt=>opt.key===cycle)?.label||'每日';
const getSubtaskXpGain = difficulty => Math.max(1,levelSystem.settings.xpByDifficulty[difficulty]||Math.round(BASE_XP_BY_DIFFICULTY[difficulty||'N']*XP_BOOST_MULTIPLIER));
function snapshotSkill(skill){
  return {level:skill.level||1,xp:skill.xp||0,lastDoneByDiff:{...(skill.lastDoneByDiff||{})},lastDecayAt:skill.lastDecayAt||''};
}
function restoreSkill(skill,state){
  if(!skill||!state) return;
  skill.level=Math.max(0,Math.min(100,parseInt(state.level,10)||1));
  skill.xp=Math.max(0,parseInt(state.xp,10)||0);
  skill.lastDoneByDiff=(state.lastDoneByDiff&&typeof state.lastDoneByDiff==='object')?{...state.lastDoneByDiff}:{};
  skill.lastDecayAt=state.lastDecayAt||skill.lastDecayAt||new Date().toISOString();
}
function getTaskCycleKey(task,date=new Date()){
  const dt=new Date(date);
  if(!Number.isFinite(dt.getTime())) return '';
  if(task.repeatCycle==='every3days') return `3d-${Math.floor(dt.getTime()/86400000/3)}`;
  if(task.repeatCycle==='weekly'){
    const copy=new Date(dt);
    const day=(copy.getDay()+6)%7;
    copy.setDate(copy.getDate()-day);
    return `w-${copy.getFullYear()}-${pad2(copy.getMonth()+1)}-${pad2(copy.getDate())}`;
  }
  if(task.repeatCycle==='monthly') return `m-${dt.getFullYear()}-${pad2(dt.getMonth()+1)}`;
  if(task.repeatCycle==='yearly') return `y-${dt.getFullYear()}`;
  return `d-${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
}
function isTaskCompletedInCurrentCycle(task){
  const last=Date.parse(task.lastCompletedAt||'');
  if(!Number.isFinite(last)) return false;
  return getTaskCycleKey(task,new Date(last))===getTaskCycleKey(task,new Date());
}
function isSubtaskCompletedInCurrentCycle(task,subtask){
  const last=Date.parse(subtask.lastCompletedAt||'');
  if(!Number.isFinite(last)) return false;
  return getTaskCycleKey(task,new Date(last))===getTaskCycleKey(task,new Date());
}
function getSkillDecayRule(skillLevel){
  const stage=getSkillStage(skillLevel);
  if(stage==='E'||stage==='F') return {days:1,levels:1,difficulty:'E'};
  if(stage==='D') return {days:1,levels:1,difficulty:'N'};
  if(stage==='C') return {days:3,levels:3,difficulty:'N'};
  if(stage==='B'||stage==='B+') return {days:7,levels:5,difficulty:'H'};
  if(stage==='A'||stage==='A+') return {days:30,levels:10,difficulty:'H'};
  return {days:365,levels:20,difficulty:'H'};
}
function getSkillDecayStatus(skill){
  const rule=getSkillDecayRule(skill.level);
  const lastBy=skill.lastDoneByDiff||{};
  const candidates=['E','N','H'].filter(d=>difficultyRank(d)>=difficultyRank(rule.difficulty)).map(d=>Date.parse(lastBy[d]||0)).filter(Number.isFinite);
  if(!candidates.length) return {...rule,daysLeft:rule.days,lastActiveAt:null};
  const lastActive=Math.max(...candidates);
  const elapsedDays=Math.floor((Date.now()-lastActive)/86400000);
  return {...rule,daysLeft:Math.max(0,rule.days-elapsedDays),lastActiveAt:lastActive};
}
function applySkillDecay(){
  const now=Date.now();
  levelSystem.skills.forEach(skill=>{
    const rule=getSkillDecayRule(skill.level);
    const needMs=rule.days*86400000;
    const lastBy=skill.lastDoneByDiff||{};
    const candidates=['E','N','H'].filter(difficulty=>difficultyRank(difficulty)>=difficultyRank(rule.difficulty)).map(difficulty=>Date.parse(lastBy[difficulty]||0)).filter(Number.isFinite);
    const lastActive=candidates.length?Math.max(...candidates):0;
    if(!lastActive) return;
    const elapsed=now-lastActive;
    const passed=Math.floor(elapsed/needMs);
    if(passed<=0) return;
    const lastDecayAt=Date.parse(skill.lastDecayAt||0);
    if(Number.isFinite(lastDecayAt)&&now-lastDecayAt<needMs) return;
    skill.level=Math.max(0,skill.level-passed*rule.levels);
    skill.xp=0;
    skill.lastDecayAt=new Date(now).toISOString();
  });
}
function gainSkillXp(skill,difficulty,gain){
  const nowIso=new Date().toISOString();
  skill.xp=(skill.xp||0)+Math.max(1,parseInt(gain,10)||0);
  skill.lastDoneByDiff=skill.lastDoneByDiff||{};
  skill.lastDoneByDiff[difficulty]=nowIso;
  while(skill.level<100){
    const need=skillXpRequired(skill.level);
    if(skill.xp<need) break;
    skill.xp-=need;
    skill.level++;
  }
  if(skill.level>=100){skill.level=100;skill.xp=0;}
}
function completeLevelTask(taskId,skillId,gainOverride=0){
  const task=levelSystem.tasks.find(t=>String(t.id)===String(taskId));
  const skill=levelSystem.skills.find(s=>String(s.id)===String(skillId));
  if(!task||!skill) return false;
  const nowIso=new Date().toISOString();
  task.completions=(task.completions||0)+1;
  task.lastCompletedAt=nowIso;
  const gain=gainOverride>0?gainOverride:(levelSystem.settings.xpByDifficulty[task.difficulty]||Math.round(BASE_XP_BY_DIFFICULTY[task.difficulty||'N']*XP_BOOST_MULTIPLIER));
  task.lastReward={cycleKey:getTaskCycleKey(task,new Date()),skillId:String(skill.id),skillPrev:snapshotSkill(skill),gain};
  gainSkillXp(skill,task.difficulty,gain);
  return true;
}
function rollbackTaskCompletion(task,skill){
  if(!task||!skill||!task.lastReward) return false;
  restoreSkill(skill,task.lastReward.skillPrev);
  task.completions=Math.max(0,(task.completions||0)-1);
  task.lastCompletedAt='';
  task.lastReward=null;
  return true;
}

function hasInvalidOrDuplicateNoteIds() {
  const seen=new Set();
  for(const node of [...notes,...mapAuxNodes]){
    if(!Number.isFinite(node.id)) return true;
    if(seen.has(node.id)) return true;
    seen.add(node.id);
  }
  return false;
}

function normalizeNoteIds(forceReindexAll=false) {
  const shouldRepair=forceReindexAll||hasInvalidOrDuplicateNoteIds();
  if(!shouldRepair) {
    nid=Math.max(nid||1,[...notes,...mapAuxNodes].reduce((m,n)=>Math.max(m,n.id||0),0)+1);
    lid=Math.max(lid||1,links.reduce((m,l)=>Math.max(m,l.id||0),0)+1);
    return false;
  }
  const fromBuckets={}, toBuckets={}, firstMap={}, remapPos={}, remapSize={}, remapSelected={};
  let nextId=1;
  const assignNodeId = n => {
    const oldId=n.id, newId=nextId++;
    n.id=newId;
    if(!fromBuckets[oldId]) fromBuckets[oldId]=[];
    if(!toBuckets[oldId]) toBuckets[oldId]=[];
    fromBuckets[oldId].push(newId);
    toBuckets[oldId].push(newId);
    if(firstMap[oldId]===undefined) firstMap[oldId]=newId;
  };
  notes.forEach(assignNodeId);
  mapAuxNodes.forEach(assignNodeId);
  mapAuxNodes.forEach(r=>{
    const oldRoot=auxnodePageRootId(r);
    r.pageRootId=oldRoot===null?null:(firstMap[oldRoot]??null);
  });
  links=links.map(l=>{
    const fromList=fromBuckets[l.from],toList=toBuckets[l.to];
    const from=fromList&&fromList.length?fromList.shift():(firstMap[l.from]??null);
    const to=toList&&toList.length?toList.shift():(firstMap[l.to]??null);
    return {...l,from,to};
  }).filter(l=>Number.isFinite(l.from)&&Number.isFinite(l.to)&&l.from!==l.to);
  Object.keys(nodePos||{}).forEach(k=>{const nk=firstMap[Number(k)];if(nk!==undefined&&remapPos[nk]===undefined) remapPos[nk]=nodePos[k];});
  Object.keys(nodeSizes||{}).forEach(k=>{const nk=firstMap[Number(k)];if(nk!==undefined&&remapSize[nk]===undefined) remapSize[nk]=nodeSizes[k];});
  Object.keys(selectedIds||{}).forEach(k=>{const nk=firstMap[Number(k)];if(nk!==undefined) remapSelected[nk]=true;});
  nodePos=remapPos; nodeSizes=remapSize; selectedIds=remapSelected;
  mapCenterNodeId=firstMap[mapCenterNodeId]??null;
  if(mapCenterNodeIds&&typeof mapCenterNodeIds==='object'){
    const remappedCenters={};
    Object.keys(mapCenterNodeIds).forEach(key=>{
      const oldIds=normalizeCenterIds(mapCenterNodeIds[key]);
      const mapped=uniq(oldIds.map(oldId=>firstMap[oldId]).filter(id=>id!==undefined));
      if(mapped.length) remappedCenters[key]=mapped;
    });
    mapCenterNodeIds=remappedCenters;
  }
  const remappedCollapsed={};
  Object.keys(mapCollapsed||{}).forEach(key=>{
    if(!mapCollapsed[key]) return;
    const parts=String(key).split('::');
    const oldId=parseInt(parts.pop(),10);
    const newId=firstMap[oldId];
    if(newId===undefined) return;
    remappedCollapsed[`${parts.join('::')}::${newId}`]=true;
  });
  mapCollapsed=remappedCollapsed;
  const remappedSubpages={};
  Object.keys(mapSubpages||{}).forEach(key=>{
    const item=(mapSubpages[key]&&typeof mapSubpages[key]==='object'&&!Array.isArray(mapSubpages[key]))?mapSubpages[key]:{};
    const oldId=parseInt(String(key).split('::').pop(),10);
    const newId=firstMap[oldId];
    if(newId===undefined||!mapNodeById(newId)) return;
    remappedSubpages[mapSubpageKey(newId)]={...item,rootId:newId,createdAt:item.createdAt||new Date().toISOString()};
  });
  mapSubpages=remappedSubpages;
  const remappedPageNotes={};
  Object.keys(mapPageNotes||{}).forEach(key=>{
    const normalizedKey=mapPageNoteKey(key);
    const raw=Array.isArray(mapPageNotes[key])?mapPageNotes[key]:[];
    const remapped=[...new Set(raw.map(v=>firstMap[Number(v)]).filter(id=>Number.isFinite(id)&&mapNodeById(id)))];
    remappedPageNotes[normalizedKey]=remapped;
  });
  if(!remappedPageNotes.root) remappedPageNotes.root=[];
  mapPageNotes=remappedPageNotes;
  mapPageStack=(Array.isArray(mapPageStack)?mapPageStack:[]).map(id=>firstMap[id]).filter(id=>Number.isFinite(id)&&mapNodeById(id));
  mapFocusedNodeId=firstMap[mapFocusedNodeId]??null;
  openId=firstMap[openId]??null;
  nid=nextId;
  lid=Math.max(lid||1,links.reduce((m,l)=>Math.max(m,l.id||0),0)+1);
  return true;
}
