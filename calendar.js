(function(global){
  const { formatDateKey, relativeDayLabel } = global.KLawsDateTime || {};
  const pad2 = n => String(n).padStart(2,'0');
  const fmtDateKey = d => (typeof formatDateKey==='function' ? formatDateKey(d) : null) || '';
  const dueTimeText = ev => `${pad2(ev.dueHour||0)}:${pad2(ev.dueMinute||0)}`;
  const relativeDateLabel = raw => (typeof relativeDayLabel==='function' ? relativeDayLabel(raw) : '');
  global.KLawsCalendar = { fmtDateKey, dueTimeText, relativeDateLabel };
})(window);
