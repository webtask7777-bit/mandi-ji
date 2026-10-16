import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { newBucket, addPrice, bucketPrice, unitMismatchedSeries } = require('../scripts/lib/robust-price.cjs');

test('a state filing many rows per mandi counts once per mandi', () => {
  const b = newBucket();
  // One Tamil Nadu market with 20 variety rows at ₹3,800 vs four other mandis near ₹1,100.
  for (let i = 0; i < 20; i++) addPrice(b, 'TN|Chennai|Koyambedu', 3800, '2026-10-16');
  for (const [k, p] of [['UP|Agra|Agra', 1000], ['PB|Patti|Patti', 1100], ['HR|Karnal|Karnal', 1150], ['MH|Pune|Pune', 1200]]) addPrice(b, k, p, '2026-10-16');
  assert.equal(bucketPrice(b), 1150);
  assert.equal(b.days.size, 1);
});

test('empty buckets and buckets without mandi keys are safe', () => {
  assert.equal(bucketPrice(newBucket()), 0);
  assert.equal(bucketPrice({ prices: [10, 20] }), 15);
  assert.equal(bucketPrice(undefined), 0);
});

test('series reported per bunch or per 1000 nuts are flagged, normal ones are not', () => {
  const rows = [];
  const add = (market, price, n = 8) => { for (let i = 0; i < n; i++) rows.push({ commodity: 'Methi(Leaves)', market, modal_price: price }); };
  for (const [m, p] of [['A', 4500], ['B', 4800], ['C', 5000], ['D', 4200], ['E', 5200]]) add(m, p);
  add('Pune bunch', 12);
  add('Premium', 9000);
  const excluded = unitMismatchedSeries(rows, { seriesKey: r => r.market, commodityKey: r => r.commodity });
  assert.deepEqual([...excluded], ['Pune bunch']);
});

test('small commodities are not judged', () => {
  const rows = [{ commodity: 'x', market: 'a', modal_price: 1000 }, { commodity: 'x', market: 'b', modal_price: 5 }];
  assert.equal(unitMismatchedSeries(rows, { seriesKey: r => r.market, commodityKey: r => r.commodity }).size, 0);
});
