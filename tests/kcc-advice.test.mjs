import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import kccRouter from '../server/routes/kcc.js';
import { currentMonthIST, liftLabel, parseMonth, perHundred, risingNext, scriptLang, dateHi, placeKey, searchPlaces } from '../src/utils/kccAdvice.js';

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

test('real call-centre spellings: typos, frost, generic insect/disease, gram in the question', () => {
  assert.equal(problemFromText('BLACK THIRPS IN CHILLI MANAGEMENT').id, 'thrips');
  assert.equal(problemFromText('Prevention of Fall army warm in maize').id, 'fall-armyworm');
  assert.equal(problemFromText('ASKED ABOUT TO FROST SAVING').id, 'frost');
  assert.equal(problemFromText('white blister disease problem in Mustard crop').id, 'rust');
  const insect = call('Plant Protection', 'Others', 'ASKED ABOUT TO INSECT CONTROL IN ONION ?');
  assert.deepEqual([insect.crop.id, insect.problem.id], ['onion', 'pest-disease']);
  const disease = call('Plant Protection', 'Others', 'ASKED ABOUT TO DISEASE CONTROL IN GRAM ?');
  assert.deepEqual([disease.crop.id, disease.problem.id], ['gram', 'pest-disease']);
  assert.equal(cropOf('Others', 'yellow mosaic in black gram').id, 'urad');
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
  if (index.status === 404) return t.skip('no KCC summaries built');
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
    assert.equal(page.body.qa, undefined, 'page payloads carry no answers');
    const month = page.body.months.findIndex(m => m.top.length) + 1;
    if (!month) continue;
    const answers = await get(`/api/kcc/districts/${state.id}/${district.id}/qa?mahina=${month}`);
    assert.equal(answers.status, 200);
    const ranked = new Set(page.body.months[month - 1].top.map(item => item.key));
    for (const [key, list] of Object.entries(answers.body.qa)) {
      assert.ok(ranked.has(key), `answers only for that month's ranked problems: ${key}`);
      assert.ok(list.length <= 4);
    }
  }
  assert.equal((await get(`/api/kcc/qa?mahina=13`)).status, 400);
});

test('district search tolerates common spelling differences', () => {
  assert.equal(placeKey('Nashik'), placeKey('Nasik'));
  assert.equal(placeKey('Ahmednagar'), placeKey('Ahmadnagar'));
  const states = [
    { id: 'maharashtra', name: 'Maharashtra', nameHi: 'महाराष्ट्र', districts: [{ id: 'nasik', name: 'Nasik' }, { id: 'nagpur', name: 'Nagpur' }, { id: 'nanded', name: 'Nanded' }] },
    { id: 'chhattisgarh', name: 'Chhattisgarh', nameHi: 'छत्तीसगढ़', districts: [{ id: 'raipur', name: 'Raipur' }] },
  ];
  assert.deepEqual(searchPlaces(states, 'Nashik').map(m => m.district.id), ['nasik']);
  assert.equal(searchPlaces(states, 'na')[0].district.id, 'nagpur', 'exact prefixes first');
  assert.deepEqual(searchPlaces(states, 'छत्तीस').map(m => m.district.id), ['raipur'], 'Hindi state name lists its districts');
  assert.deepEqual(searchPlaces(states, 'x'), []);
});

test('one indexing rule: India and states with all 12 months; no districts while crawl is scarce', async () => {
  const { isKccPageIndexable } = await import('../shared/kccIndexability.js');
  const ranked = Array.from({ length: 12 }, () => ({ top: [{ key: 'a~b' }] }));
  assert.equal(isKccPageIndexable({ months: ranked }, 'india'), true);
  assert.equal(isKccPageIndexable({ months: ranked }, 'state'), true);
  assert.equal(isKccPageIndexable({ months: ranked.slice(0, 8) }, 'state'), false);
  assert.equal(isKccPageIndexable({ months: ranked }, 'district'), false);
  assert.equal(isKccPageIndexable({ meta: { sampled: true }, months: ranked }, 'india'), false);
  assert.equal(isKccPageIndexable(null, 'india'), false);
});

