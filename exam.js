async function loadExams() {
  try{
    const fromIdb=await storageAdapter.primaryStore.get('klaws_exams_v1',null);
    const r=fromIdb||localStorage.getItem('klaws_exams_v1');
    if(r){
      examList=Array.isArray(r)?r:JSON.parse(r);
      examList.forEach(e=>{if(/^tag_s_|^tag_t_/.test(e.domain))e.domain=subByKey(e.domain).label;});
      saveExams();
    }
  }catch(e){examList=[];}
}
function saveExams() {
  try{localStorage.setItem('klaws_exams_v1',JSON.stringify(examList));}catch(e){}
  storageAdapter.primaryStore.set('klaws_exams_v1',examList).catch(()=>{});
}
function resetExamForm(){g('examQInput').value='';g('examAInput').value='';g('examIssInput').value='';g('examTimeInput').value='30';g('examSubSel').value='all';examEditingIndex=-1;const titleEl=g('examFormTitle');if(titleEl) titleEl.textContent='新增題目';const saveBtn=g('examFSave');if(saveBtn) saveBtn.textContent='儲存題目';}
function openExamPanel(){const panel=g('examModePanel');if(!panel)return;panel.classList.add('open');renderExamList();}
function renderExamList(){
  const root=g('examList');if(!root)return;
  if(!examList.length){root.innerHTML='<div class="item"><small style="color:var(--muted)">尚無題目，請先新增。</small></div>';return;}
  root.innerHTML=examList.map((e,i)=>`<div class="item" data-idx="${i}"><div><strong>${escapeHtml(e.question||'(未命名題目)')}</strong><div><small>${escapeHtml(subByKey(e.domain).label||'全部')||'全部'} · ${Number(e.timeLimit)||30} 秒</small></div></div><button class="tool-btn" data-del="${i}">刪除</button></div>`).join('');
  root.querySelectorAll('[data-idx]').forEach(el=>el.addEventListener('click',()=>{const i=parseInt(el.dataset.idx);if(!Number.isFinite(i)||!examList[i])return;const q=examList[i];g('examQInput').value=q.question||'';g('examAInput').value=q.answer||'';g('examIssInput').value=(q.issues||[]).join(', ');g('examTimeInput').value=String(q.timeLimit||30);g('examSubSel').value=q.domain||'all';examEditingIndex=i;const titleEl=g('examFormTitle');if(titleEl) titleEl.textContent='編輯題目';const saveBtn=g('examFSave');if(saveBtn) saveBtn.textContent='更新題目';g('examAddForm').classList.add('open');}));
  root.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',ev=>{ev.stopPropagation();examList.splice(parseInt(btn.dataset.del),1);saveExams();renderExamList();}));
}
function startExam(){
  if(!examList.length){showToast('題庫為空，請先新增題目');return;}
  const cfg={qCount:parseInt(g('examQuestionCount').value)||10,time:parseInt(g('examTimeLimit').value)||30,domain:g('examDomainFilter').value||'all'};
  const pool=cfg.domain==='all'?examList:examList.filter(x=>x.domain===cfg.domain);
  if(!pool.length){showToast('此領域目前沒有題目');return;}
  const shuffled=[...pool].sort(()=>Math.random()-0.5).slice(0,Math.min(cfg.qCount,pool.length));
  examSession={questions:shuffled,index:0,answers:[],timeLimit:cfg.time,startAt:Date.now(),timer:null};
  g('examModePanel').classList.remove('open');
  g('examQuestionPanel').classList.add('open');
  renderExamQuestion();
}
function renderExamQuestion(){
  if(!examSession) return;
  const q=examSession.questions[examSession.index];
  if(!q){finishExam();return;}
  g('examQMeta').textContent=`第 ${examSession.index+1} / ${examSession.questions.length} 題`;
  g('examQText').textContent=q.question||'';
  g('examAnswerInput').value='';
  const timeEl=g('examTimer');
  let remain=examSession.timeLimit;
  timeEl.textContent=`剩餘 ${remain} 秒`;
  if(examSession.timer) clearInterval(examSession.timer);
  examSession.timer=setInterval(()=>{remain--;timeEl.textContent=`剩餘 ${Math.max(remain,0)} 秒`;if(remain<=0){submitCurrentAnswer(true);}},1000);
}
