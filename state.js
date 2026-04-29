// ==================== 全域變數 ====================
let notes=[], mapRelays=[], links=[], nid=10, lid=10, types=[], subjects=[], chapters=[], sections=[];
let recycleBin=[], unusedTagTracker={};
let cv='all', cs='all', cch='all', csec='all', searchQ='', openId=null, editMode=false;
let selectedSubjects=[], selectedChapters=[], selectedSections=[];
let scopeLinkedEnabled = localStorage.getItem(SCOPE_LINKED_TOGGLE_KEY)==='1';
let formLinkSelections={}, tagSearchQ='', tagUnusedOnly=false;
let chapterSubjectFilter='', sectionChapterFilter='';
let activeTagCategory='type';
let nodePos={}, dragNode=null, dragOffX=0, dragOffY=0, mapW=800, mapH=500;
let nodeSizes={};
let mapScale=1, mapOffX=0, mapOffY=0, mapFilter={sub:'all',chapter:'all',section:'all',q:''}, mapLinkedOnly=true;
let mapDepth='all', mapFocusMode=false, mapFocusedNodeId=null;
let mapVerticalScrollMode=false;
let mapContentH=500;
let nodeEls={}, linkElsMap={}, nodeLinksIndex={}, linkCurveOffsets={}, isMapOpen=false;
let gridPage=1, sortMode='date_desc', multiSelMode=false, selectedIds={};
let examList=[], examTimer=null, examSec=0, examTotal=0, currentExam=null;
let reviewMode=false, reviewQueueIndex=0, reviewReveal=false;
let shortcuts=[], recordingBtn=null, _aiPendingAction=null, _saveTimer=null, rafId=null;
let mapRedrawTimer=null, mapResizeObserver=null, mapCenterNodeId=null, mapCenterNodeIds={}, mapLaneConfigs={}, mapNodeMeta={};
let mapTimer=null, currentView='notes';
let formMode='note';
let mapAdvancedOpen=false;
let mapCollapsed={};
let mapLinkSourceId=null;
let touchRadialMenu=null, actionUndoTimer=null, lastCardTap={id:0,time:0};
let mapSubpages={}, mapPageStack=[];
let mapPageNotes={root:[]}, mapAssignTargetPageId='root', mapAssignSelectedNoteIds={};
let typeFieldConfigs={}, customFieldDefs={};
let lastSavedPayloadRaw='';
let calendarEvents=[], calendarSettings={emails:[]}, calendarCursor=new Date(), activeCalendarDate='';
let reminderTimer=null, reminderSent={};
let reminderDismissed={};
let editingCalendarEventId=null;
let focusTimerRemainingSec=1500, focusTimerInterval=null, focusTimerRunning=false;
let focusTimerDragState={active:false,pointerId:null,startX:0,startY:0,originX:0,originY:0};
let focusTimerPos={x:null,y:null,initialized:false};
let headerDatetimeTimer=null;
let googleAccessToken='', googleTokenExpireAt=0, googleSyncBusy=false, googleSyncLastError='';
let achievements={points:0,taskCompletions:0,unlocked:{},lastUsageMinuteReward:0}; // backward compatibility for legacy data
const XP_BOOST_MULTIPLIER = 2.5;
const BASE_XP_BY_DIFFICULTY = {E:12,N:22,H:36};
let levelSystem={skills:[],tasks:[],achievements:[],settings:{xpByDifficulty:{E:30,N:55,H:90},xpBoost150Applied:true}};
let levelTaskExpanded={}, levelEditorState={kind:'',idx:-1};
const LEVEL_STAGES=[
  {min:0,max:20,rank:'E'},{min:21,max:40,rank:'F'},{min:41,max:50,rank:'D'},
  {min:51,max:60,rank:'C'},{min:61,max:70,rank:'B'},{min:71,max:80,rank:'B+'},
  {min:81,max:85,rank:'A'},{min:86,max:90,rank:'A+'},{min:91,max:98,rank:'S'},
  {min:99,max:99,rank:'SS'},{min:100,max:100,rank:'SSS'}
];
const TITLE_LEVELS=[
  {level:1,min:0,name:'節點觀測員'},
  {level:2,min:120,name:'條文解析者'},
  {level:3,min:300,name:'脈絡梳理師'},
  {level:4,min:650,name:'邏輯鏈編織手'},
  {level:5,min:1100,name:'圖譜測繪員'},
  {level:6,min:1700,name:'法理結構家'},
  {level:7,min:2500,name:'維度跨越者'},
  {level:8,min:3500,name:'體系導航員'},
  {level:9,min:4800,name:'核心矩陣師'},
  {level:10,min:6200,name:'Klaws 終極奇點'}
];
const TASK_REPEAT_OPTIONS=[
  {key:'daily',label:'每日'},
  {key:'every3days',label:'每三日'},
  {key:'weekly',label:'每週'},
  {key:'monthly',label:'每月'},
  {key:'yearly',label:'每年'}
];
function mergeRelaysIntoNotes(baseNotes=[], relayList=[]){
  return KLawsCore.mergeRelaysIntoNotes(baseNotes, relayList, {normalizeNoteSchema, safeStr});
}
