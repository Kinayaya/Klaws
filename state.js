// ==================== 全域變數 ====================
let notes=[], mapAuxNodes=[], links=[], nid=10, lid=10, types=[], domains=[], groups=[], parts=[];
let recycleBin=[];
let cv='all', cs='all', cch='all', csec='all', searchQ='', openId=null, editMode=false;
let selectedDomains=[], selectedGroups=[], selectedParts=[];
let scopeLinkedEnabled = localStorage.getItem(SCOPE_LINKED_TOGGLE_KEY)==='1';
let formLinkSelections={}, pathSearchQ='', pathUnusedOnly=false;
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
let examList=[], examTimer=null, examSec=0, examTotal=0, currentExam=null, examEditingIndex=-1, examAnswerReveal=false;
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
let mapPageNotes={root:[]};
let mapTreeCollapsedPaths={};
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
const XP_BOOST_MULTIPLIER = 2.5;
const BASE_XP_BY_DIFFICULTY = {E:12,N:22,H:36};
let levelSystem={skills:[],tasks:[],settings:{xpByDifficulty:{E:30,N:55,H:90},xpBoost150Applied:true}};
let levelTaskExpanded={}, levelEditorState={kind:'',idx:-1};
const LEVEL_STAGES=[
  {min:0,max:20,rank:'E'},{min:21,max:40,rank:'F'},{min:41,max:50,rank:'D'},
  {min:51,max:60,rank:'C'},{min:61,max:70,rank:'B'},{min:71,max:80,rank:'B+'},
  {min:81,max:85,rank:'A'},{min:86,max:90,rank:'A+'},{min:91,max:98,rank:'S'},
  {min:99,max:99,rank:'SS'},{min:100,max:100,rank:'SSS'}
];
const TASK_REPEAT_OPTIONS=[
  {key:'daily',label:'每日'},
  {key:'every3days',label:'每三日'},
  {key:'weekly',label:'每週'},
  {key:'monthly',label:'每月'},
  {key:'yearly',label:'每年'}
];
function mergeAuxNodesIntoNotes(baseNotes=[], auxNodeList=[]){
  return KLawsCore.mergeAuxNodesIntoNotes(baseNotes, auxNodeList, {normalizeNoteSchema, safeStr});
}
