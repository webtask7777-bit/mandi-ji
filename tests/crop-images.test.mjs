import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CROP_IMAGES, getCropImageNote, getCropImageSource } from '../src/utils/cropImages.js';

const reportedMovers = {
  marget: 'flower-category',
  'tube-rosedouble': 'tuberose-double',
  peach: 'peach',
  giloy: 'giloy',
  'methi-seeds': 'fenugreek-seed',
  litchi: 'litchi',
  chrysanthemumloose: 'chrysanthemum-loose',
  makhanafoxnut: 'makhana',
  'chhappan-kaddu': 'summer-squash',
  'berzizyphus-borehannu': 'ber',
  'other-pulses': 'mixed-pulses',
  'red-gram': 'arhar-whole',
  'jamunnarale-hannu': 'jamun',
  lakteora: 'grass-pea',
  behada: 'behada',
  'neem-seed': 'neem-seed',
  rajgir: 'amaranth-grain',
  'apricotjardalu-khumani': 'apricot',
  soanf: 'fennel-seed',
  delha: 'flower-category',
  ajwan: 'ajwain',
};

test('all 21 reported monthly movers resolve to their exact commodity or labelled category artwork', () => {
  const ticker = JSON.parse(readFileSync(new URL('../server/db/data/india/ticker.json', import.meta.url), 'utf8'));
  for (const [id, asset] of Object.entries(reportedMovers)) {
    assert.ok(ticker.some(crop => crop.id === id), `Source commodity ${id} exists`);
    assert.equal(getCropImageSource(id), `/visuals/crop-${asset}.webp`, id);
  }
});

test('every mapped crop image exists and is a nonempty WebP file', () => {
  for (const asset of new Set(Object.values(CROP_IMAGES))) {
    const file = new URL(`../public/visuals/crop-${asset}.webp`, import.meta.url);
    assert.ok(existsSync(file), `${asset} file exists`);
    const bytes = readFileSync(file);
    assert.ok(bytes.length > 100, `${asset} has image data`);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', asset);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', asset);
  }
});

test('grain, leafy crops, pulse forms and flower forms are never conflated', () => {
  assert.notEqual(getCropImageSource('rajgir'), getCropImageSource('amaranthus'));
  assert.equal(getCropImageSource('tivda'), getCropImageSource('lakteora'));
  assert.equal(getCropImageSource('red-gram'), getCropImageSource('arhartur-red-gramwhole'));
  for (const id of ['fenugreek', 'methileaves', 'arhar-daltur-dal', 'pegeon-peaarhar-fali', 'tube-rosesingle', 'tube-roseloose', 'chrysanthemum']) {
    assert.equal(getCropImageSource(id), null, `${id} has no verified matching artwork`);
  }
});

test('category art has a disclosure and unknown source IDs preserve the neutral fallback', () => {
  for (const id of ['marget', 'delha', 'other-pulses']) {
    assert.match(getCropImageNote(id), /प्रतीकात्मक चित्र/);
  }
  assert.match(getCropImageNote('marget'), /पहचान की पुष्टि बाकी/);
  assert.equal(getCropImageNote('peach'), null);
  assert.equal(getCropImageSource('PEACH'), getCropImageSource('peach'));
  for (const id of ['unknown-crop', 'peach-unverified', 'constructor', '__proto__', '', null, undefined]) {
    assert.equal(getCropImageSource(id), null);
    assert.equal(getCropImageNote(id), null);
  }
});
