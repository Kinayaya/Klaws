// ==================== 全域變數 ====================
let notes=[], mapAuxNodes=[], links=[], nid=10, lid=10, types=[], domains=[], groups=[], parts=[];
let recycleBin=[];
let cv='all', cs='all', cch='all', csec='all', searchQ='', openId=null, editMode=false, draftNoteId=null;
let selectedDomains=[], selectedGroups=[], selectedParts=[];
let scopeLinkedEnabled = localStorage.getItem(SCOPE_LINKED_TOGGLE_KEY)==='1';
let formLinkSelections={}, pathSearchQ='';
let groupDomainFilter='', partGroupFilter='';
let activePathCategory='type';
let nodePos={}, dragNode=null, dragOffX=0, dragOffY=0, mapW=800, mapH=500;
let nodeSizes={};
let mapScale=1, mapOffX=0, mapOffY=0, mapFilter={sub:'all',group:'all',part:'all',q:''}, mapLinkedOnly=true;
let mapDepth='all', mapFocusMode=false, mapFocusedNodeId=null;
let mapVerticalScrollMode=false;
let mapContentH=500;
let nodeEls={}, linkElsMap={}, nodeLinksIndex={}, linkCurveOffsets={}, isMapOpen=false;
let gridPage=1, sortMode='date_desc', multiSelMode=false, selectedIds={};
let examList=[], examTimer=null, currentExam=null, examEditingIndex=-1, examAnswerReveal=false;
let reviewMode=false, reviewQueueIndex=0, reviewReveal=false;
let shortcuts=[], recordingBtn=null, _aiPendingAction=null, _saveTimer=null, rafId=null;
let mapRedrawTimer=null, mapCenterNodeId=null, mapCenterNodeIds={}, mapLaneConfigs={}, mapNodeMeta={};
let mapTimer=null, currentView='notes';
let formMode='note';
let mapAdvancedOpen=false;
let mapCollapsed={};
let mapLinkSourceId=null;
let touchRadialMenu=null, actionUndoTimer=null, lastCardTap={id:0,time:0};
let mapSubpages={}, mapPageStack=[];
let mapPageNotes={root:[]};
let mapTreeCollapsedPaths={};
let mapTreeFilterQ='';
let mapTreeSidebarOpen=false;
let mapTreePathOrder={};
let formSectionCollapsedState={basic:false,path:false,fields:false,links:false};
let typeFieldConfigs={}, customFieldDefs={};
let lastSavedPayloadRaw='';
let calendarEvents=[], calendarSettings={emails:[]}, calendarCursor=new Date(), activeCalendarDate='';
function isValidDateObject(value){
  return value instanceof Date&&!Number.isNaN(value.getTime());
}
function getCalendarCursor(){
  if(isValidDateObject(calendarCursor)) return calendarCursor;
  const fallback=isValidDateObject(window.calendarCursor)?window.calendarCursor:new Date();
  calendarCursor=fallback;
  window.calendarCursor=fallback;
  return fallback;
}
function setCalendarCursor(next){
  const normalized=isValidDateObject(next)?next:new Date();
  calendarCursor=normalized;
  window.calendarCursor=normalized;
  return normalized;
}
window.getCalendarCursor=getCalendarCursor;
window.setCalendarCursor=setCalendarCursor;
window.calendarCursor=getCalendarCursor();
let reminderTimer=null, reminderSent={};
let reminderDismissed={};
let editingCalendarEventId=null;
let focusTimerRemainingSec=1500, focusTimerInterval=null, focusTimerRunning=false;
let focusTimerDragState={active:false,pointerId:null,startX:0,startY:0,originX:0,originY:0};
let focusTimerPos={x:null,y:null,initialized:false};
let headerDatetimeTimer=null;
let googleAccessToken='', googleTokenExpireAt=0, googleSyncBusy=false, googleSyncLastError='';
let cloudSyncEnabled=localStorage.getItem(typeof CLOUD_SYNC_ENABLED_KEY==='string'?CLOUD_SYNC_ENABLED_KEY:'klaws_cloud_sync_enabled_v1')==='1';
let klawsCoreBridge=null;
function resolveKLawsCore(explicitCore){
  if(explicitCore&&typeof explicitCore.mergeAuxNodesIntoNotes==='function') return explicitCore;
  if(klawsCoreBridge&&typeof klawsCoreBridge.mergeAuxNodesIntoNotes==='function') return klawsCoreBridge;
  const globalCore=typeof globalThis!=='undefined'?globalThis.KLawsCore:null;
  if(globalCore&&typeof globalCore.mergeAuxNodesIntoNotes==='function') return globalCore;
  throw new Error('KLawsCore bridge missing: inject via setKLawsCoreBridge or mergeAuxNodesIntoNotes(...,{klawsCore})');
}

function setKLawsCoreBridge(core){
  klawsCoreBridge=core;
}

function mergeAuxNodesIntoNotes(baseNotes=[], auxNodeList=[],options={}){
  const core=resolveKLawsCore(options.klawsCore);
  return core.mergeAuxNodesIntoNotes(baseNotes, auxNodeList, {normalizeNoteSchema, safeStr});
}


function createAppState(options={}){
  const debug=!!options.debug;
  const logger=typeof options.logger==='function'?options.logger:console.log.bind(console);
  const snapshot=()=>({
    currentView,
    isMapOpen,
    mapFilter:{...mapFilter},
    searchQ,
    gridPage
  });
  const logTransition=(action,before,after,payload)=>{
    if(!debug) return;
    logger('[app-state]',action,{before,after,payload});
  };
  const setView=(view,{mapOpen}={})=>{
    const before=snapshot();
    currentView=view;
    if(typeof mapOpen==='boolean') isMapOpen=mapOpen;
    logTransition('setView',before,snapshot(),{view,mapOpen});
  };
  const setSearchQuery=(q)=>{
    const before=snapshot();
    searchQ=safeStr(q);
    gridPage=1;
    logTransition('setSearchQuery',before,snapshot(),{q:searchQ});
  };
  const updateMapFilter=(patch={})=>{
    const before=snapshot();
    const next={...mapFilter,...patch};
    mapFilter=next;
    logTransition('updateMapFilter',before,snapshot(),{patch});
  };
  return {
    get currentView(){ return currentView; },
    get isMapOpen(){ return isMapOpen; },
    get mapFilter(){ return mapFilter; },
    get searchQ(){ return searchQ; },
    get gridPage(){ return gridPage; },
    setView,
    setSearchQuery,
    updateMapFilter
  };
}

const appState=createAppState({debug:localStorage.getItem('klaws_debug_state')==='1'});
if(typeof window!=='undefined'){
  window.appState=appState;
}
if(typeof module!=='undefined'&&module.exports){
  module.exports={createAppState,setKLawsCoreBridge,mergeAuxNodesIntoNotes};
}
