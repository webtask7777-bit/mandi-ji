import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CROP_IMAGES, getCropCategoryImage, getCropImage, getCropImageNote, getCropImageSource } from '../src/utils/cropImages.js';
import { CROP_IMAGE_CATEGORIES, CROP_IMAGE_CATEGORY_IDS } from '../src/data/cropImageCategories.js';

const dataRoot = fileURLToPath(new URL('../server/db/data/', import.meta.url));
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const filename = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(filename) : filename;
});
const sourceIds = new Set(walk(dataRoot)
  .filter(filename => ['crops.json', 'ticker.json'].includes(path.basename(filename)) || path.basename(path.dirname(filename)) === 'crop-prices')
  .filter(filename => filename.endsWith('.json'))
  .flatMap(filename => {
    const data = JSON.parse(readFileSync(filename, 'utf8'));
    return (Array.isArray(data) ? data : [data?.crop]).filter(crop => crop?.id).map(crop => crop.id);
  }));

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

test('all source catalogs, tickers and price details have one explicit category and a usable image', () => {
  assert.ok(sourceIds.size >= 392, 'Includes national, CG and state-only detail commodities');
  const classifiedIds = Object.values(CROP_IMAGE_CATEGORY_IDS).flat();
  assert.equal(new Set(classifiedIds).size, classifiedIds.length, 'No duplicate category assignments');
  for (const id of new Set([...sourceIds, ...Object.keys(CROP_IMAGES)])) {
    assert.ok(Object.hasOwn(CROP_IMAGE_CATEGORIES, id), `${id} explicitly classified`);
    const image = getCropImage(id);
    assert.match(image.src, /^\/visuals\/(?:crop|category)-[a-z-]+\.webp$/, id);
    assert.ok(['commodity', 'category'].includes(image.kind), id);
    if (image.kind === 'category') assert.match(image.note, /प्रतीकात्मक चित्र/, id);
  }
});

test('every exact and fallback image exists and is a nonempty WebP file', () => {
  const paths = new Set([...sourceIds, ...Object.keys(CROP_IMAGES), 'future-unknown-crop']
    .flatMap(id => [getCropImageSource(id), getCropCategoryImage(id).src]));
  for (const imagePath of paths) {
    const file = new URL(`../public${imagePath}`, import.meta.url);
    assert.ok(existsSync(file), `${imagePath} file exists`);
    const bytes = readFileSync(file);
    assert.ok(bytes.length > 100, `${imagePath} has image data`);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', imagePath);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', imagePath);
  }
});

test('grain, leafy crops, pulse forms and flower forms are never conflated', () => {
  assert.notEqual(getCropImageSource('rajgir'), getCropImageSource('amaranthus'));
  assert.equal(getCropImageSource('tivda'), getCropImageSource('lakteora'));
  assert.equal(getCropImageSource('red-gram'), getCropImageSource('arhartur-red-gramwhole'));
  for (const [first, second] of [
    ['arhar-daltur-dal', 'arhartur-red-gramwhole'],
    ['bengal-gram-dalchana-dal', 'bengal-gramgramwhole'],
    ['black-gram-dalurd-dal', 'black-gramurd-beanswhole'],
    ['green-gram-dalmoong-dal', 'green-grammoongwhole'],
    ['papaya', 'papayaraw'], ['gingergreen', 'gingerdry'],
    ['corriander-seed', 'corianderleaves'], ['green-peas', 'field-pea'],
    ['coconut', 'tender-coconut'], ['coconut', 'coconut-oil'],
    ['green-chilli', 'dry-chillies'],
  ]) {
    assert.notEqual(getCropImageSource(first), getCropImageSource(second), `${first} vs ${second}`);
  }
  for (const id of ['fenugreek', 'methileaves', 'pegeon-peaarhar-fali', 'tube-rosesingle', 'tube-roseloose', 'chrysanthemum']) {
    assert.equal(getCropImage(id).kind, 'category', `${id} has only representative artwork`);
  }
  assert.equal(getCropImage('field-pea').kind, 'category', 'Source does not establish fresh/dried form');
  assert.equal(getCropImage('peasdry').kind, 'commodity', 'Explicit dry peas use dry whole pea artwork');
  assert.notEqual(getCropImageSource('peasdry'), getCropImageSource('green-peas'));
  for (const id of ['kutki', 'muesli', 'coleus', 'asalia', 'sweet-saag']) {
    assert.equal(getCropImage(id).category, 'generic', `${id} needs source identity verification`);
  }
});

test('category art has a disclosure and unknown source IDs preserve the neutral fallback', () => {
  for (const id of ['marget', 'delha', 'other-pulses']) {
    assert.match(getCropImageNote(id), /प्रतीकात्मक चित्र/);
  }
  assert.match(getCropImageNote('marget'), /पहचान की पुष्टि बाकी/);
  assert.equal(getCropImageNote('peach'), null);
  assert.deepEqual(getCropImage('  PEACH  '), getCropImage('peach'));
  for (const id of ['unknown-crop', 'peach-unverified', 'constructor', '__proto__', 'toString', '', null, undefined, {}, []]) {
    assert.equal(getCropImageSource(id), '/visuals/category-generic.webp');
    assert.equal(getCropImage(id).kind, 'category');
    assert.match(getCropImageNote(id), /पहचान की पुष्टि बाकी/);
  }
});

test('failed exact images have a clearly labelled category fallback without changing commodity identity', () => {
  for (const id of sourceIds) {
    const fallback = getCropCategoryImage(id);
    assert.equal(fallback.kind, 'category', id);
    assert.equal(fallback.category, CROP_IMAGE_CATEGORIES[id], id);
    assert.match(fallback.note, /प्रतीकात्मक चित्र/, id);
    if (getCropImage(id).kind === 'commodity') assert.notEqual(fallback.src, getCropImageSource(id), id);
  }
  assert.equal(getCropCategoryImage('cow').category, 'livestock');
  assert.equal(getCropCategoryImage('fish').category, 'seafood');
  assert.equal(getCropCategoryImage('sheep').category, 'livestock');
});
