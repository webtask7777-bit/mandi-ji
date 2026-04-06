import { HEAT_SCALE, NO_DATA_COLOR, SELECTED_COLOR, BORDER_COLOR } from './mapConstants';

/**
 * Get heat bucket (0-4) based on value relative to max
 */
function getHeatBucket(value, maxValue) {
  if (!value || !maxValue) return -1;
  const ratio = value / maxValue;
  return Math.min(4, Math.floor(ratio * 5));
}

/**
 * Style function for India state boundaries
 */
export function stateStyle(feature, { stateDataMap, maxRecords, selectedState, selectedCrop, cropMatrix }) {
  const stateId = feature.properties.stateId;
  const info = stateDataMap?.[stateId];
  const isSelected = selectedState === stateId;

  // Crop filter: gray out states without selected crop
  if (selectedCrop && cropMatrix?.[selectedCrop]) {
    const hasC = cropMatrix[selectedCrop].states?.includes(stateId);
    if (!hasC) {
      return {
        fillColor: '#0a0a0a',
        fillOpacity: 0.4,
        weight: 0.3,
        color: '#1c1c1e',
      };
    }
  }

  if (isSelected) {
    return {
      fillColor: SELECTED_COLOR,
      fillOpacity: 0.6,
      weight: 2.5,
      color: '#4ade80',
    };
  }

  const bucket = info ? getHeatBucket(info.totalRecords, maxRecords) : -1;
  return {
    fillColor: bucket >= 0 ? HEAT_SCALE[bucket] : NO_DATA_COLOR,
    fillOpacity: 0.75,
    weight: 0.8,
    color: BORDER_COLOR,
  };
}

/**
 * Style function for district boundaries within a state
 */
export function districtStyle(feature, { districtMap, maxDistRecords, selectedCrop, hoveredDistrict }) {
  const distName = feature.properties.districtName;
  const info = districtMap?.[distName];
  const isHovered = hoveredDistrict === distName;

  // Crop filter: gray out districts without crop
  if (selectedCrop && info?.topCrops) {
    const hasCrop = info.topCrops.some(c =>
      c.name?.toLowerCase().includes(selectedCrop) || selectedCrop.includes(c.name?.toLowerCase())
    );
    if (!hasCrop && info.topCrops.length > 0) {
      return {
        fillColor: '#0a0a0a',
        fillOpacity: 0.4,
        weight: 0.5,
        color: '#1c1c1e',
      };
    }
  }

  const bucket = info ? getHeatBucket(info.totalRecords, maxDistRecords) : -1;
  return {
    fillColor: bucket >= 0 ? HEAT_SCALE[bucket] : NO_DATA_COLOR,
    fillOpacity: isHovered ? 0.9 : 0.75,
    weight: isHovered ? 2 : 0.8,
    color: isHovered ? '#71717a' : BORDER_COLOR,
  };
}

/**
 * Hover style highlight
 */
export const HOVER_STYLE = {
  weight: 2,
  color: '#71717a',
  fillOpacity: 0.85,
};
