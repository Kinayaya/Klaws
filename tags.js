// ==================== 標籤管理 ====================
function openTagMgr() {
  chapterSubjectFilter='';
  sectionChapterFilter='';
  activeTagCategory='type';
  g('tp').classList.add('open');
  ['dp','fp','ap'].forEach(p=>g(p).classList.remove('open'));
  renderTagLists();
  renderTagStats();
  syncSidePanelState();
}
function renderTagStats(){
  const box=g('tagStatsPanel');
  if(!box) return;
  const total=notes.length,byT={},byS={};
  notes.forEach(n=>{byT[n.type]=(byT[n.type]||0)+1;noteSubjects(n).forEach(sk=>{byS[sk]=(byS[sk]||0)+1;});});
  const lnk={};links.forEach(l=>{lnk[l.from]=true;lnk[l.to]=true;});
  const usageText=formatUsageDuration(ensureUsageStart());
  let html=`<div class="stats-grid"><div class="stat-card"><div class="stat-num">${total}</div><div class="stat-lbl">筆記總數</div></div><div class="stat-card"><div class="stat-num">${Object.keys(lnk).length}</div><div class="stat-lbl">有關聯筆記</div></div><div class="stat-card"><div class="stat-num">${subjects.length}</div><div class="stat-lbl">科目數</div></div><div class="stat-card"><div class="stat-num">${chapters.length}</div><div class="stat-lbl">章數</div></div><div class="stat-card"><div class="stat-num">${sections.length}</div><div class="stat-lbl">節數</div></div></div><div class="usage-time">已使用 KLaws：${usageText}</div>`;
  html+=`<div style="font-size:11px;font-weight:700;color:#888;margin:10px 0 6px;">各科目筆記數</div>`;
  Object.keys(byS).sort((a,b)=>byS[b]-byS[a]).forEach(sk=>{const s=subByKey(sk),c=byS[sk],p=total?Math.round(c/total*100):0;html+=`<div class="stats-bar-row"><span class="stats-bar-label">${s.label}</span><div class="stats-bar-bg"><div class="stats-bar-fill" style="width:${p}%;background:${s.color}"></div></div><span class="stats-bar-count">${c}</span></div>`;});
  box.innerHTML=html;
}
