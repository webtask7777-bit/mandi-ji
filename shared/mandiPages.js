// One mandi page per (state, mandi). Built by inverting the state's
// crop → mandi comparison file, so every price shown is a record the crop
// pages already show. Shared by the API, the page and the prerender.
import { isCropPriceCommodity } from '../src/utils/cropEligibility.js';
import { indexDeadline } from './seoLifecycle.js';

export const MANDI_INDEX_MAX_AGE_DAYS = 30;
// Mandis with fewer recent crops make thin pages that Google crawls but does not index.
export const MANDI_INDEX_MIN_CROPS = 5;
// A market people search for its paddy or soybean is useful with fewer crops.
export const MANDI_INDEX_MIN_CROPS_KEY_CROP = 3;
const KEY_CROP = /^(?:paddy|soya)/;
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
    // Livestock, fish, eggs and ghee have no crop page and no confirmed ₹/quintal unit.
    if (!isCropPriceCommodity(cropId)) continue;
    for (const row of Array.isArray(rows) ? rows : []) {
      const base = slugify(row?.name);
      if (!base) continue;
      const district = slugify(row.district);
      const slug = districtsByName.get(base).size > 1 && district ? `${base}-${district}` : base;
      if (!index.has(slug)) index.set(slug, { slug, name: row.name, district: row.district || null, crops: [], latestDate: null });
      const entry = index.get(slug);
      const exactQuote = row.comparisonIdentity === 'commodity-mandi-variety-grade-date-v1';
      const price = exactQuote ? (positive(row.quotePrice) ? Number(row.quotePrice) : null) : positive(row.recentPrice) ? Number(row.recentPrice) : positive(row.avgPrice) ? Number(row.avgPrice) : null;
      if (price === null) continue;
      const crop = names.get(cropId) || {};
      entry.crops.push({
        id: cropId, name: crop.name || cropId, nameHi: crop.nameHi || crop.name || cropId,
        quoteId: JSON.stringify([cropId, row.marketId || slug, row.topVariety || '', row.grade || '', row.quoteDate || row.lastDate || '']),
        price, minPrice: positive(row.minPrice) ? Number(row.minPrice) : null, maxPrice: positive(row.maxPrice) ? Number(row.maxPrice) : null,
        rangeBasis: row.rangeBasis || null, lastDate: row.quoteDate || row.lastDate || null, records: Number(row.records) || 0,
        priceBasis: row.priceBasis || null, quoteRecords: Number(row.quoteRecords) || null,
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
export function mandiSummaries(index, { asOf = new Date() } = {}) {
  return [...index.values()].map(mandi => ({ mandi, indexable: !getMandiIndexability(mandi, { asOf }).noIndex })).map(({ mandi: { slug, name, district, crops, latestDate }, indexable }) => ({
    slug, name, district, latestDate, cropCount: new Set(crops.map(crop => crop.id)).size, indexable,
    records: crops.reduce((sum, crop) => sum + crop.records, 0),
    topCrops: [...new Map(crops.slice().sort((a, b) => b.records - a.records).map(crop => [crop.id, crop.nameHi])).values()].slice(0, 3),
  })).filter(row => row.cropCount > 0).sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));
}

/** A crop row counts as current when its own record date is within the last 30 days. */
export function isRecentMandiCrop(crop, asOf = new Date()) {
  const clock = new Date(asOf);
  if (!Number.isFinite(clock.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(crop?.lastDate || '')) return false;
  const today = new Date(clock.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - MANDI_INDEX_MAX_AGE_DAYS * DAY_MS).toISOString().slice(0, 10);
  return crop.lastDate >= cutoff && crop.lastDate <= today;
}

/** Newest recent date per crop, newest first, and the newest paddy or soybean date. */
function recentCropDates(mandi, asOf) {
  const newest = new Map();
  for (const crop of mandi.crops.filter(crop => isRecentMandiCrop(crop, asOf))) {
    if (crop.lastDate > (newest.get(crop.id) || '')) newest.set(crop.id, crop.lastDate);
  }
  const keyCropDate = [...newest].filter(([id]) => KEY_CROP.test(id)).map(([, date]) => date).sort().at(-1) || null;
  return { dates: [...newest.values()].sort().reverse(), keyCropDate };
}

/** The record whose 30-day window decides when an indexable mandi stops qualifying. */
export function mandiIndexAnchorDate(mandi, { asOf = new Date() } = {}) {
  const { dates, keyCropDate } = recentCropDates(mandi, asOf);
  const full = dates[MANDI_INDEX_MIN_CROPS - 1] || null;
  const third = dates[MANDI_INDEX_MIN_CROPS_KEY_CROP - 1];
  const keyed = keyCropDate && third ? (keyCropDate < third ? keyCropDate : third) : null;
  return [full, keyed].filter(Boolean).sort().at(-1) || null;
}

/**
 * Why a mandi page is or is not offered to search. One decision for the sitemap, the
 * X-Robots-Tag header (via the runtime manifest), the initial HTML and the browser's robots tag.
 *
 * - established-market: several crops with records in the last 30 days (the original rule).
 * - useful-local-market: a small market (often one or two crops, e.g. Muli in Bastar or
 *   Katghora in Korba) whose page is still the only place that answers "<mandi> mandi bhav":
 *   a dated price from the last 30 days plus at least one more crop-day (another crop, or the
 *   same crop on another date) from the last 90 days, so the page shows a real record and some context, each labelled with its own date.
 * - single-quote: one recent number and nothing else to compare it with; kept out of search.
 * - no-recent-record: every record is older than 30 days; the page stays as labelled history.
 * - no-priced-records / invalid: nothing to show.
 */
export const MANDI_INDEX_REASONS = Object.freeze({
  ESTABLISHED: 'established-market',
  USEFUL_LOCAL: 'useful-local-market',
  SINGLE_QUOTE: 'single-quote',
  NO_RECENT: 'no-recent-record',
  NO_PRICES: 'no-priced-records',
  INVALID: 'invalid',
});
// The context window for a small market: older quotes still on the page, clearly dated.
export const MANDI_CONTEXT_MAX_AGE_DAYS = 90;
export const MANDI_INDEX_MIN_CONTEXT_QUOTES = 2;

function istToday(asOf) {
  return new Date(new Date(asOf).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
const daysBefore = (day, days) => new Date(Date.parse(`${day}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);

/**
 * Distinct crop-days on or before today, newest first. Several variety or grade quotes of one
 * crop on one day are one observation, so they never stand in for a second record.
 */
function datedQuotes(mandi, asOf) {
  const today = istToday(asOf);
  const seen = new Set();
  const dates = [];
  for (const crop of mandi.crops) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(crop?.lastDate || '') || crop.lastDate > today) continue;
    const key = JSON.stringify([crop.id, crop.lastDate]);
    if (seen.has(key)) continue;
    seen.add(key);
    dates.push(crop.lastDate);
  }
  return dates.sort().reverse();
}

function establishedMarket(mandi, asOf) {
  const { dates, keyCropDate } = recentCropDates(mandi, asOf);
  const minimum = keyCropDate ? MANDI_INDEX_MIN_CROPS_KEY_CROP : MANDI_INDEX_MIN_CROPS;
  return { dates, met: dates.length >= minimum };
}

function usefulLocalMarket(mandi, asOf) {
  const today = istToday(asOf);
  const quotes = datedQuotes(mandi, asOf);
  const recent = quotes[0] && quotes[0] >= daysBefore(today, MANDI_INDEX_MAX_AGE_DAYS) ? quotes[0] : null;
  const context = quotes[MANDI_INDEX_MIN_CONTEXT_QUOTES - 1];
  const contextOk = Boolean(context && context >= daysBefore(today, MANDI_CONTEXT_MAX_AGE_DAYS));
  return { recent, context: context || null, met: Boolean(recent && contextOk) };
}

/** Same policy for the sitemap, the initial HTML and the browser's robots tag. */
export function getMandiIndexability(mandi, { asOf = new Date() } = {}) {
  if (!mandi || !Array.isArray(mandi.crops) || !Number.isFinite(new Date(asOf).getTime())) {
    return { noIndex: true, reason: MANDI_INDEX_REASONS.INVALID, latestDate: null, recentCrops: 0 };
  }
  const established = establishedMarket(mandi, asOf);
  const recentCrops = established.dates.length;
  const latestDate = established.dates[0] || null;
  if (established.met) return { noIndex: false, reason: MANDI_INDEX_REASONS.ESTABLISHED, latestDate, recentCrops };
  const local = usefulLocalMarket(mandi, asOf);
  if (local.met) return { noIndex: false, reason: MANDI_INDEX_REASONS.USEFUL_LOCAL, latestDate, recentCrops };
  const reason = !mandi.crops.length ? MANDI_INDEX_REASONS.NO_PRICES
    : !recentCrops ? MANDI_INDEX_REASONS.NO_RECENT : MANDI_INDEX_REASONS.SINGLE_QUOTE;
  return { noIndex: true, reason, latestDate, recentCrops };
}

/**
 * When an indexable mandi page stops qualifying if no new record arrives (ms timestamp, IST
 * midnight), or 0 when it does not qualify now. The runtime proxy uses this so an old page
 * turns noindex on time without a rebuild.
 */
export function mandiIndexDeadline(mandi, { asOf = new Date() } = {}) {
  if (getMandiIndexability(mandi, { asOf }).noIndex) return 0;
  const established = indexDeadline(mandiIndexAnchorDate(mandi, { asOf }), MANDI_INDEX_MAX_AGE_DAYS);
  const local = usefulLocalMarket(mandi, asOf);
  const localDeadline = local.met
    ? Math.min(indexDeadline(local.recent, MANDI_INDEX_MAX_AGE_DAYS), indexDeadline(local.context, MANDI_CONTEXT_MAX_AGE_DAYS))
    : 0;
  return Math.max(established, localDeadline);
}
