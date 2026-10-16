import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { straightLineKm, estimateRoadKm, nearestDistrict, mapsDirectionsUrl } from '../src/utils/geoDistance.js';

const geo = JSON.parse(readFileSync(new URL('../public/geo/district-centroids.json', import.meta.url), 'utf8'));
const cg = geo.states.find(s => s.id === 'chhattisgarh');
const at = name => cg.districts.find(d => d.name === name);

test('district centres give plausible straight-line and road estimates', () => {
  const straight = straightLineKm(at('Raipur'), at('Durg'));
  assert.ok(straight > 25 && straight < 60, `Raipur–Durg straight ${straight}`);
  const road = estimateRoadKm(at('Raipur'), at('Durg'));
  assert.equal(road % 5, 0);
  assert.ok(road > straight);
  assert.equal(estimateRoadKm(at('Raipur'), null), null);
  assert.equal(estimateRoadKm(at('Raipur'), at('Raipur')), 5, 'same district never shows 0 km');
});

test('nearest district finds the district for a point inside it', () => {
  const near = nearestDistrict({ lat: 21.19, lng: 81.40 }, geo.states);
  assert.equal(near.stateId, 'chhattisgarh');
  assert.equal(near.district, 'Durg');
});

test('every state in the file has districts with valid coordinates', () => {
  assert.ok(geo.states.length >= 30);
  for (const state of geo.states) for (const d of state.districts) {
    assert.ok(d.lat > 5 && d.lat < 38 && d.lng > 67 && d.lng < 98, `${state.id}/${d.name}`);
  }
});

test('maps link is built only when both ends are known', () => {
  assert.equal(mapsDirectionsUrl('Durg, Chhattisgarh', ''), null);
  assert.match(mapsDirectionsUrl('Durg, Chhattisgarh', 'Raipur, Chhattisgarh'), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=Durg/);
});
