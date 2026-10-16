import { findDistrictRecord, getMandiDistrictName, placeKey } from './mapData.js';

/** CG has IDs; national records retain the original source market name. */
export function getMapMandiKey(mandi) {
  if (mandi?.id != null) return `id:${mandi.id}`;
  if (typeof mandi?.originalName === 'string' && mandi.originalName.trim()) return `source:${mandi.originalName}`;
  return typeof mandi?.name === 'string' && mandi.name.trim() ? `name:${mandi.name}` : '';
}

/** URL values are identifiers, never display text or evidence of availability. */
export function resolveMapSelection(search, { districts = [], mandis = [], crops = [] } = {}) {
  const params = new URLSearchParams(search);
  const district = findDistrictRecord(params.get('mapDistrict'), districts);
  const matchingMandis = district ? mandis.filter(mandi => {
    const mandiDistrict = findDistrictRecord(getMandiDistrictName(mandi), districts);
    return getMapMandiKey(mandi) === params.get('mapMandi') && mandiDistrict === district;
  }) : [];
  const cropMatches = crops.filter(crop => crop.id === params.get('mapCrop') && crop.totalRecords > 0);
  return {
    district,
    mandi: matchingMandis.length === 1 ? matchingMandis[0] : null,
    crop: cropMatches.length === 1 ? cropMatches[0] : null,
  };
}

/** Clear dependent selections when their parent changes. Keep unrelated tabs intact. */
export function updateMapSearch(search, changes) {
  const params = new URLSearchParams(search);
  const allowed = ['mapDistrict', 'mapMandi', 'mapCrop', 'mapList', 'mapView'];
  if (Object.hasOwn(changes, 'mapDistrict') && placeKey(changes.mapDistrict) !== placeKey(params.get('mapDistrict'))) params.delete('mapMandi');
  for (const key of allowed) {
    if (!Object.hasOwn(changes, key)) continue;
    const value = changes[key];
    if (value == null || value === '') params.delete(key);
    else params.set(key, String(value));
  }
  return params;
}
