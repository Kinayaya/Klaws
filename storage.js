(function(global){
  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    } catch(e) {
      return fallback;
    }
  };
  const writeJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
  global.KLawsStorage = { readJSON, writeJSON };
})(window);
