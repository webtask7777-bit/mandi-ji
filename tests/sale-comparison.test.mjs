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

test('farmgate parity includes the full fixed costs and saleable quantity', () => {
  const r = compareSaleOptions({ quantity: 1000, quantityUnit: 'kg', options: playbook });
  assert.equal(r.farmgateReference.index, 0);
  assert.equal(r.rows[0].farmgateBreakEven, undefined);
  const expected = [2010.204081632653, 2153.061224489796];
  for (const [i, threshold] of expected.entries()) {
    const row = r.rows[i + 1];
    assert.equal(row.farmgateBreakEven.status, 'ok');
    assert.ok(Math.abs(row.farmgateBreakEven.requiredPricePerQuintal - threshold) < 1e-9);
    const atParity = calculateSaleOption({ ...playbook[i + 1], pricePerQuintal: threshold }, 1000);
    assert.ok(Math.abs(atParity.net - 18500) < 1e-8);
    const roundedUp = calculateSaleOption({ ...playbook[i + 1], pricePerQuintal: Math.ceil(threshold) }, 1000);
    assert.ok(roundedUp.net >= 18500, 'displayed minimum must not understate the required quote');
  }
  assert.equal(r.best.label, 'Mandi B', 'parity insight does not change ranking');
});

test('farmgate parity uses farmgate net after its own costs and deducts mandi fees once', () => {
  const options = [
    { kind: 'farmgate', pricePerQuintal: 2000, lossPercent: 5, commissionPercent: 2, marketFeePercent: 1, freightTotal: 100, handlingTotal: 100, otherTotal: 100 },
    { kind: 'mandi', pricePerQuintal: 2200, lossPercent: 10, commissionPercent: 2, marketFeePercent: 1, freightTotal: 700, handlingTotal: 200, otherTotal: 100 },
  ];
  for (const [quantity, quantityUnit] of [[1000, 'kg'], [10, 'quintal'], [1, 'tonne']]) {
    const r = compareSaleOptions({ quantity, quantityUnit, options });
    assert.equal(r.farmgateReference.net, 18130);
    assert.ok(Math.abs(r.rows[1].farmgateBreakEven.requiredPricePerQuintal - 2191.294387170676) < 1e-9);
  }
});

test('parity uses the first completed valid farmgate and only completed valid mandis', () => {
  const r = compareSaleOptions({ quantity: 10, options: [
    { kind: 'farmgate', pricePerQuintal: '' },
    { kind: 'farmgate', pricePerQuintal: -50 },
    { kind: 'farmgate', pricePerQuintal: 1800 },
    { kind: 'farmgate', pricePerQuintal: 2500 },
    { kind: 'mandi', pricePerQuintal: 2000, freightTotal: 1000, lossPercent: 0 },
    { kind: 'mandi', pricePerQuintal: 2000, freightTotal: '', lossPercent: 0 },
    { kind: 'mandi', pricePerQuintal: 2000, freightTotal: 0, lossPercent: 101 },
  ] });
  assert.equal(r.farmgateReference.index, 2);
  assert.equal(r.rows[4].farmgateBreakEven.requiredPricePerQuintal, 1900);
  assert.equal(r.rows[5].farmgateBreakEven, undefined);
  assert.equal(r.rows[6].farmgateBreakEven, undefined);
  const withoutFarmgate = compareSaleOptions({ quantity: 10, options: playbook.slice(1) });
  assert.equal(withoutFarmgate.farmgateReference, null);
  assert.ok(withoutFarmgate.rows.every(row => !row.farmgateBreakEven));
});

test('no saleable quantity or retained receipts produces an unavailable parity, never Infinity', () => {
  for (const extra of [{ lossPercent: 100 }, { commissionPercent: 99, marketFeePercent: 1 }, { commissionPercent: 80, marketFeePercent: 30 }]) {
    const r = compareSaleOptions({ quantity: 10, options: [playbook[0], { ...playbook[1], ...extra }] });
    assert.equal(r.rows[1].status, 'ok');
    assert.equal(r.rows[1].farmgateBreakEven.status, 'unavailable');
    assert.equal(r.rows[1].farmgateBreakEven.requiredPricePerQuintal, undefined);
  }
});

test('negative farmgate receipts can already be met at any nonnegative mandi quote', () => {
  const r = compareSaleOptions({ quantity: 10, options: [
    { kind: 'farmgate', pricePerQuintal: 100, otherTotal: 2000 },
    { kind: 'mandi', pricePerQuintal: 100, freightTotal: 500, lossPercent: 0 },
  ] });
  assert.equal(r.farmgateReference.net, -1000);
  assert.equal(r.rows[1].farmgateBreakEven.requiredPricePerQuintal, 0);
});

test('nonfinite quantities and overflowing receipt amounts cannot become completed insights', () => {
  for (const quantity of [Infinity, '1e309', NaN]) {
    const r = compareSaleOptions({ quantity, options: playbook });
    assert.equal(r.best, null);
    assert.equal(r.farmgateReference, null);
  }
  const r = compareSaleOptions({ quantity: 1e308, quantityUnit: 'kg', options: playbook });
  assert.ok(r.rows.every(row => row.status === 'invalid'));
  assert.equal(r.best, null);
});

test('known quote metadata differences are flagged even when farmgate metadata is absent', () => {
  const options = [playbook[0],
    { ...playbook[1], quoteDate: '2026-10-15', variety: 'Local', grade: 'A' },
    { ...playbook[2], quoteDate: '2026-10-16', variety: 'Hybrid', grade: 'B' },
  ];
  const r = compareSaleOptions({ quantity: 10, options });
  assert.deepEqual(r.quoteCautions.differingFields.map(field => field.key), ['quoteDate', 'variety', 'grade']);
  assert.deepEqual(r.quoteCautions.differingFields[0].entries.map(entry => entry.index), [1, 2]);
  assert.equal(r.quoteCautions.missingFields.length, 3);
  assert.equal(r.best.label, 'Mandi B', 'metadata caution is nonblocking');
});

test('missing metadata is not treated as matched or different and incomplete options are ignored', () => {
  const common = { quoteDate: '2026-10-15', variety: ' Local ', grade: 'A' };
  const known = [
    { ...playbook[0], ...common },
    { ...playbook[1], ...common, quoteDate: '2026-10-15T12:00:00Z', variety: 'local', grade: 'a' },
    { ...playbook[2], freightTotal: '', quoteDate: '2026-10-17', variety: 'Hybrid', grade: 'B' },
  ];
  assert.deepEqual(compareSaleOptions({ quantity: 10, options: known }).quoteCautions, { differingFields: [], missingFields: [] });
  const unknown = compareSaleOptions({ quantity: 10, options: [playbook[0], { ...playbook[1], quoteDate: '—', variety: 'Unknown', grade: 'N/A' }] });
  assert.deepEqual(unknown.quoteCautions.differingFields, []);
  assert.equal(unknown.quoteCautions.missingFields.length, 3);
});

test('invalid quote dates stay unknown rather than suggesting a different valid quote day', () => {
  const r = compareSaleOptions({ quantity: 10, options: [
    { ...playbook[0], quoteDate: '2026-02-30' },
    { ...playbook[1], quoteDate: '2026-03-02' },
  ] });
  assert.ok(r.quoteCautions.missingFields.includes('भाव की तारीख'));
  assert.ok(!r.quoteCautions.differingFields.some(field => field.key === 'quoteDate'));
});
