import { getOutlierBounds, isOutlier } from '../lib/outlier.js';
import { quoteDateISO } from './dataFreshness.js';
import { isCropPriceCommodity } from './cropEligibility.js';

export function getMandiPrice(mandi) {
  if (mandi?.comparisonIdentity === 'commodity-mandi-variety-grade-date-v1') {
    const quote = Number(mandi.quotePrice);
    return Number.isFinite(quote) && quote > 0 ? quote : null;
  }
  const recent = Number(mandi?.recentPrice);
  const average = Number(mandi?.avgPrice);
  return Number.isFinite(recent) && recent > 0 ? recent : Number.isFinite(average) && average > 0 ? average : null;
}

export function getMandiPriceBasis(mandi) {
  return Number(mandi?.recentPrice) > 0 ? 'recent' : 'historical';
}

export function getMandiQuoteDate(mandi) {
  return quoteDateISO(mandi?.quoteDate || mandi?.arrival_date || mandi?.date || mandi?.lastDate || mandi?.latestDate);
}

/** Recent prices first (highest first), then mandis known only from older records. */
export function sortMandiPrices(data = []) {
  const recentFirst = (a, b) => (getMandiPriceBasis(a) === 'recent' ? 0 : 1) - (getMandiPriceBasis(b) === 'recent' ? 0 : 1);
  return data.filter(m => getMandiPrice(m) !== null).slice().sort((a, b) => recentFirst(a, b) || getMandiPrice(b) - getMandiPrice(a));
}

// Above this ratio a "gap" is almost always a unit or data-entry difference, not a market.
export const MAX_PAIR_RATIO = 3;

/**
 * Pair only proven same-commodity, same-variety, same-grade, same-day quotes.
 * A historical majority label, unknown identity or mixed-period average is not
 * enough evidence for a like-for-like comparison or calculator prefill.
 */
export function getComparisonPair(data = [], { now = new Date(), commodityId } = {}) {
  const clock = new Date(now);
  if (!Number.isFinite(clock.getTime())) return null;
  const today = new Date(clock.getTime() + 330 * 60000).toISOString().slice(0, 10);
  const recentCutoff = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10);
  const groups = new Map();
  for (const mandi of sortMandiPrices(data)) {
    if (getMandiPriceBasis(mandi) !== 'recent') continue;
    if (mandi.comparisonIdentity !== 'commodity-mandi-variety-grade-date-v1' || mandi.priceBasis !== 'daily-modal' || mandi.unit !== 'INR/quintal') continue;
    if (!mandi.commodityId || (commodityId && mandi.commodityId !== commodityId)) continue;
    const variety = mandi.topVariety?.trim();
    const grade = mandi.grade?.trim();
    const unknown = value => !value || /^(?:other|others|unspecified|unknown|not specified|na|n\/a|-)$/i.test(value);
    if (unknown(variety) || unknown(grade) || !mandi.marketId) continue;
    const date = getMandiQuoteDate(mandi);
    if (!date || date < recentCutoff || date > today) continue;
    const key = JSON.stringify([mandi.commodityId, variety.toLowerCase(), grade.toLowerCase(), date, mandi.unit]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mandi);
  }
  const candidates = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const bounds = getOutlierBounds(group.map(getMandiPrice));
    const rows = group.filter(m => !isOutlier(getMandiPrice(m), bounds));
    if (rows.length < 2) continue;
    const high = rows[0];
    const low = [...rows].reverse().find(m => m.marketId !== high.marketId);
    if (!low) continue;
    const spread = getMandiPrice(high) - getMandiPrice(low);
    if (spread <= 0 || getMandiPrice(high) / getMandiPrice(low) > MAX_PAIR_RATIO) continue;
    candidates.push({ high, low, spread, count: rows.length, commodityId: high.commodityId, variety: high.topVariety, grade: high.grade, quoteDate: getMandiQuoteDate(high), basis: 'daily-modal', outliersExcluded: group.length - rows.length });
  }
  // Prefer the largest cohort so a rare pair doesn't dominate the comparison.
  return candidates.sort((a, b) => b.count - a.count || b.spread - a.spread)[0] || null;
}

/** Costs are required. A blank cost or loss is not zero. Rates are ₹ / quintal. */
export function calculateSaleScenario({ quantity, buyPrice, sellPrice, totalCosts, lossPercent }) {
  const raw = [quantity, buyPrice, sellPrice, totalCosts, lossPercent];
  if (raw.some(v => v === '' || v == null || (typeof v === 'string' && !v.trim()))) return null;
  const [qty, buy, sell, costs, loss] = raw.map(Number);
  if (![qty, buy, sell, costs, loss].every(Number.isFinite) || qty <= 0 || buy <= 0 || sell <= 0 || costs < 0 || loss < 0 || loss > 100) return null;
  const purchase = qty * buy;
  const saleQuantity = qty * (1 - loss / 100);
  const revenue = saleQuantity * sell;
  const investment = purchase + costs;
  if (![purchase, saleQuantity, revenue, investment].every(Number.isFinite)) return null;
  return { purchase, saleQuantity, revenue, investment, result: revenue - investment, returnPercent: ((revenue - investment) / investment) * 100 };
}

export function buildPriceGapCandidates(mandiData = {}, crops = [], options = {}) {
  const meta = new Map(crops.map(c => [c.id, c]));
  return Object.entries(mandiData).flatMap(([cropId, mandis]) => {
    if (!isCropPriceCommodity(cropId)) return [];
    const pair = getComparisonPair(Array.isArray(mandis) ? mandis : [], { ...options, commodityId: cropId });
    if (!pair || pair.spread < 300) return [];
    const crop = meta.get(cropId);
    return [{
      cropId, cropName: crop?.nameHi || crop?.name || cropId, cropEmoji: crop?.emoji || '🌱',
      topVariety: pair.variety, grade: pair.grade, quoteDate: pair.quoteDate, priceBasis: pair.basis,
      buyMandi: pair.low.name, buyState: pair.low.stateCode, buyPrice: getMandiPrice(pair.low),
      sellMandi: pair.high.name, sellState: pair.high.stateCode, sellPrice: getMandiPrice(pair.high),
      spread: pair.spread, mandiCount: pair.count, totalMandis: mandis.length,
      interState: Boolean(pair.low.stateCode && pair.high.stateCode && pair.low.stateCode !== pair.high.stateCode),
      distance: null, costPerQ: null, netProfit: null, totalProfit: null, investment: null, roi: null,
      comparisonOnly: true, distanceBasis: 'unavailable',
    }];
  }).sort((a, b) => b.spread - a.spread).slice(0, 30);
}
