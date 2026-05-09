(function(global){
  function registerExamBindings(deps={}){
    const onRef=deps.on||global.on;
    const gRef=deps.g||global.g;
    onRef('examModeClose','click',()=>gRef('examModePanel').classList.remove('open'));
    onRef('examModeEssayBtn','click',global.openExamPanel);
    onRef('examAddBtn','click',()=>global.openExamForm());
  }
  global.registerExamBindings=registerExamBindings;
})(typeof window!=='undefined'?window:globalThis);
