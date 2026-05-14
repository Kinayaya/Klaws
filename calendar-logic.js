var appStateFacadeCalendar=(typeof window!=='undefined'&&window.appState)?window.appState:null;
let calendarHolidayRefreshToken=0;
const officialTwHolidaysByYear=(typeof window!=='undefined'&&(window.__klawsOfficialTwHolidaysByYear&&typeof window.__klawsOfficialTwHolidaysByYear==='object'))
  ? window.__klawsOfficialTwHolidaysByYear
  : ((typeof window!=='undefined') ? (window.__klawsOfficialTwHolidaysByYear={}) : {});
const calendarEscapeHtml=((typeof window!=='undefined'&&window.KLawsSafeHtml&&typeof window.KLawsSafeHtml.escapeHtml==='function')
  ? window.KLawsSafeHtml.escapeHtml
  : ((typeof window!=='undefined'&&window.KLawsUtils&&typeof window.KLawsUtils.escapeHtml==='function')
    ? window.KLawsUtils.escapeHtml
    : (value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])))));
function getCalendarDateKey(date){
  const api=window.KLawsCalendar;
  if(api&&typeof api.fmtDateKey==='function'){
    return api.fmtDateKey(date)||'';
  }
  const dateTimeApi=window.KLawsDateTime;
  if(dateTimeApi&&typeof dateTimeApi.formatDateKey==='function'){
    return dateTimeApi.formatDateKey(date)||'';
  }
  return '';
}
function renderCalendarError(grid,message){
  if(!grid) return;
  grid.innerHTML=`<div class="calendar-render-error">${calendarEscapeHtml(message||'日曆載入失敗，請重新整理')}</div>`;
}
// ==================== 統計 ====================
function openStats() {
  openPathMgr();
  setTimeout(()=>g('pathStatsPanel')?.scrollIntoView({behavior:'smooth',block:'nearest'}),60);
}

function toggleCalendarView(open){
  if(appStateFacadeCalendar) appStateFacadeCalendar.setView(open?'calendar':'notes');
  currentView=open?'calendar':'notes';
  g('notesView').style.display=open?'none':(searchQ.trim()?'block':'none');
  g('mapView').classList.remove('open');
  g('levelSystemView').classList.remove('open');
  ['dp','fp','tp'].forEach(id=>g(id)?.classList.remove('open'));
  g('calendarView').classList.toggle('open',open);
  if(open) renderCalendar();
  else updateNotesHomeVisibility();
  if(typeof window.syncViewSwitchState==='function') window.syncViewSwitchState(currentView);
  saveLastViewState();
}
function toggleLevelSystemView(open){
  if(appStateFacadeCalendar) appStateFacadeCalendar.setView(open?'level':'notes',{mapOpen:false});
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
  if(typeof window.syncViewSwitchState==='function') window.syncViewSwitchState(currentView);
  saveLastViewState();
}
function resolveCalendarCursorSafe(){
  if(typeof window.getCalendarCursor==='function') return window.getCalendarCursor();
  if(calendarCursor instanceof Date&&!Number.isNaN(calendarCursor.getTime())) return calendarCursor;
  if(window.calendarCursor instanceof Date&&!Number.isNaN(window.calendarCursor.getTime())) return window.calendarCursor;
  const fallback=new Date();
  if(typeof window.setCalendarCursor==='function') return window.setCalendarCursor(fallback);
  calendarCursor=fallback;
  window.calendarCursor=fallback;
  return fallback;
}
async function ensureOfficialTwHolidaysForCursor(){
  const cursor=resolveCalendarCursorSafe();
  const year=cursor.getFullYear();
  if(Array.isArray(officialTwHolidaysByYear[year])) return officialTwHolidaysByYear[year];
  const api=window.KLawsTwHolidays;
  if(!api||typeof api.fetchOfficialTwHolidays!=='function'){ officialTwHolidaysByYear[year]=[]; return []; }
  const data=await api.fetchOfficialTwHolidays(year);
  officialTwHolidaysByYear[year]=Array.isArray(data)?data:[];
  return officialTwHolidaysByYear[year];
}
function getOfficialHolidayEventsForDate(dateKey){
  const y=Number((dateKey||'').slice(0,4));
  if(!Number.isFinite(y)) return [];
  const list=Array.isArray(officialTwHolidaysByYear[y])?officialTwHolidaysByYear[y]:[];
  return list.filter(e=>e.date===dateKey);
}

