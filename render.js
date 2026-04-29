(function(global){
  const renderTodoHtml = todos => {
    const list=(Array.isArray(todos)?todos:[]).filter(t=>t&&t.text);
    if(!list.length) return '<span style="font-size:12px;color:#bbb">尚無待辦項目</span>';
    return `<div class="todo-list">${list.map(t=>`<div class="todo-item ${t.done?'done':''}"><span class="todo-item-check">${t.done?'✅':'⬜'}</span><span class="todo-item-text">${t.text}</span></div>`).join('')}</div>`;
  };

  const sortedNotes = (arr, ctx) => arr.slice().sort((a,b)=>{
    const {sortMode,safeStr,noteSubjectText,noteChapterText}=ctx;
    const ad=safeStr(a&&a.date),bd=safeStr(b&&b.date),at=safeStr(a&&a.title),bt=safeStr(b&&b.title),as=noteSubjectText(a),bs=noteSubjectText(b),ach=noteChapterText(a),bch=noteChapterText(b),aty=safeStr(a&&a.type),bty=safeStr(b&&b.type);
    return sortMode==='date_desc'?bd.localeCompare(ad):sortMode==='date_asc'?ad.localeCompare(bd):sortMode==='title_asc'?at.localeCompare(bt,'zh'):sortMode==='title_desc'?bt.localeCompare(at,'zh'):sortMode==='subject'?as.localeCompare(bs)||at.localeCompare(bt):sortMode==='chapter'?ach.localeCompare(bch)||at.localeCompare(bt):aty.localeCompare(bty)||at.localeCompare(bt);
  });

  global.KLawsRender = { renderTodoHtml, sortedNotes };
})(window);
