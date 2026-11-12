import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMandiIndex, getMandiIndexability, mandiIndexAnchorDate, mandiIndexDeadline, mandiPath, mandiSummaries, slugify } from '../shared/mandiPages.js';
import { isPrivatePath } from '../shared/robotsPolicy.js';
import { isRuntimeIndexable } from '../shared/seoLifecycle.js';

const compare = {
  wheat: [
    { name: 'Raipur', district: 'Raipur', recentPrice: 2500, minPrice: 2400, maxPrice: 2600, lastDate: '2026-10-24', records: 10 },
    { name: 'Neora', district: 'Raipur', recentPrice: 2450, lastDate: '2026-10-20', records: 2 },
    { name: 'Neora', district: 'Durg', recentPrice: 2460, lastDate: '2026-10-20', records: 1 },
  ],
  paddycommon: [{ name: 'Raipur', district: 'Raipur', recentPrice: 2300, lastDate: '2026-10-23', records: 30 }],
  onion: [{ name: 'Raipur', district: 'Raipur', recentPrice: 0, avgPrice: 1800, lastDate: '2026-10-22', records: 5 }],
  potato: [{ name: 'Raipur', district: 'Raipur', recentPrice: null, avgPrice: null, lastDate: '2026-10-22', records: 5 }],
  maize: [{ name: 'Raipur', district: 'Raipur', recentPrice: 1900, lastDate: '2026-10-21', records: 4 }],
  tomato: [{ name: 'Raipur', district: 'Raipur', recentPrice: 1200, lastDate: '2026-10-21', records: 3 }],
  goat: [{ name: 'Raipur', district: 'Raipur', recentPrice: 9000, lastDate: '2026-10-24', records: 2 }, { name: 'Pashu Bazaar', district: 'Raipur', recentPrice: 8000, lastDate: '2026-10-24', records: 9 }],
};
const crops = [{ id: 'wheat', name: 'Wheat', nameHi: 'गेहूँ' }, { id: 'paddycommon', name: 'Paddy', nameHi: 'धान' }];

test('slugs are plain ASCII and paths are encoded', () => {
  assert.equal(slugify('Kolhapur(Laxmipuri)'), 'kolhapur-laxmipuri');
  assert.equal(mandiPath('chhattisgarh', 'raipur'), '/mandi/chhattisgarh/raipur');
});

test('a mandi page collects every crop with a positive price; a shared name gets its district', () => {
  const index = buildMandiIndex(compare, crops);
  const raipur = index.get('raipur');
  assert.deepEqual(raipur.crops.map(crop => crop.id), ['wheat', 'paddycommon', 'onion', 'maize', 'tomato']);
  assert.equal(raipur.crops.find(crop => crop.id === 'onion').price, 1800);
  assert.equal(raipur.crops[0].nameHi, 'गेहूँ');
  assert.ok(index.has('neora-raipur') && index.has('neora-durg') && !index.has('neora'));
  assert.equal(index.slugFor('Neora', 'Durg'), 'neora-durg');
  assert.equal(index.slugFor('Raipur', 'Raipur'), 'raipur');
  assert.equal(index.slugFor('Nowhere', 'X'), null);
  assert.equal(mandiSummaries(index)[0].slug, 'raipur');
});

test('livestock, fish, eggs and ghee never make or join a mandi page', () => {
  const index = buildMandiIndex(compare, crops);
  assert.ok(!index.has('pashu-bazaar'));
  assert.ok(!index.get('raipur').crops.some(crop => crop.id === 'goat'));
});

test('established markets index; a mandi with one recent quote does not', () => {
  const index = buildMandiIndex(compare, crops);
  const asOf = new Date('2026-10-25T06:00:00Z');
  assert.deepEqual(getMandiIndexability(index.get('raipur'), { asOf }), { noIndex: false, reason: 'established-market', latestDate: '2026-10-24', recentCrops: 5 });
  const noKeyCrop = buildMandiIndex(Object.fromEntries(Object.entries(compare).filter(([id]) => id !== 'paddycommon')), crops);
  // Four recent crops without paddy or soybean: no longer "established", but still a useful local page.
  assert.deepEqual(getMandiIndexability(noKeyCrop.get('raipur'), { asOf }), { noIndex: false, reason: 'useful-local-market', latestDate: '2026-10-24', recentCrops: 4 });
  const summaries = mandiSummaries(index, { asOf });
  assert.equal(summaries.find(row => row.slug === 'raipur').indexable, true);
  assert.equal(summaries.find(row => row.slug === 'neora-raipur').indexable, false);
  assert.equal(getMandiIndexability(index.get('neora-raipur'), { asOf }).noIndex, true);
  assert.equal(getMandiIndexability(index.get('raipur'), { asOf: new Date('2027-01-30T06:00:00Z') }).noIndex, true);
  assert.equal(getMandiIndexability(null).noIndex, true);
});

test('a recent paddy or soybean record lowers the minimum to three crops, not to one', () => {
  const asOf = new Date('2026-10-25T06:00:00Z');
  const mandi = ids => ({ crops: ids.map(([id, lastDate]) => ({ id, lastDate })) });
  assert.equal(getMandiIndexability(mandi([['paddycommon', '2026-10-24'], ['wheat', '2026-10-23'], ['maize', '2026-10-22']]), { asOf }).noIndex, false);
  assert.equal(getMandiIndexability(mandi([['soyabean', '2026-10-24'], ['wheat', '2026-10-23'], ['maize', '2026-10-22']]), { asOf }).noIndex, false);
  assert.equal(getMandiIndexability(mandi([['paddycommon', '2026-10-24'], ['wheat', '2026-10-23']]), { asOf }).reason, 'useful-local-market');
  assert.equal(getMandiIndexability(mandi([['wheat', '2026-10-24'], ['maize', '2026-10-23'], ['onion', '2026-10-22']]), { asOf }).reason, 'useful-local-market');
  assert.equal(getMandiIndexability(mandi([['paddycommon', '2026-08-01'], ['wheat', '2026-10-23'], ['maize', '2026-10-22'], ['onion', '2026-10-21']]), { asOf }).reason, 'useful-local-market');
});

