// ==================== UI 建構 ====================
function buildTypeRow() {
  const row=g('typeRow');
  row.innerHTML=`<button class="tab ${cv==='all'?'on':''}" data-v="all">全部</button>`+types.map(t=>`<button class="tab ${cv===t.key?'on':''}" data-v="${t.key}" style="${cv===t.key?`background:${t.color};`:''}">${t.label}</button>`).join('');
  row.querySelectorAll('.tab[data-v]').forEach(btn=>btn.addEventListener('click',()=>{cv=btn.dataset.v;gridPage=1;buildTypeRow();render();}));
}
function buildSubRow() {
  normalizeFilterSelections();
  const row=g('subbar');
  const isAll=selectedDomains.length===0;
  row.innerHTML=`<button class="sc ${isAll?'on':''}" data-s="all">全部</button>`+domains.map(s=>{
    const active=selectedDomains.includes(s.key);
    return `<button class="sc ${active?'on':''}" data-s="${s.key}" style="${active?`background:${s.color};color:#fff;`:''}">${s.label}</button>`;
  }).join('');
  row.querySelectorAll('.sc').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.s;
    if(key==='all') selectedDomains=[];
    else selectedDomains=toggleSingleSelection(selectedDomains,key);
    cs=selectedDomains.length===1?selectedDomains[0]:'all';
    selectedGroups=[];selectedParts=[];cch='all';csec='all';
    gridPage=1;buildSubRow();render();
  }));
}
function buildGroupRow() {
  normalizeFilterSelections();
  const row=g('groupbar'); if(!row) return;
  const available=groupsByDomains(selectedDomains);
  const isAll=selectedGroups.length===0;
  row.innerHTML=available.length?`<button class="ch ${isAll?'on':''}" data-ch="all">全部</button>`+available.map(ch=>{
    const active=selectedGroups.includes(ch.key);
    return `<button class="ch ${active?'on':''}" data-ch="${ch.key}">${ch.label}</button>`;
  }).join(''):'';
  row.style.display=available.length?'flex':'none';
  row.querySelectorAll('.ch').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.ch;
    if(key==='all') selectedGroups=[];
    else selectedGroups=toggleSingleSelection(selectedGroups,key);
    const partKeys=new Set(partsByGroups(selectedGroups).map(sec=>sec.key));
    selectedParts=selectedParts.filter(k=>partKeys.has(k));
    cch=selectedGroups.length===1?selectedGroups[0]:'all';
    csec=selectedParts.length===1?selectedParts[0]:'all';
    gridPage=1;buildGroupRow();buildPartRow();render();
  }));
}
function buildPartRow() {
  normalizeFilterSelections();
  const row=g('partbar'); if(!row) return;
  const available=partsByGroups(selectedGroups);
  const isAll=selectedParts.length===0;
  row.innerHTML=available.length?`<button class="ch ${isAll?'on':''}" data-sec="all">全部</button>`+available.map(sec=>{
    const active=selectedParts.includes(sec.key);
    return `<button class="ch ${active?'on':''}" data-sec="${sec.key}">${sec.label}</button>`;
  }).join(''):'';
  row.style.display=available.length?'flex':'none';
  row.querySelectorAll('.ch').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.sec;
    if(key==='all') selectedParts=[];
    else selectedParts=toggleSingleSelection(selectedParts,key);
    csec=selectedParts.length===1?selectedParts[0]:'all';
    gridPage=1;buildPartRow();render();
  }));
}
function groupsByDomains(subKeys){
  if(!Array.isArray(subKeys)||!subKeys.length) return groups.slice();
  return groups.filter(ch=>subKeys.includes(ch.domain)||ch.domain==='all');
}
function partsByGroups(chKeys){
  if(!Array.isArray(chKeys)||!chKeys.length) return parts.slice();
  return parts.filter(sec=>chKeys.includes(sec.group)||sec.group==='all');
}
function normalizeFilterSelections(){
  const validDomainKeys=new Set(domains.map(s=>s.key));
  selectedDomains=selectedDomains.filter(k=>validDomainKeys.has(k)).slice(0,1);
  const validGroupKeys=new Set(groupsByDomains(selectedDomains).map(ch=>ch.key));
  selectedGroups=selectedGroups.filter(k=>validGroupKeys.has(k)).slice(0,1);
  const validPartKeys=new Set(partsByGroups(selectedGroups).map(sec=>sec.key));
  selectedParts=selectedParts.filter(k=>validPartKeys.has(k)).slice(0,1);
  cs=selectedDomains.length===1?selectedDomains[0]:'all';
  cch=selectedGroups.length===1?selectedGroups[0]:'all';
  csec=selectedParts.length===1?selectedParts[0]:'all';
}
function toggleSingleSelection(selectedKeys,key){
  if(!key) return [];
  return selectedKeys[0]===key?[]:[key];
}
function groupsByDomain(subKey){ return groups.filter(ch=>subKey==='all'||ch.domain===subKey||ch.domain==='all'); }
function selectedValues(id){
  const el=g(id); if(!el) return [];
  return Array.from(el.selectedOptions||[]).map(opt=>opt.value).filter(Boolean);
}
function setSelectedValues(id, values=[]){
  const el=g(id); if(!el) return;
  const set=new Set(values);
  Array.from(el.options||[]).forEach(opt=>{opt.selected=set.has(opt.value);});
}
function syncGroupSelect(domainKeys, selected=[]) {
  const fc=g('fc'); if(!fc) return;
  const keys=Array.isArray(domainKeys)?domainKeys.filter(Boolean):(domainKeys?[domainKeys]:[]);
  const available=keys.length?groupsByDomains(keys):groups.slice();
  fc.innerHTML=`<option value="">無</option>`+available.map(ch=>`<option value="${ch.key}">${ch.label}</option>`).join('');
  const selectedKeys=(Array.isArray(selected)?selected.filter(Boolean):(selected?[selected]:[])).slice(0,1);
  const validSelected=selectedKeys.filter(k=>available.some(ch=>ch.key===k));
  if(validSelected.length) setSelectedValues('fc',validSelected);
  else fc.value='';
}
function syncPartSelect(groupKeys, selected=[], domainKeys=[]){
  const sec=g('fsec'); if(!sec) return;
  const chKeys=Array.isArray(groupKeys)?groupKeys.filter(Boolean):(groupKeys?[groupKeys]:[]);
  const subKeys=Array.isArray(domainKeys)?domainKeys.filter(Boolean):(domainKeys?[domainKeys]:[]);
  const availableGroupKeys=chKeys.length
    ? chKeys
    : (subKeys.length?groupsByDomains(subKeys).map(ch=>ch.key):groups.map(ch=>ch.key));
  const available=availableGroupKeys.length?partsByGroups(availableGroupKeys):[];
  sec.innerHTML=`<option value="">無</option>`+available.map(item=>`<option value="${item.key}">${item.label}</option>`).join('');
  const selectedKeys=(Array.isArray(selected)?selected.filter(Boolean):(selected?[selected]:[])).slice(0,1);
  const validSelected=selectedKeys.filter(k=>available.some(item=>item.key===k));
  if(validSelected.length) setSelectedValues('fsec',validSelected);
  else sec.value='';
}
function buildFormSelects() {
  const typeSelect=g('ft');
  if(typeSelect) typeSelect.innerHTML=types.map(t=>`<option value="${t.key}">${t.label}</option>`).join('');
  const domainSelect=g('fs2');
  if(domainSelect) domainSelect.innerHTML=`<option value="">無</option>`+domains.map(s=>`<option value="${s.key}">${s.label}</option>`).join('');
  syncGroupSelect(selectedValues('fs2'));
  syncPartSelect(selectedValues('fc'),[],selectedValues('fs2'));
}
function rebuildUI() { buildTypeRow();buildSubRow();buildFormSelects(); }

