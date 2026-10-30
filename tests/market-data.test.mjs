import test from 'node:test';
import assert from 'node:assert/strict';
import { getDataFreshness, getLatestQuoteDate, quoteDateISO } from '../src/utils/dataFreshness.js';
import { buildPriceGapCandidates, calculateSaleScenario, getComparisonPair, getMandiPrice, sortMandiPrices } from '../src/utils/marketComparison.js';

const now = new Date('2026-10-13T02:00:00Z');
const row = (name, recentPrice, extra = {}) => ({ name, recentPrice, quotePrice: recentPrice, topVariety: 'FAQ', grade: 'A', stateCode: 'CG', district: 'Raipur', marketId: `CG|Raipur|${name}`, comparisonIdentity: 'commodity-mandi-variety-grade-date-v1', commodityId: 'wheat', unit: 'INR/quintal', priceBasis: 'daily-modal', quoteDate: '2026-10-13', ...extra });

test('stale, future, invalid and missing dates are never marked current', () => {
  assert.equal(getDataFreshness('2026-07-19', now).status, 'stale');
  assert.equal(getDataFreshness('2026-07-19', now).ageDays, 86);
  assert.equal(getDataFreshness('2026-10-14', now).status, 'future');
  for (const value of [null, '2026-10', '2026-02-30', 'bad']) assert.equal(getDataFreshness(value, now).status, 'unknown');
});
test('calendar freshness changes at Indian midnight, including timestamps', () => {
  assert.equal(getDataFreshness('2026-10-13', new Date('2026-10-12T18:29:00Z')).status, 'future');
  assert.equal(getDataFreshness('2026-10-13', new Date('2026-10-12T18:30:00Z')).status, 'current');
  assert.equal(quoteDateISO('2026-10-12T19:00:00Z'), '2026-10-13');
});
test('latest quote selection tolerates unsorted and malformed history', () => {
  assert.equal(getLatestQuoteDate([{ date: 'bad' }, { date: '2026-10-13' }, { date: '2026-10-01' }]), '2026-10-13');
  assert.equal(getLatestQuoteDate([]), null);
});
test('invalid prices are excluded and data is sorted without mutation', () => {
  const input = [row('B', 2000), row('A', 4000), row('invalid', -1)];
  assert.deepEqual(sortMandiPrices(input).map(x => x.name), ['A', 'B']);
  assert.equal(input[0].name, 'B');
  assert.equal(getMandiPrice({ recentPrice: null, avgPrice: 2000 }), 2000);
  assert.equal(getMandiPrice({ recentPrice: NaN }), null);
});
test('comparison does not mix grades, price windows, known dates or varieties', () => {
  const low = row('Low', 2000, { quoteDate: '2026-10-13' });
  for (const extra of [{ grade: 'B' }, { topVariety: 'Other' }, { quoteDate: '2026-10-12' }, { recentPrice: null, avgPrice: 4000 }]) {
    assert.equal(getComparisonPair([low, row('High', 4000, { quoteDate: '2026-10-13', ...extra })], { now }), null);
  }
});
test('undated records are inspectable but never offered as automatic calculator pairs', () => {
  const result = buildPriceGapCandidates({ wheat: [row('Low', 2000, { quoteDate: null }), row('High', 4000, { quoteDate: null })] }, [{ id: 'wheat', nameHi: 'गेहूँ' }], { now });
  assert.deepEqual(result, []);
});
test('dated comparisons never invent distance, costs or ROI', () => {
  const result = buildPriceGapCandidates({ wheat: [row('Low', 2000), row('High', 4000)] }, [{ id: 'wheat', nameHi: 'गेहूँ' }], { now });
  assert.equal(result.length, 1);
  assert.equal(result[0].spread, 2000);
  assert.equal(result[0].quoteDate, '2026-10-13');
  assert.equal(result[0].priceBasis, 'daily-modal');
  for (const key of ['distance', 'costPerQ', 'roi', 'netProfit']) assert.equal(result[0][key], null);
  assert.equal(result[0].comparisonOnly, true);
});
test('same mandi observations are not shown as a trading route', () => {
  assert.equal(getComparisonPair([row('Same', 2000), row('Same', 4000)], { now }), null);
});
test('outlier is excluded without falling back to an implausible candidate', () => {
  const pair = getComparisonPair([row('A', 2000), row('B', 2100), row('C', 2150), row('D', 2200), row('E', 99999)], { now });
  assert.equal(pair.high.name, 'D');
  assert.equal(pair.outliersExcluded, 1);
});
test('unknown expenses and loss block calculation, explicit zero is accepted', () => {
  const input = { quantity: 10, buyPrice: 2000, sellPrice: 2500, totalCosts: '', lossPercent: 0 };
  assert.equal(calculateSaleScenario(input), null);
  assert.equal(calculateSaleScenario({ ...input, totalCosts: 0, lossPercent: '' }), null);
  assert.equal(calculateSaleScenario({ ...input, totalCosts: 0 }).result, 5000);
});
test('sale calculation includes total costs and reduces sellable quantity for loss', () => {
  const result = calculateSaleScenario({ quantity: 10, buyPrice: 2000, sellPrice: 2500, totalCosts: 3000, lossPercent: 10 });
  assert.equal(result.saleQuantity, 9);
  assert.equal(result.revenue, 22500);
  assert.equal(result.investment, 23000);
  assert.equal(result.result, -500);
  assert.ok(result.returnPercent < 0);
});
test('invalid scenarios do not produce misleading finite amounts', () => {
  const input = { quantity: 10, buyPrice: 2000, sellPrice: 2500, totalCosts: 0, lossPercent: 0 };
  for (const change of [{ quantity: 0 }, { quantity: -1 }, { totalCosts: -1 }, { lossPercent: 101 }, { sellPrice: Infinity }, { buyPrice: 'bad' }]) assert.equal(calculateSaleScenario({ ...input, ...change }), null);
});
