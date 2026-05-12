var { matchesQueryMode } = window.KLawsUtils;
function refreshAchievementProgress(){
  if(typeof renderLevelSystemPage==='function' && g('levelSystemView')?.classList.contains('open')){
    renderLevelSystemPage();
  }
}

function moveLevelItem(kind,idx,dir){
  const arr=levelSystem[kind];
  const target=idx+dir;
  if(!arr?.[idx]||target<0||target>=arr.length) return;
  [arr[idx],arr[target]]=[arr[target],arr[idx]];
  saveData();renderLevelSystemPage();
}
function deleteLevelItem(kind,idx){
  const mapLabel={skills:'技能'};
  const arr=levelSystem[kind];
  const item=arr?.[idx];
  if(!item) return;
  if(!confirm(`確定刪除${mapLabel[kind]}「${item.name||'未命名'}」？`)) return;
  arr.splice(idx,1);
  saveData();
  renderLevelSystemPage();
  showToast(`${mapLabel[kind]}已刪除`);
}
function renderLevelRows(kind){
  const arr=levelSystem[kind]||[];
  if(!arr.length) return '<div style="color:#9aa3b2;font-size:12px;">尚無資料，請先新增。</div>';
  if(kind==='skills') return arr.map((skill,idx)=>{const need=skill.level>=100?0:skillXpRequired(skill.level);const pct=need?Math.round((skill.xp||0)/need*100):100;const decay=getSkillDecayStatus(skill);const decayText=`距離衰退還有 ${decay.daysLeft} 日，需完成 ${decay.difficulty} 難度（逾期衰退 ${decay.levels} 級）`;return `<div class="stats-bar-row"><span class="stats-bar-label" style="min-width:112px;">${escapeHtml(skill.name)} Lv.${skill.level} (${getSkillStage(skill.level)})</span><div class="stats-bar-bg"><div class="stats-bar-fill" style="width:${Math.max(0,Math.min(100,pct))}%;background:#3B6D11"></div></div><span class="stats-bar-count" style="min-width:64px;">${skill.level>=100?'MAX':`${skill.xp||0}/${need}`}</span><span class="level-list-row-actions"><button class="tool-btn" data-level-move="skills" data-idx="${idx}" data-dir="-1">↑</button><button class="tool-btn" data-level-move="skills" data-idx="${idx}" data-dir="1">↓</button><button class="tool-btn" data-level-del="skills" data-idx="${idx}">移除</button></span></div><div class="level-subtext">${decayText}</div>`;}).join('');
  return '<div style="color:#9aa3b2;font-size:12px;">此區塊已停用。</div>';
}
function resetSkillLevels(){
  if(!levelSystem.skills.length){showToast('目前沒有技能可重置');return;}
  if(!confirm('確定要重置全部技能等級與經驗值嗎？此動作無法復原。')) return;
  levelSystem.skills.forEach(skill=>{skill.level=1;skill.xp=0;skill.lastDoneByDiff={};skill.lastDecayAt=new Date().toISOString();});
  saveData();
  renderLevelSystemPage();
  showToast('已重置技能等級');
}
let levelSystemSection='skills';
function renderLevelSystemPage(){
  const box=g('levelSystemPanel');
  if(!box) return;
  normalizeLevelSystem();
  applySkillDecay();
  const section={title:'技能（等級 / 經驗）',rows:renderLevelRows('skills'),toolbar:`<button class="tool-btn" id="addSkillBtn">+ 技能</button><button class="tool-btn" id="resetSkillBtn">重置技能</button>`};
  g('levelSystemTitle').textContent=section.title;
  let html=`<div style="margin-top:2px;padding:10px;border:1px solid #e8edf6;border-radius:10px;background:#f8fbff;"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;"><span style="font-size:12px;color:#445;">技能總數：<b>${(levelSystem.skills||[]).length}</b></span></div></div>`;
  html+=`<div class="level-toolbar">${section.toolbar}</div>`;
  html+=`<div class="level-part-title">${section.title}</div>${section.rows}`;
  box.innerHTML=html;
  g('addSkillBtn')?.addEventListener('click',addSkillItem);
  g('resetSkillBtn')?.addEventListener('click',resetSkillLevels);
  box.querySelectorAll('[data-level-move]').forEach(btn=>btn.addEventListener('click',()=>moveLevelItem(btn.dataset.levelMove,Number(btn.dataset.idx),Number(btn.dataset.dir))));
  box.querySelectorAll('[data-level-del]').forEach(btn=>btn.addEventListener('click',()=>deleteLevelItem(btn.dataset.levelDel,Number(btn.dataset.idx))));
}
function renderPathLists(){
  const panelRoot=g('tp');
  const panels=panelRoot?panelRoot.querySelectorAll('[data-category-panel]'):[];
  const panelExists=Array.from(panels).some(panel=>panel.dataset.categoryPanel===activePathCategory);
  if(!activePathCategory||!panelExists) activePathCategory='type';
  const hasSearch=!!pathSearchQ;
  panelRoot?.querySelectorAll('.tag-nav-btn').forEach(btn=>{
    btn.classList.toggle('active',!hasSearch&&(btn.dataset.category||'type')===activePathCategory);
  });
  panels.forEach(panel=>{
    const isActive=panel.dataset.categoryPanel===activePathCategory;
    panel.classList.toggle('active',hasSearch||isActive);
    panel.hidden=hasSearch?false:!isActive;
  });
  renderPathList('typeTagList',types,'type');
  renderPathList('subTagList',domains,'sub');
  renderGroupPathList();
  renderPartPathList();
  renderPathManagerSelectOptions();
}
function renderPathManagerSelectOptions(){
  const groupDomainSel=g('newGroupDomain');
  if(groupDomainSel){
    const current=groupDomainSel.value||'all';
    groupDomainSel.innerHTML='<option value="all">全部</option>'+domains.map(s=>`<option value="${escapeHtml(s.key)}">${escapeHtml(s.label)}</option>`).join('');
    groupDomainSel.value=domains.some(s=>s.key===current)||current==='all'?current:'all';
  }
  const partGroupSel=g('newPartGroup');
  if(partGroupSel){
    const current=partGroupSel.value||'all';
    partGroupSel.innerHTML='<option value="all">全部</option>'+groups.map(ch=>`<option value="${escapeHtml(ch.key)}">${escapeHtml(ch.label)}</option>`).join('');
    partGroupSel.value=groups.some(ch=>ch.key===current)||current==='all'?current:'all';
  }
}
function renderPathList(cid,arr,kind) {
  const el=g(cid);
  if(!el) return;
  const source=Array.isArray(arr)?arr:[];
  let list=source.map((item,idx)=>({...item,_idx:idx,_usage:tagUsageCount(kind,item.key)}));
  if(pathSearchQ) list=list.filter(item=>matchesQueryMode({query:pathSearchQ,candidates:[item.label||'',item.key||''],mode:window.__klawsSearchMode}));
  if(!list.length){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">（無符合條件的路徑）</div>';return;}
  el.innerHTML=list.map(item=>`<div class="tag-item ${kind==='sub'&&groupDomainFilter===item.key?'active-domain':''}" draggable="true" data-draggable-tag="1" data-idx="${item._idx}" data-kind="${kind}" ${kind==='sub'?`data-domain-key="${item.key}"`:''}><span class="tag-drag-handle" title="拖曳排序">⋮⋮</span><div class="tag-color-dot" style="background:${item.color}"></div><span class="tag-item-label">${item.label}</span><span class="tag-item-meta">${item._usage} 筆</span><div class="tag-actions"><button class="tag-icon-btn" title="上移" data-idx="${item._idx}" data-kind="${kind}" data-dir="-1">↑</button><button class="tag-icon-btn" title="下移" data-idx="${item._idx}" data-kind="${kind}" data-dir="1">↓</button><button class="tag-icon-btn" title="編輯" data-idx="${item._idx}" data-kind="${kind}" data-edit="1">✎</button><button class="tag-icon-btn delete" title="刪除" data-idx="${item._idx}" data-kind="${kind}" data-del="1">🗑</button></div></div>`).join('');
  if(kind==='sub'){
    el.querySelectorAll('.tag-item[data-domain-key]').forEach(row=>row.addEventListener('click',ev=>{
      if(ev.target.closest('button')) return;
      groupDomainFilter=row.dataset.domainKey||'';
      activePathCategory='group';
      renderPathLists();
    }));
  }
  bindPathActions(el);
  bindPathDrag(el);
}
function renderGroupPathList() {
  const el=g('groupTagList'); if(!el) return;
  const hasSearch=!!pathSearchQ;
  if(!groupDomainFilter&&!hasSearch){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">請先到「」面板選擇一個，再管理。</div>';return;}
  let list=groups.map((item,idx)=>({...item,_idx:idx,_usage:tagUsageCount('group',item.key)}));
  if(!hasSearch) list=list.filter(item=>item.domain===groupDomainFilter||item.domain==='all');
  if(pathSearchQ) list=list.filter(item=>matchesQueryMode({query:pathSearchQ,candidates:[item.label||'',item.key||'',subByKey(item.domain).label],mode:window.__klawsSearchMode}));
  if(!list.length){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">（無符合條件的）</div>';return;}
  el.innerHTML=list.map(item=>{
    const subLabel=item.domain==='all'?'全部':subByKey(item.domain).label;
return `<div class="tag-item ${partGroupFilter===item.key?'active-domain':''}" draggable="true" data-draggable-tag="1" data-idx="${item._idx}" data-kind="group" data-group-key="${item.key}"><span class="tag-drag-handle" title="拖曳排序">⋮⋮</span><div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;"><span class="tag-item-label">${item.label}</span><span class="tag-item-sub">${subLabel}</span></div><span class="tag-item-meta">${item._usage} 筆</span><div class="tag-actions"><button class="tag-icon-btn" title="上移" data-idx="${item._idx}" data-kind="group" data-dir="-1">↑</button><button class="tag-icon-btn" title="下移" data-idx="${item._idx}" data-kind="group" data-dir="1">↓</button><button class="tag-icon-btn" title="編輯" data-idx="${item._idx}" data-kind="group" data-edit="1">✎</button><button class="tag-icon-btn delete" title="刪除" data-idx="${item._idx}" data-kind="group" data-del="1">🗑</button></div></div>`;
  }).join('');
  el.querySelectorAll('.tag-item[data-group-key]').forEach(row=>row.addEventListener('click',ev=>{
    if(ev.target.closest('button')) return;
    partGroupFilter=row.dataset.groupKey||'';
    activePathCategory='part';
    renderPathLists();
  }));
  bindPathActions(el);
  bindPathDrag(el);
}
function renderPartPathList() {
  const el=g('partTagList'); if(!el) return;
  const hasSearch=!!pathSearchQ;
  if(!partGroupFilter&&!hasSearch){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">請先到「」面板選擇一個，再管理。</div>';return;}
  let list=parts.map((item,idx)=>({...item,_idx:idx,_usage:tagUsageCount('part',item.key)}));
  if(!hasSearch) list=list.filter(item=>item.group===partGroupFilter||item.group==='all');
  if(pathSearchQ) list=list.filter(item=>matchesQueryMode({query:pathSearchQ,candidates:[item.label||'',item.key||'',groupByKey(item.group).label],mode:window.__klawsSearchMode}));
  if(!list.length){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">（無符合條件的）</div>';return;}
  el.innerHTML=list.map(item=>{
    const groupLabel=item.group==='all'?'全部':groupByKey(item.group).label;
    return `<div class="tag-item" draggable="true" data-draggable-tag="1" data-idx="${item._idx}" data-kind="part"><span class="tag-drag-handle" title="拖曳排序">⋮⋮</span><div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;"><span class="tag-item-label">${item.label}</span><span class="tag-item-sub">${groupLabel}</span></div><span class="tag-item-meta">${item._usage} 筆</span><div class="tag-actions"><button class="tag-icon-btn" title="上移" data-idx="${item._idx}" data-kind="part" data-dir="-1">↑</button><button class="tag-icon-btn" title="下移" data-idx="${item._idx}" data-kind="part" data-dir="1">↓</button><button class="tag-icon-btn" title="編輯" data-idx="${item._idx}" data-kind="part" data-edit="1">✎</button><button class="tag-icon-btn delete" title="刪除" data-idx="${item._idx}" data-kind="part" data-del="1">🗑</button></div></div>`;
  }).join('');
  bindPathActions(el);
  bindPathDrag(el);
}
function bindPathActions(root){
  root.querySelectorAll('.tag-icon-btn[data-dir]').forEach(b=>b.addEventListener('click',()=>movePath(parseInt(b.dataset.idx,10),b.dataset.kind,parseInt(b.dataset.dir,10))));
  root.querySelectorAll('.tag-icon-btn[data-edit]').forEach(b=>b.addEventListener('click',()=>editPath(parseInt(b.dataset.idx,10),b.dataset.kind)));
  root.querySelectorAll('.tag-icon-btn[data-del]').forEach(b=>b.addEventListener('click',()=>deletePath(parseInt(b.dataset.idx,10),b.dataset.kind)));
}
function bindPathDrag(root){
  root.querySelectorAll('.tag-item[data-draggable-tag]').forEach(row=>{
    row.addEventListener('dragstart',ev=>{
      row.classList.add('dragging');
      ev.dataTransfer.effectAllowed='move';
      ev.dataTransfer.setData('text/plain',JSON.stringify({idx:Number(row.dataset.idx),kind:row.dataset.kind}));
    });
    row.addEventListener('dragend',()=>row.classList.remove('dragging'));
    row.addEventListener('dragover',ev=>ev.preventDefault());
    row.addEventListener('drop',ev=>{
      ev.preventDefault();
      const raw=ev.dataTransfer.getData('text/plain');
      if(!raw) return;
      let data=null;
      try{ data=JSON.parse(raw); }catch(_e){ return; }
      const toIdx=Number(row.dataset.idx), fromIdx=Number(data.idx), kind=row.dataset.kind;
      if(!Number.isFinite(fromIdx)||!Number.isFinite(toIdx)||kind!==data.kind||fromIdx===toIdx) return;
      reorderPathByIndex(kind,fromIdx,toIdx);
    });
  });
}
function reorderPathByIndex(kind,fromIdx,toIdx){
  const arr=tagCollection(kind);
  if(!arr[fromIdx]||!arr[toIdx]) return;
  const [item]=arr.splice(fromIdx,1);
  arr.splice(toIdx,0,item);
  saveData();renderPathLists();rebuildUI();render();
}
function movePath(idx,kind,dir){
  const arr=tagCollection(kind);
  const target=idx+dir;
  if(!arr[idx]||target<0||target>=arr.length) return;
  [arr[idx],arr[target]]=[arr[target],arr[idx]];
  saveData();renderPathLists();rebuildUI();render();
}
function editPath(idx,kind) {
  if(kind==='group'){editGroupPath(idx);return;}
  if(kind==='part'){editPartPath(idx);return;}
  const arr=kind==='type'?types:domains,item=arr[idx];
  const nl2=prompt('修改路徑名稱：',item.label); if(!nl2) return;
  const nv=nl2.trim(); if(!nv){showToast('名稱不能為空');return;}
  if(arr.some((t,i)=>i!==idx&&t.label===nv)){showToast('路徑名稱重複');return;}
  const nc=prompt('修改顏色（#RRGGBB）：',item.color); if(!nc) return;
  const ncv=nc.trim(); if(!/^#[0-9A-Fa-f]{6}$/.test(ncv)){showToast('顏色格式不正確');return;}
  arr[idx].label=nv;arr[idx].color=ncv;
  saveData();renderPathLists();buildTypeRow();buildSubRow();render();showToast('路徑已更新');
}
function editGroupPath(idx) {
  const item=groups[idx]; if(!item) return;
  const nl2=prompt('修改名稱：',item.label); if(!nl2) return;
  const nv=nl2.trim(); if(!nv){showToast('名稱不能為空');return;}
  if(groups.some((c,i)=>i!==idx&&c.label===nv&&c.domain===item.domain)){showToast('相同下重複');return;}
  const guide=['all: 全部'].concat(domains.map(s=>`${s.key}: ${s.label}`)).join('\n');
  const ns=prompt(`修改（請輸入 key）\n${guide}`,item.domain||'all'); if(ns===null) return;
  const domainKey=(ns||'').trim()||'all';
  if(domainKey!=='all'&&!domains.some(s=>s.key===domainKey)){showToast('不存在');return;}
  const oldKey=item.key;
  item.label=nv;item.domain=domainKey;
  if(!groups.some((c,i)=>i!==idx&&c.key===nv)){item.key=nv;allMapNodes().forEach(n=>{const chs=noteGroups(n).map(x=>x===oldKey?nv:x);n.groups=uniq(chs);n.group=n.groups[0]||'';});parts.forEach(sec=>{if(sec.group===oldKey)sec.group=nv;});if(cch===oldKey)cch='all';if(mapFilter.group===oldKey)mapFilter.group='all';}
  saveData();renderPathLists();rebuildUI();render();showToast('已更新');
}
function editPartPath(idx){
  const item=parts[idx]; if(!item) return;
  const nl2=prompt('修改名稱：',item.label); if(!nl2) return;
  const nv=nl2.trim(); if(!nv){showToast('名稱不能為空');return;}
  if(parts.some((s,i)=>i!==idx&&s.label===nv&&s.group===item.group)){showToast('相同下重複');return;}
  const guide=['all: 全部'].concat(groups.map(ch=>`${ch.key}: ${ch.label}`)).join('\n');
  const nc=prompt(`修改所屬（請輸入 key）\n${guide}`,item.group||'all'); if(nc===null) return;
  const groupKey=(nc||'').trim()||'all';
  if(groupKey!=='all'&&!groups.some(ch=>ch.key===groupKey)){showToast('不存在');return;}
  const oldKey=item.key;
  item.label=nv; item.group=groupKey;
  if(!parts.some((s,i)=>i!==idx&&s.key===nv)){item.key=nv;allMapNodes().forEach(n=>{const secs=noteParts(n).map(x=>x===oldKey?nv:x);n.parts=uniq(secs);n.part=n.parts[0]||'';});if(csec===oldKey)csec='all';}
  saveData();renderPathLists();rebuildUI();render();showToast('已更新');
}
function deletePath(idx,kind) {
  const arr=tagCollection(kind);
  if(kind==='group'){
    const removed=arr[idx]; if(!removed) return;
    if(!confirm(`確定刪除「${removed.label}」？已使用此的筆記會改為未分類。`)) return;
    const removedPartKeys=parts.filter(s=>s.group===removed.key).map(s=>s.key);
    arr.splice(idx,1);allMapNodes().forEach(n=>{
      n.groups=noteGroups(n).filter(ch=>ch!==removed.key);n.group=n.groups[0]||'';
      n.parts=noteParts(n).filter(sec=>!removedPartKeys.includes(sec));n.part=n.parts[0]||'';
    });
    parts=parts.filter(s=>s.group!==removed.key);
    if(cch===removed.key)cch='all';if(mapFilter.group===removed.key)mapFilter.group='all';
    if(partGroupFilter===removed.key) partGroupFilter='';
    saveData();renderPathLists();rebuildUI();render();showToast('已刪除');return;
  }
  if(kind==='part'){
    const removed=arr[idx]; if(!removed) return;
    if(!confirm(`確定刪除「${removed.label}」？已使用此的筆記會改為未分類。`)) return;
    arr.splice(idx,1);allMapNodes().forEach(n=>{n.parts=noteParts(n).filter(sec=>sec!==removed.key);n.part=n.parts[0]||'';});
    if(csec===removed.key)csec='all';
    saveData();renderPathLists();rebuildUI();render();showToast('已刪除');return;
  }
  const removed=arr[idx];
  if(!confirm(`確定刪除路徑「${removed.label}」？`)) return;
  arr.splice(idx,1);
  if(kind==='type'&&removed){
    delete typeFieldConfigs[removed.key];
    notes.forEach(n=>{if(n.type===removed.key)n.type='';});
    if(cv===removed.key) cv='all';
  }
  if(kind==='sub'&&removed){
    const removedGroupKeys=groups.filter(ch=>ch.domain===removed.key).map(ch=>ch.key);
    const removedPartKeys=parts.filter(sec=>removedGroupKeys.includes(sec.group)).map(sec=>sec.key);
    groups=groups.filter(ch=>ch.domain!==removed.key);
    parts=parts.filter(sec=>!removedGroupKeys.includes(sec.group));
    allMapNodes().forEach(n=>{
      n.domains=noteDomains(n).filter(sk=>sk!==removed.key);n.domain=n.domains[0]||'';
      n.groups=noteGroups(n).filter(ch=>!removedGroupKeys.includes(ch));n.group=n.groups[0]||'';
      n.parts=noteParts(n).filter(sec=>!removedPartKeys.includes(sec));n.part=n.parts[0]||'';
    });
    if(selectedDomains.includes(removed.key)) selectedDomains=selectedDomains.filter(k=>k!==removed.key);
    if(groupDomainFilter===removed.key) groupDomainFilter='';
  }
  normalizeNotesTaxonomy();
  saveData();renderPathLists();rebuildUI();render();showToast('路徑已刪除');
}

function addPath(kind) {
  if(kind==='group'){
    const label=(g('newGroupLabel').value||'').trim();
    const domainSel=g('newGroupDomain');
    const domain=domainSel?(domainSel.value||'all'):'all';
    if(!label){showToast('請輸入名稱');return;}
    if(groups.some(ch=>ch.label===label&&ch.domain===domain)){showToast('已存在');return;}
    const key=groups.some(ch=>ch.key===label)?`group_${Date.now()}`:label;
    groups.push({key,label,domain});
    g('newGroupLabel').value='';
    saveData();renderPathLists();rebuildUI();showToast('已新增！');return;
  }
  if(kind==='part'){
    const label=(g('newPartLabel').value||'').trim();
    const groupSel=g('newPartGroup');
    const group=groupSel?(groupSel.value||'all'):'all';
    if(!label){showToast('請輸入名稱');return;}
    if(parts.some(sec=>sec.label===label&&sec.group===group)){showToast('已存在');return;}
    const key=parts.some(sec=>sec.key===label)?`part_${Date.now()}`:label;
    parts.push({key,label,group});
    g('newPartLabel').value='';
    saveData();renderPathLists();rebuildUI();showToast('已新增！');return;
  }
  const isType=kind==='type';
  const label=(g(isType?'newTypeLabel':'newSubLabel').value||'').trim();
  const color=g(isType?'newTypeColor':'newSubColor').value;
  if(!label){showToast('請輸入路徑名稱');return;}
  const arr=isType?types:domains;
  if(arr.some(t=>t.label===label)){showToast('路徑已存在');return;}
  const newKey='tag_'+Date.now();
  arr.push({key:newKey,label,color});
  if(isType) typeFieldConfigs[newKey]=getTypeFieldKeys(newKey);
  g(isType?'newTypeLabel':'newSubLabel').value='';
  saveData();renderPathLists();rebuildUI();showToast('路徑已新增！');
}
function addSkillItem(){
  const name=safeStr(prompt('技能名稱：','法條理解力')||'').trim();
  if(!name) return;
  levelSystem.skills.push({id:Date.now()+Math.random(),name,level:1,xp:0,lastDoneByDiff:{},lastDecayAt:new Date().toISOString()});
  saveData();renderLevelSystemPage();showToast('技能已新增');
}

function closeLevelEditor(){ g('levelEditorModal')?.classList.remove('open'); }
function saveLevelEditor(){ closeLevelEditor(); }