function hasTaxonomyFilter() {
  return !!(selectedDomains.length||selectedGroups.length||selectedParts.length);
}
function baseScopeMatch(note) {
  const subs=noteDomains(note), chs=noteGroups(note), secs=noteParts(note);
  return (cv==='all'||note.type===cv)
    &&(!selectedDomains.length||intersects(selectedDomains,subs))
    &&(!selectedGroups.length||intersects(selectedGroups,chs))
    &&(!selectedParts.length||intersects(selectedParts,secs))
;
}
function noteMatchesSearch(note, q, normalizedDate='') {
  if(!q) return true;
  const subs=noteDomains(note), chs=noteGroups(note), secs=noteParts(note);
  const hay=`${note.title} ${note.question||''} ${note.answer||''} ${note.prompt||''} ${note.application||''} ${note.body} ${subs.join(' ')} ${chs.join(' ')} ${secs.join(' ')} ${note.date||''}`.toLowerCase();
  return hay.includes(q)||(normalizedDate&&formatDate(note.date)===normalizedDate);
}
function auxnodeMatchesSearch(auxnode, q) {
  if(!q) return true;
  const subs=noteDomains(auxnode), chs=noteGroups(auxnode), secs=noteParts(auxnode);
  const hay=`${auxnode.title} ${auxnode.body||''} ${subs.join(' ')} ${chs.join(' ')} ${secs.join(' ')}`.toLowerCase();
  return hay.includes(q);
}
function expandWithLinkedNotes(seedIds) {
  const expanded=new Set(seedIds), queue=[...expanded];
  while(queue.length){
    const current=queue.shift();
    links.forEach(l=>{
      if(l.from===current&&!expanded.has(l.to)){expanded.add(l.to);queue.push(l.to);}
      if(l.to===current&&!expanded.has(l.from)){expanded.add(l.from);queue.push(l.from);}
    });
  }
  return expanded;
}
function expandWithChildLinkedNotes(seedIds) {
  const expanded=new Set(seedIds), queue=[...expanded];
  while(queue.length){
    const current=queue.shift();
    links.forEach(l=>{
      if(l.from===current&&!expanded.has(l.to)){expanded.add(l.to);queue.push(l.to);}
    });
  }
  return expanded;
}

