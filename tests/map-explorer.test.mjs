import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  getDistrictName, getMandiDistrictName, placeKey,
  findDistrictRecord, districtSearchText,
} from '../src/utils/mapData.js';

const json = relativePath => JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

test('map groups CG object-shaped and other-state string-shaped mandi districts consistently', () => {
  const districts = json('../server/db/data/districts.json');
  const sourceMandis = json('../server/db/data/mandis.json');
  // The CG endpoint expands districtId into the full district object.
  const apiMandis = sourceMandis.map(mandi => ({ ...mandi, district: districts.find(item => item.id === mandi.districtId) }));
  const raipur = districts.find(district => district.name === 'Raipur');
  assert.equal(apiMandis.filter(mandi => getMandiDistrictName(mandi) === raipur.name).length,
    sourceMandis.filter(mandi => mandi.districtId === raipur.id).length);
  assert.ok(apiMandis.every(mandi => typeof getMandiDistrictName(mandi) === 'string'));
  assert.equal(getMandiDistrictName({ district: ' Raipur ' }), getMandiDistrictName({ district: raipur }));
});

test('malformed district values stay empty and never become object text', () => {
  for (const value of [undefined, null, 33, [], {}, { name: {} }, { name: 33 }]) assert.equal(getDistrictName(value), '');
  assert.equal(getDistrictName({ name: ' ', nameHi: ' रायपुर ' }), 'रायपुर');
  assert.equal(getMandiDistrictName(null), '');
});

test('district matching normalizes only exact punctuation, case and Unicode presentation', () => {
  const record = { name: 'Janjgir-Champa', nameHi: 'जांजगीर-चांपा', totalRecords: 10 };
  assert.equal(findDistrictRecord(' JANJGIR CHAMPA ', [record]), record);
  assert.equal(findDistrictRecord('जांजगीर चांपा', [record]), record);
  assert.equal(placeKey('Ｒａｉｐｕｒ'), placeKey('Raipur'));
  assert.notEqual(placeKey('Bastar'), placeKey('Dakshin Bastar Dantewada'));
});

test('reviewed CG labels connect to existing source districts without merging newer districts', () => {
  const districts = json('../server/db/data/districts.json');
  for (const [geometryName, recordName] of [
    ['Bametara', 'Bemetara'], ['Kabeerdham', 'Kabirdham'], ['Koriya', 'Korea'],
    ['Uttar Bastar Kanker', 'Kanker'], ['Dakshin Bastar Dantewada', 'Dantewada'],
  ]) assert.equal(findDistrictRecord(geometryName, districts)?.name, recordName);
  assert.equal(findDistrictRecord('Sarangarh-Bilaigarh', [{ name: 'Raigarh', totalRecords: 100 }]), null);
  assert.equal(findDistrictRecord('Gaurela-Pendra-Marwahi', [{ name: 'Bilaspur', totalRecords: 100 }]), null);
});

test('ambiguous normalized and alias matches are rejected rather than choosing the first row', () => {
  assert.equal(findDistrictRecord('Janjgir Champa', [{ name: 'Janjgir-Champa' }, { name: 'JANJGIR CHAMPA' }]), null);
  assert.equal(findDistrictRecord('Bametara', [{ name: 'Bemetara' }, { name: 'Bemetra' }]), null);
  const exact = { name: 'Bametara', totalRecords: 5 };
  assert.equal(findDistrictRecord('Bametara', [exact, { name: 'Bemetara' }]), exact);
});

test('unknown place evidence remains distinct from a real zero-record district', () => {
  const zeroRecord = { name: 'Raipur', totalRecords: 0 };
  assert.equal(findDistrictRecord('Raipur', [zeroRecord]), zeroRecord);
  for (const name of ['Raigarh', 'Raipurr', '', 'Raipur Rural']) assert.equal(findDistrictRecord(name, [zeroRecord]), null);
  assert.equal(findDistrictRecord('Raipur', null), null);
});

test('district search includes supplied Hindi, English and ID without object coercion', () => {
  assert.equal(districtSearchText({ name: 'Raipur', nameHi: 'रायपुर', id: 1 }), 'raipur रायपुर 1');
  assert.equal(districtSearchText({ name: {}, id: null }), '');
  assert.equal(districtSearchText(null), '');
});
