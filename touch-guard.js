(function(global){
  function eventTargetElement(target){
    if(target&&typeof target.closest==='function') return target;
    if(target&&target.parentElement&&typeof target.parentElement.closest==='function') return target.parentElement;
    return null;
  }
  function isInteractiveTouchTarget(target){
    const el=eventTargetElement(target);
    if(!el) return false;
    return !!el.closest('button, a, input, select, textarea, label, summary, [role="button"], [data-allow-touch-default], [onclick]');
  }
  const api={ eventTargetElement, isInteractiveTouchTarget };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(global) global.KLawsTouchGuard=api;
})(typeof window!=='undefined'?window:globalThis);