test('snapshots hold two KCC months and the rows behind the price facts, and the rule survives trimming', async () => {
  const { leanKccCrop, leanKccPage, leanPriceHistory } = await import('../scripts/lib/lean-snapshot.mjs');
  const { isKccPageIndexable } = await import('../shared/kccIndexability.js');
  const asOf = new Date('2026-12-15T00:00:00Z');
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, top: [{ key: 'a~b' }] }));
  const page = leanKccPage({ meta: {}, months }, asOf);
  assert.deepEqual(page.data.months.map((row, i) => (row ? i + 1 : 0)).filter(Boolean), [1, 12], 'December wraps to January');
  assert.equal(isKccPageIndexable(page.data, 'state'), true);
  const crop = leanKccCrop({ meta: { x: 1 }, months: months.map(() => []) }, asOf);
  assert.equal(crop.omittedRows, 10);
  assert.equal(crop.data.meta, undefined);
  const row = ym => [ym, 100, 90, 110, 5, 100];
  const rows = ['2009-03', '2015-12', '2016-01', '2024-12', '2025-12', '2026-09'].map(row);
  const history = leanPriceHistory({ all: rows.concat(row('2026-10')), state: rows, seasonal: { all: { pct: [] }, state: { pct: [1] } } }, asOf);
  assert.deepEqual(history.data.state.map(item => item[0]), ['2009-03', '2015-12', '2024-12', '2025-12', '2026-09']);
  assert.deepEqual(history.data.all, []);
  assert.equal(history.data.seasonal.all, null);
  assert.equal(history.omittedRows, 1);
  assert.equal(leanPriceHistory({ all: [], state: null }, asOf), null);
});

test('the deployed API function ships the summaries it reads', async () => {
  const { readFileSync } = await import('node:fs');
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const included = vercel.functions['api/index.mjs'].includeFiles;
  assert.match(included, /db\/data\/kcc\/\*\*\/\*\.json/);
  assert.match(included, /db\/data\/price-history\/\*\.json/);
});

// Fasal Salah audit (21 Nov 2026): search, month links, answer cautions, sample strength.
const kccFile = name => JSON.parse(readFileSync(new URL(`../server/db/data/kcc/${name}`, import.meta.url), 'utf8'));
const { DISTRICT_ALIASES, districtNameHi, isRealDistrict } = await import('../shared/kccPlaceNames.js');
const advice = await import('../src/utils/kccAdvice.js');
// The India page's search list, as the page builds it.
const indiaPlaces = () => kccFile('index.json').states.map(state => ({
  ...state,
  districts: state.districts.filter(isRealDistrict).map(d => ({ ...d, nameHi: districtNameHi(state.id, d.id), aliases: DISTRICT_ALIASES[`${state.id}/${d.id}`] })),
}));
const ids = result => result.matches.map(m => `${m.state.id}/${m.district.id}`);

test('Hindi and English district names find the same district first', () => {
  const places = indiaPlaces();
  for (const query of ['रायपुर', 'Raipur', ' raipur ', 'RAIPUR']) assert.equal(ids(advice.findPlaces(places, query))[0], 'chhattisgarh/raipur', query);
  assert.equal(ids(advice.findPlaces(places, 'कवर्धा'))[0], 'chhattisgarh/kabeerdham', 'old name alias');
  assert.equal(ids(advice.findPlaces(places, 'Kanker'))[0], 'chhattisgarh/uttar-bastar-kanker', 'a later word of the name');
  // Districts without a stored Hindi name are still found by transliteration.
  assert.equal(ids(advice.findPlaces(places, 'लुधियाना'))[0], 'punjab/ludhiana');
  assert.equal(ids(advice.findPlaces(places, 'नासिक'))[0], 'maharashtra/nasik');
});

