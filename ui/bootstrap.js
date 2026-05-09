(function(global){
  function bootstrapUI(deps={}){
    const onRef=deps.on||global.on;
    const controller=(global.createViewController||deps.createViewController)({});
    global.syncViewSwitchState=controller.setActiveViewSwitch;
    onRef('viewNotesBtn','click',()=>controller.openView('notes'));
    onRef('viewCalendarBtn','click',()=>controller.openView('calendar'));
    onRef('viewLevelBtn','click',()=>controller.openView('level'));
    onRef('viewMapBtn','click',()=>controller.openView('map'));
    onRef('viewExamBtn','click',()=>controller.openView('exam'));

    global.registerSettingsBindings?.();
    global.registerMapBindings?.();
    global.registerCalendarBindings?.();
    global.registerExamBindings?.();

    return controller;
  }
  global.bootstrapUI=bootstrapUI;
})(typeof window!=='undefined'?window:globalThis);
