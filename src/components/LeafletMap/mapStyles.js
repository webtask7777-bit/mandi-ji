import { HEAT_SCALE, NO_DATA_COLOR, SELECTED_COLOR, BORDER_COLOR } from './mapConstants.js';

function getHeatBucket(value, maxValue) {
  if (!value || !maxValue) return -1;
  return Math.min(4, Math.floor(value / maxValue * 5));
}

// Normalize typography only: never collapse a crop into its processed product,
// seed, leaf, or a similar name. Slugs and their exact source names can match.
export function normalizeCropIdentity(value) {
  return typeof value === 'string' ? value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '') : '';
}

export function districtCropMatch(info, selectedCrop) {
  const selected = normalizeCropIdentity(selectedCrop);
  if (!selected || !Array.isArray(info?.topCrops)) return 'unknown';
  return info.topCrops.some(crop => [crop.id, crop.cropId, crop.name].some(value => normalizeCropIdentity(value) === selected)) ? 'matched' : 'unknown';
}

const unknownCropStyle = selected => ({
  fillColor: NO_DATA_COLOR,
  fillOpacity: 0.5,
  weight: selected ? 2 : 0.8,
  color: selected ? SELECTED_COLOR : BORDER_COLOR,
  dashArray: '4 3',
});

export function stateStyle(feature, { stateDataMap, maxRecords, selectedState, selectedCrop, cropMatrix }) {
  const stateId = feature.properties.stateId;
  const info = stateDataMap?.[stateId];
  const isSelected = selectedState === stateId;
  // The matrix proves reported presence only. Missing evidence stays unknown.
  if (selectedCrop && !cropMatrix?.[selectedCrop]?.states?.includes(stateId)) return unknownCropStyle(isSelected);
  if (isSelected) return { fillColor: SELECTED_COLOR, fillOpacity: 0.6, weight: 2.5, color: SELECTED_COLOR, dashArray: null };
  const bucket = info ? getHeatBucket(info.totalRecords, maxRecords) : -1;
  return {
    fillColor: bucket >= 0 ? HEAT_SCALE[bucket] : NO_DATA_COLOR,
    fillOpacity: 0.75,
    weight: selectedCrop ? 2 : 0.8,
    color: selectedCrop ? SELECTED_COLOR : BORDER_COLOR,
    dashArray: null,
  };
}

export function districtStyle(feature, { districtMap, maxDistRecords, selectedCrop, hoveredDistrict }) {
  const distName = feature.properties.districtName;
  const info = districtMap?.[distName];
  const isHovered = hoveredDistrict === distName;
  // topCrops is not a complete district inventory; no match cannot mean absence.
  if (selectedCrop && districtCropMatch(info, selectedCrop) !== 'matched') return unknownCropStyle(isHovered);
  const bucket = info ? getHeatBucket(info.totalRecords, maxDistRecords) : -1;
  return {
    fillColor: bucket >= 0 ? HEAT_SCALE[bucket] : NO_DATA_COLOR,
    fillOpacity: isHovered ? 0.9 : 0.75,
    weight: isHovered || selectedCrop ? 2 : 0.8,
    color: isHovered || selectedCrop ? SELECTED_COLOR : BORDER_COLOR,
    dashArray: null,
  };
}

export const HOVER_STYLE = { weight: 2, color: '#597a64', fillOpacity: 0.85 };
