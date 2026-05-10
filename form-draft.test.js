const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const formJs=fs.readFileSync('form.js','utf8');
const renderUiJs=fs.readFileSync('render-ui.js','utf8');
const stateJs=fs.readFileSync('state.js','utf8');
const initJs=fs.readFileSync('init.js','utf8');

test('new-note form creates an autosaved draft instead of waiting for final save',()=>{
  assert.match(stateJs,/draftNoteId=null/);
  assert.match(formJs,/function createFormDraftNote\(\)/);
  assert.match(formJs,/id:nid\+\+/);
  assert.match(formJs,/isDraft:true/);
  assert.match(formJs,/created_at:nowIso/);
  assert.match(formJs,/notes\.unshift\(draft\)/);
  assert.match(formJs,/draftNoteId=draft\.id/);
  assert.match(formJs,/openId=draft\.id/);
  assert.match(formJs,/createFormDraftNote\(\);/);
});

test('draft autosave persists typed content without requiring final save before reload',()=>{
  assert.match(initJs,/editMode\|\|draftNoteId/);
  assert.match(formJs,/if\(!\(\(editMode\|\|draftNoteId\)&&openId\)\) return;/);
  assert.doesNotMatch(formJs,/function saveNoteDraftFromForm\(\)\{[\s\S]*?if\(!title\) return;[\s\S]*?savePathChange\(\{mode:'draft'\}\);/);
  assert.match(formJs,/Object\.assign\(target,updated\);[\s\S]*savePathChange\(\{mode:'draft'\}\);/);
});

test('final save promotes the existing draft and close keeps only non-empty drafts',()=>{
  assert.match(formJs,/draftTarget&&draftTarget\.isDraft/);
  assert.match(formJs,/delete updated\.isDraft/);
  assert.match(formJs,/\[saveNote\]\[finalize-draft\]/);
  assert.match(formJs,/if\(currentFormHasDraftContent\(\)\) saveNoteDraftFromForm\(\);/);
  assert.match(formJs,/else \{ removeDraftNoteById\(closingDraftId\); savePathChange\(\{mode:'draft'\}\); \}/);
});

test('list and search hide blank drafts but surface content drafts with a draft chip',()=>{
  assert.match(renderUiJs,/const isVisibleDraft=n=>!n\.isDraft\|\|formDraftHasContent\(n\);/);
  assert.match(renderUiJs,/filter\(n=>isVisibleDraft\(n\)&&visibleIds\.has\(n\.id\)&&noteMatchesSearch/);
  assert.match(renderUiJs,/草稿/);
  assert.match(renderUiJs,/未命名草稿/);
});


test('flushing immediately after saveNoteDraftFromForm persists draft snapshot to storage',async()=>{
  const vm=require('node:vm');
  const timers=[];
  const takeFunction=(src,name)=>{
    let start=src.indexOf(`async function ${name}(`);
    if(start===-1) start=src.indexOf(`function ${name}(`);
    assert.notEqual(start,-1,`${name} should exist`);
    const brace=src.indexOf('{',start);
    let depth=0;
    for(let i=brace;i<src.length;i++){
      if(src[i]==='{') depth++;
      else if(src[i]==='}'){
        depth--;
        if(depth===0) return src.slice(start,i+1);
      }
    }
    throw new Error(`could not extract ${name}`);
  };
  const utilsStart=fs.readFileSync('utils-app.js','utf8').indexOf('const DRAFT_SAVE_THROTTLE_MS = 100;');
  const utilsEnd=fs.readFileSync('utils-app.js','utf8').indexOf('const typeByKey =',utilsStart);
  const utilsSnippet=fs.readFileSync('utils-app.js','utf8').slice(utilsStart,utilsEnd)+`\nObject.assign(globalThis,{queueDraftImmediateSave,flushDraftSave,savePathChange});`;
  const formSnippet=[
    takeFunction(formJs,'saveNoteDraftFromForm'),
    takeFunction(formJs,'flushNoteDraftSnapshot'),
    'Object.assign(globalThis,{saveNoteDraftFromForm,flushNoteDraftSnapshot});'
  ].join('\n');
  const saveDataCalls=[];
  const target={id:1,isDraft:true,type:'note',domain:'old',domains:['old'],title:'old title'};
  const elements={
    fti:{value:'立即保存草稿'},
    ft:{value:'note'},
    fpath:{value:'draft/path'}
  };
  const context={
    console,
    setTimeout(fn,ms){ const timer=setTimeout(fn,ms); timers.push(timer); return timer; },
    clearTimeout(timer){ clearTimeout(timer); },
    saveData:async opt=>{ saveDataCalls.push(opt); return {ok:true,store:'test'}; },
    showToast:()=>{},
    flushDeferredSave:async()=>null,
    editMode:true,
    draftNoteId:null,
    openId:1,
    domains:[{key:'dom'}],
    mapNodeById:id=>id===1?target:null,
    g:id=>elements[id]||{value:''},
    currentFormHasDraftContent:()=>true,
    resolveInheritedPath:path=>path,
    collectFormValuesByType:()=>({question:'',answer:'',prompt:'',application:'',body:'草稿內容',detail:'',todos:[],extraFields:{}}),
    selectedValues:()=>[],
    normalizeNoteSchema:n=>n
  };
  vm.createContext(context);
  vm.runInContext(utilsSnippet,context);
  vm.runInContext(formSnippet,context);

  await context.flushNoteDraftSnapshot();
  assert.equal(saveDataCalls.length,1);
  assert.equal(saveDataCalls[0].includeTransient,false);
  assert.equal(target.title,'立即保存草稿');
  assert.equal(target.body,'草稿內容');
  assert.equal(target.isDraft,true);
  timers.forEach(clearTimeout);
});
