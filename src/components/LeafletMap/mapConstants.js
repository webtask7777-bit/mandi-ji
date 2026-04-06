// India map constants
export const INDIA_CENTER = [22.5, 82.0];
export const DEFAULT_ZOOM = 5;
export const STATE_ZOOM = 7;
export const MAX_ZOOM = 12;
export const MIN_ZOOM = 4;

// Padded bounds so user can't pan away from India
export const INDIA_BOUNDS = [
  [5.5, 65.0],   // SW corner
  [38.0, 100.0],  // NE corner
];

export const HEAT_SCALE = ['#14532d', '#166534', '#15803d', '#22c55e', '#4ade80'];
export const NO_DATA_COLOR = '#1c1c1e';
export const SELECTED_COLOR = '#22c55e';
export const BORDER_COLOR = '#3f3f46';
export const HOVER_BORDER = '#71717a';

// Dark CartoDB tile URL (free, no API key)
export const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
export const DARK_TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';
