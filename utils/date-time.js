(function(global){
  const DAY_MS = 24*60*60*1000;
  const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const ISO_ZONED_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

  const pad2 = n => String(n).padStart(2,'0');
  const isValidDate = d => d instanceof Date && Number.isFinite(d.getTime());
  const startOfLocalDay = input => {
    const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
    if(!isValidDate(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  function parseDateKey(raw){
    if(raw instanceof Date){
      return startOfLocalDay(raw);
    }
    if(typeof raw!=='string') return null;
    const text = raw.trim();
    if(!text) return null;
    const keyMatch = text.match(ISO_DATE_RE);
    if(keyMatch){
      const y=Number(keyMatch[1]),m=Number(keyMatch[2]),d=Number(keyMatch[3]);
      const local = new Date(y,m-1,d);
      if(local.getFullYear()!==y||local.getMonth()!==m-1||local.getDate()!==d) return null;
      return local;
    }
    if(!ISO_ZONED_RE.test(text)) return null;
    const parsed = new Date(text);
    return startOfLocalDay(parsed);
  }

  function formatDateKey(input){
    const d = parseDateKey(input);
    if(!d) return null;
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function relativeDayLabel(raw, options={}){
    const d = parseDateKey(raw);
    if(!d) return '';
    const base = startOfLocalDay(options.now || new Date());
    if(!base) return '';
    const diff = Math.max(0, Math.floor((base.getTime()-d.getTime())/DAY_MS));
    if(diff===0) return '今天';
    if(diff===1) return '1 天前';
    if(diff<7) return `${diff} 天前`;
    return `${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
  }

  const api = { parseDateKey, formatDateKey, relativeDayLabel, startOfLocalDay };
  global.KLawsDateTime = api;
  if(typeof module!=='undefined' && module.exports){
    module.exports = api;
  }
})(typeof window!=='undefined'?window:globalThis);
