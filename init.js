// ==================== 初始化 ====================
  window.addEventListener('load',async ()=>{
  try{
  detachSidePanelsFromNotesView();
  ensureUsageStart();
  await loadData();
  const pathSample=[...notes].slice(0,5).map(n=>({id:n.id,path:n.path||''}));
  console.log('[loadData][path-sample]',pathSample);
  if(pathSample.some(x=>typeof x.path!=='string')) console.warn('[loadData][path-warning] invalid path type detected');
  rebuildUI();
  const sortSelect=g('sortSelect');
  if(sortSelect){
    sortSelect.value=sortMode;
    sortSelect.addEventListener('change',()=>{sortMode=sortSelect.value;gridPage=1;render();saveData();});
  }else{
    console.warn('[init-missing-element] sortSelect');
  }
  const scopeLinkedToggle=g('scopeLinkedToggle');
  if(scopeLinkedToggle){
    scopeLinkedToggle.checked=scopeLinkedEnabled;
    scopeLinkedToggle.addEventListener('change',()=>{
      scopeLinkedEnabled=!!scopeLinkedToggle.checked;
      localStorage.setItem(SCOPE_LINKED_TOGGLE_KEY,scopeLinkedEnabled?'1':'0');
      gridPage=1;
      render();
      showToast(scopeLinkedEnabled?'已啟用跨關聯顯示':'已關閉跨關聯顯示');
    });
  }
  if(g('selAllBtn')) g('selAllBtn').textContent='複製';
  on('selAllBtn','click',copySelectedNotes);on('selDeleteBtn','click',deleteSelected);on('selCancelBtn','click',exitMultiSel);
  on('dp-link-search','input',debounce(renderDetailQuickLinkSearch,180));
  on('mp-link-search','input',debounce(()=>renderMapPopupQuickLinkSearch(),180));
  on('headerDatetimeBtn','click',()=>toggleCalendarView(true));
  const setActiveViewSwitch=(view='notes')=>{
    ['viewNotesBtn','viewCalendarBtn','viewLevelBtn','viewMapBtn'].forEach(id=>g(id)?.classList.remove('active'));
    const targetMap={notes:'viewNotesBtn',calendar:'viewCalendarBtn',level:'viewLevelBtn',map:'viewMapBtn'};
    g(targetMap[view]||'viewNotesBtn')?.classList.add('active');
  };
  window.syncViewSwitchState=setActiveViewSwitch;
  on('viewNotesBtn','click',()=>{toggleCalendarView(false);toggleLevelSystemView(false);toggleMapView(false);setActiveViewSwitch('notes');});
  on('viewCalendarBtn','click',()=>{toggleCalendarView(true);setActiveViewSwitch('calendar');});
  on('viewLevelBtn','click',()=>{toggleLevelSystemView(true);setActiveViewSwitch('level');});
  on('viewMapBtn','click',()=>{toggleMapView(true);setActiveViewSwitch('map');});
  on('logoSettingsBtn','click',()=>g('settingsModal')?.classList.add('open'));
  g('settingsModal')?.addEventListener('click',e=>{ if(e.target?.id==='settingsModal') g('settingsModal')?.classList.remove('open'); });
  startHeaderDatetimeTicker();
  on('ft','change',()=>{renderDynamicFields(g('ft').value,editMode&&openId?noteById(openId):null);syncFormHeaderLabels();});
  on('fti','input',syncFormHeaderLabels);
  on('typeTriggerBtn','click',()=>g('ft')?.focus());
  on('titleTriggerBtn','click',()=>g('fti')?.focus());
  on('fieldConfigTriggerBtn','click',editTypeFieldsForCurrentType);
  if(g('fc')) on('fc','change',()=>syncPartSelect(selectedValues('fc'),selectedValues('fsec'),[]));
  const si=g('searchInput'),sc=g('searchClear');
  if(si&&sc){
    si.addEventListener('input',debounce(()=>{
      searchQ=si.value;gridPage=1;sc.style.display=searchQ?'block':'none';
      if(searchQ.trim()&&isMapOpen) toggleMapView(false);
      updateNotesHomeVisibility();render();
    },250));
    sc.addEventListener('click',()=>{si.value='';searchQ='';gridPage=1;sc.style.display='none';updateNotesHomeVisibility();render();si.focus();});
  }else{
    console.warn('[init-missing-element] searchInput/searchClear',{hasSearchInput:!!si,hasSearchClear:!!sc});
  }
  const compactDefault=localStorage.getItem(COMPACT_FILTER_KEY);
  applyCompactFilterMode(compactDefault===null?true:compactDefault==='1');
  on('compactToggleBtn','click',()=>applyCompactFilterMode(!document.body.classList.contains('compact-filters')));
  on('settingsCloseBtn','click',()=>g('settingsModal')?.classList.remove('open'));
  on('settingsManageBtn','click',()=>{g('settingsModal')?.classList.remove('open');openPathMgr();});
  on('settingsArchiveBtn','click',()=>{g('settingsModal')?.classList.remove('open');manageArchives();});
  on('settingsMoreBtn','click',()=>{g('settingsModal')?.classList.remove('open');g('assistToolsModal')?.classList.add('open');});
  on('settingsTasksBtn','click',()=>{g('settingsModal')?.classList.remove('open');openLevelSection('tasks');});
  on('settingsLevelBtn','click',()=>{g('settingsModal')?.classList.remove('open');openLevelSection('level');});
  on('reviewNowBtn','click',()=>{
    reviewMode=!reviewMode;
    reviewReveal=false;
    const dueCount=dueReviewNotes().length;
    const reviewNowBtn=g('reviewNowBtn');
    if(reviewNowBtn) reviewNowBtn.textContent=reviewMode?`🧠 Reviewing (${dueCount})`:'🧠 Review Now';
    showToast(reviewMode?`今日待複習：${dueCount} 筆`:'已離開複習模式');
    if(reviewMode&&dueCount>0) openNote(dueReviewNotes()[0].id);
    render();
  });
  bindCoreButtons();
  bindTouchQuickActions();
  const draftSaver=debounce(saveNoteDraftFromForm,900);
  g('fp')?.addEventListener('input',()=>{ if(editMode) draftSaver(); });
  g('fp')?.addEventListener('focusout',()=>{ if(editMode) saveNoteDraftFromForm(); });
  bindPathManagerNav();
  on('apClose','click',()=>{g('ap').classList.remove('open');syncSidePanelState();});
  on('archiveSaveBtn','click',createArchiveSnapshot);
  on('archiveExportBtn','click',exportData);
  on('archivePortableExportBtn','click',exportPortablePackage);
  on('archiveImportBtn','click',()=>g('importFile')?.click());
  on('cloudLoginBtn','click',loginGoogleDriveAndSync);
  on('cloudPullBtn','click',()=>cloudSyncPullLatest());
  on('cloudSyncBtn','click',()=>cloudSyncPushNow());
  on('cloudLogoutBtn','click',logoutGoogleDriveSync);
  on('tpClose','click',()=>{g('tp').classList.remove('open');syncSidePanelState();});
  on('pathSearchInput','input',debounce(()=>{pathSearchQ=(val('pathSearchInput')||'').toLowerCase().trim();renderPathLists();},150));
  on('pathUnusedOnly','change',()=>{pathUnusedOnly=!!g('pathUnusedOnly').checked;renderPathLists();});
  on('clearUnusedPathsBtn','click',clearUnusedPaths);
  g('addTypeBtn')?.addEventListener('click',()=>addPath('type'));
  on('panelDirBtn','click',togglePanelDir);
  loadExams();on('examBtn','click',openExamModePanel);on('examModeClose','click',()=>g('examModePanel').classList.remove('open'));
  on('examModeEssayBtn','click',openExamPanel);
  on('examModeReviewBtn','click',()=>{
    g('examModePanel')?.classList.remove('open');
    reviewMode=true;
    reviewReveal=false;
    const dueCount=dueReviewNotes().length;
    const reviewNowBtn=g('reviewNowBtn');
    if(reviewNowBtn) reviewNowBtn.textContent=`🧠 Reviewing (${dueCount})`;
    showToast(`已進入 Review：今日待複習 ${dueCount} 筆`);
    if(dueCount>0) openNote(dueReviewNotes()[0].id);
    render();
  });
  on('examListClose','click',()=>g('examListPanel').classList.remove('open'));
  on('assistToolsBtn','click',()=>g('assistToolsModal')?.classList.add('open'));
  on('assistToolsCloseBtn','click',()=>g('assistToolsModal')?.classList.remove('open'));
  on('assistAiBtn','click',()=>{g('assistToolsModal')?.classList.remove('open');openAiSettings();});
  on('calendarTimerBtn','click',openFocusTimer);
  on('assistShortcutBtn','click',()=>{g('assistToolsModal')?.classList.remove('open');openShortcutMgr();});
  on('focusTimerMinutes','change',resetFocusTimer);
  on('focusTimerStartBtn','click',startFocusTimer);
  on('focusTimerPauseBtn','click',stopFocusTimer);
  on('focusTimerResetBtn','click',resetFocusTimer);
  on('focusTimerCloseBtn','click',()=>{stopFocusTimer();g('focusTimerModal')?.classList.remove('open');});
  on('focusTimerAlertOkBtn','click',()=>g('focusTimerAlert')?.classList.remove('open'));
  on('examAddBtn','click',()=>openExamForm());
  on('examFormClose','click',()=>{g('examAddForm').classList.remove('open');resetExamForm();openExamPanel();});on('examFCancel','click',()=>{g('examAddForm').classList.remove('open');resetExamForm();openExamPanel();});
  on('examFSave','click',()=>{const q=(g('examQInput').value||'').trim();if(!q){showToast('請輸入題目');return;}const ans=(g('examAInput').value||'').trim();const iss=(g('examIssInput').value||'').split(',').map(x=>x.trim()).filter(Boolean);const tl=parseInt(g('examTimeInput').value)||30;const sub=g('examSubSel').value||(domains[0]?domains[0].key:'all');const payload={id:Date.now(),domain:sub,question:q,answer:ans,issues:iss,timeLimit:tl};if(examEditingIndex>=0&&examList[examEditingIndex]){payload.id=examList[examEditingIndex].id||payload.id;examList[examEditingIndex]=payload;showToast('題目已更新！');}else{examList.push(payload);showToast('題目已儲存！');}saveExams();g('examAddForm').classList.remove('open');resetExamForm();openExamPanel();});
  on('examToggleAnswerBtn','click',()=>{examAnswerReveal=!examAnswerReveal;const wrap=g('examModelAnswerWrap'),btn=g('examToggleAnswerBtn');if(wrap) wrap.style.display=examAnswerReveal?'block':'none';if(btn) btn.textContent=examAnswerReveal?'隱藏答案':'顯示答案';});
  on('examSubmitBtn','click',()=>doSubmit(false));on('examCancelBtn','click',()=>{clearInterval(examTimer);closeExamView();});
  on('examRetryBtn','click',()=>{closeExamView();setTimeout(openExamPanel,100);});on('examBackBtn2','click',closeExamView);
  on('examAnswerBox','input',()=>{g('examWordCount').textContent=g('examAnswerBox').value.replace(/\s/g,'').length+' 字';});
  g('aiProviderSel')?.addEventListener('change',()=>{saveAiProvider(g('aiProviderSel').value||'openrouter');renderAiModelOptions();});
  on('aiKeySave','click',()=>{const k=(g('aiKeyInput').value||'').trim();if(!k){showToast('請輸入 API Key');return;}saveAiKey(k);const psel=g('aiProviderSel');if(psel&&psel.value)saveAiProvider(psel.value);const sel=g('aiModelSel');if(sel&&sel.value)saveAiModel(sel.value);g('aiKeyModal').classList.remove('open');if(_aiPendingAction){_aiPendingAction(k);_aiPendingAction=null;}else showToast('AI 設定已儲存！');});
  on('aiKeyCancel','click',()=>{g('aiKeyModal').classList.remove('open');_aiPendingAction=null;});
  on('importFile','change',e=>{if(e.target.files&&e.target.files[0])importData(e.target.files[0]);e.target.value='';});
  on('scpClose','click',closeShortcutMgr);on('scpDone','click',closeShortcutMgr);
  on('scpReset','click',()=>{shortcuts=DEFAULT_SHORTCUTS.map(s=>({...s}));saveShortcuts();renderShortcutList();showToast('已恢復預設快捷鍵');});
  loadShortcuts();document.addEventListener('keydown',handleGlobalKey);
  loadRecycleBin();
  const touchGuard=window.KLawsTouchGuard||{};
  const eventTargetElement = touchGuard.eventTargetElement||((target)=>{
    if(target&&typeof target.closest==='function') return target;
    if(target&&target.parentElement&&typeof target.parentElement.closest==='function') return target.parentElement;
    return null;
  });
  const isInsideMapCanvas = target => {
    const el=eventTargetElement(target);
    return !!(el&&el.closest('#mapCanvas'));
  };
  const isInsideScrollablePanel = target => {
    const el=eventTargetElement(target);
    return !!(el&&el.closest('#fp, #dp, #tp, #ap, #settingsModal, #levelEditorModal, #calendarEventModal, #calendarSettingsModal, #assistToolsModal'));
  };
  const shouldBlockDoubleClickZoom = target => {
    const el=eventTargetElement(target);
    if(!el) return true;
    if(!isInsideMapCanvas(el)) return true;
    return !!el.closest('#mapPopup, #mapTreeSidebar, #mapTreeToggleBtn');
  };
  const isInteractiveTouchTarget = touchGuard.isInteractiveTouchTarget||(target=>{
    const el=eventTargetElement(target);
    if(!el) return false;
    return !!el.closest('button, a, input, select, textarea, label, summary, [role="button"], [data-allow-touch-default], [onclick]');
  });
  let lastTouchEndTs=0, lastTouchTs=0, lastTouchX=0, lastTouchY=0;
  document.addEventListener('dblclick',e=>{ if(shouldBlockDoubleClickZoom(e.target)) e.preventDefault(); },{capture:true,passive:false});
  document.addEventListener('wheel',e=>{ if(e.ctrlKey&&!isInsideMapCanvas(e.target)) e.preventDefault(); },{passive:false});
  ['gesturestart','gesturechange','gestureend'].forEach(evt=>{
    document.addEventListener(evt,e=>{ if(!isInsideMapCanvas(e.target)) e.preventDefault(); },{passive:false});
  });
  document.addEventListener('touchstart',e=>{
    if(isInsideMapCanvas(e.target)||isInsideScrollablePanel(e.target)||isInteractiveTouchTarget(e.target)) return;
    if(e.touches.length>1){ e.preventDefault(); return; }
    const t=e.touches[0];
    if(!t) return;
    const now=Date.now(), dx=Math.abs(t.clientX-lastTouchX), dy=Math.abs(t.clientY-lastTouchY);
    if(now-lastTouchTs<350&&dx<28&&dy<28) e.preventDefault();
    lastTouchTs=now; lastTouchX=t.clientX; lastTouchY=t.clientY;
  },{passive:false});
  document.addEventListener('touchmove',e=>{
    if(!isInsideMapCanvas(e.target)&&!isInsideScrollablePanel(e.target)&&e.touches.length>1) e.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',e=>{
    if(isInsideMapCanvas(e.target)||isInsideScrollablePanel(e.target)||isInteractiveTouchTarget(e.target)) return;
    const now=Date.now();
    if(now-lastTouchEndTs<320) e.preventDefault();
    lastTouchEndTs=now;
  },{passive:false});
  on('mapToggleBtn','click',()=>toggleMapView(true));
  on('mapBackBtn','click',()=>{if(isMapOpen&&leaveMapSubpage())return;toggleMapView(false);});
  on('mapAddNoteBtn','click',()=>{formMode='note';openForm(false);});
  on('mapSearchInput','input',debounce(()=>{mapFilter.q=g('mapSearchInput').value;saveDataDeferred();if(isMapOpen)drawMap();},250));
  on('mapFilterGroup','change',()=>{
    const beforeAuxnodeVisibleIds=new Set(visibleNotes().filter(isAuxnodeNode).map(n=>n.id));
    mapFilter.group=g('mapFilterGroup').value;updateMapPagePath();buildMapFilters();saveDataDeferred();if(g('lanePanel')&&g('lanePanel').classList.contains('open'))renderLanePanel();if(isMapOpen){drawMap();notifyHiddenAuxnodesByFilter(beforeAuxnodeVisibleIds);}
  });
  on('mapFilterPart','change',()=>{
    const beforeAuxnodeVisibleIds=new Set(visibleNotes().filter(isAuxnodeNode).map(n=>n.id));
    mapFilter.part=g('mapFilterPart').value;updateMapPagePath();saveDataDeferred();if(g('lanePanel')&&g('lanePanel').classList.contains('open'))renderLanePanel();if(isMapOpen){drawMap();notifyHiddenAuxnodesByFilter(beforeAuxnodeVisibleIds);}
  });
  on('mapAdvancedToggleBtn','click',()=>setMapAdvanced(!mapAdvancedOpen));
  mapDepth='all';
  mapFocusMode=false;
  const setZoom=z=>{mapScale=Math.max(.15,Math.min(3.5,z));g('zoomLabel').textContent=Math.round(mapScale*100)+'%';drawMap();};
  on('zoomIn','click',()=>setZoom(mapScale+.15));on('zoomOut','click',()=>setZoom(mapScale-.15));
  on('mpClose','click',closeMapPopup);
  on('mapLinkedOnlyBtn','click',()=>{mapLinkedOnly=!mapLinkedOnly;setMapLinkedOnlyBtnStyle();drawMap();saveDataDeferred();showToast(mapLinkedOnly?`顯示 ${visibleNotes().length} 個有關聯點`:'顯示全部點');});
  on('mapAutoBtn','click',()=>{const btn=g('mapAutoBtn'),orig=btn.textContent;btn.textContent='排列中...';btn.disabled=true;setTimeout(()=>{nodePos={};mapScale=1;mapOffX=mapOffY=0;forceLayout();drawMap();saveDataDeferred();g('zoomLabel').textContent='100%';btn.textContent=orig;btn.disabled=false;showToast('已自動排列（保留核心點）');},30);});
  on('mapLaneBtn','click',()=>{const panel=ensureLanePanel();if(!panel){showToast('泳道面板載入失敗');return;}if(panel.classList.contains('open'))closeLanePanel();else openLanePanel();});
  on('calendarBackBtn','click',()=>toggleCalendarView(false));
  on('levelSystemBackBtn','click',()=>toggleLevelSystemView(false));
  on('levelEditorClose','click',closeLevelEditor);
  on('levelEditorCancel','click',closeLevelEditor);
  on('levelEditorSave','click',saveLevelEditor);
  on('calendarPrevBtn','click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderCalendar();});
  on('calendarNextBtn','click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderCalendar();});
  on('calendarTodayBtn','click',()=>{calendarCursor=new Date();renderCalendar();});
  on('calendarSettingsBtn','click',()=>{g('calendarEmailsInput').value=(calendarSettings.emails||[]).join('\n');g('calendarSmtpToken').value=calendarSettings.smtpToken||'';g('calendarEmailFrom').value=calendarSettings.emailFrom||'';g('calendarSettingsModal').classList.add('open');});
  on('calendarSettingsCancel','click',()=>g('calendarSettingsModal').classList.remove('open'));
  on('calendarSettingsSave','click',()=>{
    const emails=(g('calendarEmailsInput').value||'').split('\n').map(v=>v.trim()).filter(Boolean);
    calendarSettings.emails=emails;calendarSettings.smtpToken=(g('calendarSmtpToken').value||'').trim();calendarSettings.emailFrom=(g('calendarEmailFrom').value||'').trim();saveData();g('calendarSettingsModal').classList.remove('open');showToast(`已儲存 ${emails.length} 個 Email`);
  });
  on('calendarEventType','change',()=>{g('calendarReminderWrap').style.display=g('calendarEventType').value==='reminder'?'block':'none';});
  on('calendarEventCancel','click',()=>g('calendarEventModal').classList.remove('open'));
  on('calendarEventSave','click',saveCalendarEvent);
  on('calendarEventDelete','click',()=>{ if(editingCalendarEventId!=null) deleteCalendarEvent(editingCalendarEventId); });
  on('lanePanelClose','click',closeLanePanel);on('laneSaveBtn','click',saveLanePanel);on('laneResetBtn','click',resetLanePanel);
  const canvas=g('mapCanvas');let panStart=null,panOffXStart=0,panOffYStart=0;
  if(!canvas){
    throw new Error('[init] mapCanvas not found');
  }
  const pointerInCanvas=(x,y)=>{
    const rect=canvas.getBoundingClientRect();
    return { x:x-rect.left, y:y-rect.top+(mapVerticalScrollMode?canvas.scrollTop:0) };
  };
  const onDragMove=(x,y)=>{
    if(!dragNode||!nodePos[dragNode])return;const activeNodeId=dragNode;
    const p=pointerInCanvas(x,y);
    let cx=(p.x-dragOffX-mapOffX)/mapScale,cy=(p.y-dragOffY-mapOffY)/mapScale;
    nodePos[activeNodeId]={x:cx,y:cy};clampNodeToCanvas(activeNodeId);
    const visIds={};visibleNotes().forEach(n=>visIds[n.id]=true);pushNodeOffLinks(activeNodeId,visibleLinks(visIds),10);
    cx=nodePos[activeNodeId].x;cy=nodePos[activeNodeId].y;
    if(rafId)cancelAnimationFrame(rafId);rafId=requestAnimationFrame(()=>{moveNodeEl(activeNodeId,cx,cy);redrawLines(activeNodeId);rafId=null;});
  };
  const onPanMove=(x,y)=>{if(!panStart)return;mapOffX=panOffXStart+(x-panStart.x);mapOffY=panOffYStart+(y-panStart.y);if(rafId)cancelAnimationFrame(rafId);rafId=requestAnimationFrame(()=>{const gw=g('mapSvg').querySelector('#mapWrap');if(gw)gw.setAttribute('transform',`translate(${mapOffX},${mapOffY}) scale(${mapScale})`);rafId=null;});};
  canvas.addEventListener('click',e=>{if(e.target===canvas||e.target.id==='mapSvg'||e.target.id==='linksLayer'||e.target.id==='arrowsLayer')closeMapPopup();});
  canvas.addEventListener('mousedown',e=>{if(!dragNode&&!mapVerticalScrollMode){panStart={x:e.clientX,y:e.clientY};panOffXStart=mapOffX;panOffYStart=mapOffY;canvas.style.cursor='grabbing';}});
  canvas.addEventListener('mousemove',e=>{if(dragNode)onDragMove(e.clientX,e.clientY);else if(panStart)onPanMove(e.clientX,e.clientY);});
  canvas.addEventListener('mouseup',()=>{if(dragNode){if(rafId)cancelAnimationFrame(rafId);saveDataDeferred();dragNode=null;}panStart=null;canvas.style.cursor='';});
  canvas.addEventListener('mouseleave',()=>{panStart=null;canvas.style.cursor='';});
  canvas.addEventListener('touchmove',e=>{if(e.touches.length===1){if(dragNode){e.preventDefault();onDragMove(e.touches[0].clientX,e.touches[0].clientY);}else if(panStart){e.preventDefault();onPanMove(e.touches[0].clientX,e.touches[0].clientY);}}},{passive:false});
  canvas.addEventListener('touchend',()=>{if(dragNode){if(rafId)cancelAnimationFrame(rafId);saveDataDeferred();dragNode=null;}panStart=null;});
  canvas.addEventListener('touchstart',e=>{if(e.touches.length===1&&!dragNode&&!mapVerticalScrollMode){panStart={x:e.touches[0].clientX,y:e.touches[0].clientY};panOffXStart=mapOffX;panOffYStart=mapOffY;}},{passive:true});
  canvas.addEventListener('wheel',e=>{
    if(mapVerticalScrollMode) return;
    e.preventDefault();
    setZoom(mapScale+(e.deltaY>0?-.1:.1));
  },{passive:false});
  canvas.addEventListener('scroll',()=>{ if(mapVerticalScrollMode&&isMapOpen) closeMapPopup(); },{passive:true});
  let pinchDist=0;
  canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){const d=e.touches[0].clientX-e.touches[1].clientX,dd=e.touches[0].clientY-e.touches[1].clientY;pinchDist=Math.sqrt(d*d+dd*dd);}},{passive:true});
  canvas.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchDist){e.preventDefault();const d=e.touches[0].clientX-e.touches[1].clientX,dd=e.touches[0].clientY-e.touches[1].clientY,nd=Math.sqrt(d*d+dd*dd);setZoom(mapScale*nd/pinchDist);pinchDist=nd;}},{passive:false});
  window.addEventListener('resize',()=>scheduleMapRedraw(100));window.addEventListener('orientationchange',()=>scheduleMapRedraw(120));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
      saveData();
      return;
    }
    scheduleMapRedraw(100);
  });
  window.addEventListener('pagehide',()=>{
    if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
    saveData();
  });
  window.addEventListener('pageshow',()=>bindCoreButtons());
  if(window.ResizeObserver){mapResizeObserver=new ResizeObserver(()=>scheduleMapRedraw(60));mapResizeObserver.observe(canvas);}
  try{reminderDismissed=JSON.parse(localStorage.getItem('klaws_reminder_dismissed_v1')||'{}')||{};}catch(e){reminderDismissed={};}
  clearInterval(reminderTimer); reminderTimer=setInterval(checkReminders,30000); checkReminders();
  updateNotesHomeVisibility();
  render();
  restoreLastViewState();
  setActiveViewSwitch(currentView);
  }catch(err){
    const detail={
      name:err&&err.name?err.name:typeof err,
      message:err&&err.message?err.message:String(err),
      stack:err&&err.stack?String(err.stack):''
    };
    console.error('[init-load-error]',detail,err);
  }
});
