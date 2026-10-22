import test from 'node:test';
import assert from 'node:assert/strict';
import { getCropIndexability } from '../shared/cropIndexability.js';

const asOf = new Date('2026-10-22T10:00:00Z');
const daily = (date, market = 1000) => ({ dailyHistory: [{ date, market }], history: [] });

test('fresh and stale price pages use the same inclusive 90-day boundary', () => {
  assert.equal(getCropIndexability(daily('2026-10-22'), { asOf }).noIndex, false);
  assert.deepEqual(getCropIndexability(daily('2026-07-24'), { asOf }), {
    status: 'fresh', noIndex: false, latestDate: '2026-07-24', ageDays: 90,
  });
  assert.deepEqual(getCropIndexability(daily('2026-07-23'), { asOf }), {
    status: 'stale', noIndex: true, latestDate: '2026-07-23', ageDays: 91,
  });
});

test('empty histories, invalid dates and unusable prices are not indexable', () => {
  for (const detail of [null, {}, { dailyHistory: [], history: [] }, daily('2026-02-30'), daily('2026-10-22', 0), daily('2026-10-22', -1), daily('2026-10-22', Infinity)]) {
    assert.deepEqual(getCropIndexability(detail, { asOf }), {
      status: 'empty', noIndex: true, latestDate: null, ageDays: null,
    });
  }
});

test('future records cannot qualify a page or replace an older valid record', () => {
  assert.equal(getCropIndexability(daily('2026-10-23'), { asOf }).status, 'future');
  const detail = { dailyHistory: [{ date: '2026-10-23', market: 2000 }, { date: '2026-03-11', market: 1000 }] };
  assert.deepEqual(getCropIndexability(detail, { asOf }), {
    status: 'stale', noIndex: true, latestDate: '2026-03-11', ageDays: 225,
  });
});

test('freshness follows the Indian calendar day, including timestamp observations', () => {
  const beforeMidnight = new Date('2026-10-21T18:29:59Z');
  const afterMidnight = new Date('2026-10-21T18:30:00Z');
  assert.equal(getCropIndexability(daily('2026-10-22'), { asOf: beforeMidnight }).status, 'future');
  assert.equal(getCropIndexability(daily('2026-10-22'), { asOf: afterMidnight }).status, 'fresh');
  assert.equal(getCropIndexability(daily('2026-10-21T19:00:00Z'), { asOf }).latestDate, '2026-10-22');
});

test('monthly-only history preserves month precision and excludes future months', () => {
  const detail = { history: [{ date: '2026-11', market: 900 }, { date: '2026-10', market: 1000 }] };
  assert.deepEqual(getCropIndexability(detail, { asOf }), {
    status: 'fresh', noIndex: false, latestDate: '2026-10', ageDays: 21,
  });
  assert.equal(getCropIndexability({ history: [{ date: '2026-11', market: 900 }] }, { asOf }).status, 'future');
  assert.equal(getCropIndexability({ history: [{ date: '2026-06', market: 900 }] }, { asOf }).status, 'stale');
});

test('loading and transient fetch errors remain pending rather than empty', () => {
  for (const options of [{ loading: true }, { error: new Error('Network unavailable') }]) {
    assert.deepEqual(getCropIndexability(null, { asOf, ...options }), {
      status: 'pending', noIndex: null, latestDate: null, ageDays: null,
    });
    // A usable snapshot still decides indexing while its request revalidates.
    assert.equal(getCropIndexability(daily('2026-03-11'), { asOf, ...options }).status, 'stale');
  }
});

test('a frozen dataset becomes stale as actual time advances', () => {
  const detail = daily('2026-10-22');
  assert.equal(getCropIndexability(detail, { asOf }).noIndex, false);
  assert.equal(getCropIndexability(detail, { asOf: '2027-01-21T10:00:00Z' }).noIndex, true);
});
