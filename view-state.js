(function(global){
  function getViewToggles(api){
    return {
      toggleMapView: typeof api.toggleMapView==='function'?api.toggleMapView:null,
      toggleCalendarView: typeof api.toggleCalendarView==='function'?api.toggleCalendarView:null,
      toggleLevelSystemView: typeof api.toggleLevelSystemView==='function'?api.toggleLevelSystemView:null
    };
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={getViewToggles};
  }
  global.KLawsViewState={getViewToggles};
})(typeof window!=='undefined'?window:globalThis);
