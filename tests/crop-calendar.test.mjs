import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCalendarPhases, getCalendarCrops, getIndiaMonth, getNextCalendarActivity,
} from '../src/utils/cropCalendar.js';
import { getDashboardStateUrl } from '../src/utils/dashboardNavigation.js';

const phaseKeys = phases => phases.map(phase => phase.key);

test('a market-arrival month preserves overlapping cultivation activities', () => {
  const crop = { id: 'brinjal', sowingMonths: [9], growingMonths: [8], harvestMonths: [9], peakMonths: [9] };
  assert.deepEqual(phaseKeys(getCalendarPhases(crop, 9)), ['sowing', 'harvest', 'arrival']);
  assert.deepEqual(phaseKeys(getCalendarPhases(crop, 8)), ['growing']);
  assert.deepEqual(getCalendarPhases(crop, 0), []);
});

test('missing, malformed and out-of-range dates cannot fabricate a calendar', () => {
  const invalid = { id: 'invalid', sowingMonths: [-1, 12, 1.5, '9', null], growingMonths: '9', harvestMonths: {} };
  const valid = { id: 'wheat', sowingMonths: [10, 11], harvestMonths: [2, 3] };
  assert.deepEqual(getCalendarCrops([null, {}, invalid, valid]), [valid]);
  assert.deepEqual(getCalendarCrops(null), []);
  for (const month of [null, undefined, -1, 12, 1.5, '10', NaN]) {
    assert.deepEqual(getCalendarPhases(valid, month), []);
    assert.equal(getNextCalendarActivity(valid, month), null);
  }
  assert.equal(getNextCalendarActivity(invalid, 0), null);
});

test('legacy dates work without overriding an explicit empty canonical field', () => {
  const legacy = { id: 'maize', sowing: [5, 6], harvest: [9], peak: [9] };
  assert.deepEqual(phaseKeys(getCalendarPhases(legacy, 9)), ['harvest', 'arrival']);
  assert.deepEqual(getCalendarCrops([legacy]), [legacy]);
  assert.deepEqual(getCalendarPhases({ ...legacy, sowingMonths: [] }, 5), []);
  assert.deepEqual(phaseKeys(getCalendarPhases({ ...legacy, sowingMonths: null }, 5)), ['sowing']);
});

test('processed rice never inherits paddy cultivation or next-activity advice', () => {
  const paddy = { id: 'paddycommon', sowingMonths: [5, 6], harvestMonths: [10, 11] };
  const rice = { ...paddy, id: 'rice' };
  assert.deepEqual(getCalendarCrops([rice, paddy]), [paddy]);
  assert.deepEqual(getCalendarPhases(rice, 5), []);
  assert.equal(getNextCalendarActivity(rice, 4), null);
  assert.deepEqual(phaseKeys(getCalendarPhases(paddy, 5)), ['sowing']);
});

test('India month changes at Indian midnight across month and year boundaries', () => {
  assert.equal(getIndiaMonth(new Date('2026-10-31T18:29:59.999Z')), 9);
  assert.equal(getIndiaMonth(new Date('2026-10-31T18:30:00Z')), 10);
  assert.equal(getIndiaMonth(new Date('2026-12-31T18:29:59.999Z')), 11);
  assert.equal(getIndiaMonth(new Date('2026-12-31T18:30:00Z')), 0);
  for (const date of [null, '2026-10-01', new Date(NaN)]) assert.equal(getIndiaMonth(date), null);
});

test('next activity wraps December, preserves overlaps, and supports a yearly return', () => {
  const crop = { id: 'wheat', growingMonths: [0], harvestMonths: [2], peakMonths: [2] };
  const next = getNextCalendarActivity(crop, 11);
  assert.equal(next.month, 0);
  assert.equal(next.offset, 1);
  assert.deepEqual(phaseKeys(next.phases), ['growing']);
  const harvest = getNextCalendarActivity(crop, 0);
  assert.equal(harvest.month, 2);
  assert.equal(harvest.offset, 2);
  assert.deepEqual(phaseKeys(harvest.phases), ['harvest', 'arrival']);
  assert.equal(getNextCalendarActivity({ id: 'annual', harvestMonths: [4] }, 4).offset, 12);
});

test('switching state retains the chosen calendar month without leaking unrelated context', () => {
  for (const month of ['1', '6', '12']) {
    const search = `?tab=calendar&calendarMonth=${month}&state=punjab&sourceCrop=wheat&mapCrop=rice`;
    assert.equal(getDashboardStateUrl('chhattisgarh', search), `/mandi-bhav/chhattisgarh?tab=calendar&calendarMonth=${month}`);
    assert.equal(getDashboardStateUrl(null, search), `/?tab=calendar&calendarMonth=${month}`);
  }
  for (const month of ['', '0', '13', '-1', '01', '1.5', 'NaN', ' 2']) {
    const params = new URLSearchParams({ tab: 'calendar', calendarMonth: month });
    assert.equal(getDashboardStateUrl('punjab', params), '/mandi-bhav/punjab?tab=calendar');
  }
  for (const tab of ['delivery', 'mandis', 'naksha', 'bazaar']) {
    assert.equal(getDashboardStateUrl('punjab', `?tab=${tab}&calendarMonth=10`), `/mandi-bhav/punjab?tab=${tab}`);
  }
  assert.equal(getDashboardStateUrl('punjab', '?tab=prices&calendarMonth=10'), '/mandi-bhav/punjab');
});
