(function(global){
  function mergeRelaysIntoNotes(baseNotes, relayList, deps){
    const normalizeNoteSchema = deps && deps.normalizeNoteSchema;
    const safeStr = deps && deps.safeStr;
    if(typeof normalizeNoteSchema !== 'function'){
      throw new TypeError('mergeRelaysIntoNotes requires deps.normalizeNoteSchema');
    }
    if(typeof safeStr !== 'function'){
      throw new TypeError('mergeRelaysIntoNotes requires deps.safeStr');
    }

    const normalizedNotes = (Array.isArray(baseNotes) ? baseNotes : []).map(normalizeNoteSchema);
    const relayNotes = (Array.isArray(relayList) ? relayList : []).map((relay)=>{
      const backupType = safeStr(relay && relay.noteTypeBackup) || safeStr(relay && relay.type) || 'article';
      const normalized = normalizeNoteSchema({ ...relay, isRelay:false, noteTypeBackup:'' });
      return { ...normalized, type: backupType };
    });

    const merged = [...normalizedNotes, ...relayNotes];
    const seen = new Set();
    return merged.filter((note)=>{
      if(!Number.isFinite(note.id) || seen.has(note.id)) return false;
      seen.add(note.id);
      return true;
    });
  }

  const api = { mergeRelaysIntoNotes };
  if(typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
  global.KLawsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
