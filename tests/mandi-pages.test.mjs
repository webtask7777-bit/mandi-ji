import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMandiIndex, getMandiIndexability, mandiPath, mandiSummaries, slugify } from '../shared/mandiPages.js';

const compare = {
  wheat: [
    { name: 'Raipur', district: 'Raipur', recentPrice: 2500, minPrice: 2400, maxPrice: 2600, lastDate: '2026-10-24', records: 10 },
    { name: 'Neora', district: 'Raipur', recentPrice: 2450, lastDate: '2026-10-20', records: 2 },
    { name: 'Neora', district: 'Durg', recentPrice: 2460, lastDate: '2026-10-20', records: 1 },
  ],
  paddycommon: [{ name: 'Raipur', district: 'Raipur', recentPrice: 2300, lastDate: '2026-10-23', records: 30 }],
  onion: [{ name: 'Raipur', district: 'Raipur', recentPrice: 0, avgPrice: 1800, lastDate: '2026-10-22', records: 5 }],
  potato: [{ name: 'Raipur', district: 'Raipur', recentPrice: null, avgPrice: null, lastDate: '2026-10-22', records: 5 }],
};
const crops = [{ id: 'wheat', name: 'Wheat', nameHi: 'गेहूँ' }, { id: 'paddycommon', name: 'Paddy', nameHi: 'धान' }];

test('slugs are plain ASCII and paths are encoded', () => {
  assert.equal(slugify('Kolhapur(Laxmipuri)'), 'kolhapur-laxmipuri');
  assert.equal(mandiPath('chhattisgarh', 'raipur'), '/mandi/chhattisgarh/raipur');
});

test('a mandi page collects every crop with a positive price; a shared name gets its district', () => {
  const index = buildMandiIndex(compare, crops);
  const raipur = index.get('raipur');
  assert.deepEqual(raipur.crops.map(crop => crop.id), ['wheat', 'paddycommon', 'onion']);
  assert.equal(raipur.crops.find(crop => crop.id === 'onion').price, 1800);
  assert.equal(raipur.crops[0].nameHi, 'गेहूँ');
  assert.ok(index.has('neora-raipur') && index.has('neora-durg') && !index.has('neora'));
  assert.equal(index.slugFor('Neora', 'Durg'), 'neora-durg');
  assert.equal(index.slugFor('Raipur', 'Raipur'), 'raipur');
  assert.equal(index.slugFor('Nowhere', 'X'), null);
  assert.equal(mandiSummaries(index)[0].slug, 'raipur');
});

test('only mandis with several recent crops are indexable', () => {
  const index = buildMandiIndex(compare, crops);
  const asOf = new Date('2026-10-25T06:00:00Z');
  assert.deepEqual(getMandiIndexability(index.get('raipur'), { asOf }), { noIndex: false, latestDate: '2026-10-24', recentCrops: 3 });
  assert.equal(getMandiIndexability(index.get('neora-raipur'), { asOf }).noIndex, true);
  assert.equal(getMandiIndexability(index.get('raipur'), { asOf: new Date('2027-01-30T06:00:00Z') }).noIndex, true);
  assert.equal(getMandiIndexability(null).noIndex, true);
});

test('several variety quotes remain distinct rows but never inflate unique crop coverage', () => {
  const rows = ['Mexican', 'Mill Quality', 'Lokwan'].map((topVariety, index) => ({
    name: 'Raipur', district: 'Raipur', marketId: 'CG|Raipur|Raipur', topVariety, grade: 'FAQ',
    comparisonIdentity: 'commodity-mandi-variety-grade-date-v1', priceBasis: 'daily-modal',
    quotePrice: 3000 + index * 100, recentPrice: 9999, quoteDate: '2026-10-29', lastDate: '2026-10-29', quoteRecords: 1, records: 1,
  }));
  const index = buildMandiIndex({ wheat: rows }, crops);
  const mandi = index.get('raipur');
  assert.equal(mandi.crops.length, 3);
  assert.equal(new Set(mandi.crops.map(crop => crop.quoteId)).size, 3);
  assert.deepEqual(mandi.crops.map(crop => crop.price), [3000, 3100, 3200], 'exact quoted prices override legacy aggregate fields');
  assert.deepEqual(mandiSummaries(index)[0].topCrops, ['गेहूँ']);
  assert.equal(mandiSummaries(index)[0].cropCount, 1);
  assert.deepEqual(getMandiIndexability(mandi, { asOf: new Date('2026-10-30T10:00:00Z') }), { noIndex: true, latestDate: '2026-10-29', recentCrops: 1 });
});
