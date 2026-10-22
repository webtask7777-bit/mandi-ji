import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import kccRouter from '../server/routes/kcc.js';
import { currentMonthIST, liftLabel, parseMonth, perHundred, risingNext, scriptLang, dateHi } from '../src/utils/kccAdvice.js';

const require = createRequire(import.meta.url);
const { classify, cropOf, problemFromText, queryFamily } = require('../scripts/lib/kcc-topics.cjs');

const call = (qt, c, q) => classify({ qt, c, q });

test('a named pest or disease wins over a mis-filed query type', () => {
  const result = call('Fertilizer Use and Availability', 'Tomato', 'Information regarding control of Virus in Tomato?');
  assert.equal(result.family, 'crop');
  assert.equal(result.crop.id, 'tomato');
  assert.equal(result.problem.id, 'mosaic');
});

test('specific problems are matched before broad ones', () => {
  assert.equal(problemFromText('yellow stem borer in paddy').id, 'stem-borer');
  assert.equal(problemFromText('pink bollworm control in cotton').id, 'pink-bollworm');
  assert.equal(problemFromText('धान में झोंका रोग का नियंत्रण').id, 'blast');
  assert.equal(problemFromText('गेहूं में दीमक').id, 'termite');
  assert.equal(problemFromText('sheath blight in rice').id, 'sheath-blight');
});

test('a plant-protection call without a named problem is general, not a fungus', () => {
  assert.equal(call('Plant Protection', 'Wheat', 'Plant protection in wheat?').problem.id, 'pest-disease');
});

test('scheme, weather and price calls are never crop problems, whatever their query type', () => {
  assert.equal(call('Plant Protection', 'Others', 'Farmer wants to know about the Status of the PM kisan samman nidhi yojna and e-kyc ?').family, 'scheme');
  assert.equal(call('Water Management', 'Others', 'Farmer asked query on Weather').family, 'weather');
  assert.equal(call('Market Information', 'Wheat', 'Farmer asked price detail of Wheat in Karanja mandi.').family, 'market');
});

test('crops are read from the question when the crop field says Others', () => {
  const result = call('Weed Management', 'Others', 'ASKED ABOUT WEED MANAGEMENT IN ONION ?');
  assert.equal(result.crop.id, 'onion');
  assert.equal(result.problem.id, 'weeds');
});

test('KCC crop spellings map to price-page crops', () => {
  assert.equal(cropOf('Paddy (Dhan)').mandi, 'paddycommon');
  assert.equal(cropOf('Black Gram (urd bean)').mandi, 'black-gramurd-beanswhole');
  assert.equal(cropOf('Bhindi(Okra/Ladysfinger)').mandi, 'bhindiladies-finger');
  assert.equal(cropOf('Others'), null);
  // "price" must not be read as rice.
  assert.equal(cropOf('Others', 'price of onion'), cropOf('Onion'));
});

test('query families come from the query type when the text is neutral', () => {
  assert.equal(queryFamily('\tPlant Protection\t', 'shoot borer in sugarcane'), 'protection');
  assert.equal(queryFamily('Animal Husbandry', 'fodder for cow'), 'animal');
});

test('month helpers', () => {
  // 18:40 UTC on 31 Oct is already 1 Nov in India.
  assert.equal(currentMonthIST(Date.parse('2026-10-31T18:40:00Z')), 11);
  assert.equal(parseMonth('11', 3), 11);
  for (const bad of ['0', '13', 'x', '1.5', null]) assert.equal(parseMonth(bad, 3), 3);
  assert.equal(dateHi('2025-07-29'), '29 जुलाई 2025');
  assert.equal(perHundred(0.4), '100 में 1 से कम');
  assert.equal(perHundred(14.6), '100 में 15');
  assert.equal(liftLabel(1.2), null);
  assert.match(liftLabel(4.2), /4 गुना/);
  assert.equal(scriptLang('நெல் விதைக்கும்'), 'ta');
  assert.equal(scriptLang('गेहूं'), 'hi');
});

test('rising problems: new next month or clearly larger, wrapping December to January', () => {
  const months = Array.from({ length: 12 }, () => ({ top: [] }));
  months[11].top = [{ key: 'a', share: 10 }, { key: 'b', share: 5 }];
  months[0].top = [{ key: 'a', share: 11 }, { key: 'b', share: 9 }, { key: 'c', share: 4 }];
  assert.deepEqual(risingNext(months, 12).map(item => item.key), ['b', 'c']);
  assert.deepEqual(risingNext(undefined, 5), []);
});

async function serve(t) {
  const app = express();
  app.use('/api/kcc', kccRouter);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return async path => { const r = await fetch(base + path); return { status: r.status, body: await r.json().catch(() => null) }; };
}

test('KCC routes never turn a request into a path outside the summaries', async t => {
  const get = await serve(t);
  for (const path of ['/api/kcc/states/..%2Fmeta', '/api/kcc/districts/x/..%2F..%2Findia%2Fstates', '/api/kcc/crop/..%2Fstates?state=..', '/api/kcc/states/Bihar']) {
    const { status } = await get(path);
    assert.ok(status === 404 || status === 503, `${path} → ${status}`);
  }
});

test('published summaries are internally consistent', async t => {
  const get = await serve(t);
  const index = await get('/api/kcc');
  if (index.status === 503) return t.skip('no KCC summaries built');
  assert.equal(index.status, 200);
  assert.equal(index.body.months.length, 12);
  assert.ok(['live', 'seasonal'].includes(index.body.meta.mode));
  // A sampled build publishes shares only, never call counts.
  if (index.body.meta.sampled) assert.equal(index.body.meta.calls, undefined);
  for (const month of index.body.months) for (const item of month.top) assert.ok(index.body.topics[item.key], item.key);
  const state = index.body.states[0];
  if (!state) return;
  const detail = await get(`/api/kcc/states/${state.id}`);
  assert.equal(detail.status, 200);
  for (const district of state.districts.slice(0, 3)) {
    const page = await get(`/api/kcc/districts/${state.id}/${district.id}`);
    assert.equal(page.status, 200);
    for (const key of Object.keys(page.body.qa)) assert.ok(page.body.topics[key], key);
  }
});
