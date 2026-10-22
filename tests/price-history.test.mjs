import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { summarizeMonth, chainLevel, linkChange, seasonal, dropThin } = require('../scripts/aggregate-price-history.cjs');

// series key: state|district|market|variety|grade → [sum, count]
const month = entries => new Map(entries.map(([key, sum, count]) => [key, [sum, count]]));

test('a month is the median of mandi prices, per state and for India', () => {
  const out = summarizeMonth(month([
    ['bihar|patna|a|x|faq', 2000, 1], ['bihar|patna|b|x|faq', 2200 * 3, 3], ['bihar|gaya|c|x|faq', 2400, 1],
    ['punjab|ludhiana|d|x|faq', 2600, 1], ['punjab|ludhiana|e|x|faq', 2800, 1],
  ]));
  assert.deepEqual(out.all.row, [2400, 2200, 2600, 5]);
  assert.equal(out.bihar.row[0], 2200);
  assert.equal(out.punjab.row[3], 2);
  assert.equal(out.bihar.series.size, 3);
});

test('a mandi is the mean of its varieties, so filing more premium rows does not move it', () => {
  const few = summarizeMonth(month([['up|a|m|common|faq', 2000, 1], ['up|a|m|premium|faq', 3000, 1]]));
  const many = summarizeMonth(month([['up|a|m|common|faq', 2000, 1], ['up|a|m|premium|faq', 3000 * 9, 9]]));
  assert.equal(few.all.row[0], 2500);
  assert.equal(many.all.row[0], 2500);
});

test('a mandi reporting another unit (5x off the month median) is left out', () => {
  const out = summarizeMonth(month([
    ['bihar|a|a|x|f', 2000, 1], ['bihar|b|b|x|f', 2100, 1], ['bihar|c|c|x|f', 2200, 1], ['bihar|d|d|x|f', 2300, 1], ['bihar|e|e|x|f', 300, 1], ['bihar|f|f|x|f', 15000, 1],
  ]));
  assert.equal(out.all.row[3], 4);
  assert.equal(out.all.row[0], 2150);
});

test('chain-linking: new expensive mandis joining do not show up as a price rise', () => {
  const m1 = new Map([['a', 1000], ['b', 1100], ['c', 1200]]);
  // Same mandis flat; three far dearer mandis start reporting.
  const m2 = new Map([['a', 1000], ['b', 1100], ['c', 1200], ['d', 3000], ['e', 3100], ['f', 3200]]);
  assert.equal(linkChange(m1, m2), 0);
  const rows = [['2020-01', 1100, 0, 0, 3], ['2020-02', 2050, 0, 0, 6]];
  const level = chainLevel(rows, new Map([['2020-02', 0]]));
  assert.equal(level[0][5], level[1][5], 'flat level across the coverage change');
  assert.equal(level[1][5], 2050, 'anchored to the recent actual median');
  assert.equal(linkChange(new Map([['a', 1]]), new Map([['a', 2]])), null, 'too few shared series to link');
});

test('thin months (under a fifth of the usual mandi count) are dropped', () => {
  const rows = [['2009-01', 1, 1, 1, 3], ['2010-01', 1, 1, 1, 100], ['2011-01', 1, 1, 1, 120], ['2012-01', 1, 1, 1, 110]];
  assert.deepEqual(dropThin(rows).map(row => row[0]), ['2010-01', '2011-01', '2012-01']);
});

const seasonalRows = ({ from = 2018, to = 2023, growth = 0, skip = () => false } = {}) => {
  const rows = [];
  for (let year = from; year <= to; year++) for (let m = 1; m <= 12; m++) {
    if (skip(year, m)) continue;
    const trend = 1000 * (1 + growth) ** ((year - from) * 12 + m);
    const season = m === 6 ? 1.2 : m === 12 ? 0.8 : 1;
    rows.push([`${year}-${String(m).padStart(2, '0')}`, 0, 0, 0, 10, Math.round(trend * season)]);
  }
  return rows;
};

test('seasonal profile against a centred moving average: inflation and trend do not decide it', () => {
  const profile = seasonal(seasonalRows({ growth: 0.01 }));
  assert.ok(profile.pct[5] > 15, `June ${profile.pct[5]}`);
  assert.ok(profile.pct[11] < -15, `December ${profile.pct[11]}`);
  assert.ok(Math.abs(profile.pct[2]) < 3, `March ${profile.pct[2]} (a 1%/month trend must not tilt it)`);
});

test('seasonal profile survives a missing month and a partial last year, and needs three years', () => {
  const profile = seasonal(seasonalRows({ to: 2024, skip: (year, m) => (year === 2020 && m === 9) || (year === 2024 && m > 7) }));
  assert.ok(profile.pct[5] > 15 && profile.pct[11] < -15);
  assert.equal(seasonal(seasonalRows({ from: 2020, to: 2021 })), null, 'two years are not a pattern');
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
