import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { getLanguage, AVAILABLE_LANGUAGES } from '../shared/languages.js';
import { EDITORIAL_LANGUAGE_CODES } from '../shared/editorialLanguages.js';

const hasSSR = existsSync(new URL('../dist-ssr/entry-server.js', import.meta.url));
const ssrOptions = { skip: hasSSR ? false : 'Build the updated SSR bundle first.' };
const states = [
  { id: 'chhattisgarh', name: 'Chhattisgarh', hasData: true, totalRecords: 10 },
  { id: 'tamil-nadu', name: 'Tamil Nadu', hasData: true, totalRecords: 10 },
];
const crops = [
  { id: 'capsicum', name: 'Capsicum', nameEn: 'Capsicum', nameHi: 'शिमला मिर्च' },
  { id: 'tomato', name: 'Tomato', nameEn: 'Tomato', nameHi: 'टमाटर' },
];
const toolResponses = {
  '/states': { data: states },
  '/crops?state=chhattisgarh': { data: crops },
  '/prices/capsicum?state=chhattisgarh&months=13': { data: { dailyHistory: [{ date: '2025-01-01', market: 1000 }], history: [] } },
};
async function render(route, responses = {}) {
  const { renderPage } = await import('../dist-ssr/entry-server.js');
  return renderPage(route, responses);
}

