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
