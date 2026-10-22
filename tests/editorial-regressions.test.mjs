import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { INDIA_REGIONS, getIndiaRegion, normalizeRegionId } from '../shared/indiaRegions.js';
import { getLanguage, languagePath } from '../shared/languages.js';
import { editorialArticleLanguage, editorialStateName, getEditorialLabels } from '../src/utils/editorialLabels.js';
import { getEditorialPost, listEditorialPosts } from '../server/utils/editorial.js';

const readJSON = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const posts = readJSON('../server/db/data/blog-posts.json');
const hasSSR = existsSync(new URL('../dist-ssr/entry-server.js', import.meta.url));
const ssrOptions = { skip: hasSSR ? false : 'Build the SSR bundle first.' };
const parseUrl = href => new URL(href.replaceAll('&amp;', '&'), 'https://sahibhav.in');

async function render(route, responses = {}) {
  const { renderPage } = await import('../dist-ssr/entry-server.js');
  return renderPage(route, responses);
}
const jsonLd = result => [...`${result.head}${result.html}`.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));

test('article locale registry contains exactly the actual published articles', () => {
  const registry = readJSON('../src/data/editorialLocales.json');
  const published = posts.filter(post => post.status === 'published' && post.content?.trim());
  assert.deepEqual(Object.keys(registry).sort(), published.map(post => post.slug).sort());
  for (const post of published) assert.equal(editorialArticleLanguage(post.slug), post.language);
  assert.equal(editorialArticleLanguage('unpublished-guide-ur'), null, 'a slug suffix cannot invent an article language');
  assert.equal(editorialArticleLanguage('__proto__'), null);
});

test('editorial state choices match canonical price scopes and merge historical UT aliases', () => {
  const apiStates = readJSON('../server/db/data/india/states.json');
  assert.equal(INDIA_REGIONS.length, 36);
  assert.deepEqual(INDIA_REGIONS.map(region => region.id).sort(), apiStates.map(region => region.id).sort());
  for (const alias of ['dadra-nagar-haveli', 'daman-diu', 'dadra-nagar-haveli-daman-diu']) {
    assert.equal(normalizeRegionId(alias), 'dadra-daman');
    assert.equal(getIndiaRegion(alias).id, 'dadra-daman');
  }
  assert.equal(normalizeRegionId('not-a-state'), 'not-a-state', 'unknown places are not silently replaced');
  assert.equal(getIndiaRegion('not-a-state'), null);
  assert.equal(editorialStateName('dadra-daman', '', 'en'), 'Dadra and Nagar Haveli and Daman and Diu');
  assert.equal(editorialStateName('andaman-nicobar', '', 'ur'), 'Andaman and Nicobar', 'untranslated names retain the actual source name');
  assert.equal(editorialStateName('assam', 'असम', 'mr'), 'आसाम');
});

test('published article loading and API errors retain actual article language despite different tool language', ssrOptions, async () => {
  for (const post of posts.filter(post => post.translationGroup === 'tomato-sale-delivery')) {
    const path = `/cms/blog/${post.slug}`;
    const code = post.language;
    const copy = getEditorialLabels(code);
    const route = `/blog/${post.slug}?toolLanguage=${code === 'ur' ? 'ta' : 'ur'}`;
    for (const [state, responses] of [['loading', {}], ['error', { [path]: { error: 'API 503: service unavailable' } }]]) {
      const result = await render(route, responses);
      assert.match(result.html, new RegExp(`class="sb-journal-page[^>]*lang="${code}" dir="${getLanguage(code).dir}"`), `${code}: ${state} direction`);
      assert.ok(result.html.includes(state === 'loading' ? copy.articleLoading : copy.failed), `${code}: ${state} copy`);
    }
  }
});

test('native article metadata follows its native hierarchy and description, with context-free URLs', ssrOptions, async () => {
  const post = posts.find(item => item.language === 'ur');
  const path = `/cms/blog/${post.slug}`;
  const result = await render(`/blog/${post.slug}?toolLanguage=ta&state=tamil-nadu&sourceCrop=tomato&q=tomato&category=Markets&page=2`, { [path]: { data: getEditorialPost(posts, post.slug) } });
  const schemas = jsonLd(result);
  const app = schemas.find(item => item['@type'] === 'WebApplication');
  assert.equal(app.inLanguage, 'ur');
  assert.equal(app.description, post.seoDescription);
  const breadcrumb = schemas.flatMap(item => item['@graph'] || []).find(item => item['@type'] === 'BreadcrumbList');
  assert.deepEqual(breadcrumb.itemListElement.map(item => parseUrl(item.item).pathname), [languagePath('ur'), '/ur/blog', `/blog/${post.slug}`]);
  assert.ok(breadcrumb.itemListElement.every(item => !parseUrl(item.item).search));
  const translationLinks = [...result.html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]).filter(tag => /\bhrefLang="/i.test(tag));
  assert.equal(translationLinks.length, 13);
  for (const tag of translationLinks) {
    const href = tag.match(/\bhref="([^"]+)"/i)[1];
    const url = parseUrl(href);
    assert.equal(url.searchParams.get('toolLanguage'), 'ta');
    assert.equal(url.searchParams.get('sourceCrop'), 'tomato');
    assert.equal(url.searchParams.get('state'), 'tamil-nadu');
    for (const key of ['q', 'category', 'page']) assert.equal(url.searchParams.has(key), false, `${key} must not filter a different article language`);
  }
});

test('native library renders canonical states and language-specific accessible option labels', ssrOptions, async () => {
  const apiPath = '/cms/blog?page=1&limit=10&language=ur&state=dadra-daman';
  const result = await render('/ur/blog?state=daman-diu', { [apiPath]: { data: listEditorialPosts(posts, { language: 'ur', state: 'dadra-daman' }) } });
  assert.ok(result.requested.includes(apiPath), 'legacy alias requests the canonical scope');
  const stateSelect = result.html.match(/<select name="state"[^>]*>(.*?)<\/select>/s)[1];
  assert.equal((stateSelect.match(/<option\b/g) || []).length, 37, '36 regions plus all-states option');
  assert.doesNotMatch(stateSelect, /value="(?:daman-diu|dadra-nagar-haveli)"/);
  assert.match(stateSelect, /<option[^>]*value="dadra-daman"[^>]*selected=""[^>]*>Dadra and Nagar Haveli and Daman and Diu<\/option>/);
  const languageSelect = result.html.match(/<select name="language"[^>]*>(.*?)<\/select>/s)[1];
  assert.match(languageSelect, /<option[^>]*value="ur"[^>]*lang="ur"[^>]*dir="rtl"/);
  assert.match(languageSelect, /<option[^>]*value="ta"[^>]*lang="ta"[^>]*dir="ltr"/);
  const chooser = [...result.html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => parseUrl(match[1])).find(url => url.pathname === '/languages');
  assert.equal(chooser.searchParams.get('toolLanguage'), 'ur');
  assert.equal(chooser.searchParams.get('state'), 'dadra-daman');
});
