import test from 'node:test';
import assert from 'node:assert/strict';
import { mandiNameHi } from '../shared/mandiNames.js';

test('known markets get their Hindi name, keyed by state', () => {
  assert.equal(mandiNameHi('chhattisgarh', 'raipur', 'Raipur'), 'रायपुर');
  assert.equal(mandiNameHi('madhya-pradesh', 'indore', 'Indore'), 'इंदौर');
});

test('anything unchecked keeps its source name', () => {
  assert.equal(mandiNameHi('chhattisgarh', 'neora', 'Neora'), 'Neora');
  assert.equal(mandiNameHi('kerala', 'raipur', 'Raipur'), 'Raipur');
  assert.equal(mandiNameHi('chhattisgarh', 'constructor', 'Constructor'), 'Constructor');
});
