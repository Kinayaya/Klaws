// ==================== 申論測驗 ====================
function loadExams() { try{const r=localStorage.getItem('klaws_exams_v1');if(r){examList=JSON.parse(r);examList.forEach(e=>{if(/^tag_s_|^tag_t_/.test(e.subject))e.subject=subByKey(e.subject).label;});saveExams();}}catch(e){examList=[];} }
function saveExams() { try{localStorage.setItem('klaws_exams_v1',JSON.stringify(examList));}catch(e){} }
function openExamPanel() {
  loadExams();renderExamList();
  const esel=g('examSubSel');if(esel)esel.innerHTML=subjects.map(s=>`<option value="${s.key}">${s.label}</option>`).join('');
  g('examListPanel').classList.add('open');g('examAddForm').classList.remove('open');g('dp').classList.remove('open');
  setTimeout(()=>g('examListPanel').scrollIntoView({behavior:'smooth',block:'nearest'}),60);
}
function renderExamList() {
  const el=g('examListItems');
  if(!examList.length){el.innerHTML='<div style="color:#bbb;font-size:13px;padding:12px 0;">尚無題目，請點新增題目</div>';return;}
  el.innerHTML=examList.map((ex,i)=>`<div class="exam-item" data-idx="${i}"><div><div class="exam-item-title">${subByKey(ex.subject).label} | ${ex.question.slice(0,35)}${ex.question.length>35?'...':''}</div><div class="exam-item-meta">${ex.timeLimit}分鐘</div></div><button class="exam-item-del" data-del="${i}">🗑️</button></div>`).join('');
  el.querySelectorAll('.exam-item').forEach(el2=>{el2.addEventListener('click',ev=>{if(ev.target.getAttribute('data-del')!==null)return;startExam(examList[parseInt(el2.dataset.idx)]);});});
  el.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',ev=>{ev.stopPropagation();examList.splice(parseInt(btn.dataset.del),1);saveExams();renderExamList();}));
}
function startExam(exam) {
  currentExam=exam;g('examListPanel').classList.remove('open');g('notesView').style.display='none';g('examView').classList.add('open');
  g('examBody').style.display='flex';g('examResult').style.display='none';
  g('examQuestionDisplay').textContent=exam.question;g('examIssueChips').innerHTML=(exam.issues||[]).map(iss=>`<span class="exam-issue-chip">${iss}</span>`).join('');
  g('examAnswerBox').value='';g('examWordCount').textContent='0 字';g('examHeaderTitle').textContent=`✒️ ${subByKey(exam.subject).label}`;
  examTotal=exam.timeLimit*60;examSec=examTotal;
  const updateTimer=()=>{const m=Math.floor(examSec/60),s=examSec%60;g('examTimer').textContent=`${m<10?'0':''}${m}:${s<10?'0':''}${s}`;if(examSec<=300)g('examTimer').classList.add('warning');};
  updateTimer();clearInterval(examTimer);examTimer=setInterval(()=>{examSec--;updateTimer();if(examSec<=0)doSubmit(true);},1000);
}
function doSubmit(timeUp) {
  clearInterval(examTimer);const ans=g('examAnswerBox').value.trim(),used=Math.round((examTotal-examSec)/60*10)/10;
  g('examBody').style.display='none';g('examResult').style.display='flex';g('examResult').classList.add('open');
  g('resultScoreNum').textContent='--';g('resultComment').textContent='評分中，請稍候…';g('resultRef').textContent='';g('resultTags').innerHTML='';
  gradeEssay(currentExam,ans,used,timeUp);
}
function gradeEssay(exam,ans,used,timeUp) {
  const issueList=(exam.issues||[]).join('、');
  const prompt=`你是台灣大學法律系教授，正在批改學生的申論題作答。請給予詳細、具體、有教育價值的評語。\n\n【科目】${subByKey(exam.subject).label}\n【題目】\n${exam.question.slice(0,300)}\n【預設爭點】${issueList}\n【學生作答】\n${(ans||'(未作答)').slice(0,3000)}\n【作答時間】${used}分鐘${timeUp?' (時間到，作答可能不完整)':''}\n\n請依下列 JSON 格式輸出評分（只輸出 JSON，不加任何其他文字或 markdown）：\n{"score":<0-100整數>,"comment":"<100-150字整體總評>","issue_analysis":[{"issue":"<爭點名稱>","hit":<true/false>,"analysis":"<針對此爭點的詳細評析>"}],"strengths":["<具體優點1>"],"weaknesses":["<具體缺點1>"],"suggestions":["<具體改進建議1>"],"reference":"<參考答題要點>"}`;
  fetch('https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getAiKey(),'HTTP-Referer':'https://kinayaya.github.io/LawsNote','X-Title':'KLaws'},
    body:JSON.stringify({model:getAiModel(),max_tokens:5000,messages:[{role:'user',content:prompt}]})
  }).then(r=>r.json()).then(d=>{
    if(d.error){g('resultScoreNum').textContent='?';g('resultComment').textContent='AI 錯誤：'+(d.error.message||JSON.stringify(d.error));return;}
    let raw=(((d.choices||[{}])[0].message||{}).content||'').replace(/```json|```/g,'').trim();
    const start=raw.indexOf('{'),end=raw.lastIndexOf('}');if(start!==-1&&end!==-1)raw=raw.slice(start,end+1);
    try{showResult(JSON.parse(raw));}catch(e){g('resultScoreNum').textContent='?';g('resultComment').textContent='AI 回應無法解析，原始內容：\n'+raw.slice(0,300);}
  }).catch(e=>{g('resultScoreNum').textContent='?';g('resultComment').textContent='評分服務暫時無法連線。錯誤：'+e.message;});
}
function showResult(r) {
  g('resultScoreNum').textContent=r.score||'--';
  const sc=g('resultScoreNum').parentElement;sc.style.background=r.score>=80?'#1D9E75':r.score>=60?'#378ADD':r.score>=40?'#D85A30':'#8B1A1A';
  g('resultComment').textContent=r.comment||'';
  const iaEl=g('resultIssueAnalysis');if(iaEl)iaEl.innerHTML=(r.issue_analysis||[]).map(item=>`<div class="issue-analysis-item"><div class="issue-analysis-head"><span class="issue-analysis-name">${item.issue}</span><span class="issue-hit-badge" style="background:${item.hit?'#1D9E75':'#D85A30'}">${item.hit?'✔ 有涵蓋':'✘ 未涵蓋'}</span></div><div class="issue-analysis-body">${item.analysis}</div></div>`).join('');
  let tags='';(r.strengths||[]).forEach(s=>tags+=`<span class="result-tag good">✓ ${s}</span>`);(r.weaknesses||[]).forEach(s=>tags+=`<span class="result-tag bad">✗ ${s}</span>`);(r.suggestions||[]).forEach(s=>tags+=`<span class="result-tag ok">→ ${s}</span>`);
  g('resultTags').innerHTML=tags;g('resultRef').textContent=r.reference||'';
}
function closeExamView() {
  clearInterval(examTimer);
  g('examView').classList.remove('open');
  currentView='notes';
  updateNotesHomeVisibility();
}

function initMoreMenu(){
  const btn=g('moreToolsBtn'),menu=g('moreToolsMenu');
  if(!btn||!menu) return;
  btn.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('open');});
  menu.querySelectorAll('button,label').forEach(el=>el.addEventListener('click',()=>menu.classList.remove('open')));
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn)menu.classList.remove('open');});
}

