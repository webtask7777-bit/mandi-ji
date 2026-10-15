import assert from 'node:assert/strict';
import test from 'node:test';
import { safeReturnTo } from '../src/utils/safeReturnTo.js';
import { districtCropMatch, districtStyle, stateStyle } from '../src/components/LeafletMap/mapStyles.js';

// These paths cover the real buy/sell and crop-prefill journeys through auth.
test('auth return preserves internal listing intent, query and hash', () => {
  for (const value of [
    '/listing/new?type=buy&crop=bengal-gram-dalchana-dal&mandi=Raipur#details',
    '/listing/new?type=sell&crop=wheat',
    '/?tab=bazaar',
    '/my-listings',
  ]) assert.equal(safeReturnTo(value), value);
});

test('auth return rejects external, malformed and authentication-loop targets', () => {
  for (const value of [
    null, undefined, {}, '', 'https://evil.example', 'javascript:alert(1)',
    '//evil.example', '/\\evil.example', '/%2f%2fevil.example', '/%5cevil.example',
    '/\nevil.example', '/%0aevil.example', ' /listing/new', '/%ZZ',
    '/login', '/login?returnTo=/listing/new', '/register', '/REGISTER#go', '/%6cogin',
    '/listing/../login',
  ]) assert.equal(safeReturnTo(value), '/', String(value));
});

test('district crop evidence matches exact source names despite slug punctuation', () => {
  const info = { totalRecords: 100, topCrops: [{ name: 'Bengal Gram Dal(Chana Dal)', count: 22 }] };
  assert.equal(districtCropMatch(info, 'bengal-gram-dalchana-dal'), 'matched');
  assert.equal(districtCropMatch({ topCrops: [{ name: 'Bhindi (Ladies Finger)' }] }, 'bhindiladies-finger'), 'matched');
  assert.equal(districtCropMatch({ topCrops: [{ cropId: 'banana-green' }] }, 'banana-green'), 'matched');
});

test('district evidence never conflates whole/processed, ripe/raw or seed names', () => {
  const pairs = [
    ['Bengal Gram Dal(Chana Dal)', 'bengal-gramgramwhole'],
    ['Banana - Green', 'banana'],
    ['Coriander Leaves', 'coriander-seed'],
    ['Wheat Atta', 'wheat'],
  ];
  for (const [name, selected] of pairs) assert.equal(districtCropMatch({ topCrops: [{ name }] }, selected), 'unknown');
});

test('missing district or incomplete top-crop evidence is unknown, not absence', () => {
  assert.equal(districtCropMatch(null, 'wheat'), 'unknown');
  assert.equal(districtCropMatch({ topCrops: [] }, 'wheat'), 'unknown');
  assert.equal(districtCropMatch({ topCrops: [{ name: 'Rice' }] }, 'wheat'), 'unknown');
  const feature = { properties: { districtName: 'Varanasi' } };
  const positive = districtStyle(feature, { districtMap: { Varanasi: { totalRecords: 100, topCrops: [{ name: 'Bengal Gram Dal(Chana Dal)' }] } }, maxDistRecords: 100, selectedCrop: 'bengal-gram-dalchana-dal' });
  const unknown = districtStyle(feature, { districtMap: {}, maxDistRecords: 100, selectedCrop: 'bengal-gram-dalchana-dal' });
  assert.equal(positive.dashArray, null);
  assert.equal(unknown.dashArray, '4 3');
});

test('state evidence only highlights reported presence; missing matrix stays unknown', () => {
  const feature = { properties: { stateId: 'uttar-pradesh' } };
  const options = { stateDataMap: { 'uttar-pradesh': { totalRecords: 100 } }, maxRecords: 100, selectedCrop: 'wheat' };
  assert.equal(stateStyle(feature, options).dashArray, '4 3');
  assert.equal(stateStyle(feature, { ...options, cropMatrix: { wheat: { states: ['uttar-pradesh'] } } }).dashArray, null);
  assert.equal(stateStyle(feature, { ...options, cropMatrix: { wheat: { states: ['punjab'] } } }).dashArray, '4 3');
});
