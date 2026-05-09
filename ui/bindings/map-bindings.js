(function(global){
  function registerMapBindings(deps={}){
    const onRef=deps.on||global.on;
    const gRef=deps.g||global.g;
    const toggleMapView=deps.toggleMapView||global.toggleMapView;
    onRef('mapBackBtn','click',()=>{if(global.isMapOpen&&global.leaveMapSubpage())return;toggleMapView(false);});
    onRef('mapAddNoteBtn','click',()=>{global.formMode='note';global.openForm(false);});
    onRef('mapSearchInput','input',global.debounce(()=>{global.mapFilter.q=gRef('mapSearchInput').value;global.saveDataDeferred();if(global.isMapOpen)global.drawMap();},250));
  }
  global.registerMapBindings=registerMapBindings;
})(typeof window!=='undefined'?window:globalThis);