test('an exact district match is not padded with distant look-alikes', () => {
  const result = advice.findPlaces(indiaPlaces(), 'Raipur');
  assert.equal(result.similar, false);
  for (const lookAlike of ['chandrapur', 'chhatarpur', 'dungarpur']) assert.ok(!ids(result).some(id => id.endsWith(`/${lookAlike}`)), lookAlike);
  // A misspelling with no strong match falls back to flagged look-alikes.
  const loose = advice.findPlaces([{ id: 's', name: 'S', districts: [{ id: 'chandrapur', name: 'Chandrapur' }] }], 'ndrapr');
  assert.equal(loose.similar, true);
});

test('the result count is the total before the list is cut', () => {
  const cg = kccFile('index.json').states.find(state => state.id === 'chhattisgarh');
  const result = advice.findPlaces(indiaPlaces(), 'Chhattisgarh');
  assert.equal(result.matches.length, 12);
  assert.equal(result.total, cg.districts.filter(isRealDistrict).length);
  assert.ok(result.total > 12);
  assert.equal(result.state.id, 'chhattisgarh');
});

test('place links keep a chosen month; the current month and bad values give the plain path', () => {
  assert.equal(advice.salahPath('chhattisgarh', null, 8, 11), '/fasal-salah/chhattisgarh?mahina=8');
  assert.equal(advice.salahPath('chhattisgarh', 'raipur', 8, 11), '/fasal-salah/chhattisgarh/raipur?mahina=8');
  assert.equal(advice.salahPath(null, null, 8, 11), '/fasal-salah?mahina=8');
  assert.equal(advice.salahPath('chhattisgarh', null, 11, 11), '/fasal-salah/chhattisgarh');
  for (const bad of [0, 13, '1x', null, undefined]) assert.equal(advice.salahPath('goa', null, bad, 11), '/fasal-salah/goa');
});

test('unknown-district placeholders are not districts', () => {
  for (const id of ['0', '9999', 'na', 'unknown']) assert.equal(isRealDistrict({ id }), false, id);
  assert.equal(isRealDistrict({ id: 'raipur' }), true);
  const cg = kccFile('states/chhattisgarh.json');
  assert.ok(cg.districts.some(d => !isRealDistrict(d)), 'the published data still holds a placeholder the page must skip');
});

test('clipped or container-only dose answers get cautions; their text is untouched', () => {
  const haryana = Object.values(kccFile('index.json').qa).flat().find(item => /30-35 दिन बाद/.test(item.a) && /…$/.test(item.a));
  assert.ok(haryana, 'the audited clipped answer is in the national data');
  const before = haryana.a;
  assert.deepEqual(advice.answerCautions(haryana), { clipped: true, dose: true, perContainerOnly: false });
  assert.equal(haryana.a, before);
  assert.equal(advice.answerCautions({ a: 'इमिडाक्लोप्रिड 15 ग्राम/पंप की दर से छिड़काव करें' }).perContainerOnly, true);
  assert.equal(advice.answerCautions({ a: '15 ग्राम प्रति पंप, 15 लीटर पानी में' }).perContainerOnly, false);
  assert.deepEqual(advice.answerCautions({ a: 'खेत की गहरी जुताई करें।' }), { clipped: false, dose: false, perContainerOnly: false });
});

test('a problem asked about a few times a year is "limited" and loses its N-times lift', () => {
  const raipurNov = kccFile('districts/chhattisgarh/raipur.json').months[10];
  const mustard = raipurNov.top.find(item => item.key === 'mustard~sowing');
  assert.ok(mustard && mustard.lift >= 3, 'the audited case: a large lift on few calls');
  assert.equal(advice.topicStrength(mustard, raipurNov), 'limited');
  assert.equal(advice.topicStrength({ callsPerYear: 40 }, { years: 3 }), 'strong');
  assert.equal(advice.topicStrength({ callsPerYear: 40 }, { years: 1 }), 'limited');
  assert.equal(advice.topicStrength({ share: 5 }, { years: 3 }), 'unknown', 'sampled builds have no counts');
});
