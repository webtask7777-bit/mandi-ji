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

export const HEAT_SCALE = ['#d4e3c6', '#a7c694', '#73a578', '#3c7b59', '#174c3c'];
export const NO_DATA_COLOR = '#e4e7de';
export const SELECTED_COLOR = '#174c3c';
export const BORDER_COLOR = '#b7c5b2';
export const HOVER_BORDER = '#597a64';

// CARTO light base map; names kept stable for existing imports.
export const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
export const DARK_TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
