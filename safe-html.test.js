const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const code = fs.readFileSync('./utils/safe-html.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(code, context);

const { escapeHtml, safeText, safeAttr } = context.window.KLawsSafeHtml;

test('escapeHtml neutralizes script/onerror/closing tags', () => {
  const payload = '<script>alert(1)</script><img src=x onerror=alert(1)></div>';
  const out = escapeHtml(payload);
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('onerror=alert(1)'));
  assert.ok(out.includes('&lt;/div&gt;'));
  assert.ok(!out.includes('<script>'));
  assert.ok(!out.includes('</div>'));
});

test('safeText preserves line breaks via whitelist <br> only', () => {
  const out = safeText('line1\nline2<script>');
  assert.equal(out, 'line1<br>line2&lt;script&gt;');
  assert.ok(!out.includes('<script>'));
});

test('safeAttr escapes quotes and backticks', () => {
  const out = safeAttr('x\" onerror=\"1`');
  assert.equal(out, 'x&quot; onerror=&quot;1&#96;');
});
