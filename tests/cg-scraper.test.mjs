import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { commodityFor, splitCrop, districtFor, mandiFor } = require('../scripts/lib/cg-scraper-map.cjs');
const { combine } = require('../scripts/import-cg-scraper.cjs');

test('exact commodity forms are mapped with the variety kept', () => {
  assert.equal(commodityFor('धान(I.R. 64)'), 'Paddy(Common)');
  assert.deepEqual(splitCrop('चना(Desi (Whole))'), { category: 'चना', variety: 'Desi (Whole)' });
  assert.equal(commodityFor('चना(Desi (Whole))'), 'Bengal Gram(Gram)(Whole)');
  assert.equal(commodityFor('बैंगन(Brinjal)'), 'Brinjal');
});

test('ambiguous forms are skipped, never guessed', () => {
  for (const crop of ['तुअर(Medium)', 'मटर(Peas(Dry))', 'मैथी(Methi)', 'महुवे के फूल(Local)', 'चना(Kanta)', 'मसूर(Masoor Gola)', 'कटहल(Jack Fruit)', 'केला(Medium)', 'इमली(Tamarind Fruit)']) {
    assert.equal(commodityFor(crop), null, crop);
  }
});

test('Hindi places match whichever nukta form the source used', () => {
  const composed = 'खैरागढ़ छुईखदान गण्डई';
  const decomposed = composed.normalize('NFD');
  assert.equal(districtFor(composed), 'Khairagarh Chhuikhadan Gandai');
  assert.equal(districtFor(decomposed), 'Khairagarh Chhuikhadan Gandai');
  assert.equal(mandiFor('अभनपुर'), 'Abhanpur');
  assert.equal(mandiFor('अज्ञात'), null);
});

test('transactions combine per mandi, variety, grade and day with a quantity-weighted modal', () => {
  const tx = (modal, qty, extra = {}) => ({ district: 'रायपुर', mandi: 'अभनपुर', arrival_date: '10/03/2026', crop: 'धान(I.R. 64)', min_price: modal - 50, max_price: modal + 50, modal_price: modal, arrival_qty: qty, faq_status: 'NON FAQ', ...extra });
  const { records } = combine([tx(2000, 30), tx(2400, 10), tx(2600, 5, { faq_status: 'FAQ' }), tx(1, 5, { crop: 'तुअर(Medium)' })]);
  assert.equal(records.length, 2);
  const nonFaq = records.find(r => r.grade === 'Non-FAQ');
  assert.equal(nonFaq.modal_price, 2100);
  assert.equal(nonFaq.min_price, 1950);
  assert.equal(nonFaq.max_price, 2450);
  assert.equal(nonFaq.market, 'Abhanpur APMC');
  assert.equal(nonFaq.variety, 'I.R. 64');
});
