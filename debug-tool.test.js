const test = require('node:test');
const assert = require('node:assert/strict');
const { formatErrorDetail, createDebugRuntime } = require('./debug-tool.js');

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
