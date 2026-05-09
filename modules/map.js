export const MAP_NODE_RADIUS_MIN = 15;
export const MAP_NODE_RADIUS_MAX = 100;
export const MAP_NODE_RADIUS_DEFAULT = 25;
export const MAP_LIGHT_BUNDLING_STRENGTH = 0.38;
export const DEFAULT_LANE_NAMES = ['法條', '構成要件', '違法性', '罪責', '其它'];
export const MIN_LANE_COUNT = 2;
export const MAX_LANE_COUNT = 10;

export const clampMapRadius = (radius) => Math.max(MAP_NODE_RADIUS_MIN, Math.min(MAP_NODE_RADIUS_MAX, radius));
export const defaultLaneNameAt = (idx) => DEFAULT_LANE_NAMES[idx] || `泳道 ${idx + 1}`;
export const normalizeLaneCount = (value) =>
  Math.max(MIN_LANE_COUNT, Math.min(MAX_LANE_COUNT, parseInt(value, 10) || DEFAULT_LANE_NAMES.length));
export const splitMapTitleLines = (title, max = 8) => {
  const text = String(title || '').trim();
  if (!text) return ['（未命名）'];
  const lines = [];
  for (let i = 0; i < text.length; i += max) lines.push(text.slice(i, i + max));
  return lines;
};

export const mapApi = {
  MAP_NODE_RADIUS_MIN,
  MAP_NODE_RADIUS_MAX,
  MAP_NODE_RADIUS_DEFAULT,
  MAP_LIGHT_BUNDLING_STRENGTH,
  DEFAULT_LANE_NAMES,
  MIN_LANE_COUNT,
  MAX_LANE_COUNT,
  clampMapRadius,
  defaultLaneNameAt,
  normalizeLaneCount,
  splitMapTitleLines,
};