// ==================== 渲染 ====================
function render() {
  updateNotesHomeVisibility();
  if(currentView==='notes'&&!searchQ.trim()&&!reviewMode) return;
  const q=searchQ.trim().toLowerCase();
  const normalizedDate=parseSearchDateVariants(searchQ);
  const seedIds=new Set(notes.filter(n=>baseScopeMatch(n)).map(n=>n.id));
  const shouldExpand=scopeLinkedEnabled&&hasTaxonomyFilter();
  const visibleIds=shouldExpand?expandWithLinkedNotes(seedIds):seedIds;
  const dueSet=new Set(dueReviewNotes().map(n=>n.id));
  const filtered=sortedNotes(notes,{sortMode,safeStr,noteDomainText,noteGroupText}).filter(n=>visibleIds.has(n.id)&&noteMatchesSearch(n,q,normalizedDate)&&(!reviewMode||dueSet.has(n.id)));
  const sb=g('search-results-bar');
  if(q){sb.style.display='block';sb.textContent=`搜尋「${searchQ}」：找到 ${filtered.length} 筆筆記`;}
  else if(shouldExpand){
    const linkedCount=Math.max(0,filtered.length-seedIds.size);
    sb.style.display='block';
    sb.textContent=linkedCount>0?`已額外顯示 ${linkedCount} 筆跨關聯筆記`:'已啟用跨關聯顯示（目前無新增筆記）';
  }else sb.style.display='none';
  const grid=g('grid');
  const pager=g('gridPager'); if(pager) pager.remove();
  const reminderHits=(q||normalizedDate)?calendarEvents.filter(ev=>{
    if(ev.type!=='reminder') return false;
    const hay=`${ev.title||''} ${ev.body||''} ${ev.date||''}`.toLowerCase();
    return hay.includes(q)||(normalizedDate&&formatDate(ev.date)===normalizedDate);
  }).map(ev=>({__isReminder:true,id:`r_${ev.id}`,title:ev.title||'未命名提醒',body:ev.body||'',date:ev.date,type:'reminder',eventId:ev.id,dueHour:ev.dueHour||0,dueMinute:ev.dueMinute||0})) : [];
  const mixed=[...filtered,...reminderHits];
  if(!mixed.length){const hasFilters=!!(q||hasTaxonomyFilter()||reviewMode);grid.innerHTML=hasFilters?'<div class="empty">沒有符合的筆記，試試調整關鍵字或篩選條件</div>':'<div class="empty empty-state"><div class="empty-emoji">🗂️</div><div class="empty-title">還沒有筆記</div><div class="empty-sub">先新增第一筆內容，或點選左側分類開始整理你的法律知識。</div><button class="add-btn empty-cta" id="emptyAddBtn">+ 新增第一筆</button></div>';const cta=g('emptyAddBtn');if(cta) cta.addEventListener('click',()=>openForm());return;}
  const maxPg=Math.ceil(mixed.length/PAGE_SIZE)||1;
  if(gridPage>maxPg) gridPage=maxPg;
  const pgF=mixed.slice((gridPage-1)*PAGE_SIZE,gridPage*PAGE_SIZE);
  grid.innerHTML=pgF.map(n=>{
    const isReminder=!!n.__isReminder;
    const tp=isReminder?{label:'提醒',color:'#b91c1c'}:typeByKey(n.type),subs=isReminder?[]:noteDomains(n),chs=isReminder?[]:noteGroups(n),secs=isReminder?[]:noteParts(n);
    const subChips=subs.map(sk=>{const sb2=subByKey(sk);return `<span class="chip" style="background:${lightC(sb2.color)};color:${darkC(sb2.color)}">${sb2.label}</span>`;}).join('');
    const noteActionChips=isReminder?'':`<span class="chip card-action-chip" data-action="duplicate">建立副本</span><span class="chip card-action-chip" data-action="copy">複製內容</span><span class="chip card-action-chip" data-action="delete">刪除</span>`;
    const linkedChip=(shouldExpand&&!seedIds.has(n.id))?'<span class="chip" style="background:#EAF3DE;color:#3B6D11;border-color:#97C459">跨科關聯</span>':'';
    const hasContent=isReminder?!!safeStr(n.body):noteHasVisibleContent(n);
    const previewText=reviewMode?(n.prompt||n.question||'（尚未填寫問題）'):(n.question||n.body);
    return `<div class="card ${hasContent?'':'card-empty-content'} ${isReminder?'calendar-reminder-card':''}" data-id="${n.id}" data-reminder-id="${isReminder?n.eventId:''}" style="--type-color:${tp.color}"><button class="sel-check" type="button" aria-label="勾選筆記"></button><div class="ctop"><span class="ctag">${tp.label}</span><div class="ctitle-inline">${hl(n.title,q)}</div></div>${hasContent?`<div class="cbody">${escapeHtml(previewText)}</div>`:''}<div class="cfoot">${subChips}${linkedChip}${noteActionChips}</div></div>`;
  }).join('');
  grid.querySelectorAll('.card').forEach(c=>{
    const rid=c.dataset.reminderId?parseInt(c.dataset.reminderId,10):0;
    const id=parseInt(c.dataset.id);
    if(rid){
      c.addEventListener('click',()=>{const ev=calendarEvents.find(e=>e.id===rid);if(ev) openCalendarEventModal(ev.date,ev);});
      return;
    }
    if(multiSelMode) c.classList.add('selectable');
    if(selectedIds[id]){c.classList.add('selected');c.querySelector('.sel-check').textContent='✓';}
    bindCardInteractions(c,id);
  });
  if(mixed.length>PAGE_SIZE){
    const totalPg=Math.ceil(mixed.length/PAGE_SIZE),pager=document.createElement('div');
    pager.id='gridPager';pager.style.cssText='display:flex;align-items:center;justify-content:center;gap:10px;padding:14px 14px 28px;';
    if(gridPage>1){const pb=document.createElement('button');pb.className='tool-btn';pb.textContent='← 上一頁';pb.onclick=()=>{gridPage--;render();window.scrollTo(0,0);};pager.appendChild(pb);}
    const pi=document.createElement('span');pi.style.cssText='font-size:12px;color:#7b8492;';pi.textContent=`${gridPage} / ${totalPg}`;pager.appendChild(pi);
    if(gridPage<totalPg){const nb=document.createElement('button');nb.className='tool-btn';nb.textContent='下一頁 →';nb.onclick=()=>{gridPage++;render();window.scrollTo(0,0);};pager.appendChild(nb);}
    g('content').appendChild(pager);
  }
}
function applyCompactFilterMode(enabled){
  document.body.classList.toggle('compact-filters',!!enabled);
  window.KLawsStorage.governedWriteLocal(COMPACT_FILTER_KEY,enabled?'1':'0','ephemeral');
  const btn=g('compactToggleBtn');
  if(btn) btn.textContent=enabled?'☰ 顯示分類':'☰ 收合分類';
}
function createRelationLink(fromId,toId,relType='',relNote=''){
  const a=parseInt(fromId,10),b=parseInt(toId,10);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a===b) return false;
  const src=mapNodeById(a),target=mapNodeById(b);
  if(!src||!target) return false;
  if((isAuxnodeNode(src)||isAuxnodeNode(target))&&(!isNodeInCurrentMapPage(a)||!isNodeInCurrentMapPage(b))) return false;
  if(links.some(l=>(l.from===a&&l.to===b)||(l.from===b&&l.to===a))) return false;
  links.push({id:lid++,from:a,to:b,note:normalizeRelationNote(relNote)});
  return true;
}
function clearMapLinkSource(opts={}){
  const {silent=false}=opts;
  if(!mapLinkSourceId) return;
  mapLinkSourceId=null;
  if(isMapOpen) drawMap();
  if(!silent) showToast('已取消地圖連線起點');
}
function setMapLinkSource(id){
  if(!mapNodeById(id)) return;
  mapLinkSourceId=id;
  if(isMapOpen) drawMap();
  showToast('已選擇地圖連線起點，請再點一個點建立關聯');
}
function handleMapNodeLinkTap(targetId){
  if(!mapLinkSourceId) return false;
  if(mapLinkSourceId===targetId){
    clearMapLinkSource();
    return true;
  }
  const src=mapLinkSourceId;
  const created=createRelationLink(src,targetId);
  if(!created){
    showToast('關聯已存在或無效');
    return true;
  }
  mapLinkSourceId=targetId;
  saveData();
  drawMap();
  if(openId===src||openId===targetId) renderLinksForNote(openId);
  showToast('已建立關聯，可繼續點下一個點串接');
  return true;
}
function findMapNodesByKeyword(keyword,excludeId){
  const q=safeStr(keyword).replace(/^@/,'').trim().toLowerCase();
  if(!q) return [];
  const blocked=Number(excludeId);
  return [...notes,...mapAuxNodes].filter(n=>n.id!==blocked&&`${n.title} ${noteDomainText(n)} ${isAuxnodeNode(n)?'':typeByKey(n.type).label}`.toLowerCase().includes(q)).slice(0,18);
}
function mapPageRootOptions(){
  const subpages=[...notes,...mapAuxNodes]
    .filter(n=>hasSubpageForNode(n.id))
    .map(n=>({id:n.id,title:n.title||`點#${n.id}`}));
  return [{id:'root',title:'主頁'},...subpages];
}
function ensureMapSubpageRoot(rootId){
  if(!Number.isFinite(rootId)||!mapNodeById(rootId)) return false;
  const key=findSubpageKeyByNoteId(rootId)||mapSubpageKey(rootId);
  const existed=(mapSubpages[key]&&typeof mapSubpages[key]==='object'&&!Array.isArray(mapSubpages[key]))?mapSubpages[key]:null;
  const noteIds=Array.isArray(existed&&existed.noteIds)?[...new Set(existed.noteIds.map(v=>parseInt(v,10)).filter(Number.isFinite).filter(v=>v!==rootId))]:[];
  mapSubpages[key]={...(existed||{}),rootId,createdAt:(existed&&existed.createdAt)||new Date().toISOString(),noteIds};
  return true;
}
function getMapSubpageAssignedIds(rootId){
  const key=findSubpageKeyByNoteId(rootId);
  const item=key?mapSubpages[key]:null;
  if(!item||typeof item!=='object'||Array.isArray(item)) return new Set();
  const arr=Array.isArray(item.noteIds)?item.noteIds:[];
  return new Set(arr.map(v=>parseInt(v,10)).filter(Number.isFinite).filter(v=>v!==rootId));
}
function openMapNodeFromLink(id){
  if(!mapNodeById(id)){ showToast('點已被刪除'); return; }
  openNote(id);
}
function renderDetailQuickLinkSearch(){
  const root=g('dp-link-results');
  if(!root||!openId) return;
  const q=(g('dp-link-search')?.value||'').trim();
  if(!q){root.innerHTML='<div class="dp-link-empty">輸入關鍵字即可快速建立關聯</div>';return;}
  const existingIds=new Set(links.filter(l=>l.from===openId||l.to===openId).map(l=>l.from===openId?l.to:l.from));
  const pool=findMapNodesByKeyword(q,openId).filter(n=>!existingIds.has(n.id)&&(!isAuxnodeNode(n)||isNodeInCurrentMapPage(n.id)));
  if(!pool.length){root.innerHTML='<div class="dp-link-empty">找不到可關聯的筆記</div>';return;}
  root.innerHTML=pool.map(n=>`<div class="fl-result-item quick-add" data-quick-link-id="${n.id}"><span class="fl-result-title">${escapeHtml(n.title)}</span><button class="tool-btn" type="button">+ 關聯</button></div>`).join('');
  root.querySelectorAll('[data-quick-link-id]').forEach(row=>row.addEventListener('click',()=>{
    const targetId=parseInt(row.dataset.quickLinkId,10);
    if(!openId||!targetId) return;
    if(createRelationLink(openId,targetId)){
      saveData();renderLinksForNote(openId);render();showToast('已建立關聯');
      renderDetailQuickLinkSearch();
      if(isMapOpen) scheduleMapRedraw(100);
    }else showToast('此關聯已存在或無效');
  }));
}
function renderMapPopupQuickLinkSearch(sourceId=null){
  const input=g('mp-link-search'),root=g('mp-link-results');
  if(!input||!root) return;
  const srcId=parseInt(sourceId??input.dataset.sourceId,10);
  if(!srcId||!auxnodeById(srcId)){root.innerHTML='';return;}
  input.dataset.sourceId=String(srcId);
  const q=(input.value||'').trim();
  if(!q){root.innerHTML='<div class="dp-link-empty">輸入關鍵字即可快速建立關聯</div>';return;}
  const existingIds=new Set(links.filter(l=>l.from===srcId||l.to===srcId).map(l=>l.from===srcId?l.to:l.from));
  const pool=findMapNodesByKeyword(q,srcId).filter(n=>!existingIds.has(n.id)&&!isAuxnodeNode(n)&&isNodeInCurrentMapPage(n.id));
  if(!pool.length){root.innerHTML='<div class="dp-link-empty">找不到可關聯的筆記</div>';return;}
  root.innerHTML=pool.map(n=>`<div class="fl-result-item quick-add" data-mp-quick-link-id="${n.id}"><span class="fl-result-title">${escapeHtml(n.title)}</span><button class="tool-btn" type="button">+ 關聯</button></div>`).join('');
  root.querySelectorAll('[data-mp-quick-link-id]').forEach(row=>row.addEventListener('click',()=>{
    const targetId=parseInt(row.dataset.mpQuickLinkId,10);
    if(!srcId||!targetId) return;
    if(createRelationLink(srcId,targetId)){
      saveData();
      showMapInfo(srcId);
      if(isMapOpen) drawMap();
      if(openId&&(openId===srcId||openId===targetId)) renderLinksForNote(openId);
      showToast('已建立關聯');
      renderMapPopupQuickLinkSearch(srcId);
    }else showToast('此關聯已存在或無效');
  }));
}
function extractMentionTargets(raw,selfId){
  const text=safeStr(raw);
  const matches=[...text.matchAll(/@([^\s@#，。；、,.!?！？:：()（）\[\]【】]+)/g)].map(m=>safeStr(m[1]).trim()).filter(Boolean);
  const uniqMatches=uniq(matches);
  const ids=[];
  uniqMatches.forEach(token=>{
    const lower=token.toLowerCase();
    const exact=notes.find(n=>n.id!==selfId&&safeStr(n.title).toLowerCase()===lower);
    if(exact){ids.push(exact.id);return;}
    const fuzzy=notes.find(n=>n.id!==selfId&&safeStr(n.title).toLowerCase().includes(lower));
    if(fuzzy) ids.push(fuzzy.id);
  });
  return uniq(ids);
}
function findMentionNoteId(token,selfId){
  const normalized=safeStr(token).trim();
  if(!normalized) return null;
  const aliases=uniq([normalized,normalized.replace(/筆記$/,'')].filter(Boolean));
  for(const alias of aliases){
    const lower=alias.toLowerCase();
    const exact=notes.find(n=>n.id!==selfId&&safeStr(n.title).toLowerCase()===lower);
    if(exact) return exact.id;
    const fuzzy=notes.find(n=>n.id!==selfId&&safeStr(n.title).toLowerCase().includes(lower));
    if(fuzzy) return fuzzy.id;
  }
  return null;
}
function findSlashNoteId(token,selfId){
  const normalized=safeStr(token).trim();
  if(!normalized) return null;
  const lower=normalized.toLowerCase();
  const exact=notes.find(n=>n.id!==selfId&&safeStr(n.title).toLowerCase()===lower);
  if(exact) return exact.id;
  const fuzzy=notes.find(n=>n.id!==selfId&&safeStr(n.title).toLowerCase().includes(lower));
  if(fuzzy) return fuzzy.id;
  return null;
}
function extractSlashLinks(raw,selfId){
  const text=safeStr(raw);
  if(!text) return [];
  const tokens=[...text.matchAll(/\/([^\s/@#，。；、,.!?！？:：()（）\[\]【】]+)/g)].map(m=>safeStr(m[1]).trim()).filter(Boolean);
  const ids=uniq(tokens.map(token=>findSlashNoteId(token,selfId)).filter(Number.isFinite));
  return ids.map(id=>({id,title:mapNodeById(id)?.title||`點#${id}`}));
}
function renderMentionText(raw,selfId){
  const text=safeStr(raw);
  if(!text) return '';
  const reg=/@([^\s@#，。；、,.!?！？:：()（）\[\]【】]+)/g;
  let html='',lastIndex=0,m;
  while((m=reg.exec(text))){
    const [full,token]=m;
    html+=escapeHtml(text.slice(lastIndex,m.index));
    const targetId=findMentionNoteId(token,selfId);
    if(targetId) html+=`<a href="#" class="mention-jump" data-nid="${targetId}">${escapeHtml(full)}</a>`;
    else html+=escapeHtml(full);
    lastIndex=m.index+full.length;
  }
  html+=escapeHtml(text.slice(lastIndex));
  return html;
}
function renderDetailRichText(raw,selfId){
  const withMention=renderMentionText(raw,selfId);
  const text=safeStr(raw);
  const links=extractSlashLinks(text,selfId);
  if(!links.length) return withMention;
  const linkHtml=links.map(item=>`<a href="#" class="mention-jump" data-nid="${item.id}">/${escapeHtml(item.title)}</a>`).join('、');
  return `${withMention}<div style="margin-top:8px;font-size:12px;color:#64748B;">參照：${linkHtml}</div>`;
}
function bindMentionJumps(root){
  if(!root) return;
  root.querySelectorAll('.mention-jump').forEach(link=>link.addEventListener('click',e=>{
    e.preventDefault();
    const nid=parseInt(link.dataset.nid,10);
    if(noteById(nid)){ openNote(nid); return; }
    openMapNodeFromLink(nid);
  }));
}
function autoLinkMentionsForNote(note){
  if(!note||!note.id) return 0;
  const blocks=[note.title,note.question,note.answer,note.body,note.detail,note.application];
  Object.values(noteExtraFields(note)).forEach(v=>blocks.push(safeStr(v)));
  const mentionIds=extractMentionTargets(blocks.join('\n'),note.id);
  let added=0;
  mentionIds.forEach(id=>{ if(createRelationLink(note.id,id)) added++; });
  return added;
}

function applyReviewResult(noteId,status){
  const n=mapNodeById(noteId);
  if(!n) return;
  const now=new Date();
  n.last_reviewed=now.toISOString();
  n.next_review=nextReviewDateISO(status,now);
  saveData();
}
function openNote(id) {
  const n=mapNodeById(id); if(!n) return;
  const auxnode=isAuxnodeNode(n);
  openId=id;
  const tp=typeByKey(n.type),subs=noteDomains(n),chs=noteGroups(n),secs=noteParts(n);
  g('dp-badge').textContent=auxnode?'':tp.label; g('dp-badge').style.background=auxnode?'#A855F7':tp.color;
  g('dp-title').textContent=n.title;
  const bodyLabel=g('dp-body')?.previousElementSibling,detailLabel=g('dp-detail')?.previousElementSibling;
  const todoWrap=g('dp-todo'),todoLabel=g('dp-todo-label');
  const fields=getTypeFieldKeys(n.type);
  if(bodyLabel){bodyLabel.style.display=fields.includes('body')?'block':'none';}
  if(detailLabel){detailLabel.style.display=fields.includes('detail')?'block':'none';}
  g('dp-body').style.display=fields.includes('body')?'block':'none';
  g('dp-detail').style.display=fields.includes('detail')?'block':'none';
  g('dp-body').innerHTML=n.question?renderMentionText(n.question,n.id):'（尚無問題）';
  g('dp-detail').innerHTML=n.answer?renderDetailRichText(n.answer,n.id):'（尚無答案）';
  bindMentionJumps(g('dp-body'));
  bindMentionJumps(g('dp-detail'));
  const reveal=!!reviewReveal;
  if(reviewMode){
    g('dp-body').innerHTML=n.prompt?`${renderMentionText(n.prompt,n.id)}<hr style="margin:8px 0;border:none;border-top:1px solid #eee;">${renderMentionText(n.question,n.id)}`:renderMentionText(n.question,n.id);
    g('dp-detail').style.display=reveal?'block':'none';
    if(!reveal) g('dp-detail').innerHTML='（先回想，再按「顯示答案」）';
    todoLabel.style.display='none';todoWrap.style.display='block';
    todoWrap.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="tool-btn" id="reviewRevealBtn">${reveal?'已顯示答案':'顯示答案'}</button><button class="tool-btn" id="reviewKnewBtn" style="background:#EAF3DE;color:#2F6B1B;border-color:#97C459;">✅ 我記得</button><button class="tool-btn" id="reviewForgotBtn" style="background:#FFF1F2;color:#B42318;border-color:#F5B8BF;">❌ 我忘了</button></div><div style="margin-top:8px;font-size:12px;color:#666;">Application：${escapeHtml(n.application||'（請補上真實情境）')}</div>`;
    g('reviewRevealBtn')?.addEventListener('click',()=>{reviewReveal=true;openNote(id);});
    g('reviewKnewBtn')?.addEventListener('click',()=>{applyReviewResult(id,'knew');reviewReveal=false;showToast('已安排較長複習間隔');render();});
    g('reviewForgotBtn')?.addEventListener('click',()=>{applyReviewResult(id,'forgot');reviewReveal=false;showToast('已安排短期複習');render();});
  }else if(fields.includes('todos')){todoLabel.style.display='block';todoWrap.style.display='block';todoWrap.innerHTML=renderTodoHtml(n.todos);}
  else{todoLabel.style.display='none';todoWrap.style.display='none';todoWrap.innerHTML='';}
  const subChips=subs.map(sk=>{const sb=subByKey(sk);return `<span class="chip" style="background:${lightC(sb.color)};color:${darkC(sb.color)}">${sb.label}</span>`;}).join('');
  const pathChip=n.path?`<span class="chip" style="background:#EEF2FF;color:#334155">${escapeHtml(n.path)}</span>`:'';
  const customHtml=fields.filter(k=>!BUILTIN_FIELD_DEFS[k]).map(k=>{
    const v=renderFieldValue(n,k);
    return `<span class="chip" title="${getFieldDef(k).label}">${getFieldDef(k).label}：${String(v).slice(0,20)||'（空）'}</span>`;
  }).join('');
  g('dp-chips').innerHTML=subChips+pathChip+customHtml;
  g('dp-inline-actions').innerHTML=`<button class="inline-note-action" data-action="edit">✏️ 編輯</button><button class="inline-note-action" data-action="duplicate">📄 建立副本</button><button class="inline-note-action" data-action="copy">📋 複製內容</button><button class="inline-note-action" data-action="delete">🗑️ 刪除</button>`;
  g('dp-inline-actions').querySelectorAll('.inline-note-action').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const action=btn.dataset.action;
      if(action==='edit') openForm(true);
      else if(action==='duplicate') duplicateMapNode(id);
      else if(action==='copy') copyNoteToClipboard(id);
      else if(action==='delete') deleteMapNode(id);
    });
  });
  const quickInput=g('dp-link-search');
  if(quickInput) quickInput.value='';
  renderLinksForNote(id);
  renderDetailQuickLinkSearch();
  g('dp').classList.add('open');['fp','tp','ap'].forEach(p=>g(p).classList.remove('open'));
  syncSidePanelState();
}

function renderLinksForNote(id) {
  const related=links.filter(l=>l.from===id||l.to===id);
  const el=g('dp-links');
  if(!related.length){el.innerHTML='<span style="font-size:12px;color:#bbb">尚無關聯</span>';return;}
  el.innerHTML=related.map(l=>{
    const otherId=l.from===id?l.to:l.from,other=mapNodeById(otherId);
    const relationNote=normalizeRelationNote(l.note);
    return `<div class="link-item"><div class="link-dot" style="background:${LINK_COLOR}"></div><span class="link-title link-jump" data-nid="${otherId}" style="cursor:pointer;color:#007AFF;text-decoration:underline;">${other?other.title:'（已刪除）'}</span>${relationNote?`<span class="chip" title="${escapeHtml(relationNote)}">${escapeHtml(relationNote)}</span>`:''}<button class="link-del" data-lid="${l.id}">✕</button></div>`;
  }).join('');
  el.querySelectorAll('.link-jump').forEach(btn=>btn.addEventListener('click',()=>{
    const nid2=parseInt(btn.dataset.nid,10);
    if(noteById(nid2)){ openNote(nid2); return; }
    openMapNodeFromLink(nid2);
  }));
  el.querySelectorAll('.link-del').forEach(btn=>btn.addEventListener('click',()=>{links=links.filter(l=>l.id!==parseInt(btn.dataset.lid));saveData();renderLinksForNote(id);renderDetailQuickLinkSearch();render();showToast('關聯已刪除');}));
}

function closeDetail() { g('dp').classList.remove('open'); openId=null; syncSidePanelState(); }

let debugVisible=false;
let debugMode='';
let debugCaptureInstalled=false;
let debugLines=[];
let debugPanelEl=null, debugPanelBodyEl=null;
let debugStorageEl=null;
let storageWarnLevel='';
let erudaUnavailable=false;
const debugConsoleRaw={};
const runtimeDebugBridge=window.__KLawsDebugRuntime||null;
window.__KLawsDebugPushLine=(text)=>{
  debugLines.push(text);
  if(debugLines.length>600) debugLines=debugLines.slice(-600);
  if(debugPanelBodyEl){
    debugPanelBodyEl.textContent=debugLines.join('\n');
    debugPanelBodyEl.scrollTop=debugPanelBodyEl.scrollHeight;
  }
};
function appendDebugLine(level,args=[]){
  if(runtimeDebugBridge&&typeof runtimeDebugBridge.append==='function') return runtimeDebugBridge.append(level,args);
  const text=`[${new Date().toISOString()}] ${level.toUpperCase()} ${args.join(' ')}`;
  window.__KLawsDebugPushLine(text);
  return text;
}
function installDebugConsoleCapture(){
  if(debugCaptureInstalled) return;
  ['log','info','warn','error'].forEach(level=>{
    if(typeof console[level]!=='function') return;
    debugConsoleRaw[level]=console[level].bind(console);
    console[level]=(...args)=>{
      appendDebugLine(level,args);
      debugConsoleRaw[level](...args);
    };
  });
  debugCaptureInstalled=true;
}
function ensureLocalDebugConsole(){
  if(debugPanelEl) return;
  const panel=document.createElement('div');
  panel.id='localDebugPanel';
  panel.innerHTML='<div class="local-debug-head"><b>內建偵錯主控台</b><div><button type="button" class="tool-btn mini-btn" id="localDebugStorageRefreshBtn">刷新儲存</button><button type="button" class="tool-btn mini-btn" id="localDebugClearBtn">清空</button><button type="button" class="tool-btn mini-btn" id="localDebugCloseBtn">關閉</button></div></div><div class="local-debug-storage" id="localDebugStorage">儲存健康：讀取中…</div><pre class="local-debug-body" id="localDebugBody"></pre>';
  document.body.appendChild(panel);
  debugPanelEl=panel;
  debugPanelBodyEl=panel.querySelector('#localDebugBody');
  debugStorageEl=panel.querySelector('#localDebugStorage');
  panel.querySelector('#localDebugClearBtn')?.addEventListener('click',()=>{
    debugLines=[];
    if(debugPanelBodyEl) debugPanelBodyEl.textContent='';
  });
  panel.querySelector('#localDebugStorageRefreshBtn')?.addEventListener('click',()=>refreshStorageHealth({force:true,withToast:true}));
  panel.querySelector('#localDebugCloseBtn')?.addEventListener('click',()=>toggleDebugTool());
  if(debugPanelBodyEl) debugPanelBodyEl.textContent=debugLines.join('\n');
}
function formatStorageBytes(bytes){
  const n=Number(bytes)||0;
  if(n<=0) return '0 B';
  const units=['B','KB','MB','GB','TB'];
  const exp=Math.min(units.length-1,Math.floor(Math.log(n)/Math.log(1024)));
  const val=n/Math.pow(1024,exp);
  return `${val.toFixed(val>=10||exp===0?0:1)} ${units[exp]}`;
}
function maybeWarnStorageRatio(ratio, withToast=false){
  const level=ratio>=0.92?'critical':(ratio>=0.85?'warn':'');
  if(!level){ storageWarnLevel=''; return; }
  if(!withToast&&storageWarnLevel===level) return;
  storageWarnLevel=level;
  if(level==='critical') showToast('儲存空間接近上限，請先匯出資料再清理。');
  else showToast('儲存空間已達 85%，建議近期整理容量。');
}
async function refreshStorageHealth(opts={}){
  if(!window.KLawsStorage||typeof window.KLawsStorage.getStorageHealth!=='function') return;
  const force=!!(opts&&opts.force);
  const withToast=!!(opts&&opts.withToast);
  try{
    const health=await window.KLawsStorage.getStorageHealth({force});
    const ratio=Number(health&&health.ratio)||0;
    if(debugStorageEl){
      const percent=(ratio*100).toFixed(1);
      debugStorageEl.textContent=`儲存健康：已使用 ${formatStorageBytes(health.usage)} / 總容量 ${formatStorageBytes(health.quota)}（${percent}%）`;
    }
    maybeWarnStorageRatio(ratio,withToast);
  }catch(err){
    appendDebugLine('warn',['Load storage health failed:',err]);
    if(debugStorageEl) debugStorageEl.textContent='儲存健康：讀取失敗';
  }
}
function showLocalDebugConsole(){
  ensureLocalDebugConsole();
  if(debugPanelEl) debugPanelEl.classList.add('open');
  setTimeout(()=>{refreshStorageHealth();},0);
}
function hideLocalDebugConsole(){
  if(debugPanelEl) debugPanelEl.classList.remove('open');
}
function ensureEruda(){
  return new Promise((resolve,reject)=>{
    if(window.eruda){resolve(window.eruda);return;}
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/eruda';
    s.onload=()=>resolve(window.eruda);
    s.onerror=()=>reject(new Error('load eruda failed'));
    document.head.appendChild(s);
  });
}
const erudaInitState=new WeakSet();
function ensureErudaInitialized(eruda){
  if(!eruda||typeof eruda.init!=='function') return false;
  if(erudaInitState.has(eruda)||eruda._isInit===true) return true;
  try{
    eruda.init();
    erudaInitState.add(eruda);
    return true;
  }catch(err){
    appendDebugLine('warn',['Eruda init failed:',err]);
    return false;
  }
}
function safeErudaCall(eruda,method){
  if(!eruda||typeof eruda[method]!=='function') return false;
  if(method!=='init'&&!ensureErudaInitialized(eruda)) return false;
  const invoke=()=>{
    eruda[method]();
    return true;
  };
  try{
    return invoke();
  }catch(err){
    const msg=String(err&&err.message||err||'');
    if(method!=='init'&&/call\s+"?eruda\.init\(\)"?\s+first/i.test(msg)){
      try{
        if(ensureErudaInitialized(eruda)) return invoke();
      }catch(_){/* noop */}
    }
    appendDebugLine('warn',[`Eruda ${method} failed:`,err]);
    return false;
  }
}
async function toggleDebugTool(){
  const btn=g('debugToggle');
  if(debugVisible){
    if(debugMode==='eruda') safeErudaCall(window.eruda,'hide');
    hideLocalDebugConsole();
    debugVisible=false;
    debugMode='';
    btn?.classList.remove('active');
    showToast('偵錯工具已隱藏');
    return;
  }

  // 先顯示內建主控台，避免 CDN 或外部腳本阻塞時「點了沒反應」
  showLocalDebugConsole();
  debugVisible=true;
  debugMode='local';
  btn?.classList.add('active');
  showToast('偵錯工具已開啟');

  if(erudaUnavailable) return;
  try{
    const er=await ensureEruda();
    if(!er||typeof er.init!=='function') throw new Error('eruda unavailable');
    const erudaReady=ensureErudaInitialized(er);
    if(!erudaReady) throw new Error('eruda init unavailable');
    const erudaShown=safeErudaCall(er,'show');
    if(erudaShown){
      hideLocalDebugConsole();
      debugMode='eruda';
    }else{
      erudaUnavailable=true;
    }
  }catch(e){
    erudaUnavailable=true;
    appendDebugLine('warn',['Eruda fallback:',e]);
  }
}
installDebugConsoleCapture();

// 雙保險：即使 init 綁定失敗，按鈕仍可直接切換偵錯工具
function bindDebugToggleButton(){
  if(window.KLawsDebug&&typeof window.KLawsDebug.bindDebugToggle==='function'){
    window.KLawsDebug.bindDebugToggle(()=>g('debugToggle'),toggleDebugTool);
    return;
  }
  const btn=g('debugToggle');
  if(!btn||btn.dataset.boundDebugToggle) return;
  btn.dataset.boundDebugToggle='1';
  btn.addEventListener('click',toggleDebugTool);
}
bindDebugToggleButton();

// 若 UI 被重建導致按鈕點替換，透過事件代理補綁，避免「點擊無反應」
document.addEventListener('click',ev=>{
  const btn=ev.target&&ev.target.closest?ev.target.closest('#debugToggle'):null;
  if(!btn) return;
  bindDebugToggleButton();
});
