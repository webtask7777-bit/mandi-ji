import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { summarizeMonth, seasonal, dropThin } = require('../scripts/aggregate-price-history.cjs');

const month = entries => new Map(entries.map(([key, sum, count]) => [key, [sum, count]]));

test('a month is the median of mandi averages, per state and for India', () => {
  const rows = summarizeMonth(month([
    ['bihar|patna|a', 2000, 1], ['bihar|patna|b', 2200 * 3, 3], ['bihar|gaya|c', 2400, 1],
    ['punjab|ludhiana|d', 2600, 1], ['punjab|ludhiana|e', 2800, 1],
  ]));
  assert.deepEqual(rows.all, [2400, 2200, 2600, 5]);
  assert.equal(rows.bihar[0], 2200);
  assert.equal(rows.punjab[3], 2);
});

test('a mandi reporting another unit (10x off the month median) is left out', () => {
  const rows = summarizeMonth(month([
    ['bihar|a|a', 2000, 1], ['bihar|b|b', 2100, 1], ['bihar|c|c', 2200, 1], ['bihar|d|d', 2300, 1], ['bihar|e|e', 40, 1], ['bihar|f|f', 90000, 1],
  ]));
  assert.equal(rows.all[3], 4);
  assert.equal(rows.all[0], 2150);
});

test('thin months (under a fifth of the usual mandi count) are dropped', () => {
  const rows = [['2009-01', 1, 1, 1, 3], ['2010-01', 1, 1, 1, 100], ['2011-01', 1, 1, 1, 120], ['2012-01', 1, 1, 1, 110]];
  assert.deepEqual(dropThin(rows).map(row => row[0]), ['2010-01', '2011-01', '2012-01']);
});

test('the seasonal profile compares each month with its own year, so inflation does not decide it', () => {
  const rows = [];
  for (const [year, level] of [[2019, 1000], [2020, 1500], [2021, 2000], [2022, 2500]]) {
    for (let m = 1; m <= 12; m++) rows.push([`${year}-${String(m).padStart(2, '0')}`, m === 6 ? level * 1.2 : m === 12 ? level * 0.8 : level]);
  }
  const profile = seasonal(rows);
  assert.equal(profile.years, 4);
  assert.ok(profile.pct[5] > 15, `June ${profile.pct[5]}`);
  assert.ok(profile.pct[11] < -15, `December ${profile.pct[11]}`);
  assert.ok(Math.abs(profile.pct[2]) < 2);
  assert.equal(seasonal(rows.slice(0, 24)), null, 'two years are not a pattern');
});

const { seasonalExtremes, sameMonthEarlier, yearTicks } = await import('../src/utils/priceHistory.js');

test('seasonal extremes need a real spread', () => {
  const pct = [2, 4, 6, 1, -1, -3, -8, -5, 0, 3, 5, 9];
  assert.deepEqual(seasonalExtremes(pct), { high: { month: 11, pct: 9 }, low: { month: 6, pct: -8 } });
  assert.equal(seasonalExtremes([1, 2, 1, 0, -1, -2, -1, 0, 1, 2, 1, 0]), null, 'a ±2% wobble is no pattern');
  assert.equal(seasonalExtremes([5, null, null, null]), null);
});

test('same month in earlier years counts back from the current year', () => {
  const rows = ['2016-10', '2021-10', '2024-10', '2025-09', '2025-10', '2026-09'].map(ym => [ym, 1, 1, 1, 1]);
  // In October 2026, "last year" is October 2025, whatever the newest stored month is.
  assert.deepEqual(sameMonthEarlier(rows, 10, [1, 5, 10], 2026).map(item => item.row[0]), ['2025-10', '2021-10', '2016-10']);
  assert.deepEqual(sameMonthEarlier(rows, 10, [3], 2026), [], 'a missing year (2023) is left out, not replaced');
});

test('year ticks stay sparse over long ranges', () => {
  const rows = [['2009-03'], ['2026-10']];
  const ticks = yearTicks(rows);
  assert.ok(ticks.length <= 9 && ticks.every(t => t >= '2009-03'), ticks.join());
});
