const pad2 = (n) => String(n).padStart(2, '0');

export const createCalendarApi = (deps = {}) => {
  const { formatDateKey, relativeDayLabel } = deps;
  const fmtDateKey = (date) => (typeof formatDateKey === 'function' ? formatDateKey(date) : '') || '';
  const dueTimeText = (event) => `${pad2(event?.dueHour || 0)}:${pad2(event?.dueMinute || 0)}`;
  const relativeDateLabel = (raw) => (typeof relativeDayLabel === 'function' ? relativeDayLabel(raw) : '');
  return { fmtDateKey, dueTimeText, relativeDateLabel };
};

export const calendarApi = createCalendarApi();
