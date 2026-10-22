import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { listEditorialPosts, getEditorialPost } from '../server/utils/editorial.js';
import { EDITORIAL_LANGUAGE_CODES } from '../shared/editorialLanguages.js';
import {
  readLanguageNavigation, buildLanguageChooserUrl, buildLanguageBlogUrl,
  buildArticleNavigationUrl, localizedToolsUrl, localizedPriceUrl, editorialNavigationUrl,
} from '../src/utils/languageNavigation.js';

const context = { toolLanguage: 'ta', state: 'tamil-nadu', sourceCrop: 'paddycommon', crop: 'paddy' };
const parse = path => new URL(path, 'https://example.test');

test('navigation retains exact commodity identity separately from editorial groups and article language', () => {
  const blog = parse(buildLanguageBlogUrl('mr', context));
  assert.equal(blog.pathname, '/mr/blog');
  assert.equal(blog.searchParams.has('language'), false);
  assert.equal(blog.searchParams.get('toolLanguage'), 'ta');
  assert.equal(blog.searchParams.get('sourceCrop'), 'paddycommon');
  assert.equal(blog.searchParams.get('crop'), 'paddy');
  assert.deepEqual(readLanguageNavigation(blog.search), context);
  const article = parse(buildArticleNavigationUrl('tamatar-vikri-vahatuk-kharch-marathi', context));
  assert.deepEqual(readLanguageNavigation(article.search), context);
  assert.equal(article.searchParams.has('language'), false, 'article language is determined by its published content');
  const tools = parse(localizedToolsUrl(context, 'mr', 'delivery'));
  assert.equal(tools.pathname, '/ta/mandi-bhav');
  assert.equal(tools.searchParams.get('crop'), 'paddycommon');
  assert.equal(tools.searchParams.get('state'), 'tamil-nadu');
  assert.equal(tools.hash, '#language-delivery');
});

test('chooser carries the exact tool selection across language choice', () => {
  const url = parse(buildLanguageChooserUrl(context));
  assert.equal(url.pathname, '/languages');
  assert.equal(url.searchParams.get('crop'), 'paddycommon');
  assert.equal(url.searchParams.get('state'), 'tamil-nadu');
  assert.equal(buildLanguageChooserUrl({ state: 'all', crop: 'tomato' }), '/languages?crop=tomato');
  assert.equal(buildLanguageChooserUrl(), '/languages');
});

test('price links retain explicit commodity and regional scope while adopting the reader tool language', () => {
  const crop = parse(localizedPriceUrl('/crop/tomato', context, 'mr'));
  assert.equal(crop.searchParams.get('crop'), 'tomato');
  assert.equal(crop.searchParams.get('state'), 'tamil-nadu');
  const regional = parse(localizedPriceUrl('/mandi-bhav/gujarat/bengal-gramgramwhole', context, 'mr'));
  assert.equal(regional.pathname, '/ta/mandi-bhav');
  assert.equal(regional.searchParams.get('crop'), 'bengal-gramgramwhole');
  assert.equal(regional.searchParams.get('state'), 'gujarat');
  assert.equal(parse(localizedPriceUrl('/mandi-bhav/gujarat', context, 'mr')).searchParams.has('crop'), false);
  assert.equal(localizedPriceUrl('/crop/tomato/more', context), null);
  assert.equal(localizedPriceUrl('https://other.test/crop/tomato', context), null);
  assert.equal(localizedToolsUrl({ crop: 'paddy' }, 'ur'), '/ur/mandi-bhav', 'editorial topic is never guessed as a priced commodity');
});

test('navigation rejects route injection, unavailable tool languages and arbitrary return URLs', () => {
  const untrusted = readLanguageNavigation('?toolLanguage=kok&state=all%26crop%3Dforged&sourceCrop=tomato%23other&crop=paddy&returnTo=https://evil.test');
  assert.deepEqual(untrusted, { toolLanguage: '', state: '', sourceCrop: '', crop: 'paddy' });
  assert.equal(localizedToolsUrl(untrusted, 'mr', 'https://evil.test'), '/mr/mandi-bhav');
  assert.equal(localizedToolsUrl({ toolLanguage: 'https://evil.test' }, 'xx'), '/hi/mandi-bhav');
  assert.equal(parse(buildArticleNavigationUrl('x?returnTo=//evil.test', context)).origin, 'https://example.test');
  assert.equal(editorialNavigationUrl('/\\evil.test', context), null);
});

