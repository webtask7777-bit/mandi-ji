import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { monthChange, consecutive, changeSignal } = require('../scripts/lib/month-change.cjs');
const bucket = (...prices) => ({ prices });

test('consecutive months produce a change', () => {
  const r = monthChange([['2026-09', bucket(1000)], ['2026-10', bucket(1100)]]);
  assert.deepEqual({ price: r.price, prevPrice: r.prevPrice, change: r.change, changePct: r.changePct, month: r.month }, { price: 1100, prevPrice: 1000, change: 100, changePct: 10, month: '2026-10' });
  assert.equal(consecutive('2025-12', '2026-01'), true);
});

test('October against July (missing months) yields no change', () => {
  const r = monthChange([['2026-07', bucket(4000)], ['2026-10', bucket(3005)]]);
  assert.equal(r.price, 3005);
  assert.equal(r.change, null);
  assert.equal(r.changePct, null);
  assert.equal(r.prevPrice, null);
});

test('no signal is derived from a missing change', () => {
  assert.equal(changeSignal(null), null);
  assert.equal(changeSignal(-24.3).signal, 'buy');
  assert.equal(changeSignal(2), null);
});

test('single month and empty buckets are safe', () => {
  assert.equal(monthChange([['2026-10', bucket(10)]]).change, null);
  assert.equal(monthChange([]).price, 0);
  assert.equal(monthChange([['2026-09', bucket()], ['2026-10', bucket(10)]]).change, null);
});

test('a month with fewer than three reporting days is not compared', () => {
  const withDays = (price, n) => ({ prices: [price], byMandi: { m: [price] }, days: new Set(Array.from({ length: n }, (_, i) => `d${i}`)) });
  const r = monthChange([['2026-09', withDays(1000, 20)], ['2026-10', withDays(1500, 1)]]);
  assert.equal(r.change, null);
  assert.equal(r.days, 1);
  assert.equal(monthChange([['2026-09', withDays(1000, 20)], ['2026-10', withDays(1100, 3)]]).changePct, 10);
});