test('the anchor date is when an indexable mandi would stop qualifying', () => {
  const asOf = new Date('2026-10-25T06:00:00Z');
  const crops = [['wheat', '2026-10-24'], ['paddycommon', '2026-10-10'], ['maize', '2026-10-20'], ['onion', '2026-10-05']].map(([id, lastDate]) => ({ id, lastDate }));
  assert.equal(mandiIndexAnchorDate({ crops }, { asOf }), '2026-10-10');
  const five = [...crops, { id: 'potato', lastDate: '2026-10-22' }];
  assert.equal(mandiIndexAnchorDate({ crops: five }, { asOf }), '2026-10-10');
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
  assert.deepEqual(getMandiIndexability(mandi, { asOf: new Date('2026-10-30T10:00:00Z') }), { noIndex: true, reason: 'single-quote', latestDate: '2026-10-29', recentCrops: 1 });
});

// Shapes taken from the 13 Nov 2026 data (state chhattisgarh). Muli is a market in Bastar, not radish.
const asOfNov = new Date('2026-11-13T06:00:00Z');
const quote = (id, lastDate, variety = '', grade = 'FAQ') => ({ id, lastDate, variety, grade, quoteId: JSON.stringify([id, 'm', variety, grade, lastDate]), price: 2000 });
const muli = { slug: 'muli', name: 'Muli', district: 'Bastar', crops: [quote('tamarind-fruit', '2026-11-11'), quote('maize', '2026-10-12'), quote('paddycommon', '2026-10-12')] };
const katghora = { slug: 'katghora', name: 'Katghora', district: 'Korba', crops: [quote('paddycommon', '2026-11-12'), quote('paddycommon', '2026-10-29', 'Common'), quote('paddycommon', '2026-10-29', 'Sarna'), quote('millets', '2026-10-16')] };

test('a small local market with a recent record and dated context is indexable, not blocked for its crop count', () => {
  for (const mandi of [muli, katghora]) {
    const decision = getMandiIndexability(mandi, { asOf: asOfNov });
    assert.equal(decision.noIndex, false, mandi.slug);
    assert.equal(decision.reason, 'useful-local-market', mandi.slug);
    assert.ok(decision.recentCrops < 3, 'still a small market');
    // The page keeps each record's own date; the newest is never relabelled as today.
    assert.equal(decision.latestDate, mandi.crops[0].lastDate);
    assert.ok(isRuntimeIndexable(['/mandi/chhattisgarh/' + mandi.slug, decision.latestDate, mandiIndexDeadline(mandi, { asOf: asOfNov })], asOfNov.getTime()));
  }
});

test('one quote, only old records, or no records stay out of search with a reason', () => {
  assert.equal(getMandiIndexability({ crops: [quote('wheat', '2026-11-10')] }, { asOf: asOfNov }).reason, 'single-quote');
  // Two varieties of one crop on one day are one observation.
  assert.equal(getMandiIndexability({ crops: [quote('wheat', '2026-11-10', 'Lokwan'), quote('wheat', '2026-11-10', 'Sharbati')] }, { asOf: asOfNov }).reason, 'single-quote');
  // Recent quote, but the only other one is older than the 90-day context window.
  assert.equal(getMandiIndexability({ crops: [quote('wheat', '2026-11-10'), quote('maize', '2026-07-01')] }, { asOf: asOfNov }).reason, 'single-quote');
  assert.equal(getMandiIndexability({ crops: [quote('wheat', '2026-09-01'), quote('maize', '2026-08-20')] }, { asOf: asOfNov }).reason, 'no-recent-record');
  assert.equal(getMandiIndexability({ crops: [] }, { asOf: asOfNov }).reason, 'no-priced-records');
  assert.equal(getMandiIndexability(null).reason, 'invalid');
  assert.equal(mandiIndexDeadline({ crops: [quote('wheat', '2026-11-10')] }, { asOf: asOfNov }), 0);
});

test('a useful local page expires when its recent record leaves the 30-day window, without a rebuild', () => {
  const deadline = mandiIndexDeadline(muli, { asOf: asOfNov });
  // Newest record 11 Nov: indexable through 11 Dec (IST), noindex from 12 Dec.
  assert.ok(isRuntimeIndexable(['/x', null, deadline], Date.parse('2026-12-11T12:00:00+05:30')));
  assert.ok(!isRuntimeIndexable(['/x', null, deadline], Date.parse('2026-12-12T00:30:00+05:30')));
  assert.equal(getMandiIndexability(muli, { asOf: new Date('2026-12-12T06:00:00Z') }).noIndex, true);
});

test('account, listing-create and admin screens stay private; public pages do not', () => {
  for (const path of ['/login', '/register', '/listing/new', '/listing/new?type=sell&crop=onion', '/my-listings', '/eway-bill/new', '/my-eway-bills', '/admin', '/admin/blog']) assert.ok(isPrivatePath(path), path);
  for (const path of ['/', '/mandi/chhattisgarh/muli', '/listing/abc123', '/crop/sunflower', '/blog', '/administer']) assert.ok(!isPrivatePath(path), path);
});
