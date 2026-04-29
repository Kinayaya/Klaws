function buildTreePathLabel(parentPath, childLabel){
  const parent=(parentPath||'').trim();
  const child=(childLabel||'').trim();
  if(!child) return parent;
  return parent?`${parent}>${child}`:child;
}

if(typeof module!=='undefined') module.exports={ buildTreePathLabel };

if(typeof window!=='undefined') window.buildTreePathLabel=buildTreePathLabel;