test('native tools use available state translations and tag fallback crop names by their actual language', ssrOptions, async () => {
  const cases = [
    ['hi', 'छत्तीसगढ़', 'hi', 'शिमला मिर्च', 'hi'],
    ['mr', 'छत्तीसगड', 'mr', 'शिमला मिर्च', 'hi'],
    ['gu', 'છત્તીસગઢ', 'gu', 'Capsicum', 'en'],
    ['ne', 'Chhattisgarh', 'en', 'शिमला मिर्च', 'hi'],
    ['ta', 'Chhattisgarh', 'en', 'Capsicum', 'en'],
    ['ur', 'Chhattisgarh', 'en', 'Capsicum', 'en'],
  ];
  for (const [code, stateName, stateLanguage, cropName, cropLanguage] of cases) {
    const result = await render(`/${code}/mandi-bhav?state=chhattisgarh&crop=capsicum`, toolResponses);
    assert.match(result.html, new RegExp(`<option[^>]*value="chhattisgarh"[^>]*lang="${stateLanguage}"[^>]*>${stateName}</option>`), `${code}: state option uses a real translated label or marked English source`);
    assert.ok(result.html.includes(`<span lang="${stateLanguage}" dir="ltr">${stateName}</span>`), `${code}: selected state keeps the same label and language`);
    assert.ok(result.html.includes(`<h3 lang="${cropLanguage}" dir="ltr">${cropName}</h3>`), `${code}: selected crop fallback is not mislabeled as translated`);
    assert.ok(result.requested.includes('/prices/capsicum?state=chhattisgarh&months=13'), `${code}: names do not change the exact commodity request`);
    if (code === 'mr') assert.ok(result.html.includes('<strong lang="mr" dir="ltr">टोमॅटो</strong>'), 'actual Marathi translations retain their own language');
    if (code === 'ur') assert.match(result.html, /class="sb-language-page[^>]*lang="ur" dir="rtl"/);
  }
});

test('every editorial language gets its own district-weather utility with official destinations', ssrOptions, async () => {
  const scriptPatterns = {
    hi: /\p{Script=Devanagari}/u, mr: /\p{Script=Devanagari}/u, ne: /\p{Script=Devanagari}/u,
    as: /\p{Script=Bengali}/u, bn: /\p{Script=Bengali}/u, gu: /\p{Script=Gujarati}/u,
    kn: /\p{Script=Kannada}/u, ml: /\p{Script=Malayalam}/u, or: /\p{Script=Oriya}/u,
    pa: /\p{Script=Gurmukhi}/u, ta: /\p{Script=Tamil}/u, te: /\p{Script=Telugu}/u, ur: /\p{Script=Arabic}/u,
    en: /[A-Za-z]/,
  };
  const titles = new Map();
  for (const code of EDITORIAL_LANGUAGE_CODES) {
    const route = code === 'hi' ? '/blog' : `/${code}/blog`;
    const apiPath = `/cms/blog?page=1&limit=10${code === 'hi' ? '' : `&language=${code}`}`;
    const result = await render(route, { [apiPath]: { data: { posts: [], total: 0, totalPages: 1, facets: {} } } });
    const section = result.html.match(/<section class="sb-local-weather"[^>]*>[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, `${code}: official weather links remain useful even with no matching article`);
    assert.ok(section.includes(`lang="${code}" dir="${getLanguage(code).dir}"`), `${code}: truthful language and direction`);
    const title = section.match(/<h2>(.*?)<\/h2>/)?.[1];
    assert.match(title, scriptPatterns[code], `${code}: native heading script`);
    titles.set(code, title);
    for (const suffix of ['district_current_lo', 'district_current_en', 'state_current']) {
      assert.ok(section.includes(`href="https://mausam.imd.gov.in/responsive/agromet_adv_ser_${suffix}.php"`), `${code}: official destination ${suffix}`);
    }
    assert.equal((section.match(/target="_blank"/g) || []).length, 3);
  }
  for (const [code, title] of titles) if (code !== 'hi') assert.notEqual(title, titles.get('hi'), `${code}: no silent Hindi fallback`);
});

test('weather-relevant native articles include district links and render readable semantic Markdown tables', ssrOptions, async () => {
  const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
  const original = posts.find(post => post.language === 'en' && post.status === 'published');
  const post = { ...original, weatherRelevant: true, content: '## Field checklist\n\n| Region | Action |\n| --- | --- |\n| Local district | Check the issue date |' };
  const result = await render(`/blog/${post.slug}`, { [`/cms/blog/${post.slug}`]: { data: post } });
  assert.match(result.html, /<section class="sb-local-weather"[^>]*lang="en" dir="ltr"/);
  assert.match(result.html, /class="sb-journal-table-scroll"[^>]*tabindex="0"/i, 'wide tables can be scrolled with a keyboard');
  assert.match(result.html, /<table>[\s\S]*<thead>[\s\S]*<th>Region<\/th>[\s\S]*<tbody>/);
  assert.ok(result.html.includes('<td>Check the issue date</td>'));
  assert.ok(!result.html.includes('| --- | --- |'), 'Markdown delimiters are not shown as prose');
});

test('provisional language tools stay noindex without advertising a nonreciprocal hreflang cluster', ssrOptions, async () => {
  for (const language of AVAILABLE_LANGUAGES.filter(item => !item.searchReady)) {
    const result = await render(`/${language.code}/mandi-bhav`, { '/states': { data: [] }, '/crops?state=all': { data: [] } });
    // React 19 may hoist metadata into the rendered HTML instead of Helmet's head string.
    const document = result.head + result.html;
    assert.match(document, /name="robots" content="noindex, follow"/);
    assert.doesNotMatch(document, /<link\b[^>]*\bhreflang=/i, `${language.code}: no unmatched alternate cluster or x-default`);
    assert.ok(document.includes(`href="https://sahibhav.in/${language.code}/mandi-bhav"`), 'self-canonical remains available');
  }
});

test('translated article links identify Hindi-only tools without mislabeling localized destinations', ssrOptions, async () => {
  const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
  const original = posts.find(post => post.language === 'en' && post.status === 'published');
  const hints = {
    en: 'Hindi', as: 'হিন্দী', bn: 'হিন্দি', gu: 'હિન્દી', kn: 'ಹಿಂದಿ', ml: 'ഹിന്ദി',
    mr: 'हिंदी', ne: 'हिन्दी', or: 'ହିନ୍ଦୀ', pa: 'ਹਿੰਦੀ', ta: 'இந்தி', te: 'హిందీ', ur: 'ہندی',
  };
  for (const code of EDITORIAL_LANGUAGE_CODES) {
    const hint = hints[code];
    const post = {
      ...original, language: code,
      content: `[Sale calculator](/bechne-ka-hisab?crop=maize#calculator)\n\n[Calendar](/kisan-calendar)\n\n[Advice](/kisan-salah)\n\n[Existing (${hint || 'हिंदी'})](/bechne-ka-hisab)\n\n[Crop prices](/crop/maize)\n\n[Delivery](/delivery-calculator)\n\n[Older guide (Hindi)](/blog/dhan-ke-baad-rabi-fasal-chhattisgarh)`,
    };
    const result = await render(`/blog/${post.slug}`, { [`/cms/blog/${post.slug}`]: { data: post } });
    // Adjacent React text children have invisible SSR comment separators.
    const visibleMarkup = result.html.replace(/<!--[\s\S]*?-->/g, '');
    const links = [...visibleMarkup.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)];
    for (const label of ['Sale calculator', 'Calendar', 'Advice']) {
      const link = links.find(match => match[2].startsWith(label));
      assert.ok(link, `${code}: ${label} is reachable`);
      assert.match(link[1], /hrefLang="hi"/i, `${code}: destination declares Hindi`);
      assert.equal(link[2], hint ? `${label} (${hint})` : label, `${code}: native hint only when needed`);
    }
    assert.ok(links.some(match => match[1].includes('/bechne-ka-hisab?crop=maize#calculator')), `${code}: original destination, query and anchor remain intact`);
    assert.ok(links.some(match => match[2] === `Existing (${hint || 'हिंदी'})`), `${code}: manually supplied hint is not repeated`);
    for (const label of ['Crop prices', 'Delivery', 'Older guide (Hindi)']) {
      const link = links.find(match => match[2] === label);
      assert.ok(link, `${code}: ${label} keeps its existing label`);
      assert.doesNotMatch(link[1], /hrefLang="hi"/i, `${code}: no blanket Hindi label for other destinations`);
    }
  }
});
