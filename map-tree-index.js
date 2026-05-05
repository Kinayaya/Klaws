function buildTreePathLabel(parentPath, childLabel){
  const parent=(parentPath||'').trim();
  const child=(childLabel||'').trim();
  if(!child) return parent;
  return parent?`${parent}>${child}`:child;
}

function collectTreePathSegments(pathSources, splitFn){
  const splitter=typeof splitFn==='function'?splitFn:(raw=>{
    const path=raw&&typeof raw==='object'?raw.path:raw;
    return String(path||'').split(/[/>＞，、。]/).map(x=>x.trim()).filter(Boolean);
  });
  const paths=[];
  (Array.isArray(pathSources)?pathSources:[]).forEach(source=>{
    const segs=splitter(source);
    for(let depth=1;depth<=segs.length;depth++) paths.push(segs.slice(0,depth));
  });
  return paths;
}

if(typeof module!=='undefined') module.exports={ buildTreePathLabel, collectTreePathSegments };

if(typeof window!=='undefined'){
  window.buildTreePathLabel=buildTreePathLabel;
  window.collectTreePathSegments=collectTreePathSegments;
}
