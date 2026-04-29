// ==================== 統計 ====================
function openStats() {
  openTagMgr();
  setTimeout(()=>g('tagStatsPanel')?.scrollIntoView({behavior:'smooth',block:'nearest'}),60);
}

function toggleCalendarView(open){
  currentView=open?'calendar':'notes';
  g('notesView').style.display=open?'none':(searchQ.trim()?'block':'none');
  g('mapView').classList.remove('open');
  g('levelSystemView').classList.remove('open');
  ['dp','fp','tp'].forEach(id=>g(id)?.classList.remove('open'));
  g('calendarView').classList.toggle('open',open);
  if(open) renderCalendar();
  else updateNotesHomeVisibility();
  saveLastViewState();
}
function toggleLevelSystemView(open){
  currentView=open?'level':'notes';
  isMapOpen=false;
  g('notesView').style.display=open?'none':(searchQ.trim()?'block':'none');
  g('mapView').classList.remove('open');
  g('calendarView').classList.remove('open');
  ['dp','fp','tp'].forEach(id=>g(id)?.classList.remove('open'));
  g('levelSystemView').classList.toggle('open',open);
  g('subbar').style.display=open?'none':'flex';
  const advanced=g('filterAdvanced');
  if(advanced) advanced.style.display=open?'none':'block';
  if(open) renderLevelSystemPage();
  else updateNotesHomeVisibility();
  saveLastViewState();
}
function renderCalendar(){
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
  g('calendarTitle').textContent=`${y}年${m+1}月`;
  const grid=g('calendarGrid');
  const first=new Date(y,m,1), startOffset=(first.getDay()+6)%7;
  const days=new Date(y,m+1,0).getDate();
  const prevDays=new Date(y,m,0).getDate();
  const todayKey=fmtDateKey(new Date());
  const list=[];
  for(let i=0;i<42;i++){
    let dayNum=0,cellDate=null,muted=false;
    if(i<startOffset){ dayNum=prevDays-startOffset+i+1; cellDate=new Date(y,m-1,dayNum); muted=true; }
    else if(i>=startOffset+days){ dayNum=i-(startOffset+days)+1; cellDate=new Date(y,m+1,dayNum); muted=true; }
    else { dayNum=i-startOffset+1; cellDate=new Date(y,m,dayNum); }
    const key=fmtDateKey(cellDate);
    const items=calendarEvents.filter(e=>e.date===key).slice(0,2);
    list.push(`<div class="calendar-cell ${muted?'muted':''} ${key===todayKey?'today':''}" data-date="${key}"><div class="calendar-day">${dayNum}</div>${items.map(ev=>`<span class="calendar-event-chip ${ev.type==='reminder'?'reminder':''}">${ev.type==='diary'?'📝':'⏰'} ${escapeHtml(ev.title||'未命名')}</span>`).join('')}</div>`);
  }
  grid.innerHTML=list.join('');
  grid.querySelectorAll('.calendar-cell').forEach(cell=>cell.addEventListener('click',()=>toggleCalendarDayDetail(cell.dataset.date)));
}
function toggleCalendarDayDetail(dateKey){
  activeCalendarDate=dateKey;
  const box=g('calendarDayDetail');
  if(!box) return;
  const entries=calendarEvents.filter(e=>e.date===dateKey);
  if(!entries.length){
    openCalendarEventModal(dateKey);
    return;
  }
  box.classList.add('open');
  box.innerHTML=`<div class="calendar-day-title">${dateKey}（${entries.length} 筆）</div>`+entries.map(ev=>`<div class="calendar-day-item"><div class="calendar-day-item-head"><span class="calendar-day-item-type">${ev.type==='diary'?'📝 日記':'⏰ 提醒（到期 '+dueTimeText(ev)+'）'}</span><div class="calendar-day-item-actions"><button data-eid="${ev.id}">編輯</button><button class="calendar-delete-btn" data-delete-eid="${ev.id}">刪除</button></div></div><div style="font-weight:700;margin-bottom:4px;">${escapeHtml(ev.title||'未命名')}</div><pre>${escapeHtml(ev.body||'（無內容）')}</pre></div>`).join('')+`<button class="tool-btn" id="calendarAddNewBtn">+ 新增</button>`;
  box.querySelectorAll('button[data-eid]').forEach(btn=>btn.addEventListener('click',()=>{
    const ev=calendarEvents.find(e=>String(e.id)===btn.dataset.eid);
    if(ev) openCalendarEventModal(dateKey,ev);
  }));
  box.querySelectorAll('button[data-delete-eid]').forEach(btn=>btn.addEventListener('click',()=>{
    const ev=calendarEvents.find(e=>String(e.id)===btn.dataset.deleteEid);
    if(ev) deleteCalendarEvent(ev.id);
  }));
  const addBtn=g('calendarAddNewBtn');
  if(addBtn) addBtn.addEventListener('click',()=>openCalendarEventModal(dateKey));
}
function openCalendarEventModal(dateKey, eventItem=null){
  activeCalendarDate=dateKey;
  editingCalendarEventId=eventItem?eventItem.id:null;
  g('calendarEventDateLabel').textContent=`日期：${dateKey}`;
  g('calendarEventType').value=eventItem?.type||'diary';
  g('calendarEventName').value=eventItem?.title||'';
  g('calendarEventBody').value=eventItem?.body||'';
  g('remindDays').value=eventItem?.remindBefore?.days??0;g('remindHours').value=eventItem?.remindBefore?.hours??0;g('remindMinutes').value=eventItem?.remindBefore?.minutes??10;
  g('dueHour').value=eventItem?.dueHour??9;g('dueMinute').value=eventItem?.dueMinute??0;
  g('remindPopup').checked=eventItem?.channels?.popup??true;g('remindEmail').checked=eventItem?.channels?.email??false;
  g('calendarEventDelete').style.display=eventItem?'inline-flex':'none';
  g('calendarReminderWrap').style.display=g('calendarEventType').value==='reminder'?'block':'none';
  g('calendarEventModal').classList.add('open');
}
function deleteCalendarEvent(eventId){
  const idx=calendarEvents.findIndex(e=>e.id===eventId);
  if(idx<0) return;
  const ev=calendarEvents[idx];
  if(!confirm(`確定刪除這筆${ev.type==='diary'?'日記':'提醒'}？`)) return;
  calendarEvents.splice(idx,1);
  saveData();rebuildUI();renderCalendar();
  const dayBox=g('calendarDayDetail');
  if(dayBox?.classList.contains('open')) toggleCalendarDayDetail(activeCalendarDate);
  g('calendarEventModal').classList.remove('open');
  editingCalendarEventId=null;
  showToast('已刪除日程');
}
function saveCalendarEvent(){
  const type=g('calendarEventType').value,title=(g('calendarEventName').value||'').trim(),body=(g('calendarEventBody').value||'').trim();
  if(!title){showToast('請輸入標題');return;}
  const ev={id:editingCalendarEventId||Date.now()+Math.random(),date:activeCalendarDate,type,title,body};
  if(type==='reminder'){
    ev.dueHour=Math.min(23,Math.max(0,parseInt(g('dueHour').value,10)||0));
    ev.dueMinute=Math.min(59,Math.max(0,parseInt(g('dueMinute').value,10)||0));
    ev.remindBefore={
      days:Math.max(0,parseInt(g('remindDays').value,10)||0),
      hours:Math.max(0,parseInt(g('remindHours').value,10)||0),
      minutes:Math.max(0,parseInt(g('remindMinutes').value,10)||0)
    };
    ev.channels={popup:!!g('remindPopup').checked,email:!!g('remindEmail').checked};
  }
  const idx=calendarEvents.findIndex(x=>x.id===ev.id);
  if(idx>=0) calendarEvents[idx]=ev;
  else calendarEvents.push(ev);
  if(type==='diary'&&idx<0){
    const d=activeCalendarDate;
    const defaultDiarySubject=(mapFilter.sub!=='all'&&subjects.some(s=>s.key===mapFilter.sub))
      ?mapFilter.sub
      :((subjects[0]&&subjects[0].key)||'');
    notes.unshift(normalizeNoteSchema({id:nid++,type:'diary',subject:defaultDiarySubject,subjects:defaultDiarySubject?[defaultDiarySubject]:[],chapter:'',chapters:[],section:'',sections:[],title,question:title,answer:body,prompt:'',application:'日常回顧與行動追蹤',body,detail:body,date:d,todos:[],extraFields:{}}));
  }
  saveData();rebuildUI();renderCalendar();g('calendarEventModal').classList.remove('open');
  const dayBox=g('calendarDayDetail');if(dayBox?.classList.contains('open')) toggleCalendarDayDetail(activeCalendarDate);
  showToast(editingCalendarEventId?'已更新日程':'已新增日程');
  editingCalendarEventId=null;
}
async function sendReminderEmail(ev){
  const to=(calendarSettings.emails||[]).join(',');
  if(!to) return false;
  const token=safeStr(calendarSettings.smtpToken||'').trim();
  const from=safeStr(calendarSettings.emailFrom||'').trim();
  const title=`KLaws 提醒：${ev.title}`;
  const content=`提醒事項：${ev.title}\n到期日：${ev.date} ${dueTimeText(ev)}\n內容：${ev.body||''}`;
  if(token&&from&&window.Email&&window.Email.send){
    try{
      await window.Email.send({SecureToken:token,To:to,From:from,Subject:title,Body:content.replace(/\n/g,'<br>')});
      return true;
    }catch(e){console.warn('smtp send fail',e);}
  }
  try{
    window.location.href=`mailto:${to}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`;
    return true;
  }catch(e){
    return false;
  }
}
function checkReminders(){
  const now=Date.now();
  calendarEvents.filter(e=>e.type==='reminder').forEach(async e=>{
    const due=new Date(`${e.date}T${pad2(e.dueHour||9)}:${pad2(e.dueMinute||0)}:00`).getTime();
    const before=e.remindBefore||{days:0,hours:0,minutes:0};
    const remindAt=due-(before.days*86400000+before.hours*3600000+before.minutes*60000);
    if(now<remindAt||reminderSent[e.id]||reminderDismissed[e.id]) return;
    const channels=e.channels||{};
    if(channels.popup!==false){
      const pop=g('reminderPopup');
      pop.innerHTML=`<button id="reminderCloseBtn">✕</button><div style="font-weight:700;margin-bottom:10px;">提醒：${escapeHtml(e.title)}</div><div style="font-size:.45em;color:#d1d5db;">到期 ${e.date} ${dueTimeText(e)}</div><div style="font-size:.5em;margin-top:8px;">${escapeHtml(e.body||'')}</div>`;
      pop.classList.add('open');
      g('reminderCloseBtn').onclick=()=>{
        pop.classList.remove('open');
        reminderDismissed[e.id]=true;
        localStorage.setItem('klaws_reminder_dismissed_v1',JSON.stringify(reminderDismissed));
      };
    }
    if(channels.email&&calendarSettings.emails.length){
      const ok=await sendReminderEmail(e);
      if(!ok) showToast('Email 提醒寄送失敗，已改用 mailto');
    }
    reminderSent[e.id]=true;
  });
}
