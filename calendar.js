(function(global){
  const pad2 = n => String(n).padStart(2,'0');
  const fmtDateKey = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const dueTimeText = ev => `${pad2(ev.dueHour||0)}:${pad2(ev.dueMinute||0)}`;
  const relativeDateLabel = raw => {
    if(!raw) return '';
    const d=new Date(raw);
    if(!Number.isFinite(d.getTime())) return '';
    const now=new Date();
    const dayMs=24*60*60*1000;
    const diff=Math.max(0,Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/dayMs));
    if(diff===0) return '今天';
    if(diff===1) return '1 天前';
    if(diff<7) return `${diff} 天前`;
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  };
  global.KLawsCalendar = { fmtDateKey, dueTimeText, relativeDateLabel };
})(window);
