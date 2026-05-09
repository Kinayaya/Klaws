// KLaws script.js — 完整版（精簡行數）
// ==================== 資料定義 ====================
const DEFAULTS = {
  notes: [
    {id:1,type:'article',domain:'民法',title:'民法第 184 條 — 侵權行為',question:'民法第 184 條要件是什麼？',answer:'因故意或過失，不法侵害他人之權利者，負損害賠償責任。',prompt:'先回想「侵害權利 + 故意過失 + 因果關係」。',application:'在侵權責任題型中，用它判斷是否成立損害賠償。',tags:['侵權行為','損害賠償'],date:'2025-03-10',detail:'構成要件：\n1. 須有加害行為\n2. 行為須不法\n3. 須有故意或過失\n4. 須有損害\n5. 加害行為與損害間有因果關係'},
  ],
  links: [{id:1,from:3,to:4,rel:'example',color:'#2F8F6B'},{id:2,from:3,to:2,rel:'contrast',color:'#8A5CF6'},{id:3,from:1,to:5,rel:'application',color:'#D97706'}],
  types: [{key:'article',label:'條文',color:'#007AFF'},{key:'concept',label:'概念',color:'#7F77DD'},{key:'issue',label:'爭點',color:'#D85A30'}],
  domains: [{key:'民法',label:'民法',color:'#D85A30'},{key:'刑法',label:'刑法',color:'#1D9E75'},{key:'憲法',label:'憲法',color:'#7F77DD'},{key:'行政法',label:'行政法',color:'#378ADD'}],
  groups: [
    {key:'總則',label:'總則',domain:'民法'},{key:'法律行為',label:'法律行為',domain:'民法'},
  ],
  parts: []
};
const LINK_COLOR = '#6F86A0', SKEY = 'legal_notes_v4', PAGE_SIZE = 30;
const ARCHIVES_KEY = 'klaws_archives_v1';
const ARCHIVE_SNAPSHOT_LIMIT = 30;
const RECYCLE_BIN_KEY = 'klaws_recycle_bin_v1';
const RECYCLE_GROUP_WINDOW_MS = 30*60*1000;
const SCOPE_LINKED_TOGGLE_KEY = 'klaws_scope_linked_toggle_v1';
const COMPACT_FILTER_KEY = 'klaws_compact_filters_v1';
const USAGE_START_KEY = 'klaws_usage_start_v1';
const FORM_TAXONOMY_PREF_KEY = 'klaws_form_taxonomy_pref_v1';
const BACKEND_SYNC_ENDPOINT_KEY = 'klaws_backend_sync_endpoint_v1';
const LAST_VIEW_STATE_KEY = 'klaws_last_view_state_v1';
const GOOGLE_DRIVE_CLIENT_ID_KEY = 'klaws_google_drive_client_id_v1';
const GOOGLE_DRIVE_SYNC_FILE_NAME = 'klaws-sync-v1.json';
const GOOGLE_DRIVE_SYNC_MIME = 'application/json';
const PORTABLE_EXPORT_SCHEMA_VERSION = '1.0.0';
const AI_MODELS = [
  {id:'openrouter/free', label:'🔀 自動選最佳免費模型（推薦）'},
  {id:'meta-llama/llama-3.3-70b-instruct:free', label:'Llama 3.3 70B（Meta）'},
  {id:'google/gemini-2.0-flash-exp:free', label:'Gemini 2.0 Flash（Google）'},
  {id:'deepseek/deepseek-r1:free', label:'DeepSeek R1（推理強）'},
  {id:'mistralai/mistral-small-3.1-24b-instruct:free', label:'Mistral Small 3.1'}
];
const GROQ_MODELS = [
  {id:'llama-3.3-70b-versatile', label:'Llama 3.3 70B Versatile'},
  {id:'llama-3.1-8b-instant', label:'Llama 3.1 8B Instant（快速）'},
  {id:'deepseek-r1-distill-llama-70b', label:'DeepSeek R1 Distill Llama 70B'},
  {id:'mixtral-8x7b-32768', label:'Mixtral 8x7B'}
];
const DEFAULT_SHORTCUTS = [
  {id:'new',label:'新增筆記',code:'KeyN',alt:true},{id:'search',label:'搜尋',code:'KeyF',alt:true},
  {id:'map',label:'開啟體系圖',code:'KeyM',alt:true},{id:'back',label:'返回筆記列表',code:'Escape'},
  {id:'close',label:'關閉面板',code:'KeyW',alt:true},{id:'edit',label:'編輯當前筆記',code:'KeyE',alt:true},
  {id:'link',label:'新增關聯',code:'KeyL',alt:true},{id:'export',label:'存檔管理',code:'KeyS',alt:true},
  {id:'shortcuts',label:'快捷鍵設定',code:'KeyK',alt:true},
  {id:'stats',label:'統計',code:'KeyI',alt:true}
];
const BUILTIN_FIELD_DEFS = {
  body:{key:'body',label:'摘要',kind:'textarea',placeholder:''},
  detail:{key:'detail',label:'詳細筆記',kind:'textarea',placeholder:''},
  todos:{key:'todos',label:'📝 待辦清單',kind:'textarea',placeholder:''}
};
const DEFAULT_TYPE_FIELD_KEYS = {
  article:['body','detail'],
  concept:['body','detail'],
  issue:['body','detail']
};
const DEFAULT_NORMAL_FIELD_KEYS = ['body','detail'];
const RELATION_TYPE_META = {
  cause:{label:'cause',color:'#2563EB',needsNote:true,notePlaceholder:'請輸入因果說明（例如：A 造成 B）'},
  example:{label:'example',color:'#2F8F6B'},
  contrast:{label:'contrast',color:'#8A5CF6',needsNote:true,notePlaceholder:'請輸入對比重點（例如：兩者差異）'},
  analogy:{label:'analogy',color:'#0EA5A4',needsNote:true,notePlaceholder:'請輸入類比說明（例如：像什麼）'}
};
const REVIEW_INTERVALS_DAYS = { forgot:1, hard:3, knew:7, easy:14 };


var { safeStr, uniq, pad2, escapeHtml, hl, parseTodos, formatTodosForEdit, parseSearchDateVariants, formatDate, normalizeNoteSchema } = window.KLawsUtils;
const { readJSON, writeJSON, readJSONAsync, writeJSONAsync, createStoreAdapter } = window.KLawsStorage;
const { renderTodoHtml, sortedNotes } = window.KLawsRender;
const { MAP_NODE_RADIUS_MIN, MAP_NODE_RADIUS_MAX, MAP_NODE_RADIUS_DEFAULT, MAP_LIGHT_BUNDLING_STRENGTH, DEFAULT_LANE_NAMES, MIN_LANE_COUNT, MAX_LANE_COUNT, clampMapRadius, defaultLaneNameAt, normalizeLaneCount, splitMapTitleLines } = window.KLawsMap;
const { fmtDateKey, dueTimeText, relativeDateLabel } = window.KLawsCalendar;

const storageAdapter=createStoreAdapter();
