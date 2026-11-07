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

test('every built ticker (all-India and each state) carries the robust price basis', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = new URL('../server/db/data/india/', import.meta.url).pathname;
  const files = [path.join(root, 'ticker.json'), ...fs.readdirSync(path.join(root, 'states')).map(s => path.join(root, 'states', s, 'ticker.json')).filter(f => fs.existsSync(f))];
  for (const file of files) {
    for (const row of JSON.parse(fs.readFileSync(file, 'utf8'))) {
      if (row.price > 0) assert.ok(Number.isInteger(row.priceDays) && row.priceDays > 0, `${file}: ${row.id} has priceDays`);
    }
  }
});

test('thin national points are dropped but the newest day is kept', async () => {
  const { dropThinBuckets } = require('../scripts/lib/robust-price.cjs');
  const bucket = n => ({ byMandi: Object.fromEntries(Array.from({ length: n }, (_, i) => [`m${i}`, [1]])) });
  const months = { '2025-12': bucket(5), '2026-01': bucket(5), '2026-03': bucket(500), '2026-04': bucket(600), '2026-05': bucket(550) };
  assert.deepEqual(dropThinBuckets(months).sort(), ['2025-12', '2026-01']);
  const days = { '2026-07-18': bucket(300), '2026-07-19': bucket(280), '2026-07-20': bucket(310), '2026-10-16': bucket(4) };
  assert.deepEqual(dropThinBuckets(days, 0.2, { keepLatest: true }), []);
});

test('coconut per 1000 nuts (about 3x the per-quintal price) is left out with its tighter unit ratio', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { unitMismatchedSeries } = require('../scripts/lib/robust-price.cjs');
  const { UNIT_RATIO_OVERRIDES } = require('../scripts/lib/source-names.cjs');
  const records = [];
  const add = (market, price, n = 10) => { for (let i = 0; i < n; i++) records.push({ commodity: 'Coconut', market, modal_price: price }); };
  for (const market of ['tn1', 'tn2', 'tn3', 'tn4', 'kl1', 'kl2']) add(market, 5600);
  add('ka-per-1000', 21000); add('ap-per-1000', 17000);
  const options = { seriesKey: r => r.market, commodityKey: r => r.commodity };
  assert.equal(unitMismatchedSeries(records, options).size, 0, 'the default 10x misses a 3x unit difference');
  const excluded = unitMismatchedSeries(records, { ...options, ratioFor: c => UNIT_RATIO_OVERRIDES[c] });
  assert.deepEqual([...excluded].sort(), ['ap-per-1000', 'ka-per-1000']);
});