test('article content links keep context but honor an explicit destination filter and fragment', () => {
  const blog = parse(editorialNavigationUrl('/blog?crop=tomato&language=gu#guides-title', context, 'mr'));
  assert.equal(blog.searchParams.get('crop'), 'tomato');
  assert.equal(blog.searchParams.get('sourceCrop'), 'paddycommon');
  assert.equal(blog.pathname, '/gu/blog');
  assert.equal(blog.searchParams.has('language'), false);
  assert.equal(blog.searchParams.get('toolLanguage'), 'ta');
  assert.equal(blog.hash, '#guides-title');
  assert.equal(parse(editorialNavigationUrl('/delivery-calculator', context, 'mr')).hash, '#language-delivery');
  assert.equal(editorialNavigationUrl('https://icar.gov.in/', context), 'https://icar.gov.in/');
  assert.equal(editorialNavigationUrl('#sources-title', context), '#sources-title');
  assert.equal(buildArticleNavigationUrl('a-guide'), '/blog/a-guide');
  assert.equal(buildLanguageBlogUrl('hi'), '/blog');
  assert.equal(buildLanguageBlogUrl('ur'), '/ur/blog');
  assert.equal(buildLanguageBlogUrl('ks'), '/blog');
  assert.equal(buildLanguageBlogUrl('kok'), '/blog');
  assert.equal(buildLanguageBlogUrl('https://evil.test'), '/blog');
});

