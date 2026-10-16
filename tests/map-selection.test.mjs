import assert from 'node:assert/strict';
import test from 'node:test';
import { getMapMandiKey, resolveMapSelection, updateMapSearch } from '../src/utils/mapSelection.js';
import { getDashboardStateUrl } from '../src/utils/dashboardNavigation.js';

const districts = [{ name: 'Raipur', nameHi: 'रायपुर' }, { name: 'Durg', nameHi: 'दुर्ग' }];
const mandis = [{ id: 7, name: 'Raipur', district: districts[0] }, { id: 8, name: 'Durg', district: 'Durg' }];
const crops = [{ id: 'beans', nameHi: 'सेम', totalRecords: 10 }, { id: 'indian-beans', nameHi: 'सेम', totalRecords: 5 }];
const catalog = { districts, mandis, crops };

test('a map link restores the exact source district, mandi and crop after data loads', () => {
  const search = updateMapSearch('?tab=naksha', { mapDistrict: 'Raipur', mapMandi: 'id:7', mapCrop: 'indian-beans', mapView: 'list' });
  assert.equal(resolveMapSelection(search).mandi, null);
  const restored = resolveMapSelection(search, catalog);
  assert.equal(restored.district, districts[0]);
  assert.equal(restored.mandi, mandis[0]);
  assert.equal(restored.crop, crops[1]);
  assert.equal(search.get('tab'), 'naksha');
});

test('unknown, cross-district, unavailable and ambiguous URL selections never fabricate records', () => {
  assert.equal(resolveMapSelection('?mapDistrict=Unknown&mapMandi=id:7', catalog).district, null);
  assert.equal(resolveMapSelection('?mapDistrict=Durg&mapMandi=id:7', catalog).mandi, null);
  assert.equal(resolveMapSelection('?mapDistrict=Raipur&mapMandi=id:7', { ...catalog, mandis: [...mandis, mandis[0]] }).mandi, null);
  assert.equal(resolveMapSelection('?mapCrop=सेम', catalog).crop, null);
  assert.equal(resolveMapSelection('?mapCrop=beans', { ...catalog, crops: [{ id: 'beans', totalRecords: 0 }] }).crop, null);
});

test('changing district clears the previous mandi; changing crop keeps selected place', () => {
  const search = '?tab=naksha&mapDistrict=Raipur&mapMandi=id:7&mapCrop=beans';
  assert.equal(updateMapSearch(search, { mapDistrict: 'Durg' }).has('mapMandi'), false);
  assert.equal(updateMapSearch(search, { mapCrop: 'indian-beans' }).get('mapMandi'), 'id:7');
  assert.equal(updateMapSearch(search, { mapDistrict: null }).has('mapMandi'), false);
  assert.equal(updateMapSearch(search, { mapDistrict: 'Durg', mapMandi: 'id:8' }).get('mapMandi'), 'id:8');
});

test('region navigation carries only the crop candidate for destination-catalog validation', () => {
  const url = getDashboardStateUrl('maharashtra', '?tab=naksha&mapCrop=beans&mapDistrict=Raipur&mapMandi=id:7&mapView=list');
  assert.equal(url, '/mandi-bhav/maharashtra?tab=naksha&mapCrop=beans');
  assert.equal(resolveMapSelection(url.split('?')[1], { crops: [] }).crop, null);
  assert.equal(getDashboardStateUrl(null, '?tab=delivery&mapCrop=beans'), '/?tab=delivery');
});

test('national mandi selections use exact original source names when numeric IDs are absent', () => {
  const national = { name: 'Raipur', originalName: 'Raipur APMC', district: 'Raipur' };
  const search = updateMapSearch('?tab=naksha', { mapDistrict: 'Raipur', mapMandi: getMapMandiKey(national) });
  assert.equal(resolveMapSelection(search, { districts, mandis: [national] }).mandi, national);
  assert.equal(resolveMapSelection(search, { districts, mandis: [{ ...national, originalName: 'Raipur Rural APMC' }] }).mandi, null);
});
