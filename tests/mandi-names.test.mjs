import test from 'node:test';
import assert from 'node:assert/strict';
import { mandiDisplayName, mandiSearchText } from '../shared/mandiNames.js';

test('Hindi mandi labels retain exact source identity and state scope', () => {
  assert.equal(mandiDisplayName('Raipur', 'chhattisgarh'), 'रायपुर');
  assert.equal(mandiDisplayName('Tiphra', 'chhattisgarh'), 'तिफरा');
  assert.equal(mandiDisplayName('Raipur', 'another-state'), 'Raipur');
  assert.equal(mandiDisplayName('Raipur New Market', 'chhattisgarh'), 'Raipur New Market');
});

test('Hindi, English and district searches find the same source mandi without changing its slug', () => {
  const row = { name: 'Abhanpur', district: 'Raipur', slug: 'abhanpur' };
  const text = mandiSearchText(row, 'chhattisgarh');
  for (const query of ['अभनपुर', 'abhanpur', 'रायपुर', 'raipur']) assert.ok(text.includes(query));
  assert.equal(row.slug, 'abhanpur');
  assert.equal(mandiSearchText(undefined, 'chhattisgarh'), '');
});
