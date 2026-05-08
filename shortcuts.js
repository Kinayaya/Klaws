// ==================== 快捷鍵 ====================
function loadShortcuts() { try{const raw=localStorage.getItem('legal_shortcuts_v2');if(raw){const p=JSON.parse(raw);shortcuts=DEFAULT_SHORTCUTS.map(s=>p.find(x=>x.id===s.id)?{...s,...p.find(x=>x.id===s.id)}:{...s});}else shortcuts=DEFAULT_SHORTCUTS.map(s=>({...s}));}catch(e){shortcuts=DEFAULT_SHORTCUTS.map(s=>({...s}));} }
function saveShortcuts() { window.KLawsStorage.governedWriteLocal('legal_shortcuts_v2',JSON.stringify(shortcuts),'ephemeral'); }
const codeToDisplay = c => !c?'未設定':c==='Escape'?'Esc':c==='Space'?'Space':c==='Backspace'?'Backspace':c==='Enter'?'Enter':c==='Tab'?'Tab':c.startsWith('Key')?c.slice(3).toUpperCase():c.startsWith('Digit')?c.slice(5):c;
const fmtKey = sc => !sc.code?'未設定':[sc.ctrl?'Ctrl':'',sc.alt?'Alt':'',sc.shift?'Shift':'',codeToDisplay(sc.code)].filter(Boolean).join(' + ');
function renderShortcutList() {
  g('scpList').innerHTML=shortcuts.map((sc,i)=>`<div class="sc-item"><span class="sc-label">${sc.label}</span><button class="sc-key${sc.code?' has-key':''}" data-idx="${i}">${fmtKey(sc)}</button><button data-clear="${i}">✕</button></div>`).join('');
  g('scpList').querySelectorAll('.sc-key').forEach(btn=>btn.addEventListener('click',()=>{if(recordingBtn){recordingBtn.classList.remove('recording');recordingBtn.textContent=fmtKey(shortcuts[parseInt(recordingBtn.dataset.idx)]);}recordingBtn=btn;btn.classList.add('recording');btn.textContent='請按下按鍵...';btn.focus();}));
  g('scpList').querySelectorAll('[data-clear]').forEach(btn=>btn.addEventListener('click',()=>{const idx=parseInt(btn.dataset.clear);shortcuts[idx].code='';shortcuts[idx].ctrl=shortcuts[idx].shift=shortcuts[idx].alt=false;saveShortcuts();renderShortcutList();}));
}
function openShortcutMgr() {
  recordingBtn=null;
  renderShortcutList();
  g('scp').style.display='block';
  ['dp','fp','tp'].forEach(p=>g(p).classList.remove('open'));
  syncSidePanelState();
  setTimeout(()=>g('scp').scrollIntoView({behavior:'smooth',block:'nearest'}),60);
}
function closeShortcutMgr() { if(recordingBtn){recordingBtn.classList.remove('recording');recordingBtn=null;}g('scp').style.display='none'; }
function handleGlobalKey(e) {
  if(recordingBtn){
    if(['Control','Shift','Alt','Meta','CapsLock','Tab'].includes(e.key)) return;
    e.preventDefault();e.stopPropagation();
    if(e.code==='Escape'){recordingBtn.classList.remove('recording');recordingBtn.textContent=fmtKey(shortcuts[parseInt(recordingBtn.dataset.idx)]);recordingBtn=null;return;}
    const idx=parseInt(recordingBtn.dataset.idx);shortcuts[idx]={...shortcuts[idx],code:e.code,ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,alt:e.altKey};
    recordingBtn.classList.remove('recording');recordingBtn.classList.add('has-key');recordingBtn.textContent=fmtKey(shortcuts[idx]);recordingBtn=null;saveShortcuts();return;
  }
  if(['input','textarea','select'].includes(e.target.tagName.toLowerCase())) return;
  const ctrl=e.ctrlKey||e.metaKey;
  shortcuts.forEach(sc=>{if(sc.code&&sc.code===e.code&&sc.ctrl===ctrl&&sc.shift===e.shiftKey&&sc.alt===e.altKey){e.preventDefault();execShortcut(sc.id);}});
}
function execShortcut(id) {
  const map={
    new:()=>openForm(false),
    search:()=>{
      const target=isMapOpen?g('mapSearchInput'):g('searchInput');
      if(target){target.focus();target.select?.();}
    },
    map:()=>{if(!isMapOpen)toggleMapView(true);},back:()=>{if(isMapOpen)toggleMapView(false);},
    close:()=>{if(g('scp').style.display==='block')closeShortcutMgr();else if(g('ap').classList.contains('open')){g('ap').classList.remove('open');syncSidePanelState();}else if(g('tp').classList.contains('open')){g('tp').classList.remove('open');syncSidePanelState();}else if(g('fp').classList.contains('open'))closeForm();else if(g('dp').classList.contains('open'))closeDetail();},
    edit:()=>{if(openId)openForm(true);},link:()=>{if(openId)openForm(true);},
    export:()=>manageArchives(),stats:()=>{if(!isMapOpen)openStats();},shortcuts:()=>openShortcutMgr()
  };
  if(map[id]) map[id]();
  showShortcutHint({new:'新增筆記',search:'搜尋',map:'開啟體系圖',back:'返回筆記列表',close:'關閉',edit:'編輯筆記',link:'新增關聯',export:'存檔管理',stats:'統計',shortcuts:'快捷鍵設定'}[id]);
}
function showShortcutHint(t){ const h=g('scHint');h.textContent=t;h.style.display='block';clearTimeout(h._t);h._t=setTimeout(()=>h.style.display='none',1800); }
function setMapLinkedOnlyBtnStyle(){
  const btn=g('mapLinkedOnlyBtn');
  if(!btn) return;
  btn.style.background=mapLinkedOnly?'#edf4fb':'#f5f5f5';
  btn.style.color=mapLinkedOnly?'#0C447C':'#666';
  btn.style.borderColor=mapLinkedOnly?'#b7d1eb':'#ddd';
  btn.textContent=mapLinkedOnly?'✓ 關聯點':'🔗 關聯點';
}
function updateMapPinnedGroup(){
  const el=g('mapPinnedGroup');
  if(!el) return;
  if(mapFilter.group==='none'){el.textContent='：無';return;}
  const ch=mapFilter.group==='all'?null:groupByKey(mapFilter.group);
  el.textContent=ch?`：${ch.label}`:'：未設定';
}
function setMapAdvanced(open){
  mapAdvancedOpen=!!open;
  const mapView=g('mapView');
  if(mapView) mapView.classList.toggle('map-advanced-open',mapAdvancedOpen);
  const btn=g('mapAdvancedToggleBtn');
  if(btn){
    btn.textContent=mapAdvancedOpen?'⚙️ 收合進階':'⚙️ 進階';
    btn.style.background=mapAdvancedOpen?'#0C447C':'#f5f5f5';
    btn.style.color=mapAdvancedOpen?'#fff':'#555';
    btn.style.borderColor=mapAdvancedOpen?'#0C447C':'#ddd';
  }
}
function toggleMapView(open) {
  isMapOpen=open;currentView=open?'map':'notes';
  g('calendarView')?.classList.remove('open');
  g('levelSystemView')?.classList.remove('open');
  g('mapView').classList.toggle('open',open);
  g('notesView').style.display=open?'none':(searchQ.trim()?'block':'none');
  g('subbar').style.display=open?'none':(searchQ.trim()?'flex':'none');
  const advanced=g('filterAdvanced');
  if(advanced) advanced.style.display=open?'none':(searchQ.trim()?'block':'none');
  if(open){
    mapPageStack=normalizeMapPageStack(mapPageStack);
    setMapAdvanced(false);
    if(cch!=='all') mapFilter.group=cch;
    else if(selectedGroups.length) mapFilter.group=selectedGroups[0];
    buildMapFilters();
    updateMapPinnedGroup();
    const mapSearch=g('mapSearchInput');if(mapSearch)mapSearch.value=mapFilter.q||'';
    setMapLinkedOnlyBtnStyle();
    updateMapPagePath();
    setTimeout(()=>{const hadNodePos=Object.keys(nodePos).length>0;initNodePos();drawMap();if(!hadNodePos)saveData();},80);
  } else { updateMapPagePath();closeLanePanel();closeMapPopup(); }
  if(typeof window.syncViewSwitchState==='function') window.syncViewSwitchState(currentView);
  saveLastViewState();
}