const hasSSR = existsSync(new URL('../dist-ssr/entry-server.js', import.meta.url));
const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
const linkedUrls = html => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)].map(match => parse(match[1].replaceAll('&amp;', '&')));
const seoLinkedUrls = html => [...html.matchAll(/<link\b[^>]*>/g)]
  .filter(match => /\brel="(?:canonical|alternate)"/.test(match[0]))
  .map(match => parse(match[0].match(/\bhref="([^"]+)"/)[1].replaceAll('&amp;', '&')));
async function renderNavigationPage(route) {
  const { renderPage } = await import('../dist-ssr/entry-server.js');
  const responses = {};
  let result;
  for (let pass = 0; pass < 3; pass++) {
    result = await renderPage(route, responses);
    const missing = result.requested.filter(request => !responses[request]);
    if (!missing.length) break;
    for (const request of missing) {
      const url = parse(request);
      if (url.pathname === '/cms/blog') responses[request] = { data: listEditorialPosts(posts, Object.fromEntries(url.searchParams)) };
      else if (url.pathname.startsWith('/cms/blog/')) responses[request] = { data: getEditorialPost(posts, decodeURIComponent(url.pathname.slice('/cms/blog/'.length))) };
      else assert.fail(`Unexpected navigation fixture request: ${request}`);
    }
  }
  return result;
}

test('rendered chooser preserves price scope while changing the tool language', { skip: hasSSR ? false : 'Build the SSR bundle first.' }, async () => {
  const result = await renderNavigationPage('/languages?state=tamil-nadu&crop=paddycommon');
  const links = linkedUrls(result.html).filter(url => url.pathname.endsWith('/mandi-bhav'));
  assert.equal(links.length, 18);
  for (const link of links) {
    assert.equal(link.searchParams.get('state'), 'tamil-nadu');
    assert.equal(link.searchParams.get('crop'), 'paddycommon');
  }
  assert.match(result.head + result.html, /rel="canonical"[^>]+href="https:\/\/sahibhav.in\/languages"/);
});

test('rendered articles keep their real language, clean SEO URLs and original tool context', { skip: hasSSR ? false : 'Build the SSR bundle first.' }, async () => {
  const slug = 'tamatar-vikri-vahatuk-kharch-marathi';
  const result = await renderNavigationPage(buildArticleNavigationUrl(slug, context));
  assert.match(result.html, /sb-journal-article-page[^>]+lang="mr"[^>]+dir="ltr"/);
  assert.match(result.head + result.html, new RegExp(`rel="canonical"[^>]+href="https://sahibhav.in/blog/${slug}"`));
  const links = linkedUrls(result.html);
  const exactPrices = links.filter(url => url.pathname === '/ta/mandi-bhav' && url.hash === '#language-prices');
  assert.ok(exactPrices.some(url => url.searchParams.get('crop') === 'tomato' && url.searchParams.get('state') === 'tamil-nadu'));
  assert.ok(links.some(url => url.pathname === '/ta/mandi-bhav' && url.hash === '#language-delivery' && url.searchParams.get('crop') === 'paddycommon'));
  assert.ok(links.some(url => url.pathname === '/languages' && url.searchParams.get('crop') === 'paddycommon'));
  const seoLinks = seoLinkedUrls(result.head + result.html);
  assert.equal(seoLinks.length, getEditorialPost(posts, slug).translations.length + 2, 'one canonical plus actual translations and x-default');
  for (const link of seoLinks) assert.equal(link.search, '', 'SEO links do not carry user navigation context');
});

test('native guide library renders actual article-language direction and preserves return scope', { skip: hasSSR && posts.some(post => post.language === 'ur') ? false : 'Build with the national article translations first.' }, async () => {
  const route = buildLanguageBlogUrl('ur', { ...context, crop: '' });
  const result = await renderNavigationPage(route);
  assert.match(result.html, /sb-journal-page[^>]+lang="ur"[^>]+dir="rtl"/);
  assert.match(result.head + result.html, /rel="canonical"[^>]+href="https:\/\/sahibhav.in\/ur\/blog"/);
  const articleLinks = linkedUrls(result.html).filter(url => url.pathname.startsWith('/blog/'));
  assert.ok(articleLinks.length > 0);
  for (const link of articleLinks) {
    assert.equal(link.searchParams.get('sourceCrop'), 'paddycommon');
    assert.equal(link.searchParams.get('toolLanguage'), 'ta');
    assert.equal(link.searchParams.get('state'), 'tamil-nadu');
  }
  const unknown = await renderNavigationPage('/blog?language=unsupported-language');
  assert.match(unknown.html, /sb-journal-page[^>]+lang="hi"/);
  assert.doesNotMatch(unknown.html, /lang="unsupported-language"/);
  const unavailable = await renderNavigationPage('/ks/blog');
  assert.doesNotMatch(unavailable.html, /id="journal-title"/);
  assert.match(unavailable.head + unavailable.html, /noindex/);
  const conflicting = await renderNavigationPage('/ur/blog?language=hi');
  assert.match(conflicting.html, /sb-journal-page[^>]+lang="ur"[^>]+dir="rtl"/, 'native route language takes precedence over a legacy query');
});

test('native library pages ship translated first-paint HTML without hydration or query routing', { skip: hasSSR ? false : 'Build the static pages first.' }, () => {
  const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
  for (const code of EDITORIAL_LANGUAGE_CODES) {
    const libraryPath = buildLanguageBlogUrl(code);
    const file = new URL(`../dist${libraryPath}.html`, import.meta.url);
    assert.ok(existsSync(file), `${code}: native library HTML must exist`);
    const html = readFileSync(file, 'utf8');
    assert.match(html, new RegExp(`<html[^>]+lang="${code}"`));
    assert.match(html, new RegExp(`rel="canonical"[^>]+href="https://sahibhav.in${libraryPath}"`));
    assert.doesNotMatch(html.split('</head>')[0], /rel="alternate"[^>]+hrefLang=/i, 'non-equivalent article collections have no hreflang');
    const labelFile = new URL(`../src/i18n/editorial/${code}.json`, import.meta.url);
    if (existsSync(labelFile)) {
      const copy = JSON.parse(readFileSync(labelFile, 'utf8'));
      assert.ok(html.includes(escapeHTML(copy.hero)), `${code}: translated heading in initial HTML`);
      assert.ok(html.includes(escapeHTML(copy.guides)), `${code}: translated guide title in initial HTML`);
    }
  }
});
