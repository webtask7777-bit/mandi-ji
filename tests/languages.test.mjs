import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { LANGUAGES, AVAILABLE_LANGUAGES, SEARCH_LANGUAGES, getLanguage, languagePath, languageFromPath, normalizeLanguage } from '../shared/languages.js';
import { parseLanguageNumber, latestPriceRecord, calculateDeliveryEstimate, buildLanguageToolsUrl } from '../src/utils/languageTools.js';
import { calculateDeliveryScenario } from '../src/utils/deliveryCalculator.js';

const root = process.cwd();
const readJSON = relative => JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
const base = readJSON('src/i18n/base.json');
const pending = readJSON('src/i18n/translation-pending.json');
const localeFile = code => path.join(root, 'src/i18n/locales', `${code}.json`);
const built = existsSync(path.join(root, 'dist/index.html'));
const skipBuild = built ? false : 'Run npm run build to verify language-page output.';
const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
function tags(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map(match => Object.fromEntries(
    [...match[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(attribute => [attribute[1].toLowerCase(), attribute[2]]),
  ));
}
function builtLanguagePage(code) {
  const filename = path.join(root, 'dist', `${languagePath(code).slice(1)}.html`);
  assert.ok(existsSync(filename), `${code}: available language page must be prerendered`);
  return readFileSync(filename, 'utf8');
}

test('national language registry distinguishes available translations from genuinely pending languages', () => {
  assert.equal(LANGUAGES.length, 23, '22 scheduled languages plus English');
  assert.equal(new Set(LANGUAGES.map(item => item.code)).size, LANGUAGES.length);
  assert.deepEqual(LANGUAGES.filter(item => item.status === 'pending').map(item => item.code).sort(), Object.keys(pending).sort());
  for (const item of LANGUAGES) {
    assert.ok(['available', 'pending'].includes(item.status), item.code);
    assert.ok(item.name.trim() && item.english.trim() && item.script, item.code);
    assert.ok(['ltr', 'rtl'].includes(item.dir), item.code);
    assert.equal(languageFromPath(languagePath(item.code))?.code, item.code);
    if (item.status === 'pending') {
      assert.equal(item.searchReady, false, `${item.code}: unreviewed missing translation cannot enter search`);
      assert.equal(pending[item.code].status, 'pending');
      assert.ok(pending[item.code].reason.trim());
      assert.equal(existsSync(localeFile(item.code)), false, `${item.code}: no fake fallback dictionary`);
    }
  }
  assert.deepEqual(LANGUAGES.filter(item => item.dir === 'rtl').map(item => item.code).sort(), ['ks', 'sd', 'ur']);
  assert.equal(getLanguage('xx'), null);
  assert.equal(normalizeLanguage('TA-in'), 'ta');
  assert.equal(normalizeLanguage('ur_PK'), 'ur');
  assert.equal(normalizeLanguage('javascript:alert(1)'), null);
  assert.equal(languageFromPath('/ta/mandi-bhav/extra'), null);
});

test('every available interface has all message keys and real nonempty text', () => {
  const expectedKeys = Object.keys(base).sort();
  for (const language of AVAILABLE_LANGUAGES) {
    assert.ok(existsSync(localeFile(language.code)), `${language.code}: own locale dictionary`);
    const copy = JSON.parse(readFileSync(localeFile(language.code), 'utf8'));
    assert.deepEqual(Object.keys(copy).sort(), expectedKeys, `${language.code}: complete key parity`);
    for (const [key, value] of Object.entries(copy)) {
      assert.equal(typeof value, 'string', `${language.code}.${key}: message must be text`);
      assert.ok(value.trim(), `${language.code}.${key}: nonempty message`);
      assert.doesNotMatch(value, /\b(?:TODO|TRANSLATE_ME)\b|\uFFFD/, `${language.code}.${key}: no placeholder/replacement character`);
    }
    if (language.code !== 'en') assert.notEqual(copy.headline, base.headline, `${language.code}: headline is not an English fallback`);
    if (language.dir === 'rtl') assert.match(copy.headline, /\p{Script=Arabic}/u, `${language.code}: Arabic-script headline`);
  }
});

test('national tools accept native decimal digits and reject blank or malformed numeric quotes', () => {
  for (const digits of ['१२३४.५', '১২৩৪.৫', '੧੨੩੪.੫', '૧૨૩૪.૫', '୧୨୩୪.୫', '௧௨௩௪.௫', '౧౨౩౪.౫', '೧೨೩೪.೫', '൧൨൩൪.൫', '١٢٣٤٫٥', '۱۲۳۴٫۵', '᱑᱒᱓᱔.᱕']) {
    assert.equal(parseLanguageNumber(digits), 1234.5, digits);
  }
  assert.equal(parseLanguageNumber('1,23,456.75'), 123456.75);
  assert.equal(parseLanguageNumber('123,456.75'), 123456.75);
  assert.equal(parseLanguageNumber('۰'), 0);
  assert.equal(parseLanguageNumber(0), 0);
  for (const input of ['', ' ', null, undefined, false, {}, '0x10', '1e3', 'Infinity', 'NaN', '12,34', '1,2,3', '1 000', '20 rupees', Infinity, NaN]) {
    assert.equal(parseLanguageNumber(input), null, String(input));
  }
});

test('price cards use dated valid observations rather than ingestion timestamps or catalog summaries', () => {
  const dailyHistory = [
    { date: '2026-10-08', market: '१२५०', mandis: 7 },
    { date: '2026-10-02', market: 1100 },
    { date: '2026-10-09', market: 0 },
    { date: '2026-10-10', market: -10 },
    { date: '2026-02-30', market: 9000 },
    { date: '2026-13-01', market: 9000 },
    { date: '2026-10-16T00:00:00Z', market: 9000 },
    { date: '2026-10-15', market: 'not a price' },
  ];
  const snapshot = JSON.stringify(dailyHistory);
  assert.deepEqual(latestPriceRecord({ dailyHistory, history: [{ date: '2026-10', market: 1400 }], lastUpdated: '2026-10-17T12:00:00Z', avgPrice: 1500 }), {
    date: '2026-10-08', market: 1250, mandis: 7, basis: 'daily',
  });
  assert.equal(JSON.stringify(dailyHistory), snapshot, 'selection does not mutate cached API responses');
  assert.equal(latestPriceRecord({ lastUpdated: '2026-10-17T12:00:00Z', avgPrice: 1500 }), null);
  assert.equal(latestPriceRecord(null), null);
});

test('monthly fallback preserves its month and never invents a daily quote date', () => {
  assert.deepEqual(latestPriceRecord({ dailyHistory: [{ date: '2026-02-29', market: 9000 }], history: [
    { date: '2026-03', market: 1300 }, { date: '2026-01', market: 1100 },
    { date: '2026-13', market: 9999 }, { date: '2026-04', market: null }, { date: '2026-05', market: Infinity },
  ] }), { date: '2026-03', market: 1300, basis: 'monthly' });
  assert.equal(latestPriceRecord({ dailyHistory: [{ date: '2024-02-29', market: 1000 }] }).date, '2024-02-29');
  assert.equal(latestPriceRecord({ history: [{ date: '2026-03-01', market: 1300 }] }), null);
  assert.deepEqual(latestPriceRecord({ dailyHistory: [{ date: '2026-08-31', market: 1000 }], history: [{ date: '2026-09', market: 1300 }] }), { date: '2026-09', market: 1300, basis: 'monthly' }, 'a newer available month must not be hidden by an older daily quote');
  assert.equal(latestPriceRecord({ dailyHistory: [{ date: '2026-09-12', market: 1000 }], history: [{ date: '2026-09', market: 1300 }] }).basis, 'daily', 'daily observation wins within the same month');
});

const deliveryInput = { distance: 80, capacity: 1000, weight: 2500, rate: 18, extra: 900, roundTrip: false };
test('localized delivery estimate charges every vehicle trip and treats extra costs as one consignment total', () => {
  assert.deepEqual(calculateDeliveryEstimate(deliveryInput), { valid: true, trips: 3, totalDistance: 240, totalCost: 5220, perKg: 2.088 });
  assert.deepEqual(calculateDeliveryEstimate({ ...deliveryInput, roundTrip: true }), { valid: true, trips: 3, totalDistance: 480, totalCost: 9540, perKg: 3.816 });
  assert.equal(calculateDeliveryEstimate({ ...deliveryInput, weight: 2000 }).trips, 2);
  assert.equal(calculateDeliveryEstimate({ ...deliveryInput, weight: 2000.001 }).trips, 3, 'real payload excess needs another trip');
  assert.equal(calculateDeliveryEstimate({ ...deliveryInput, weight: 0.1 + 0.2, capacity: 0.3 }).trips, 1, 'floating-point noise is not an extra trip');
  assert.deepEqual(calculateDeliveryEstimate({ distance: '८०', capacity: '১০০০', weight: '૨૫૦૦', rate: '۱۸', extra: '۹۰۰' }), calculateDeliveryEstimate(deliveryInput));
});

test('localized delivery formula agrees with the existing delivery engine for equivalent costs', () => {
  for (const roundTrip of [false, true]) {
    const compact = calculateDeliveryEstimate({ ...deliveryInput, roundTrip });
    const full = calculateDeliveryScenario({
      quantityKg: deliveryInput.weight, packagingWeightKg: 0, capacityKg: deliveryInput.capacity,
      distanceKm: deliveryInput.distance, journeyFactor: roundTrip ? 2 : 1, freightMode: 'rate',
      ratePerKm: deliveryInput.rate, minFare: 0, tollPerTrip: 0, loadingTotal: 0, packingTotal: 0,
      otherTotal: deliveryInput.extra, marketFeePercent: 0, buyPricePerKg: 1, benchmarkPricePerKg: 1,
      lossPercent: 0, comparisonMode: 'local',
    });
    assert.equal(full.valid, true);
    assert.equal(compact.trips, full.trips);
    assert.equal(compact.totalDistance, full.totalBilledKm);
    assert.equal(compact.totalCost, full.transportTotal + full.input.otherTotal);
  }
});

test('delivery estimates reject unknown, nonpositive and unsafe values while accepting explicit zero costs', () => {
  assert.equal(calculateDeliveryEstimate({ ...deliveryInput, rate: 0, extra: '०' }).totalCost, 0);
  for (const key of ['distance', 'capacity', 'weight', 'rate', 'extra']) {
    for (const value of ['', ' ', null, undefined, -1, Infinity, '1e3', Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(calculateDeliveryEstimate({ ...deliveryInput, [key]: value }).valid, false, `${key}: ${String(value)}`);
    }
  }
  for (const key of ['distance', 'capacity', 'weight']) {
    assert.equal(calculateDeliveryEstimate({ ...deliveryInput, [key]: 0 }).valid, false, `${key}: zero is invalid`);
  }
  assert.equal(calculateDeliveryEstimate({ ...deliveryInput, distance: 1e12, weight: 1e12, capacity: 1 }).valid, false, 'overflowing multiplied totals rejected');
  assert.equal(calculateDeliveryEstimate({ ...deliveryInput, weight: 1, capacity: Number.MIN_VALUE }).valid, false, 'trip overflow rejected');
});

test('language links preserve state and crop with encoded query values and cannot create an external URL', () => {
  assert.equal(buildLanguageToolsUrl('ta', { state: 'all' }), '/ta/mandi-bhav');
  const result = buildLanguageToolsUrl('gu', { state: 'gujarat', crop: 'bengal-gramgramwhole' });
  assert.equal(result, '/gu/mandi-bhav?state=gujarat&crop=bengal-gramgramwhole');
  const unusual = { state: 'all&crop=forged', crop: 'tomato#?state=other/ગુજરાતી' };
  const url = new URL(buildLanguageToolsUrl('ur', unusual), 'https://example.test');
  assert.equal(url.origin, 'https://example.test');
  assert.equal(url.pathname, '/ur/mandi-bhav');
  assert.equal(url.searchParams.get('state'), unusual.state);
  assert.equal(url.searchParams.get('crop'), unusual.crop);
  assert.equal(url.hash, '');
  assert.equal(new URL(buildLanguageToolsUrl('https://evil.test'), 'https://example.test').pathname, '/languages');
});

test('built language pages expose translated primary content, correct document direction and self canonicals', { skip: skipBuild }, () => {
  for (const language of AVAILABLE_LANGUAGES) {
    const html = builtLanguagePage(language.code);
    const head = html.split('</head>')[0];
    const copy = JSON.parse(readFileSync(localeFile(language.code), 'utf8'));
    const document = tags(html, 'html')[0];
    assert.equal(document.lang, language.code, `${language.code}: document language`);
    assert.equal(document.dir, language.dir, `${language.code}: document direction`);
    const canonicals = tags(head, 'link').filter(tag => tag.rel === 'canonical');
    assert.equal(canonicals.length, 1, `${language.code}: one canonical`);
    assert.equal(new URL(canonicals[0].href).pathname, languagePath(language.code));
    assert.equal((head.match(/<title\b/g) || []).length, 1, `${language.code}: one title`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${language.code}: one page heading`);
    for (const key of ['headline', 'intro', 'prices', 'delivery', 'priceNote', 'estimateNote']) {
      assert.ok(html.includes(escapeHTML(copy[key])), `${language.code}: translated ${key} is rendered`);
    }
    const robots = tags(head, 'meta').find(tag => tag.name === 'robots')?.content;
    assert.ok(robots, `${language.code}: explicit indexing status`);
    assert.equal(robots.startsWith('noindex'), !language.searchReady, `${language.code}: provisional translation indexing`);
  }
});

test('search-ready language pages have reciprocal supported hreflang and an explicit chooser fallback', { skip: skipBuild }, () => {
  const supported = SEARCH_LANGUAGES.filter(item => /^[a-z]{2}$/.test(item.code));
  for (const language of SEARCH_LANGUAGES) {
    const head = builtLanguagePage(language.code).split('</head>')[0];
    const alternates = tags(head, 'link').filter(tag => tag.rel === 'alternate' && tag.hreflang);
    assert.deepEqual(alternates.map(tag => tag.hreflang).sort(), [...supported.map(item => item.code), 'x-default'].sort(), `${language.code}: real search-ready alternates only`);
    for (const alternate of alternates) {
      const url = new URL(alternate.href);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.pathname, alternate.hreflang === 'x-default' ? '/languages' : languagePath(alternate.hreflang));
    }
  }
});

test('sitemap includes only search-ready language pages and pending languages have no generated landing page', { skip: skipBuild }, () => {
  const sitemap = readFileSync(path.join(root, 'dist/sitemap.xml'), 'utf8');
  const indexedPaths = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname));
  assert.ok(indexedPaths.has('/languages'));
  for (const language of LANGUAGES) {
    assert.equal(indexedPaths.has(languagePath(language.code)), language.status === 'available' && language.searchReady, `${language.code}: sitemap publication status`);
    if (language.status === 'pending') {
      assert.equal(existsSync(path.join(root, 'dist', `${languagePath(language.code).slice(1)}.html`)), false, `${language.code}: no invented translated page`);
    }
  }
  const chooser = readFileSync(path.join(root, 'dist/languages.html'), 'utf8');
  for (const language of AVAILABLE_LANGUAGES) assert.ok(chooser.includes(`href="${languagePath(language.code)}"`), `${language.code}: visible chooser link`);
});
