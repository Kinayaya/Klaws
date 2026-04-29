function moveLevelItem(kind,idx,dir){
  const arr=levelSystem[kind];
  const target=idx+dir;
  if(!arr?.[idx]||target<0||target>=arr.length) return;
  [arr[idx],arr[target]]=[arr[target],arr[idx]];
  saveData();renderLevelSystemPage();
}
function deleteLevelItem(kind,idx){
  const mapLabel={skills:'技能',tasks:'任務',achievements:'成就'};
  const arr=levelSystem[kind];
  const item=arr?.[idx];
  if(!item) return;
  if(!confirm(`確定刪除${mapLabel[kind]}「${item.name||'未命名'}」？`)) return;
  arr.splice(idx,1);
  refreshAchievementProgress();
  saveData();
  applyBrandTitle();
  renderLevelSystemPage();
  showToast(`${mapLabel[kind]}已刪除`);
}
function renderLevelRows(kind){
  const arr=levelSystem[kind]||[];
  if(!arr.length) return '<div style="color:#9aa3b2;font-size:12px;">尚無資料，請先新增。</div>';
  if(kind==='skills') return arr.map((skill,idx)=>{const need=skill.level>=100?0:skillXpRequired(skill.level);const pct=need?Math.round((skill.xp||0)/need*100):100;const decay=getSkillDecayStatus(skill);const decayText=`距離衰退還有 ${decay.daysLeft} 日，需完成 ${decay.difficulty} 難度（逾期衰退 ${decay.levels} 級）`;return `<div class="stats-bar-row"><span class="stats-bar-label" style="min-width:112px;">${escapeHtml(skill.name)} Lv.${skill.level} (${getSkillStage(skill.level)})</span><div class="stats-bar-bg"><div class="stats-bar-fill" style="width:${Math.max(0,Math.min(100,pct))}%;background:#3B6D11"></div></div><span class="stats-bar-count" style="min-width:64px;">${skill.level>=100?'MAX':`${skill.xp||0}/${need}`}</span><span class="level-list-row-actions"><button class="tool-btn" data-level-move="skills" data-idx="${idx}" data-dir="-1">↑</button><button class="tool-btn" data-level-move="skills" data-idx="${idx}" data-dir="1">↓</button><button class="tool-btn" data-level-del="skills" data-idx="${idx}">移除</button></span></div><div class="level-subtext">${decayText}</div>`;}).join('');
  if(kind==='tasks') return arr.map((task,idx)=>renderTaskRow(task,idx)).join('');
  return arr.map((def,idx)=>{const unlocked=!!def.unlocked;const pct=Math.max(0,Math.min(100,Math.round((def.progress||0)/def.target*100)));return `<div class="stats-bar-row"><span class="stats-bar-label" style="min-width:92px;">${escapeHtml(def.name)}</span><div class="stats-bar-bg"><div class="stats-bar-fill" style="width:${unlocked?100:pct}%;background:${unlocked?'#3B6D11':'#9cb8d8'}"></div></div><span class="stats-bar-count" style="min-width:64px;">${unlocked?'✓':'+'+(def.points||0)}</span><span class="level-list-row-actions"><button class="tool-btn" data-achievement-edit="${idx}">編輯</button><button class="tool-btn" data-level-move="achievements" data-idx="${idx}" data-dir="-1">↑</button><button class="tool-btn" data-level-move="achievements" data-idx="${idx}" data-dir="1">↓</button><button class="tool-btn" data-level-del="achievements" data-idx="${idx}">移除</button></span></div><div class="level-subtext">${escapeHtml(def.condition)}（${Math.min(def.progress||0,def.target)}/${def.target}）・難度 ${def.difficulty||'N'}</div>`;}).join('');
}
function renderTaskRow(task,idx){
  const doneInCycle=isTaskCompletedInCurrentCycle(task);
  const expanded=!!levelTaskExpanded[task.id];
  const selectedSkill=levelSystem.skills.some(s=>String(s.id)===String(levelTaskExpanded[`skill_${task.id}`]))?String(levelTaskExpanded[`skill_${task.id}`]):String(levelSystem.skills[0]?.id||'');
  const skillOptions=levelSystem.skills.map(skill=>`<option value="${skill.id}" ${String(skill.id)===selectedSkill?'selected':''}>${escapeHtml(skill.name)}（Lv.${skill.level}）</option>`).join('');
  const subtasks=Array.isArray(task.subtasks)?task.subtasks:[];
  const subtasksHtml=subtasks.length?subtasks.map((sub,subIdx)=>{
    const subDone=isSubtaskCompletedInCurrentCycle(task,sub);
    return `<div class="level-subtask-item"><label class="level-subtask-left"><input type="checkbox" data-task-subtask-check="${idx}" data-sub-idx="${subIdx}" ${subDone?'checked':''}><span class="level-subtask-text ${subDone?'done':''}">${escapeHtml(sub.text)} [${sub.difficulty||task.difficulty}]</span></label><span class="level-subtask-actions"><button class="tool-btn" data-task-subtask-edit="${idx}" data-sub-idx="${subIdx}">編輯</button><button class="tool-btn" data-task-subtask-del="${idx}" data-sub-idx="${subIdx}">移除</button></span></div>`;
  }).join(''):'<div style="font-size:12px;color:#94a3b8;">尚未建立小任務</div>';
  return `<div class="level-task-card"><div class="stats-bar-row"><label style="display:flex;align-items:center;gap:8px;min-width:112px;"><input type="checkbox" data-task-check="${idx}" ${doneInCycle?'checked':''}><span class="level-task-name">${escapeHtml(task.name)} [${task.difficulty}]</span></label><div class="stats-bar-bg"><div class="stats-bar-fill" style="width:${Math.min(100,(task.completions||0)*8)}%;background:#9cb8d8"></div></div><span class="stats-bar-count" style="min-width:64px;">${task.completions||0} 次</span><span class="level-list-row-actions"><button class="tool-btn" data-task-expand="${idx}">${expanded?'收合':'展開'}</button><button class="tool-btn" data-task-edit="${idx}">編輯</button><button class="tool-btn" data-level-move="tasks" data-idx="${idx}" data-dir="-1">↑</button><button class="tool-btn" data-level-move="tasks" data-idx="${idx}" data-dir="1">↓</button><button class="tool-btn" data-level-del="tasks" data-idx="${idx}">移除</button></span></div><div class="level-subtext">重複：${getTaskRepeatLabel(task.repeatCycle)}</div>${expanded?`<div class="level-task-subtasks"><div class="level-skill-row"><span style="font-size:12px;color:#64748b;">完成後升級技能：</span>${skillOptions?`<select class="fs" data-task-skill="${idx}">${skillOptions}</select>`:'<span style="font-size:12px;color:#94a3b8;">請先新增技能</span>'}</div>${subtasksHtml}<div class="level-subtask-add"><input class="fi" data-task-subtask-input="${idx}" placeholder="新增小任務內容"><select class="fs" data-task-subtask-difficulty="${idx}"><option value="E" ${task.difficulty==='E'?'selected':''}>E</option><option value="N" ${task.difficulty==='N'?'selected':''}>N</option><option value="H" ${task.difficulty==='H'?'selected':''}>H</option></select><button class="tool-btn" data-task-subtask-add="${idx}">+ 小任務</button></div></div>`:''}</div>`;
}
function resetSkillLevels(){
  if(!levelSystem.skills.length){showToast('目前沒有技能可重置');return;}
  if(!confirm('確定要重置全部技能等級與經驗值嗎？此動作無法復原。')) return;
  levelSystem.skills.forEach(skill=>{skill.level=1;skill.xp=0;skill.lastDoneByDiff={};skill.lastDecayAt=new Date().toISOString();});
  saveData();
  renderLevelSystemPage();
  showToast('已重置技能等級');
}
function renderLevelSystemPage(){
  const box=g('levelSystemPanel');
  if(!box) return;
  normalizeLevelSystem();
  applySkillDecay();
  refreshAchievementProgress();
  const titleInfo=getCurrentTitle();
  const unlockedCount=(levelSystem.achievements||[]).filter(a=>a.unlocked).length;
  const allTaskCount=(levelSystem.tasks||[]).reduce((sum,t)=>sum+(Number(t.completions)||0),0);
  let html=`<div style="margin-top:2px;padding:10px;border:1px solid #e8edf6;border-radius:10px;background:#f8fbff;"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;"><span class="brand-title">LV${titleInfo.level}・${titleInfo.name}</span><span style="font-size:12px;color:#445;">成就點數：<b>${getLevelAchievementPoints()}</b></span><span style="font-size:12px;color:#445;">任務完成：<b>${allTaskCount}</b> 次</span><span style="font-size:12px;color:#445;">已解鎖：<b>${unlockedCount}</b> 項</span></div></div>`;
  html+=`<div class="level-toolbar"><button class="tool-btn" id="addSkillBtn">+ 技能</button><button class="tool-btn" id="addTaskBtn">+ 任務</button><button class="tool-btn" id="addAchievementBtn">+ 成就</button><button class="tool-btn" id="resetSkillLevelBtn">重置技能等級</button></div>`;
  html+=`<div class="level-part-title">技能</div>${renderLevelRows('skills')}`;
  html+=`<div class="level-part-title">任務（E/N/H）</div>${renderLevelRows('tasks')}`;
  html+=`<div class="level-part-title">成就進度</div>${renderLevelRows('achievements')}`;
  box.innerHTML=html;
  g('addSkillBtn')?.addEventListener('click',addSkillItem);
  g('addTaskBtn')?.addEventListener('click',addTaskItem);
  g('addAchievementBtn')?.addEventListener('click',addAchievementItem);
  g('resetSkillLevelBtn')?.addEventListener('click',resetSkillLevels);
  box.querySelectorAll('[data-level-move]').forEach(btn=>btn.addEventListener('click',()=>moveLevelItem(btn.dataset.levelMove,Number(btn.dataset.idx),Number(btn.dataset.dir))));
  box.querySelectorAll('[data-level-del]').forEach(btn=>btn.addEventListener('click',()=>deleteLevelItem(btn.dataset.levelDel,Number(btn.dataset.idx))));
  box.querySelectorAll('[data-task-edit]').forEach(btn=>btn.addEventListener('click',()=>editTaskItem(Number(btn.dataset.taskEdit))));
  box.querySelectorAll('[data-achievement-edit]').forEach(btn=>btn.addEventListener('click',()=>editAchievementItem(Number(btn.dataset.achievementEdit))));
  box.querySelectorAll('[data-task-expand]').forEach(btn=>btn.addEventListener('click',()=>toggleTaskExpand(Number(btn.dataset.taskExpand))));
  box.querySelectorAll('[data-task-check]').forEach(checkbox=>checkbox.addEventListener('change',()=>toggleTaskCompletionFromCheckbox(Number(checkbox.dataset.taskCheck),checkbox.checked)));
  box.querySelectorAll('[data-task-skill]').forEach(sel=>sel.addEventListener('change',()=>{
    const task=levelSystem.tasks[Number(sel.dataset.taskSkill)];
    if(task) levelTaskExpanded[`skill_${task.id}`]=sel.value;
  }));
  box.querySelectorAll('[data-task-subtask-add]').forEach(btn=>btn.addEventListener('click',()=>addTaskSubtask(Number(btn.dataset.taskSubtaskAdd))));
  box.querySelectorAll('[data-task-subtask-edit]').forEach(btn=>btn.addEventListener('click',()=>editTaskSubtask(Number(btn.dataset.taskSubtaskEdit),Number(btn.dataset.subIdx))));
  box.querySelectorAll('[data-task-subtask-del]').forEach(btn=>btn.addEventListener('click',()=>deleteTaskSubtask(Number(btn.dataset.taskSubtaskDel),Number(btn.dataset.subIdx))));
  box.querySelectorAll('[data-task-subtask-check]').forEach(checkbox=>checkbox.addEventListener('change',()=>toggleSubtaskCompletion(Number(checkbox.dataset.taskSubtaskCheck),Number(checkbox.dataset.subIdx),checkbox.checked)));
}
function renderTagLists() {
  renderTagList('typeTagList',types,'type');
  renderTagList('subTagList',domains,'sub');
  if(groupDomainFilter&&!domains.some(s=>s.key===groupDomainFilter)) groupDomainFilter='';
  if(partGroupFilter&&!groups.some(ch=>ch.key===partGroupFilter)) partGroupFilter='';
  renderGroupTagList();
  renderPartTagList();
  const sel=g('newGroupDomain');
  if(sel) sel.innerHTML='<option value="all">全部</option>'+domains.map(s=>`<option value="${s.key}">${s.label}</option>`).join('');
  const secSel=g('newPartGroup');
  if(secSel) secSel.innerHTML='<option value="all">全部</option>'+groups.map(ch=>`<option value="${ch.key}">${ch.label}</option>`).join('');
  g('tagCategoryNav')?.querySelectorAll('.tag-nav-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.category===activeTagCategory));
  g('tp')?.querySelectorAll('.tag-category-panel').forEach(panel=>{
    panel.classList.toggle('active',panel.dataset.categoryPanel===activeTagCategory);
  });
}
function renderTagList(cid,arr,kind) {
  const el=g(cid);
let list=arr.map((item,idx)=>({...item,_idx:idx,_usage:tagUsageCount(kind,item.key)}));
  if(tagSearchQ) list=list.filter(item=>item.label.toLowerCase().includes(tagSearchQ));
  if(tagUnusedOnly) list=list.filter(item=>item._usage===0);
  if(!list.length){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">（無符合條件的標籤）</div>';return;}
  el.innerHTML=list.map(item=>`<div class="tag-item ${kind==='sub'&&groupDomainFilter===item.key?'active-domain':''}" draggable="true" data-draggable-tag="1" data-idx="${item._idx}" data-kind="${kind}" ${kind==='sub'?`data-domain-key="${item.key}"`:''}><span class="tag-drag-handle" title="拖曳排序">⋮⋮</span><div class="tag-color-dot" style="background:${item.color}"></div><span class="tag-item-label">${item.label}</span><span class="tag-item-meta">${item._usage} 筆</span><div class="tag-actions"><button class="tag-icon-btn" title="上移" data-idx="${item._idx}" data-kind="${kind}" data-dir="-1">↑</button><button class="tag-icon-btn" title="下移" data-idx="${item._idx}" data-kind="${kind}" data-dir="1">↓</button><button class="tag-icon-btn" title="編輯" data-idx="${item._idx}" data-kind="${kind}" data-edit="1">✎</button><button class="tag-icon-btn delete" title="刪除" data-idx="${item._idx}" data-kind="${kind}" data-del="1">🗑</button></div></div>`).join('');
  if(kind==='sub'){
    el.querySelectorAll('.tag-item[data-domain-key]').forEach(row=>row.addEventListener('click',ev=>{
      if(ev.target.closest('button')) return;
      groupDomainFilter=row.dataset.domainKey||'';
      activeTagCategory='group';
      renderTagLists();
    }));
  }
  bindTagActions(el);
  bindTagDrag(el);
}
function renderGroupTagList() {
  const el=g('groupTagList'); if(!el) return;
  if(!groupDomainFilter){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">請先到「」面板選擇一個，再管理。</div>';return;}
let list=groups.map((item,idx)=>({...item,_idx:idx,_usage:tagUsageCount('group',item.key)}));
  list=list.filter(item=>item.domain===groupDomainFilter||item.domain==='all');
  if(tagSearchQ) list=list.filter(item=>`${item.label} ${subByKey(item.domain).label}`.toLowerCase().includes(tagSearchQ));
  if(tagUnusedOnly) list=list.filter(item=>item._usage===0);
  if(!list.length){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">（無符合條件的）</div>';return;}
  el.innerHTML=list.map(item=>{
    const subLabel=item.domain==='all'?'全部':subByKey(item.domain).label;
return `<div class="tag-item ${partGroupFilter===item.key?'active-domain':''}" draggable="true" data-draggable-tag="1" data-idx="${item._idx}" data-kind="group" data-group-key="${item.key}"><span class="tag-drag-handle" title="拖曳排序">⋮⋮</span><div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;"><span class="tag-item-label">${item.label}</span><span class="tag-item-sub">${subLabel}</span></div><span class="tag-item-meta">${item._usage} 筆</span><div class="tag-actions"><button class="tag-icon-btn" title="上移" data-idx="${item._idx}" data-kind="group" data-dir="-1">↑</button><button class="tag-icon-btn" title="下移" data-idx="${item._idx}" data-kind="group" data-dir="1">↓</button><button class="tag-icon-btn" title="編輯" data-idx="${item._idx}" data-kind="group" data-edit="1">✎</button><button class="tag-icon-btn delete" title="刪除" data-idx="${item._idx}" data-kind="group" data-del="1">🗑</button></div></div>`;
  }).join('');
  el.querySelectorAll('.tag-item[data-group-key]').forEach(row=>row.addEventListener('click',ev=>{
    if(ev.target.closest('button')) return;
    partGroupFilter=row.dataset.groupKey||'';
    activeTagCategory='part';
    renderTagLists();
  }));
  bindTagActions(el);
  bindTagDrag(el);
}
function renderPartTagList() {
  const el=g('partTagList'); if(!el) return;
  if(!partGroupFilter){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">請先到「」面板選擇一個，再管理。</div>';return;}
  let list=parts.map((item,idx)=>({...item,_idx:idx,_usage:tagUsageCount('part',item.key)}));
  list=list.filter(item=>item.group===partGroupFilter||item.group==='all');
  if(tagSearchQ) list=list.filter(item=>`${item.label} ${groupByKey(item.group).label}`.toLowerCase().includes(tagSearchQ));
  if(tagUnusedOnly) list=list.filter(item=>item._usage===0);
  if(!list.length){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:8px 0">（無符合條件的）</div>';return;}
  el.innerHTML=list.map(item=>{
    const groupLabel=item.group==='all'?'全部':groupByKey(item.group).label;
    return `<div class="tag-item" draggable="true" data-draggable-tag="1" data-idx="${item._idx}" data-kind="part"><span class="tag-drag-handle" title="拖曳排序">⋮⋮</span><div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;"><span class="tag-item-label">${item.label}</span><span class="tag-item-sub">${groupLabel}</span></div><span class="tag-item-meta">${item._usage} 筆</span><div class="tag-actions"><button class="tag-icon-btn" title="上移" data-idx="${item._idx}" data-kind="part" data-dir="-1">↑</button><button class="tag-icon-btn" title="下移" data-idx="${item._idx}" data-kind="part" data-dir="1">↓</button><button class="tag-icon-btn" title="編輯" data-idx="${item._idx}" data-kind="part" data-edit="1">✎</button><button class="tag-icon-btn delete" title="刪除" data-idx="${item._idx}" data-kind="part" data-del="1">🗑</button></div></div>`;
  }).join('');
  bindTagActions(el);
  bindTagDrag(el);
}
function bindTagActions(root){
  root.querySelectorAll('.tag-icon-btn[data-dir]').forEach(b=>b.addEventListener('click',()=>moveTag(parseInt(b.dataset.idx,10),b.dataset.kind,parseInt(b.dataset.dir,10))));
  root.querySelectorAll('.tag-icon-btn[data-edit]').forEach(b=>b.addEventListener('click',()=>editTag(parseInt(b.dataset.idx,10),b.dataset.kind)));
  root.querySelectorAll('.tag-icon-btn[data-del]').forEach(b=>b.addEventListener('click',()=>deleteTag(parseInt(b.dataset.idx,10),b.dataset.kind)));
}
function bindTagDrag(root){
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
      reorderTagByIndex(kind,fromIdx,toIdx);
    });
  });
}
function reorderTagByIndex(kind,fromIdx,toIdx){
  const arr=tagCollection(kind);
  if(!arr[fromIdx]||!arr[toIdx]) return;
  const [item]=arr.splice(fromIdx,1);
  arr.splice(toIdx,0,item);
  saveData();renderTagLists();rebuildUI();render();
}
function moveTag(idx,kind,dir){
  const arr=tagCollection(kind);
  const target=idx+dir;
  if(!arr[idx]||target<0||target>=arr.length) return;
  [arr[idx],arr[target]]=[arr[target],arr[idx]];
  saveData();renderTagLists();rebuildUI();render();
}
function autoCleanupUnusedTags(){
  const now=Date.now();
  const usage={
    type:new Set(notes.map(n=>n.type).filter(Boolean)),
    domain:new Set(allMapNodes().flatMap(n=>noteDomains(n)).filter(Boolean)),
    group:new Set(allMapNodes().flatMap(n=>noteGroups(n)).filter(Boolean)),
    part:new Set(allMapNodes().flatMap(n=>noteParts(n)).filter(Boolean))
  };
  const nextTracker={};
  const keepOrTrack=(kind,key)=>{
    if(usage[kind].has(key)) return true;
    const trackerKey=`${kind}:${key}`;
    const since=unusedTagTracker[trackerKey]||now;
    nextTracker[trackerKey]=since;
    return now-since<UNUSED_TAG_PURGE_MS;
  };
  const before=types.length+domains.length+groups.length+parts.length;
  types=types.filter(t=>keepOrTrack('type',t.key));
  domains=domains.filter(s=>keepOrTrack('domain',s.key));
  groups=groups.filter(c=>keepOrTrack('group',c.key));
  parts=parts.filter(s=>keepOrTrack('part',s.key));
  unusedTagTracker=nextTracker;
  localStorage.setItem(UNUSED_TAG_TRACK_KEY,JSON.stringify(unusedTagTracker));
  normalizeNotesTaxonomy();
  const after=types.length+domains.length+groups.length+parts.length;
  if(after!==before){
    saveData();
    if(g('tp')?.classList.contains('open')) renderTagLists();
    rebuildUI();
    render();
    showToast(`已自動清理 ${before-after} 個未使用標籤`);
  }
}
function clearUnusedTags(){
  const usedTypes=new Set(notes.map(n=>n.type)),usedSubs=new Set(allMapNodes().flatMap(n=>noteDomains(n))),usedGroups=new Set(allMapNodes().flatMap(n=>noteGroups(n))),usedParts=new Set(allMapNodes().flatMap(n=>noteParts(n)));
  const before={types:types.length,subs:domains.length,groups:groups.length,parts:parts.length};
  types=types.filter(t=>usedTypes.has(t.key));
  domains=domains.filter(s=>usedSubs.has(s.key));
  groups=groups.filter(c=>usedGroups.has(c.key));
  parts=parts.filter(s=>usedParts.has(s.key));
  normalizeNotesTaxonomy();
  unusedTagTracker={};
  localStorage.setItem(UNUSED_TAG_TRACK_KEY,JSON.stringify(unusedTagTracker));
  const removed=(before.types-types.length)+(before.subs-domains.length)+(before.groups-groups.length)+(before.parts-parts.length);
  saveData();renderTagLists();rebuildUI();render();showToast(removed?`已清理 ${removed} 個未使用標籤`:'沒有可清理的標籤');
}
function editTag(idx,kind) {
  if(kind==='group'){editGroupTag(idx);return;}
  if(kind==='part'){editPartTag(idx);return;}
  const arr=kind==='type'?types:domains,item=arr[idx];
  const nl2=prompt('修改標籤名稱：',item.label); if(!nl2) return;
  const nv=nl2.trim(); if(!nv){showToast('名稱不能為空');return;}
  if(arr.some((t,i)=>i!==idx&&t.label===nv)){showToast('標籤名稱重複');return;}
  const nc=prompt('修改顏色（#RRGGBB）：',item.color); if(!nc) return;
  const ncv=nc.trim(); if(!/^#[0-9A-Fa-f]{6}$/.test(ncv)){showToast('顏色格式不正確');return;}
  arr[idx].label=nv;arr[idx].color=ncv;
  saveData();renderTagLists();buildTypeRow();buildSubRow();render();showToast('標籤已更新');
}
function editGroupTag(idx) {
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
  saveData();renderTagLists();rebuildUI();render();showToast('已更新');
}
function editPartTag(idx){
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
  saveData();renderTagLists();rebuildUI();render();showToast('已更新');
}
function deleteTag(idx,kind) {
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
    saveData();renderTagLists();rebuildUI();render();showToast('已刪除');return;
  }
  if(kind==='part'){
    const removed=arr[idx]; if(!removed) return;
    if(!confirm(`確定刪除「${removed.label}」？已使用此的筆記會改為未分類。`)) return;
    arr.splice(idx,1);allMapNodes().forEach(n=>{n.parts=noteParts(n).filter(sec=>sec!==removed.key);n.part=n.parts[0]||'';});
    if(csec===removed.key)csec='all';
    saveData();renderTagLists();rebuildUI();render();showToast('已刪除');return;
  }
  const removed=arr[idx];
  if(!confirm(`確定刪除標籤「${removed.label}」？`)) return;
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
  saveData();renderTagLists();rebuildUI();render();showToast('標籤已刪除');
}

function addTag(kind) {
  if(kind==='group'){
    const label=(g('newGroupLabel').value||'').trim();
    const domainSel=g('newGroupDomain');
    const domain=domainSel?(domainSel.value||'all'):'all';
    if(!label){showToast('請輸入名稱');return;}
    if(groups.some(ch=>ch.label===label&&ch.domain===domain)){showToast('已存在');return;}
    const key=groups.some(ch=>ch.key===label)?`group_${Date.now()}`:label;
    groups.push({key,label,domain});
    g('newGroupLabel').value='';
    saveData();renderTagLists();rebuildUI();showToast('已新增！');return;
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
    saveData();renderTagLists();rebuildUI();showToast('已新增！');return;
  }
  const isType=kind==='type';
  const label=(g(isType?'newTypeLabel':'newSubLabel').value||'').trim();
  const color=g(isType?'newTypeColor':'newSubColor').value;
  if(!label){showToast('請輸入標籤名稱');return;}
  const arr=isType?types:domains;
  if(arr.some(t=>t.label===label)){showToast('標籤已存在');return;}
  const newKey='tag_'+Date.now();
  arr.push({key:newKey,label,color});
  if(isType) typeFieldConfigs[newKey]=getTypeFieldKeys(newKey);
  g(isType?'newTypeLabel':'newSubLabel').value='';
  saveData();renderTagLists();rebuildUI();showToast('標籤已新增！');
}
function addSkillItem(){
  const name=safeStr(prompt('技能名稱：','法條理解力')||'').trim();
  if(!name) return;
  levelSystem.skills.push({id:Date.now()+Math.random(),name,level:1,xp:0,lastDoneByDiff:{},lastDecayAt:new Date().toISOString()});
  saveData();renderLevelSystemPage();applyBrandTitle();showToast('技能已新增');
}
function addTaskItem(){
  openLevelEditor('task');
}
function addAchievementItem(){
  openLevelEditor('achievement');
}
function editTaskItem(idx){
  openLevelEditor('task',idx);
}
function editAchievementItem(idx){
  openLevelEditor('achievement',idx);
}
function openLevelEditor(kind,idx=-1){
  const modal=g('levelEditorModal'),box=g('levelEditorBox');
  if(!modal||!box) return;
  levelEditorState={kind,idx};
  box.classList.toggle('task-mode',kind==='task');
  box.classList.toggle('achievement-mode',kind==='achievement');
  if(kind==='task'){
    const task=idx>=0?levelSystem.tasks[idx]:null;
    g('levelEditorTitle').textContent=task?'編輯任務':'新增任務';
    g('levelTaskName').value=task?.name||'';
    g('levelTaskDifficulty').value=task?.difficulty||'N';
    g('levelTaskRepeat').innerHTML=TASK_REPEAT_OPTIONS.map(opt=>`<option value="${opt.key}" ${(task?.repeatCycle||'daily')===opt.key?'selected':''}>${opt.label}</option>`).join('');
    g('levelTaskSubtasks').value=(task?.subtasks||[]).map(sub=>sub.text).join('\n');
  }else{
    const item=idx>=0?levelSystem.achievements[idx]:null;
    g('levelEditorTitle').textContent=item?'編輯成就':'新增成就';
    g('levelAchievementName').value=item?.name||'';
    g('levelAchievementTarget').value=String(item?.target||10);
    g('levelAchievementCondition').value=item?.condition||'累積完成任務次數';
    g('levelAchievementDifficulty').value=item?.difficulty||'N';
    g('levelAchievementPoints').value=String(item?.points||30);
  }
  modal.classList.add('open');
}
function closeLevelEditor(){ g('levelEditorModal')?.classList.remove('open'); }
function saveLevelEditor(){
  if(levelEditorState.kind==='task'){
    const name=safeStr(g('levelTaskName')?.value||'').trim();
    const difficulty=safeStr(g('levelTaskDifficulty')?.value||'N').toUpperCase();
    const repeatCycle=safeStr(g('levelTaskRepeat')?.value||'daily');
    if(!name){showToast('請輸入任務名稱');return;}
    if(!['E','N','H'].includes(difficulty)){showToast('難度需為 E / N / H');return;}
    if(!TASK_REPEAT_OPTIONS.some(opt=>opt.key===repeatCycle)){showToast('重複週期無效');return;}
    const lines=(g('levelTaskSubtasks')?.value||'').split('\n').map(v=>v.trim()).filter(Boolean);
    const idx=levelEditorState.idx;
    const oldTask=idx>=0?levelSystem.tasks[idx]:null;
    const oldByText={};
    (oldTask?.subtasks||[]).forEach(sub=>{oldByText[sub.text]=sub;});
    const subtasks=lines.map(text=>{
      const prev=oldByText[text];
      return prev?{...prev,text}:{id:Date.now()+Math.random(),text,difficulty,completions:0,lastCompletedAt:'',lastReward:null};
    });
    const payload={id:oldTask?.id||Date.now()+Math.random(),name,difficulty,repeatCycle,completions:oldTask?.completions||0,lastCompletedAt:oldTask?.lastCompletedAt||'',lastReward:oldTask?.lastReward||null,subtasks};
    if(idx>=0) levelSystem.tasks[idx]=payload;
    else levelSystem.tasks.push(payload);
    saveData();renderLevelSystemPage();closeLevelEditor();showToast(idx>=0?'任務已更新':'任務已新增');
    return;
  }
  const name=safeStr(g('levelAchievementName')?.value||'').trim();
  const target=Math.max(1,parseInt(g('levelAchievementTarget')?.value||'1',10)||1);
  const condition=safeStr(g('levelAchievementCondition')?.value||'').trim()||'累積完成任務次數';
  const difficulty=safeStr(g('levelAchievementDifficulty')?.value||'N').toUpperCase();
  const points=Math.max(0,parseInt(g('levelAchievementPoints')?.value||'0',10)||0);
  if(!name){showToast('請輸入成就名稱');return;}
  if(!['E','N','H'].includes(difficulty)){showToast('難度需為 E / N / H');return;}
  const idx=levelEditorState.idx;
  const old=idx>=0?levelSystem.achievements[idx]:null;
  const payload={id:old?.id||Date.now()+Math.random(),name,target,condition,difficulty,points,progress:old?.progress||0,unlocked:!!old?.unlocked};
  if(idx>=0) levelSystem.achievements[idx]=payload;
  else levelSystem.achievements.push(payload);
  refreshAchievementProgress();
  saveData();renderLevelSystemPage();applyBrandTitle();closeLevelEditor();showToast(idx>=0?'成就已更新':'成就已新增');
}
function getSelectedSkillForTaskIdx(taskIdx){
  const task=levelSystem.tasks[taskIdx];
  if(!task||!levelSystem.skills.length) return null;
  const sel=g('levelSystemPanel')?.querySelector(`[data-task-skill="${taskIdx}"]`);
  const selected=sel?.value||String(levelTaskExpanded[`skill_${task.id}`]||levelSystem.skills[0].id);
  levelTaskExpanded[`skill_${task.id}`]=selected;
  return levelSystem.skills.find(skill=>String(skill.id)===String(selected))||null;
}
function toggleTaskCompletionFromCheckbox(taskIdx,checked){
  const task=levelSystem.tasks[taskIdx];
  if(!task) return;
  if(!checked){
    if(!isTaskCompletedInCurrentCycle(task)){renderLevelSystemPage();return;}
    const cycleKey=getTaskCycleKey(task,new Date());
    const reward=task.lastReward;
    if(!reward||reward.cycleKey!==cycleKey){showToast('無法返還：缺少本週期紀錄');renderLevelSystemPage();return;}
    const skill=levelSystem.skills.find(s=>String(s.id)===String(reward.skillId));
    if(!skill||!rollbackTaskCompletion(task,skill)){showToast('返還失敗');renderLevelSystemPage();return;}
    saveData();renderLevelSystemPage();
    showToast(`已返還 ${reward.gain||0} EXP 與任務進度`);
    return;
  }
  if(isTaskCompletedInCurrentCycle(task)){showToast('此任務在本週期已完成');renderLevelSystemPage();return;}
  if(!levelSystem.skills.length){showToast('請先新增至少 1 個技能');renderLevelSystemPage();return;}
  const skill=getSelectedSkillForTaskIdx(taskIdx);
  if(!skill){showToast('請先選擇技能');renderLevelSystemPage();return;}
  if(!completeLevelTask(task.id,skill.id)){showToast('任務完成失敗');renderLevelSystemPage();return;}
  saveData();renderLevelSystemPage();
  showToast(`+${levelSystem.settings.xpByDifficulty[task.difficulty]||0} EXP → ${skill.name}`);
}
function toggleTaskExpand(taskIdx){
  const task=levelSystem.tasks[taskIdx];
  if(!task) return;
  levelTaskExpanded[task.id]=!levelTaskExpanded[task.id];
  renderLevelSystemPage();
}
function addTaskSubtask(taskIdx){
  const task=levelSystem.tasks[taskIdx];
  if(!task) return;
  const input=g('levelSystemPanel')?.querySelector(`[data-task-subtask-input="${taskIdx}"]`);
  const difficultySel=g('levelSystemPanel')?.querySelector(`[data-task-subtask-difficulty="${taskIdx}"]`);
  const text=safeStr(input?.value||'').trim();
  if(!text){showToast('請輸入小任務內容');return;}
  const difficulty=['E','N','H'].includes(difficultySel?.value)?difficultySel.value:'N';
  task.subtasks=Array.isArray(task.subtasks)?task.subtasks:[];
  task.subtasks.push({id:Date.now()+Math.random(),text,difficulty,completions:0,lastCompletedAt:'',lastReward:null});
  if(input) input.value='';
  saveData();renderLevelSystemPage();showToast('小任務已新增');
}
function editTaskSubtask(taskIdx,subIdx){
  const task=levelSystem.tasks[taskIdx],sub=task?.subtasks?.[subIdx];
  if(!sub) return;
  const next=safeStr(prompt('小任務內容：',sub.text)||'').trim();
  if(!next) return;
  const diffInput=safeStr(prompt('小任務難度（E / N / H）：',sub.difficulty||task.difficulty||'N')||'').toUpperCase();
  const nextDifficulty=['E','N','H'].includes(diffInput)?diffInput:(sub.difficulty||task.difficulty||'N');
  sub.text=next;
  sub.difficulty=nextDifficulty;
  saveData();renderLevelSystemPage();showToast('小任務已更新');
}
function deleteTaskSubtask(taskIdx,subIdx){
  const task=levelSystem.tasks[taskIdx],sub=task?.subtasks?.[subIdx];
  if(!sub) return;
  if(!confirm(`確定刪除小任務「${sub.text}」？`)) return;
  task.subtasks.splice(subIdx,1);
  saveData();renderLevelSystemPage();showToast('小任務已刪除');
}
function toggleSubtaskCompletion(taskIdx,subIdx,checked){
  const task=levelSystem.tasks[taskIdx],sub=task?.subtasks?.[subIdx];
  if(!task||!sub) return;
  if(!checked){
    if(!isSubtaskCompletedInCurrentCycle(task,sub)){renderLevelSystemPage();return;}
    const cycleKey=getTaskCycleKey(task,new Date());
    const reward=sub.lastReward;
    if(!reward||reward.cycleKey!==cycleKey){showToast('無法返還：缺少本週期紀錄');renderLevelSystemPage();return;}
    const skill=levelSystem.skills.find(s=>String(s.id)===String(reward.skillId));
    if(!skill){showToast('返還失敗：找不到技能');renderLevelSystemPage();return;}
    restoreSkill(skill,reward.skillPrev);
    sub.completions=Math.max(0,(sub.completions||0)-1);
    sub.lastCompletedAt='';
    sub.lastReward=null;
    refreshAchievementProgress();
    applyBrandTitle();
    saveData();renderLevelSystemPage();
    showToast(`已返還 ${reward.gain||0} EXP 與小任務進度`);
    return;
  }
  if(isSubtaskCompletedInCurrentCycle(task,sub)){showToast('此小任務在本週期已完成');renderLevelSystemPage();return;}
  const skill=getSelectedSkillForTaskIdx(taskIdx);
  if(!skill){showToast('請先新增技能並選擇');renderLevelSystemPage();return;}
  const diff=['E','N','H'].includes(sub.difficulty)?sub.difficulty:task.difficulty;
  const gain=getSubtaskXpGain(diff);
  sub.lastReward={cycleKey:getTaskCycleKey(task,new Date()),skillId:String(skill.id),skillPrev:snapshotSkill(skill),gain};
  gainSkillXp(skill,diff,gain);
  sub.completions=(sub.completions||0)+1;
  sub.lastCompletedAt=new Date().toISOString();
  refreshAchievementProgress();
  applyBrandTitle();
  saveData();renderLevelSystemPage();
  showToast(`小任務完成：+${gain} EXP → ${skill.name}`);
}

