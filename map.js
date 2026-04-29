(function(global){
  const MAP_NODE_RADIUS_MIN=15, MAP_NODE_RADIUS_MAX=100, MAP_NODE_RADIUS_DEFAULT=25;
  const MAP_LIGHT_BUNDLING_STRENGTH=0.38;
  const DEFAULT_LANE_NAMES=['法條','構成要件','違法性','罪責','其它'];
  const MIN_LANE_COUNT=2, MAX_LANE_COUNT=10;
  const clampMapRadius = r => Math.max(MAP_NODE_RADIUS_MIN,Math.min(MAP_NODE_RADIUS_MAX,r));
  const defaultLaneNameAt = idx => DEFAULT_LANE_NAMES[idx]||`泳道 ${idx+1}`;
  const normalizeLaneCount = v => Math.max(MIN_LANE_COUNT,Math.min(MAX_LANE_COUNT,parseInt(v,10)||DEFAULT_LANE_NAMES.length));
  const splitMapTitleLines = (title,max=8) => { const s=String(title||'').trim(); if(!s) return ['（未命名）']; const r=[]; for(let i=0;i<s.length;i+=max) r.push(s.slice(i,i+max)); return r; };
  global.KLawsMap = { MAP_NODE_RADIUS_MIN, MAP_NODE_RADIUS_MAX, MAP_NODE_RADIUS_DEFAULT, MAP_LIGHT_BUNDLING_STRENGTH, DEFAULT_LANE_NAMES, MIN_LANE_COUNT, MAX_LANE_COUNT, clampMapRadius, defaultLaneNameAt, normalizeLaneCount, splitMapTitleLines };
})(window);
