import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSaleOption, compareSaleOptions, saleComparisonSummary } from '../src/utils/saleComparison.js';

// The playbook's illustration: 1,000 kg, 2% loss at either mandi.
const playbook = [
  { label: 'Farmgate', kind: 'farmgate', pricePerQuintal: 1850 },
  { label: 'Mandi A', kind: 'mandi', pricePerQuintal: 2000, freightTotal: 700, otherTotal: 500, lossPercent: 2 },
  { label: 'Mandi B', kind: 'mandi', pricePerQuintal: 2200, freightTotal: 2100, otherTotal: 500, lossPercent: 2 },
];

test('reproduces the playbook illustration exactly', () => {
  const r = compareSaleOptions({ quantity: 1000, quantityUnit: 'kg', options: playbook });
  assert.deepEqual(r.rows.map(x => Math.round(x.gross)), [18500, 19600, 21560]);
  assert.deepEqual(r.rows.map(x => Math.round(x.net)), [18500, 18400, 18960]);
  assert.equal(r.best.label, 'Mandi B');
  assert.equal(Math.round(r.margin), 460);
  assert.equal(r.rows[1].rank, 3);
});

test('the highest quoted price does not win when freight eats the difference', () => {
  const r = compareSaleOptions({ quantity: 10, options: [
    { label: 'near', kind: 'mandi', pricePerQuintal: 2000, freightTotal: 0, lossPercent: 0 },
    { label: 'far', kind: 'mandi', pricePerQuintal: 2100, freightTotal: 1500, lossPercent: 0 },
  ] });
  assert.equal(r.best.label, 'near');
});

test('blank freight or loss at a mandi is incomplete, never zero', () => {
  const r = calculateSaleOption({ kind: 'mandi', pricePerQuintal: 2000, freightTotal: '', lossPercent: 2 }, 1000);
  assert.equal(r.status, 'incomplete');
  assert.deepEqual(r.missing, ['भाड़ा']);
  const ok = calculateSaleOption({ kind: 'mandi', pricePerQuintal: 2000, freightTotal: 0, lossPercent: 0 }, 1000);
  assert.equal(ok.status, 'ok');
  assert.ok(ok.assumedZero.includes('मंडी शुल्क'), 'optional blanks are reported as assumed zero');
});

test('percentage fees apply to the gross on saleable weight, and loss is not counted twice', () => {
  const r = calculateSaleOption({ kind: 'mandi', pricePerQuintal: 2000, freightTotal: 0, lossPercent: 10, commissionPercent: 2, marketFeePercent: 1 }, 1000);
  assert.equal(r.saleableKg, 900);
  assert.equal(r.gross, 18000);
  assert.equal(Math.round(r.commission + r.marketFee), 540);
  assert.equal(Math.round(r.net), 17460);
});

test('invalid entries are rejected rather than ranked', () => {
  for (const bad of [{ pricePerQuintal: 0 }, { pricePerQuintal: -5 }, { lossPercent: 101 }, { commissionPercent: 'x' }]) {
    const r = calculateSaleOption({ kind: 'mandi', pricePerQuintal: 2000, freightTotal: 0, lossPercent: 0, ...bad }, 1000);
    assert.equal(r.status, 'invalid', JSON.stringify(bad));
  }
  assert.equal(compareSaleOptions({ quantity: '', options: playbook }).best, null);
});

test('a small gap is flagged as a close call; one complete option is not a comparison', () => {
  const close = compareSaleOptions({ quantity: 10, options: [
    { kind: 'farmgate', pricePerQuintal: 2000 },
    { kind: 'mandi', pricePerQuintal: 2030, freightTotal: 0, lossPercent: 0 },
  ] });
  assert.equal(close.closeCall, true);
  const single = compareSaleOptions({ quantity: 10, options: [{ kind: 'farmgate', pricePerQuintal: 2000 }, { kind: 'mandi', pricePerQuintal: 2100 }] });
  assert.equal(single.comparable, false);
});

test('the shared summary carries quote dates and the not-a-guarantee line', () => {
  const options = playbook.map((o, i) => ({ ...o, quoteDate: i ? '2026-10-15' : undefined }));
  const result = compareSaleOptions({ quantity: 10, options });
  const text = saleComparisonSummary({ cropName: 'टमाटर', quantity: 10, quantityUnit: 'quintal', options, result });
  assert.match(text, /भाव की तारीख 2026-10-15/);
  assert.match(text, /पक्का भाव नहीं/);
});

test('options within ₹1 are a tie: same rank, no winner', () => {
  const r = compareSaleOptions({ quantity: 10, options: [
    { label: 'gate', kind: 'farmgate', pricePerQuintal: 2000 },
    { label: 'mandi', kind: 'mandi', pricePerQuintal: 2100, freightTotal: 1000, lossPercent: 0 },
  ] });
  assert.equal(r.tie, true);
  assert.deepEqual(r.rows.map(x => x.rank), [1, 1]);
});
