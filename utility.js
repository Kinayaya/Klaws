(function(global){
  const safeStr = v => typeof v==='string'?v:'';
  const uniq = arr => [...new Set((Array.isArray(arr)?arr:[]).filter(Boolean))];
  const pad2 = n => String(n).padStart(2,'0');
  const escapeHtml = txt => safeStr(txt).replace(/[&<>"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]||ch));
  const hl = (text,q) => {
    const s=safeStr(text);
    return !q?s:s.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi'),'<span class="hl">$1</span>');
  };
  const formatDate = raw => {
    if(!raw) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    try {
      const d = new Date(raw);
      if(Number.isNaN(d.getTime())) return raw;
      return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    } catch(e) { return raw; }
  };
  const parseTodos = raw => (raw||'').split('\n').map(x=>x.trim()).filter(Boolean).map(line=>({text:line.replace(/^\[(x|X| )\]\s*/,''),done:/^\[(x|X)\]/.test(line)})).filter(x=>x.text);
  const formatTodosForEdit = todos => (Array.isArray(todos)?todos:[]).map(t=>`${t.done?'[x]':'[ ]'} ${t.text||''}`.trim()).join('\n');
  const parseSearchDateVariants = raw => {
    const q=safeStr(raw).trim();
    if(!q) return null;
    const t=q.replace(/\./g,'/').replace(/-/g,'/');
    const iso=t.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if(iso){
      const y=+iso[1],m=+iso[2],d=+iso[3];
      if(m>=1&&m<=12&&d>=1&&d<=31) return `${y}-${pad2(m)}-${pad2(d)}`;
    }
    const us=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if(us){
      const y=2000+(+us[3]),m=+us[1],d=+us[2];
      if(m>=1&&m<=12&&d>=1&&d<=31) return `${y}-${pad2(m)}-${pad2(d)}`;
    }
    return null;
  };
  const normalizeNoteSchema = (note) => {
    const n = (note && typeof note==='object') ? {...note} : {};
    if(!Array.isArray(n.todos)) n.todos=[];
    n.todos=n.todos.filter(Boolean).map(t=>({text:safeStr(t&&t.text).trim(),done:!!(t&&t.done)})).filter(t=>t.text);
    if(!Array.isArray(n.tags)) n.tags=[];
    n.tags=uniq(n.tags.map(x=>safeStr(x).trim()).filter(Boolean));
    n.title=safeStr(n.title);
    n.question=safeStr(n.question||n.title);
    n.answer=safeStr(n.answer||n.body);
    n.prompt=safeStr(n.prompt);
    n.application=safeStr(n.application);
    n.body=safeStr(n.body);
    n.detail=safeStr(n.detail);
    n.path=safeStr(n.path).trim();
    if(!n.extraFields||typeof n.extraFields!=='object'||Array.isArray(n.extraFields)) n.extraFields={};
    const subjects=Array.isArray(n.subjects)?n.subjects:(safeStr(n.subject)?[n.subject]:[]);
    n.subjects=uniq(subjects.map(x=>safeStr(x).trim()).filter(Boolean));
    // 章/節功能已由 path 路徑系統取代，統一清空避免舊資料殘留造成篩選錯誤
    n.chapters=[];
    n.sections=[];
    n.subject=n.subjects[0]||'';
    n.chapter='';
    n.section='';
    n.date=formatDate(n.date)||'1970-01-01';
    n.created_at=safeStr(n.created_at)||new Date(`${n.date}T00:00:00`).toISOString();
    n.last_reviewed=safeStr(n.last_reviewed);
    n.next_review=safeStr(n.next_review||n.date)||n.date;
    return n;
  };

  global.KLawsUtils = {
    safeStr, uniq, pad2, escapeHtml, hl, parseTodos, formatTodosForEdit, parseSearchDateVariants, formatDate, normalizeNoteSchema
  };
})(window);
