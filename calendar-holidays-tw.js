(function(global){
  const CACHE_KEY='klaws_tw_official_holidays_cache_v1';
  const API_URL='https://data.gov.tw/api/v1/rest/datastore/A-C0032-001';
  function safeStr(v){ return typeof v==='string'?v:''; }
  function parseDate(v){
    const s=safeStr(v).trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    return s;
  }
  function normalizeRecords(records,year){
    const y=String(year);
    return (Array.isArray(records)?records:[]).map(item=>{
      const date=parseDate(item.date||item.Date||item.holidayDate||'');
      const title=safeStr(item.name||item.Name||item.holidayName||item.title||'').trim();
      if(!date||!title||!date.startsWith(`${y}-`)) return null;
      return {id:`tw_holiday_${date}_${title}`,date,title,type:'holiday',source:'official_tw',readonly:true};
    }).filter(Boolean);
  }
  function readCache(){
    try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{};}catch(_){return {};}
  }
  function writeCache(cache){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(cache));}catch(_){ }
  }
  async function fetchOfficialTwHolidays(year){
    const y=Number(year);
    if(!Number.isFinite(y)) return [];
    const cache=readCache();
    if(Array.isArray(cache[y])) return cache[y];
    try{
      const res=await fetch(`${API_URL}?limit=2000`);
      if(!res.ok) throw new Error(`holiday fetch failed ${res.status}`);
      const json=await res.json();
      const records=((json&&json.result&&json.result.records)||[]);
      const normalized=normalizeRecords(records,y);
      cache[y]=normalized;
      writeCache(cache);
      return normalized;
    }catch(_){
      return Array.isArray(cache[y])?cache[y]:[];
    }
  }
  global.KLawsTwHolidays={fetchOfficialTwHolidays};
})(typeof window!=='undefined'?window:globalThis);
