(function (global) {
  function normalizeNotesList(baseNotes, deps) {
    const normalizeNoteSchema = deps && deps.normalizeNoteSchema;
    if (typeof normalizeNoteSchema !== 'function') {
      throw new TypeError('normalizeNotesList requires deps.normalizeNoteSchema');
    }

    const normalizedNotes = (Array.isArray(baseNotes) ? baseNotes : []).map(normalizeNoteSchema);
    const seen = new Set();
    return normalizedNotes.filter((note) => {
      if (!Number.isFinite(note.id) || seen.has(note.id)) return false;
      seen.add(note.id);
      return true;
    });
  }

  const api = { normalizeNotesList };

  // Build target: CommonJS (tests / Node runtime)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  // Build target: Browser global bridge (legacy scripts)
  global.KLawsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
