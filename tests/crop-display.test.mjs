import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  withCropDisplayName, normalizeCropDataset, normalizeCropPriceDetail,
} from '../server/db/crop-display-names.js';
import {
  loadData, loadIndiaData, loadStateData,
  loadCropPrices, loadIndiaCropPrices, loadStateCropPrices,
} from '../server/db/connection.js';

const readData = relative => JSON.parse(readFileSync(new URL(`../server/db/data/${relative}.json`, import.meta.url), 'utf8'));

test('exact commodity IDs distinguish livestock, pulses and fruit lookalikes', () => {
  assert.equal(withCropDisplayName({ id: 'cow', nameHi: 'लोबिया' }).nameHi, 'गाय');
  assert.equal(withCropDisplayName({ id: 'cowpeaveg', nameHi: 'लोबिया' }).nameHi, 'बरबटी की फली');
  assert.equal(withCropDisplayName({ id: 'black-gramurd-beanswhole', nameHi: 'सेम' }).nameHi, 'साबुत उड़द');
  assert.equal(withCropDisplayName({ id: 'custard-applesharifa', nameHi: 'सेब' }).nameHi, 'सीताफल');
  const apple = { id: 'apple', nameHi: 'सेब' };
  assert.equal(withCropDisplayName(apple), apple);
  const unknown = { id: 'cow-unverified-variety', nameHi: 'Source name' };
  assert.equal(withCropDisplayName(unknown), unknown);
});

test('processed products, seeds, leaves and raw produce retain different labels', () => {
  const pairs = [
    ['coconut-oil', 'नारियल तेल'], ['coconut-coir', 'नारियल रेशा'], ['coconut-seed', 'नारियल बीज'],
    ['wheat-atta', 'गेहूँ आटा'], ['beaten-rice', 'पोहा'], ['cotton-seed', 'कपास बीज'],
    ['mustard-oil', 'सरसों तेल'], ['mango-powder', 'अमचूर'], ['dry-grapes', 'किशमिश'],
    ['guar-seedcluster-beans-seed', 'ग्वार बीज'], ['cluster-beans', 'ग्वारफली'],
    ['turmeric', 'हल्दी'], ['turmericraw', 'कच्ची हल्दी'],
    ['corriander-seed', 'धनिया बीज'], ['corianderleaves', 'धनिया पत्ती'],
  ];
  for (const [id, expected] of pairs) assert.equal(withCropDisplayName({ id }).nameHi, expected, id);
});

test('display corrections preserve original source names, IDs and market fields', () => {
  const source = Object.freeze({ id: 'cow', name: 'Cow', nameHi: 'लोबिया', price: 45500, source: 'AGMARKNET', varieties: ['Local'], lastUpdated: '2026-04-04' });
  const result = withCropDisplayName(source);
  assert.deepEqual(result, { ...source, nameHi: 'गाय' });
  assert.equal(source.nameHi, 'लोबिया');
  assert.equal(result.varieties, source.varieties);
});

test('only crop and ticker datasets are normalized, never editorial or location objects', () => {
  const rows = [{ id: 'cow', nameHi: 'लोबिया', bestMandi: { id: 'cow', nameHi: 'Original mandi label' } }];
  for (const name of ['crops', 'ticker']) {
    const result = normalizeCropDataset(name, rows);
    assert.equal(result[0].nameHi, 'गाय');
    assert.equal(result[0].bestMandi, rows[0].bestMandi);
  }
  for (const name of ['crop-info', 'districts', 'mandis', 'stats', 'heatmap']) {
    assert.equal(normalizeCropDataset(name, rows), rows, name);
  }
  const object = { crop: rows[0] };
  assert.equal(normalizeCropDataset('crops', object), object);
});

test('price detail normalization touches only the top-level crop identity', () => {
  const detail = {
    crop: { id: 'cow', name: 'Cow', nameHi: 'लोबिया' },
    districtBreakdown: [{ id: 'cow', nameHi: 'Do not change district', avgPrice: 123 }],
    history: [{ market: 456, volume: 7 }],
  };
  const result = normalizeCropPriceDetail(detail);
  assert.deepEqual(result.crop, { ...detail.crop, nameHi: 'गाय' });
  assert.equal(result.districtBreakdown, detail.districtBreakdown);
  assert.equal(result.history, detail.history);
  assert.equal(detail.crop.nameHi, 'लोबिया');
});

test('unknown regional names and ambiguous legacy CG commodity IDs remain unchanged', () => {
  for (const id of ['coriander', 'fenugreek', 'chilli', 'guar', 'delha', 'bullar', 'seemebadnekai', 'constructor', '__proto__']) {
    const item = { id, name: 'Original source', nameHi: 'Original display' };
    assert.equal(withCropDisplayName(item), item, id);
  }
  for (const value of [null, undefined, 'cow', [], 5]) assert.equal(withCropDisplayName(value), value);
  assert.equal(normalizeCropPriceDetail(null), null);
});

test('national and state crop/ticker API loaders apply the same display correction', () => {
  assert.equal(loadIndiaData('crops').find(x => x.id === 'cow').nameHi, 'गाय');
  assert.equal(loadIndiaData('ticker').find(x => x.id === 'cow').nameHi, 'गाय');
  const id = 'black-gramurd-beanswhole';
  for (const kind of ['crops', 'ticker']) {
    assert.equal(loadStateData('chhattisgarh', kind).find(x => x.id === id).nameHi, 'साबुत उड़द');
  }
  assert.deepEqual(loadData('crop-info'), readData('crop-info'));
  const original = readData('crops').find(x => x.id === 'coriander');
  assert.deepEqual(loadData('crops').find(x => x.id === 'coriander'), original);
});

test('all three price loaders preserve source values while correcting only crop nameHi', () => {
  const cases = [
    [() => loadCropPrices('turmeric'), 'crop-prices/turmeric', 'हल्दी'],
    [() => loadIndiaCropPrices('cow'), 'india/crop-prices/cow', 'गाय'],
    [() => loadStateCropPrices('chhattisgarh', 'black-gramurd-beanswhole'), 'india/states/chhattisgarh/crop-prices/black-gramurd-beanswhole', 'साबुत उड़द'],
  ];
  for (const [load, path, nameHi] of cases) {
    const original = readData(path);
    assert.deepEqual(load(), { ...original, crop: { ...original.crop, nameHi } }, path);
  }
});
