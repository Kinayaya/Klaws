(function(global){
  function createViewController(deps={}){
    const gRef=deps.g||global.g;
    const toggleCalendarView=deps.toggleCalendarView||global.toggleCalendarView;
    const toggleLevelSystemView=deps.toggleLevelSystemView||global.toggleLevelSystemView;
    const toggleMapView=deps.toggleMapView||global.toggleMapView;
    const openExamModePanel=deps.openExamModePanel||global.openExamModePanel;

    const setActiveViewSwitch=(view='notes')=>{
      ['viewNotesBtn','viewCalendarBtn','viewLevelBtn','viewMapBtn','viewExamBtn'].forEach(id=>gRef(id)?.classList.remove('active'));
      const targetMap={notes:'viewNotesBtn',calendar:'viewCalendarBtn',level:'viewLevelBtn',map:'viewMapBtn',exam:'viewExamBtn'};
      gRef(targetMap[view]||'viewNotesBtn')?.classList.add('active');
      const compactBtn=gRef('compactToggleBtn');
      if(compactBtn) compactBtn.style.display=view==='notes'?'inline-flex':'none';
    };

    const openView=(view='notes')=>{
      if(view==='notes'){
        toggleCalendarView(false);toggleLevelSystemView(false);toggleMapView(false);
      }else if(view==='calendar'){
        toggleCalendarView(true);
      }else if(view==='level'){
        toggleLevelSystemView(true);
      }else if(view==='map'){
        toggleMapView(true);
      }else if(view==='exam'){
        openExamModePanel();
      }
      setActiveViewSwitch(view);
    };

    return { setActiveViewSwitch, openView };
  }

  global.createViewController=createViewController;
})(typeof window!=='undefined'?window:globalThis);
