(function(global){
  function normalizeStack(stack=''){
    return String(stack||'').split('\n').map(line=>line.trim()).filter(Boolean).slice(0,8).join(' | ');
  }

  function safeSerialize(value){
    if(typeof value==='string') return value;
    const seen=new WeakSet();
    try{
      return JSON.stringify(value,(k,v)=>{
        if(v&&typeof v==='object'){
          if(seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return v;
      });
    }catch(_){
      return String(value);
    }
  }

  function formatErrorDetail(err, context=''){
    const e = err instanceof Error ? err : new Error(safeSerialize(err));
    const name=e.name||'Error';
    const msg=e.message||'Unknown error';
    const stack=normalizeStack(e.stack||'');
    const where=stack ? `\nStack: ${stack}` : '';
    const prefix=context?`[${context}] `:'';
    return `${prefix}${name}: ${msg}${where}`;
  }

  function createDebugRuntime(opts={}){
    const lines=[];
    const maxLines=Number.isInteger(opts.maxLines)?opts.maxLines:500;
    const sink=typeof opts.sink==='function'?opts.sink:()=>{};

    const append=(level,args=[])=>{
      const time=new Date().toISOString();
      const text=`[${time}] ${String(level||'log').toUpperCase()} ${args.map(v=>v instanceof Error?formatErrorDetail(v):String(v)).join(' ')}`;
      lines.push(text);
      if(lines.length>maxLines) lines.splice(0,lines.length-maxLines);
      sink(text,lines.slice());
      return text;
    };

    const reportError=(context,error)=>append('error',[formatErrorDetail(error,context)]);

    return {
      append,
      reportError,
      getLines:()=>lines.slice()
    };
  }

  function bindDebugToggle(getBtn,onToggle){
    const btn=typeof getBtn==='function'?getBtn():null;
    if(!btn||btn.dataset?.boundDebugToggle) return false;
    if(btn.dataset) btn.dataset.boundDebugToggle='1';
    btn.addEventListener('click',onToggle);
    return true;
  }

  const api={ normalizeStack, formatErrorDetail, createDebugRuntime, bindDebugToggle };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(global) global.KLawsDebug=api;
})(typeof window!=='undefined'?window:globalThis);
