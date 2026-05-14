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

  let guardsInstalled=false;
  function installDefaultGuards(){
    if(guardsInstalled||typeof document==='undefined') return;
    guardsInstalled=true;

    const isInsideMapCanvas=target=>{
      const el=eventTargetElement(target);
      return !!(el&&el.closest('#mapCanvas'));
    };
    const isInsideScrollablePanel=target=>{
      const el=eventTargetElement(target);
      return !!(el&&el.closest('#fp, #dp, #tp, #ap, #settingsModal, #levelEditorModal, #calendarEventModal, #calendarSettingsModal, #assistToolsModal'));
    };
    const isInsideMapTreeSidebar=target=>{
      const el=eventTargetElement(target);
      return !!(el&&el.closest('#mapTreeSidebar'));
    };
    const isInsidePathIndexLabel=target=>{
      const el=eventTargetElement(target);
      return !!(el&&el.closest('.tag-item-label'));
    };
    const shouldBlockDoubleClickZoom=target=>{
      const el=eventTargetElement(target);
      if(!el) return true;
      if(!isInsideMapCanvas(el)) return true;
      return !!el.closest('#mapPopup, #mapTreeSidebar, #mapTreeToggleBtn');
    };

    let lastTouchEndTs=0, lastTouchTs=0, lastTouchX=0, lastTouchY=0;
    document.addEventListener('dblclick',e=>{ if(shouldBlockDoubleClickZoom(e.target)) e.preventDefault(); },{capture:true,passive:false});
    document.addEventListener('wheel',e=>{ if(e.ctrlKey&&!isInsideMapCanvas(e.target)) e.preventDefault(); },{passive:false});
    ['gesturestart','gesturechange','gestureend'].forEach(evt=>{
      document.addEventListener(evt,e=>{ if(!isInsideMapCanvas(e.target)) e.preventDefault(); },{passive:false});
    });
    document.addEventListener('touchstart',e=>{
      if(isInsideMapCanvas(e.target)||isInsideScrollablePanel(e.target)||isInteractiveTouchTarget(e.target)) return;
      if(e.touches.length>1){ e.preventDefault(); return; }
      const t=e.touches[0];
      if(!t) return;
      const now=Date.now(), dx=Math.abs(t.clientX-lastTouchX), dy=Math.abs(t.clientY-lastTouchY);
      if(now-lastTouchTs<350&&dx<28&&dy<28) e.preventDefault();
      lastTouchTs=now; lastTouchX=t.clientX; lastTouchY=t.clientY;
    },{passive:false});
    document.addEventListener('touchmove',e=>{
      if(!isInsideMapCanvas(e.target)&&!isInsideScrollablePanel(e.target)&&e.touches.length>1) e.preventDefault();
    },{passive:false});
    document.addEventListener('touchend',e=>{
      const now=Date.now();
      if(isInsideMapTreeSidebar(e.target)||isInsidePathIndexLabel(e.target)){
        if(now-lastTouchEndTs<320) e.preventDefault();
        lastTouchEndTs=now;
        return;
      }
      if(isInsideMapCanvas(e.target)||isInsideScrollablePanel(e.target)||isInteractiveTouchTarget(e.target)) return;
      if(now-lastTouchEndTs<320) e.preventDefault();
      lastTouchEndTs=now;
    },{passive:false});
  }

  const api={ eventTargetElement, isInteractiveTouchTarget, installDefaultGuards };
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(global) global.KLawsTouchGuard=api;
})(typeof window!=='undefined'?window:globalThis);
