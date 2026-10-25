// One mandi page per (state, mandi). Built by inverting the state's
// crop → mandi comparison file, so every price shown is a record the crop
// pages already show. Shared by the API, the page and the prerender.

export const MANDI_INDEX_MAX_AGE_DAYS = 30;
export const MANDI_INDEX_MIN_CROPS = 3;
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const slugify = value => String(value ?? '').toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function mandiPath(stateId, slug) {
  return `/mandi/${encodeURIComponent(stateId)}/${encodeURIComponent(slug)}`;
}

const positive = value => Number.isFinite(Number(value)) && Number(value) > 0;

/**
 * compare: { [cropId]: [{ name, district, recentPrice, minPrice, maxPrice, lastDate, ... }] }
 * crops:   [{ id, name, nameHi }]
 * Returns Map slug → { slug, name, district, crops: [...], latestDate }.
 * A name used in more than one district gets the district in its slug.
 */
export function buildMandiIndex(compare, crops = []) {
  const names = new Map((Array.isArray(crops) ? crops : []).map(crop => [crop.id, crop]));
  const districtsByName = new Map();
  for (const rows of Object.values(compare || {})) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const key = slugify(row?.name);
      if (!key) continue;
      if (!districtsByName.has(key)) districtsByName.set(key, new Set());
      districtsByName.get(key).add(slugify(row.district));
    }
  }
  const index = new Map();
  for (const [cropId, rows] of Object.entries(compare || {})) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const base = slugify(row?.name);
      if (!base) continue;
      const district = slugify(row.district);
      const slug = districtsByName.get(base).size > 1 && district ? `${base}-${district}` : base;
      if (!index.has(slug)) index.set(slug, { slug, name: row.name, district: row.district || null, crops: [], latestDate: null });
      const entry = index.get(slug);
      const price = positive(row.recentPrice) ? Number(row.recentPrice) : positive(row.avgPrice) ? Number(row.avgPrice) : null;
      if (price === null) continue;
      const crop = names.get(cropId) || {};
      entry.crops.push({
        id: cropId, name: crop.name || cropId, nameHi: crop.nameHi || crop.name || cropId,
        price, minPrice: positive(row.minPrice) ? Number(row.minPrice) : null, maxPrice: positive(row.maxPrice) ? Number(row.maxPrice) : null,
        rangeBasis: row.rangeBasis || null, lastDate: row.lastDate || null, records: Number(row.records) || 0,
        variety: row.topVariety || null, grade: row.grade || null,
      });
      if (row.lastDate && (!entry.latestDate || row.lastDate > entry.latestDate)) entry.latestDate = row.lastDate;
    }
  }
  index.slugFor = (name, district) => {
    const base = slugify(name);
    const slug = districtsByName.get(base)?.size > 1 && slugify(district) ? `${base}-${slugify(district)}` : base;
    return index.has(slug) ? slug : null;
  };
  for (const entry of index.values()) {
    entry.crops.sort((a, b) => String(b.lastDate || '').localeCompare(String(a.lastDate || '')) || b.records - a.records);
  }
  return index;
}

/** Summary rows for a state's mandi list (links), most-recorded first. */
export function mandiSummaries(index) {
  return [...index.values()].map(({ slug, name, district, crops, latestDate }) => ({
    slug, name, district, latestDate, cropCount: crops.length,
    records: crops.reduce((sum, crop) => sum + crop.records, 0),
    topCrops: crops.slice().sort((a, b) => b.records - a.records).slice(0, 3).map(crop => crop.nameHi),
  })).filter(row => row.cropCount > 0).sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));
}

/** Same policy for the sitemap, the initial HTML and the browser's robots tag. */
export function getMandiIndexability(mandi, { asOf = new Date() } = {}) {
  const clock = new Date(asOf);
  if (!mandi || !Array.isArray(mandi.crops) || !Number.isFinite(clock.getTime())) return { noIndex: true, latestDate: null, recentCrops: 0 };
  const today = new Date(clock.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - MANDI_INDEX_MAX_AGE_DAYS * DAY_MS).toISOString().slice(0, 10);
  const recent = mandi.crops.filter(crop => /^\d{4}-\d{2}-\d{2}$/.test(crop.lastDate || '') && crop.lastDate >= cutoff && crop.lastDate <= today);
  const latestDate = recent.map(crop => crop.lastDate).sort().at(-1) || null;
  return { noIndex: recent.length < MANDI_INDEX_MIN_CROPS, latestDate, recentCrops: recent.length };
}
