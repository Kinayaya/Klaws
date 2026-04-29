// ==================== 初始化 ====================
  window.addEventListener('load',()=>{
  try{
  detachSidePanelsFromNotesView();
  ensureUsageStart();
  loadData();
  const pathSample=[...notes].slice(0,5).map(n=>({id:n.id,path:n.path||''}));
  console.log('[loadData][path-sample]',pathSample);
  if(pathSample.some(x=>typeof x.path!=='string')) console.warn('[loadData][path-warning] invalid path type detected');
  rebuildUI();
  initMoreMenu();
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
      showToast(scopeLinkedEnabled?'已啟用跨科目關聯顯示':'已關閉跨科目關聯顯示');
    });
  }
  if(g('selAllBtn')) g('selAllBtn').textContent='複製';
  on('selAllBtn','click',copySelectedNotes);on('selDeleteBtn','click',deleteSelected);on('selCancelBtn','click',exitMultiSel);
  on('dp-link-search','input',debounce(renderDetailQuickLinkSearch,180));
  on('mp-link-search','input',debounce(()=>renderMapPopupQuickLinkSearch(),180));
  on('headerTitleWrap','click',()=>toggleLevelSystemView(true));
  on('headerDatetimeBtn','click',()=>toggleCalendarView(true));
  on('logoArchiveBtn','click',manageArchives);
  startHeaderDatetimeTicker();
  on('ft','change',()=>renderDynamicFields(g('ft').value,editMode&&openId?noteById(openId):null));
  if(g('fc')) on('fc','change',()=>syncSectionSelect(selectedValues('fc'),selectedValues('fsec'),[]));
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
  on('tagMgrBtn','click',openTagMgr);
  on('reviewNowBtn','click',()=>{
    reviewMode=!reviewMode;
    reviewReveal=false;
    const dueCount=dueReviewNotes().length;
    g('reviewNowBtn').textContent=reviewMode?`🧠 Reviewing (${dueCount})`:'🧠 Review Now';
    showToast(reviewMode?`今日待複習：${dueCount} 筆`:'已離開複習模式');
    if(reviewMode&&dueCount>0) openNote(dueReviewNotes()[0].id);
    render();
  });
  bindCoreButtons();
  bindTouchQuickActions();
  const draftSaver=debounce(saveNoteDraftFromForm,900);
  g('fp')?.addEventListener('input',()=>{ if(editMode) draftSaver(); });
  g('fp')?.addEventListener('focusout',()=>{ if(editMode) saveNoteDraftFromForm(); });
  applyBrandTitle();
  bindTagManagerNav();
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
  on('tagSearchInput','input',debounce(()=>{tagSearchQ=(val('tagSearchInput')||'').toLowerCase().trim();renderTagLists();},150));
  on('tagUnusedOnly','change',()=>{tagUnusedOnly=!!g('tagUnusedOnly').checked;renderTagLists();});
  on('clearUnusedTagsBtn','click',clearUnusedTags);
  g('addTypeBtn')?.addEventListener('click',()=>addTag('type'));
  on('panelDirBtn','click',togglePanelDir);
  on('addTypeFieldBtn','click',addTypeFieldForCurrentType);
  on('removeTypeFieldBtn','click',removeTypeFieldForCurrentType);
  loadExams();on('examBtn','click',openExamPanel);on('examListClose','click',()=>g('examListPanel').classList.remove('open'));
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
  on('examAddBtn','click',()=>{const esel=g('examSubSel');if(esel)esel.innerHTML=subjects.map(s=>`<option value="${s.key}">${s.label}</option>`).join('');g('examListPanel').classList.remove('open');g('examAddForm').classList.add('open');setTimeout(()=>g('examAddForm').scrollIntoView({behavior:'smooth',block:'nearest'}),60);});
  on('examFormClose','click',()=>{g('examAddForm').classList.remove('open');openExamPanel();});on('examFCancel','click',()=>{g('examAddForm').classList.remove('open');openExamPanel();});
  on('examFSave','click',()=>{const q=(g('examQInput').value||'').trim();if(!q){showToast('請輸入題目');return;}const iss=(g('examIssInput').value||'').split(',').map(x=>x.trim()).filter(Boolean);const tl=parseInt(g('examTimeInput').value)||30;const sub=g('examSubSel').value||(subjects[0]?subjects[0].key:'all');examList.push({id:Date.now(),subject:sub,question:q,issues:iss,timeLimit:tl});saveExams();g('examQInput').value='';g('examIssInput').value='';g('examTimeInput').value='30';g('examAddForm').classList.remove('open');openExamPanel();showToast('題目已儲存！');});
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
  purgeRecycleBin();
  try{unusedTagTracker=JSON.parse(localStorage.getItem(UNUSED_TAG_TRACK_KEY)||'{}')||{};}catch(e){unusedTagTracker={};}
  setInterval(()=>{purgeRecycleBin();autoCleanupUnusedTags();},60000);
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
  const isInteractiveTouchTarget = touchGuard.isInteractiveTouchTarget||(target=>{
    const el=eventTargetElement(target);
    if(!el) return false;
    return !!el.closest('button, a, input, select, textarea, label, summary, [role="button"], [data-allow-touch-default], [onclick]');
  });
  let lastTouchEndTs=0, lastTouchTs=0, lastTouchX=0, lastTouchY=0;
  document.addEventListener('dblclick',e=>{ if(!isInsideMapCanvas(e.target)) e.preventDefault(); },{capture:true,passive:false});
  document.addEventListener('wheel',e=>{ if(e.ctrlKey&&!isInsideMapCanvas(e.target)) e.preventDefault(); },{passive:false});
  ['gesturestart','gesturechange','gestureend'].forEach(evt=>{
    document.addEventListener(evt,e=>{ if(!isInsideMapCanvas(e.target)) e.preventDefault(); },{passive:false});
  });
  document.addEventListener('touchstart',e=>{
    if(isInsideMapCanvas(e.target)||isInteractiveTouchTarget(e.target)) return;
    if(e.touches.length>1){ e.preventDefault(); return; }
    const t=e.touches[0];
    if(!t) return;
    const now=Date.now(), dx=Math.abs(t.clientX-lastTouchX), dy=Math.abs(t.clientY-lastTouchY);
    if(now-lastTouchTs<350&&dx<28&&dy<28) e.preventDefault();
    lastTouchTs=now; lastTouchX=t.clientX; lastTouchY=t.clientY;
  },{passive:false});
  document.addEventListener('touchmove',e=>{
    if(!isInsideMapCanvas(e.target)&&e.touches.length>1) e.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',e=>{
    if(isInsideMapCanvas(e.target)||isInteractiveTouchTarget(e.target)) return;
    const now=Date.now();
    if(now-lastTouchEndTs<320) e.preventDefault();
    lastTouchEndTs=now;
  },{passive:false});
  on('mapToggleBtn','click',()=>toggleMapView(true));
  on('mapBackBtn','click',()=>{if(isMapOpen&&leaveMapSubpage())return;toggleMapView(false);});
  on('mapAddNoteBtn','click',()=>{formMode='note';openForm(false);});
  on('mapAssignNoteBtn','click',openMapAssignPanel);
  on('mapSearchInput','input',debounce(()=>{mapFilter.q=g('mapSearchInput').value;saveDataDeferred();if(isMapOpen)drawMap();},250));
  on('mapFilterSub','change',()=>{
    const beforeRelayVisibleIds=new Set(visibleNotes().filter(isRelayNode).map(n=>n.id));
    mapFilter.sub=g('mapFilterSub').value;updateMapPagePath();buildMapFilters();saveDataDeferred();if(g('lanePanel')&&g('lanePanel').classList.contains('open'))renderLanePanel();if(isMapOpen){drawMap();notifyHiddenRelaysByFilter(beforeRelayVisibleIds);}
  });
  on('mapFilterChapter','change',()=>{
    const beforeRelayVisibleIds=new Set(visibleNotes().filter(isRelayNode).map(n=>n.id));
    mapFilter.chapter=g('mapFilterChapter').value;updateMapPagePath();buildMapFilters();saveDataDeferred();if(g('lanePanel')&&g('lanePanel').classList.contains('open'))renderLanePanel();if(isMapOpen){drawMap();notifyHiddenRelaysByFilter(beforeRelayVisibleIds);}
  });
  on('mapFilterSection','change',()=>{
    const beforeRelayVisibleIds=new Set(visibleNotes().filter(isRelayNode).map(n=>n.id));
    mapFilter.section=g('mapFilterSection').value;updateMapPagePath();saveDataDeferred();if(g('lanePanel')&&g('lanePanel').classList.contains('open'))renderLanePanel();if(isMapOpen){drawMap();notifyHiddenRelaysByFilter(beforeRelayVisibleIds);}
  });
  on('mapAdvancedToggleBtn','click',()=>setMapAdvanced(!mapAdvancedOpen));
  mapDepth='all';
  mapFocusMode=false;
  const updateMapScrollModeBtn=()=>{
    const btn=g('mapScrollModeBtn'),canvas=g('mapCanvas');
    if(canvas) canvas.classList.toggle('vertical-scroll-mode',!!mapVerticalScrollMode);
    if(!btn) return;
    btn.textContent=mapVerticalScrollMode?'↕ 垂直捲動：開':'↕ 垂直捲動';
    btn.style.background=mapVerticalScrollMode?'#0C447C':'#f5f5f5';
    btn.style.color=mapVerticalScrollMode?'#fff':'#555';
    btn.style.borderColor=mapVerticalScrollMode?'#0C447C':'#ddd';
  };
  const setZoom=z=>{mapScale=Math.max(.15,Math.min(3.5,z));g('zoomLabel').textContent=Math.round(mapScale*100)+'%';drawMap();};
  on('zoomIn','click',()=>setZoom(mapScale+.15));on('zoomOut','click',()=>setZoom(mapScale-.15));
  on('mapScrollModeBtn','click',()=>{
    mapVerticalScrollMode=!mapVerticalScrollMode;
    const canvas=g('mapCanvas');
    if(mapVerticalScrollMode) mapOffY=0;
    else if(canvas) canvas.scrollTop=0;
    updateMapScrollModeBtn();
    drawMap();
    showToast(mapVerticalScrollMode?'已啟用垂直捲動模式':'已關閉垂直捲動模式');
  });
  on('zoomFit','click',()=>{const vis=visibleNotes();if(!vis.length)return;const xs=vis.map(n=>nodePos[n.id]?nodePos[n.id].x:mapW/2),ys=vis.map(n=>nodePos[n.id]?nodePos[n.id].y:mapH/2);const minX=Math.min(...xs)-40,maxX=Math.max(...xs)+40,minY=Math.min(...ys)-40,maxY=Math.max(...ys)+40;const sc=Math.min(mapW/(maxX-minX||1),mapH/(maxY-minY||1),2.5);mapScale=sc;mapOffX=-minX*sc+(mapW-(maxX-minX)*sc)/2;mapOffY=-minY*sc+(mapH-(maxY-minY)*sc)/2;g('zoomLabel').textContent=Math.round(sc*100)+'%';drawMap();});
  on('mpClose','click',closeMapPopup);
  on('mapLinkedOnlyBtn','click',()=>{mapLinkedOnly=!mapLinkedOnly;setMapLinkedOnlyBtnStyle();drawMap();saveDataDeferred();showToast(mapLinkedOnly?`顯示 ${visibleNotes().length} 個有關聯節點`:'顯示全部節點');});
  on('mapAutoBtn','click',()=>{const btn=g('mapAutoBtn'),orig=btn.textContent;btn.textContent='排列中...';btn.disabled=true;setTimeout(()=>{nodePos={};mapScale=1;mapOffX=mapOffY=0;forceLayout();drawMap();saveDataDeferred();g('zoomLabel').textContent='100%';btn.textContent=orig;btn.disabled=false;showToast('已自動排列（保留核心節點）');},30);});
  on('mapLaneBtn','click',()=>{const panel=ensureLanePanel();if(!panel){showToast('泳道面板載入失敗');return;}if(panel.classList.contains('open'))closeLanePanel();else openLanePanel();});
  updateMapScrollModeBtn();
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
  if(!window.Email){const sc=document.createElement('script');sc.src='https://smtpjs.com/v3/smtp.js';document.head.appendChild(sc);}
  clearInterval(reminderTimer); reminderTimer=setInterval(checkReminders,30000); checkReminders();
  updateNotesHomeVisibility();
  render();
  restoreLastViewState();
  }catch(err){
    const detail={name:err&&err.name,message:err&&err.message,stack:err&&err.stack};
    console.error('[init-load-error]',detail,err);
  }
});