async function renderCalendar(){
  const grid=g('calendarGrid');
  if(!grid) return;
  try{
    const cursor=resolveCalendarCursorSafe();
    const y=cursor.getFullYear(),m=cursor.getMonth();
    g('calendarTitle').textContent=`${y}年${m+1}月`;
    const safeCalendarEvents=Array.isArray(calendarEvents)?calendarEvents:[];
    const first=new Date(y,m,1), startOffset=(first.getDay()+6)%7;
    const days=new Date(y,m+1,0).getDate();
    const prevDays=new Date(y,m,0).getDate();
    const todayKey=getCalendarDateKey(new Date())||'';
    const list=[];
    const refreshToken=++calendarHolidayRefreshToken;
    ensureOfficialTwHolidaysForCursor().then(()=>{
      if(refreshToken!==calendarHolidayRefreshToken) return;
      const currentCursor=resolveCalendarCursorSafe();
      if(currentCursor.getFullYear()!==y||currentCursor.getMonth()!==m) return;
      renderCalendar();
    }).catch(()=>{});
    for(let i=0;i<42;i++){
      let dayNum=0,cellDate=null,muted=false;
      if(i<startOffset){ dayNum=prevDays-startOffset+i+1; cellDate=new Date(y,m-1,dayNum); muted=true; }
      else if(i>=startOffset+days){ dayNum=i-(startOffset+days)+1; cellDate=new Date(y,m+1,dayNum); muted=true; }
      else { dayNum=i-startOffset+1; cellDate=new Date(y,m,dayNum); }
      const key=getCalendarDateKey(cellDate) || '--';
      const userItems=safeCalendarEvents.filter(e=>e.date===key);
      const holidayItems=getOfficialHolidayEventsForDate(key);
      const items=[...holidayItems,...userItems].slice(0,3);
      list.push(`<div class="calendar-cell ${muted?'muted':''} ${key===todayKey?'today':''}" data-date="${key}"><div class="calendar-day">${dayNum}</div>${items.map(ev=>{const cls=ev.type==='reminder'?'reminder':(ev.type==='holiday'?'holiday':'');const icon=ev.type==='diary'?'📝':(ev.type==='holiday'?'🎌':'⏰');return `<span class="calendar-event-chip ${cls}">${icon} ${calendarEscapeHtml(ev.title||'未命名')}</span>`;}).join('')}</div>`);
    }
    grid.innerHTML=list.join('');
    grid.querySelectorAll('.calendar-cell').forEach(cell=>cell.addEventListener('click',()=>toggleCalendarDayDetail(cell.dataset.date)));
  }catch(err){
    console.error('[calendar-render-failed]',{err});
    renderCalendarError(grid,'日曆初始化失敗，請重新整理');
  }
}
function toggleCalendarDayDetail(dateKey){
  activeCalendarDate=dateKey;
  const box=g('calendarDayDetail');
  if(!box) return;
  const entries=[...getOfficialHolidayEventsForDate(dateKey),...calendarEvents.filter(e=>e.date===dateKey)];
  if(!entries.length){
    openCalendarEventModal(dateKey);
    return;
  }
  box.classList.add('open');
  const safeDateLabel=dateKey&&dateKey!=='--'?dateKey:'--';
  box.innerHTML=`<div class="calendar-day-title">${safeDateLabel}（${entries.length} 筆）</div>`+entries.map(ev=>{
    const typeLabel=ev.type==='diary'?'📝 日記':(ev.type==='holiday'?'🎌 官方節日':'⏰ 提醒（到期 '+dueTimeText(ev)+'）');
    const actionHtml=ev.readonly?'':`<div class=\"calendar-day-item-actions\"><button data-eid=\"${ev.id}\">編輯</button><button class=\"calendar-delete-btn\" data-delete-eid=\"${ev.id}\">刪除</button></div>`;
    return `<div class="calendar-day-item"><div class="calendar-day-item-head"><span class="calendar-day-item-type">${typeLabel}</span>${actionHtml}</div><div style="font-weight:700;margin-bottom:4px;">${calendarEscapeHtml(ev.title||'未命名')}</div><pre>${calendarEscapeHtml(ev.body||'（無內容）')}</pre></div>`;
  }).join('')+`<button class="tool-btn" id="calendarAddNewBtn">+ 新增</button>`;
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
  g('calendarEventDateLabel').textContent=`日期：${(dateKey&&dateKey!=='--')?dateKey:'--'}`;
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
    const defaultDiaryDomain=(mapFilter.sub!=='all'&&domains.some(s=>s.key===mapFilter.sub))
      ?mapFilter.sub
      :((domains[0]&&domains[0].key)||'');
    notes.unshift(normalizeNoteSchema({id:nid++,type:'diary',domain:defaultDiaryDomain,domains:defaultDiaryDomain?[defaultDiaryDomain]:[],group:'',groups:[],part:'',parts:[],title,question:title,answer:body,prompt:'',application:'日常回顧與行動追蹤',body,detail:body,date:d,todos:[],extraFields:{}}));
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
  if(token&&from){
    if(!window.Email||!window.Email.send){
      try{
        await ensureSmtpClient();
      }catch(e){
        console.warn('[smtp-client-load-failed]',e);
      }
    }
  }
  if(token&&from&&window.Email&&window.Email.send){
    try{
      await window.Email.send({SecureToken:token,To:to,From:from,Domain:title,Body:content.replace(/\n/g,'<br>')});
      return true;
    }catch(e){console.warn('smtp send fail',e);}
  }
  try{
    window.location.href=`mailto:${to}?domain=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`;
    return true;
  }catch(e){
    return false;
  }
}
let smtpClientLoadPromise=null;
function ensureSmtpClient(){
  if(window.Email&&window.Email.send) return Promise.resolve(true);
  if(smtpClientLoadPromise) return smtpClientLoadPromise;
  smtpClientLoadPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-smtpjs="1"]');
    if(existing){
      existing.addEventListener('load',()=>resolve(true),{once:true});
      existing.addEventListener('error',()=>reject(new Error('smtpjs load failed')),{once:true});
      return;
    }
    const sc=document.createElement('script');
    sc.src='https://smtpjs.com/v3/smtp.js';
    sc.async=true;
    sc.dataset.smtpjs='1';
    sc.onload=()=>resolve(true);
    sc.onerror=()=>reject(new Error('smtpjs load failed'));
    document.head.appendChild(sc);
  }).finally(()=>{
    if(!(window.Email&&window.Email.send)) smtpClientLoadPromise=null;
  });
  return smtpClientLoadPromise;
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
      pop.innerHTML=`<button id="reminderCloseBtn">✕</button><div style="font-weight:700;margin-bottom:10px;">提醒：${calendarEscapeHtml(e.title)}</div><div style="font-size:.45em;color:#d1d5db;">到期 ${e.date} ${dueTimeText(e)}</div><div style="font-size:.5em;margin-top:8px;">${calendarEscapeHtml(e.body||'')}</div>`;
      pop.classList.add('open');
      g('reminderCloseBtn').onclick=()=>{
        pop.classList.remove('open');
        reminderDismissed[e.id]=true;
        window.KLawsStorage.governedWriteLocal('klaws_reminder_dismissed_v1',JSON.stringify(reminderDismissed),'ephemeral');
      };
    }
    if(channels.email&&calendarSettings.emails.length){
      const ok=await sendReminderEmail(e);
      if(!ok) showToast('Email 提醒寄送失敗，已改用 mailto');
    }
    reminderSent[e.id]=true;
  });
}
