/** Preserve source names; never stringify a district object into UI text. */
export function getDistrictName(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  for (const key of ['name', 'nameHi']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  return '';
}

export function getMandiDistrictName(mandi) {
  return getDistrictName(mandi?.district) || getDistrictName(mandi?.districtName);
}

/** Typography only. No substring, phonetic, transliteration or edit-distance match. */
export function placeKey(value) {
  return getDistrictName(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '');
}

export const normalizeDistrictName = placeKey;

// Reviewed labels in public/geo/districts/chhattisgarh.json and the existing
// src/data/cg-districts.js / server/db/data/districts.json catalogs. The latter
// pair also shares district IDs and Hindi names for these spelling variants.
// These resolve a source name, not current administrative boundary equivalence.
// Newly split districts must remain unmatched; never map them to a parent.
const DISTRICT_ALIASES = [
  ['Bametara', 'Bemetra', 'Bemetara'],
  ['Kabeerdham', 'Kabirdham'],
  ['Koriya', 'Korea'],
  ['Uttar Bastar Kanker', 'Kanker'],
  ['Dakshin Bastar Dantewada', 'Dantewada'],
].map(names => new Set(names.map(placeKey)));

function districtKeys(district) {
  if (!district || typeof district !== 'object' || Array.isArray(district)) return [];
  return [district.name, district.nameHi].map(placeKey).filter(Boolean);
}

/** Return one source record or null. Missing/ambiguous evidence is never zero. */
export function findDistrictRecord(geoName, districts) {
  const key = placeKey(geoName);
  if (!key || !Array.isArray(districts)) return null;
  const exact = districts.filter(district => districtKeys(district).includes(key));
  if (exact.length) return exact.length === 1 ? exact[0] : null;

  const aliases = DISTRICT_ALIASES.find(group => group.has(key));
  if (!aliases) return null;
  const matches = districts.filter(district => districtKeys(district).some(name => aliases.has(name)));
  return matches.length === 1 ? matches[0] : null;
}

/** Search both supplied languages and the source identifier without inventing names. */
export function districtSearchText(district) {
  if (!district || typeof district !== 'object' || Array.isArray(district)) return '';
  return [district.name, district.nameHi, district.id]
    .filter(value => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))
    .join(' ').normalize('NFKC').toLowerCase();
}
