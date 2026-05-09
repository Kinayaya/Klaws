(function (global) {
  const deps = global.KLawsDateTime || {};
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDateKey = (date) => (typeof deps.formatDateKey === 'function' ? deps.formatDateKey(date) : '') || '';
  const dueTimeText = (event) => `${pad2(event?.dueHour || 0)}:${pad2(event?.dueMinute || 0)}`;
  const relativeDateLabel = (raw) => (typeof deps.relativeDayLabel === 'function' ? deps.relativeDayLabel(raw) : '');
  global.KLawsCalendar = { fmtDateKey, dueTimeText, relativeDateLabel };
})(window);
