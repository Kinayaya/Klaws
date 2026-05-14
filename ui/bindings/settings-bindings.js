(function(global){
  function registerSettingsBindings(deps={}){
    const onRef=deps.on||global.on;
    const gRef=deps.g||global.g;
    const closeSettings=()=>gRef('settingsModal')?.classList.remove('open');
    onRef('logoSettingsBtn','click',()=>gRef('settingsModal')?.classList.add('open'));
    gRef('settingsModal')?.addEventListener('click',e=>{ if(e.target?.id==='settingsModal') closeSettings(); });
    onRef('settingsCloseBtn','click',closeSettings);
    onRef('settingsArchiveBtn','click',()=>{closeSettings();global.manageArchives();});
    onRef('settingsManageBtn','click',()=>{closeSettings();gRef('tp')?.classList.add('open');global.syncSidePanelState?.();});
    onRef('settingsMoreBtn','click',()=>{closeSettings();gRef('assistToolsModal')?.classList.add('open');});
    onRef('assistToolsBtn','click',()=>gRef('assistToolsModal')?.classList.add('open'));
  }
  global.registerSettingsBindings=registerSettingsBindings;
  if(typeof module!=='undefined') module.exports={registerSettingsBindings};
})(typeof window!=='undefined'?window:globalThis);
