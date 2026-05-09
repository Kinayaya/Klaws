(function(global){
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeText = value => escapeHtml(value).replace(/\r?\n/g,'<br>');
  const safeAttr = value => escapeHtml(value).replace(/`/g,'&#96;');
  global.KLawsSafeHtml = { escapeHtml, safeText, safeAttr };
})(window);
