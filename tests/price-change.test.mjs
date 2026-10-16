import test from 'node:test';
import assert from 'node:assert/strict';
import { comparableChange, gapNote, MAX_DAILY_GAP_DAYS } from '../src/utils/priceChange.js';

const day = (date, market) => ({ date, market });

test('nearby daily records produce a change', () => {
  const r = comparableChange(day('2026-10-16', 2996), day('2026-10-15', 3000));
  assert.equal(r.status, 'ok');
  assert.equal(r.change, -4);
  assert.equal(r.gapDays, 1);
});

test('a three-month source gap is not reported as a price movement', () => {
  const r = comparableChange(day('2026-10-16', 2996), day('2026-07-18', 4728));
  assert.equal(r.status, 'gap');
  assert.equal(r.gapDays, 90);
  assert.match(gapNote(r), /90 दिन पहले/);
});

test('the gap limit is inclusive and bad dates never produce a change', () => {
  assert.equal(comparableChange(day('2026-10-16', 10), day('2026-10-09', 10)).gapDays, MAX_DAILY_GAP_DAYS);
  assert.equal(comparableChange(day('2026-10-16', 10), day('2026-10-09', 10)).status, 'ok');
  assert.equal(comparableChange(day('2026-10-16', 10), day('2026-10-08', 10)).status, 'gap');
  for (const prev of [day('bad', 10), day('2026-10-17', 10), day('2026-10-16', 10)]) {
    assert.equal(comparableChange(day('2026-10-16', 10), prev).status, 'gap');
  }
  assert.equal(comparableChange(day('2026-10-16', 10), day('2026-10-15', 0)).status, 'none');
});

test('monthly averages compare only consecutive months', () => {
  assert.equal(comparableChange({ month: '2026-10', market: 20 }, { month: '2026-09', market: 10 }, { daily: false }).status, 'ok');
  assert.equal(comparableChange({ month: '2026-10', market: 20 }, { month: '2026-07', market: 10 }, { daily: false }).status, 'gap');
  assert.equal(comparableChange({ month: '2026-01', market: 20 }, { month: '2025-12', market: 10 }, { daily: false }).status, 'ok');
});
