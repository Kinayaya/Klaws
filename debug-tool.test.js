const test = require('node:test');
const assert = require('node:assert/strict');
const { formatErrorDetail, createDebugRuntime, bindDebugToggle } = require('./debug-tool.js');

test('formatErrorDetail includes error name/message and stack summary', ()=>{
  const err=new Error('btn failed');
  err.stack='Error: btn failed\n at fnA (a.js:10:3)\n at fnB (b.js:20:7)';
  const txt=formatErrorDetail(err,'headerBtn:click');
  assert.match(txt,/\[headerBtn:click\] Error: btn failed/);
  assert.match(txt,/a.js:10:3/);
});

test('createDebugRuntime keeps max lines and reports detailed error', ()=>{
  const rt=createDebugRuntime({maxLines:2});
  rt.append('info',['line1']);
  rt.append('warn',['line2']);
  rt.reportError('saveBtn:click',new Error('save failed'));
  const lines=rt.getLines();
  assert.equal(lines.length,2);
  assert.match(lines[1],/saveBtn:click/);
  assert.match(lines[1],/save failed/);
});

test('bindDebugToggle only binds once per button element', ()=>{
  let calls=0;
  const btn={
    dataset:{},
    addEventListener:(evt,fn)=>{ if(evt==='click'){ calls++; btn._fn=fn; } }
  };
  const onToggle=()=>{};
  assert.equal(bindDebugToggle(()=>btn,onToggle),true);
  assert.equal(bindDebugToggle(()=>btn,onToggle),false);
  assert.equal(calls,1);
});

test('bindDebugToggle rebinds after button node replacement', ()=>{
  let calls=0;
  const mkBtn=()=>({
    dataset:{},
    addEventListener:(evt)=>{ if(evt==='click') calls++; }
  });
  const btnA=mkBtn();
  const btnB=mkBtn();
  assert.equal(bindDebugToggle(()=>btnA,()=>{}),true);
  assert.equal(bindDebugToggle(()=>btnB,()=>{}),true);
  assert.equal(calls,2);
});
