export const createRenderApi = (deps = {}) => {
  const { safeText = (v) => `${v ?? ''}` } = deps;

  const renderTodoHtml = (todos) => {
    const list = (Array.isArray(todos) ? todos : []).filter((item) => item && item.text);
    if (!list.length) return '<span style="font-size:12px;color:#bbb">尚無待辦項目</span>';
    return `<div class="todo-list">${list
      .map(
        (item) =>
          `<div class="todo-item ${item.done ? 'done' : ''}"><span class="todo-item-check">${
            item.done ? '✅' : '⬜'
          }</span><span class="todo-item-text">${safeText(item.text)}</span></div>`,
      )
      .join('')}</div>`;
  };

  const sortedNotes = (arr, ctx) =>
    arr.slice().sort((a, b) => {
      const { sortMode, safeStr, noteDomainText, noteGroupText } = ctx;
      const ad = safeStr(a && a.date);
      const bd = safeStr(b && b.date);
      const at = safeStr(a && a.title);
      const bt = safeStr(b && b.title);
      const as = noteDomainText(a);
      const bs = noteDomainText(b);
      const aty = safeStr(a && a.type);
      const bty = safeStr(b && b.type);
      return sortMode === 'date_desc'
        ? bd.localeCompare(ad)
        : sortMode === 'date_asc'
          ? ad.localeCompare(bd)
          : sortMode === 'title_asc'
            ? at.localeCompare(bt, 'zh')
            : sortMode === 'title_desc'
              ? bt.localeCompare(at, 'zh')
              : sortMode === 'domain'
                ? as.localeCompare(bs) || at.localeCompare(bt)
                : aty.localeCompare(bty) || at.localeCompare(bt);
    });

  return { renderTodoHtml, sortedNotes };
};

export const renderApi = createRenderApi();
