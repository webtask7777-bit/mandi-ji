const { arrivalToISO, MIN_PLAUSIBLE_PRICE } = require('./daily-store.cjs');

const COMPARISON_IDENTITY = 'commodity-mandi-variety-grade-date-v1';
const text = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const identity = value => text(value).toLocaleLowerCase('en');

/** Seven calendar dates including the newest observed date. */
function recentDateCutoff(newest, days = 7) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newest || '') || !Number.isInteger(days) || days < 1) return null;
  const timestamp = Date.parse(`${newest}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== newest) return null;
  return new Date(timestamp - (days - 1) * 86400000).toISOString().slice(0, 10);
}

/**
 * Each public row is the latest observed day for ONE commodity, market, variety
 * and grade. Do not label a mixed-history average with its most-common variety.
 * If synonymous market spellings yield more than one observation on that exact
 * day, their modal-price mean remains explicitly scoped to that same identity.
 */
function buildMandiComparison(records, { recentCutoff, cropIdOf, marketIdOf, marketNameOf, stateInfoOf = () => ({}), include = () => true }) {
  const groups = new Map();
  for (const record of records) {
    if (!include(record)) continue;
    const price = Number(record.modal_price);
    const date = arrivalToISO(record.arrival_date);
    const commodityId = cropIdOf(record);
    const marketId = marketIdOf(record);
    if (!date || !commodityId || !marketId || !Number.isFinite(price) || price < MIN_PLAUSIBLE_PRICE) continue;
    const variety = text(record.variety);
    const grade = text(record.grade);
    const key = JSON.stringify([commodityId, marketId, identity(variety), identity(grade)]);
    let group = groups.get(key);
    if (!group) {
      group = { commodityId, marketId, name: marketNameOf(record), district: record.district, ...stateInfoOf(record), topVariety: variety || null, grade: grade || null, date, total: 0, count: 0, min: Infinity, max: -Infinity, totalRecords: 0 };
      groups.set(key, group);
    }
    group.totalRecords++;
    if (date < group.date) continue;
    if (date > group.date) Object.assign(group, { date, total: 0, count: 0, min: Infinity, max: -Infinity });
    group.total += price;
    group.count++;
    const sourceMin = Number(record.min_price);
    const sourceMax = Number(record.max_price);
    group.min = Math.min(group.min, Number.isFinite(sourceMin) && sourceMin >= MIN_PLAUSIBLE_PRICE ? sourceMin : price);
    group.max = Math.max(group.max, Number.isFinite(sourceMax) && sourceMax >= MIN_PLAUSIBLE_PRICE ? sourceMax : price);
  }
  const result = {};
  for (const group of groups.values()) {
    const { date, total, count, min, max, ...metadata } = group;
    const quotePrice = Math.round(total / count);
    const recent = Boolean(recentCutoff && date >= recentCutoff);
    const row = {
      ...metadata, comparisonIdentity: COMPARISON_IDENTITY, unit: 'INR/quintal',
      quoteDate: date, lastDate: date, quotePrice, quoteRecords: count, records: count,
      priceBasis: 'daily-modal', recentPrice: recent ? quotePrice : null,
      // Retained for older display clients, always the exact dated quote above.
      avgPrice: quotePrice, minPrice: min, maxPrice: max, rangeBasis: recent ? 'recent' : 'historical',
    };
    if (!result[group.commodityId]) result[group.commodityId] = [];
    result[group.commodityId].push(row);
  }
  for (const rows of Object.values(result)) rows.sort((a, b) => (b.recentPrice != null) - (a.recentPrice != null) || b.quotePrice - a.quotePrice || a.marketId.localeCompare(b.marketId));
  return result;
}

module.exports = { COMPARISON_IDENTITY, recentDateCutoff, buildMandiComparison };
