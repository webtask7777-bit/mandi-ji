import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { getComparisonPair, getMandiPrice } from '../src/utils/marketComparison.js';

const require = createRequire(import.meta.url);
const { buildMandiComparison, recentDateCutoff } = require('../scripts/lib/mandi-comparison.cjs');
const base = { state: 'Karnataka', district: 'Bidar', market: 'Basava Kalayana APMC', commodity: 'Wheat', grade: 'FAQ' };
const quote = (date, variety, price, extra = {}) => ({ ...base, arrival_date: date, variety, modal_price: price, ...extra });
const options = {
  recentCutoff: recentDateCutoff('2026-10-29'),
  cropIdOf: row => row.commodity.toLowerCase(),
  marketIdOf: row => `${row.state}|${row.district}|${row.market}`,
  marketNameOf: row => row.market,
};
const now = new Date('2026-10-30T10:00:00Z');

test('Basava Kalayana regression: Mexican and Mill Quality prices never become a labelled mixed mean', () => {
  // Actual stored source observations from 24 and 29 October 2026.
  const result = buildMandiComparison([
    quote('24/10/2026', 'Mexican', 3400), quote('24/10/2026', 'Mill Quality', 5200),
    quote('29/10/2026', 'Mexican', 4000), quote('29/10/2026', 'Mill Quality', 5550),
  ], options).wheat;
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(row => [row.topVariety, row.quotePrice, row.quoteDate]), [
    ['Mill Quality', 5550, '2026-10-29'], ['Mexican', 4000, '2026-10-29'],
  ]);
  assert.ok(result.every(row => row.quoteRecords === 1 && row.totalRecords === 2 && row.grade === 'FAQ'));
  assert.ok(result.every(row => getMandiPrice(row) !== 4538));
  assert.equal(getComparisonPair(result, { now }), null, 'two varieties at the same mandi are not a trading route');
});

test('quote date and grade stay attached to their actual observations, independent of input order', () => {
  const source = [quote('29/10/2026', 'Mexican', 4000), quote('24/10/2026', 'Mexican', 3400), quote('29/10/2026', 'Mexican', 5000, { grade: 'A' })];
  const rows = buildMandiComparison(source, options).wheat;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => [row.grade, row.quotePrice, row.quoteDate]), [['A', 5000, '2026-10-29'], ['FAQ', 4000, '2026-10-29']]);
  assert.deepEqual(buildMandiComparison(source.slice().reverse(), options).wheat, rows);
});

test('seven-day window includes newest day and six previous dates, not eight dates', () => {
  assert.equal(recentDateCutoff('2026-10-29'), '2026-10-23');
  assert.equal(recentDateCutoff('2026-03-02'), '2026-02-24');
  const rows = buildMandiComparison([
    quote('22/10/2026', 'Mexican', 3400, { market: 'Old' }),
    quote('23/10/2026', 'Mexican', 3500, { market: 'Included' }),
  ], options).wheat;
  assert.equal(rows.find(row => row.name === 'Old').recentPrice, null);
  assert.equal(rows.find(row => row.name === 'Old').quotePrice, 3400, 'older actual quote remains inspectable');
  assert.equal(rows.find(row => row.name === 'Included').recentPrice, 3500);
});

test('calculator pair uses matching commodity, known variety, grade, unit and exact day from different mandis', () => {
  const rows = buildMandiComparison([
    quote('29/10/2026', 'Mexican', 4000),
    quote('29/10/2026', 'Mexican', 3000, { market: 'Second mandi' }),
    quote('29/10/2026', 'Mill Quality', 5550),
  ], options).wheat;
  const pair = getComparisonPair(rows, { now, commodityId: 'wheat' });
  assert.equal(pair.spread, 1000);
  assert.equal(pair.basis, 'daily-modal');
  assert.equal(pair.quoteDate, '2026-10-29');
  assert.equal(pair.variety, 'Mexican');
  assert.equal(pair.grade, 'FAQ');
  assert.equal(getMandiPrice(pair.low), 3000);
  assert.equal(getMandiPrice(pair.high), 4000);
  for (const change of [
    { quoteDate: '2026-10-28' }, { commodityId: 'rice' }, { grade: null }, { grade: 'A' },
    { topVariety: 'Other' }, { unit: 'INR/kg' }, { comparisonIdentity: undefined },
    { quoteDate: null, lastDate: null }, { priceBasis: 'recent' },
  ]) assert.equal(getComparisonPair([pair.low, { ...pair.high, ...change }], { now }), null, JSON.stringify(change));
  assert.equal(getComparisonPair(rows, { now: new Date('2026-11-06T10:00:00Z') }), null, 'a frozen dataset cannot keep offering stale comparisons');
  assert.equal(getComparisonPair(rows, { now: new Date('2026-10-28T10:00:00Z') }), null, 'future records are never paired');
});
