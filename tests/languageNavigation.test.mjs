import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { listEditorialPosts, getEditorialPost } from '../server/utils/editorial.js';
import { EDITORIAL_LANGUAGE_CODES } from '../shared/editorialLanguages.js';
import {
  readLanguageNavigation, buildLanguageChooserUrl, buildLanguageBlogUrl,
  buildArticleNavigationUrl, localizedToolsUrl, localizedPriceUrl, editorialNavigationUrl,
  buildHindiCropDetailUrl, dashboardLanguageContext, dashboardLanguageSection,
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
  const delivery = parse(buildLanguageChooserUrl({ ...context, toolSection: 'delivery' }));
  assert.equal(readLanguageNavigation(delivery.search).toolSection, 'delivery');
  for (const section of ['https://evil.test', 'delivery#other', 'unknown']) {
    assert.equal(readLanguageNavigation(`?toolSection=${encodeURIComponent(section)}`).toolSection, undefined);
    assert.equal(parse(buildLanguageChooserUrl({ toolSection: section })).searchParams.has('toolSection'), false);
  }
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

test('article round-trip preserves bounded native search, category and pagination separately from tool context', () => {
  const search = { ...context, q: 'टमाटर & ढुलाई', category: 'मंडी और लागत', page: '2' };
  const article = parse(buildArticleNavigationUrl('a-guide', search));
  const retained = readLanguageNavigation(article.search);
  assert.deepEqual(retained, search);
  const library = parse(buildLanguageBlogUrl('hi', retained));
  assert.equal(library.searchParams.get('q'), search.q);
  assert.equal(library.searchParams.get('category'), search.category);
  assert.equal(library.searchParams.get('page'), '2');
  assert.equal(parse(localizedToolsUrl(retained, 'hi')).searchParams.has('q'), false, 'editorial search never becomes a price filter');
  assert.equal(readLanguageNavigation('?q=first&q=second').q, 'first', 'filter reading agrees with the rendered library');
  const unsafe = readLanguageNavigation(`?q=${'a'.repeat(300)}&category=%00native%0A&page=900000000`);
  assert.equal(unsafe.q.length, 160);
  assert.equal(unsafe.category, 'native');
  assert.equal(unsafe.page, undefined);
  for (const page of ['-1', '0', '1', '2e3', '2.5', 'NaN']) assert.equal(readLanguageNavigation(`?page=${page}`).page, undefined);
});

test('Hindi detail continuation keeps a validated native language and exact scoped crop', () => {
  assert.equal(buildHindiCropDetailUrl('tomato', 'tamil-nadu', 'ta'), '/mandi-bhav/tamil-nadu/tomato?toolLanguage=ta');
  assert.equal(buildHindiCropDetailUrl('paddycommon', 'daman-diu', 'ur'), '/mandi-bhav/dadra-daman/paddycommon?toolLanguage=ur');
  assert.equal(buildHindiCropDetailUrl('tomato', 'all', 'kok'), '/crop/tomato');
  const link = parse(buildHindiCropDetailUrl('tomato', 'tamil-nadu', 'ta'));
  const navigation = readLanguageNavigation(link.search);
  assert.equal(localizedToolsUrl({ ...navigation, state: 'tamil-nadu', sourceCrop: 'tomato' }, 'hi', 'prices'), '/ta/mandi-bhav?state=tamil-nadu&crop=tomato#language-prices');
});

test('dashboard language entry retains region and exact map crop without guessing a crop family', () => {
  const scoped = dashboardLanguageContext('/mandi-bhav/tamil-nadu', '?tab=naksha&mapCrop=paddycommon&state=punjab');
  assert.equal(localizedToolsUrl({ ...scoped, toolLanguage: 'ta' }), '/ta/mandi-bhav?state=tamil-nadu&crop=paddycommon');
  assert.equal(dashboardLanguageContext('/', '?state=dadra-nagar-haveli').state, 'dadra-daman');
  assert.equal(dashboardLanguageContext('/', '?state=unknown-state').state, 'unknown-state');
  assert.equal(dashboardLanguageContext('/', '?crop=paddy').sourceCrop, '');
  assert.equal(dashboardLanguageSection('/delivery-calculator'), 'delivery');
  assert.equal(dashboardLanguageSection('/mandi-bhav/tamil-nadu', '?tab=delivery'), 'delivery');
  assert.equal(dashboardLanguageSection('/mandi-bhav/tamil-nadu', '?tab=prices'), '');
});

const hasSSR = existsSync(new URL('../dist-ssr/entry-server.js', import.meta.url));
const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
const linkedUrls = html => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)].map(match => parse(match[1].replaceAll('&amp;', '&')));
const seoLinkedUrls = html => [...html.matchAll(/<link\b[^>]*>/g)]
  .filter(match => /\brel="(?:canonical|alternate)"/.test(match[0]))
  .map(match => parse(match[0].match(/\bhref="([^"]+)"/)[1].replaceAll('&amp;', '&')));
async function renderNavigationPage(route, initialResponses = {}) {
  const { renderPage } = await import('../dist-ssr/entry-server.js');
  const responses = { ...initialResponses };
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

test('rendered Hindi detail offers a native return using route scope while keeping Hindi SEO', { skip: hasSSR ? false : 'Build the SSR bundle first.' }, async () => {
  const result = await renderNavigationPage('/mandi-bhav/tamil-nadu/tomato?toolLanguage=ta&state=punjab&sourceCrop=wheat', {
    '/prices/tomato?months=13&state=tamil-nadu': { data: { crop: { id: 'tomato', name: 'Tomato', nameHi: 'टमाटर' }, history: [], dailyHistory: [], districtBreakdown: [] } },
    '/mandi-compare/tomato?state=tamil-nadu': { data: [] },
    '/ticker?state=tamil-nadu': { data: [] },
  });
  const native = linkedUrls(result.html).filter(url => url.pathname === '/ta/mandi-bhav');
  assert.ok(native.length >= 1, 'Hindi detail has an in-app native return');
  for (const url of native) {
    assert.equal(url.searchParams.get('state'), 'tamil-nadu');
    assert.equal(url.searchParams.get('crop'), 'tomato');
    assert.equal(url.hash, '#language-prices');
  }
  assert.match(result.head + result.html, /rel="canonical"[^>]+href="https:\/\/sahibhav.in\/mandi-bhav\/tamil-nadu\/tomato"/);
  assert.match(result.head + result.html, /property="og:locale"[^>]+content="hi_IN"/);
});

test('rendered chooser preserves price scope while changing the tool language', { skip: hasSSR ? false : 'Build the SSR bundle first.' }, async () => {
  const result = await renderNavigationPage('/languages?state=tamil-nadu&crop=paddycommon');
  const links = linkedUrls(result.html).filter(url => url.pathname.endsWith('/mandi-bhav'));
  // The recommendation and task cards may repeat a destination; all 18 language
  // choices must still be present, and every tool link must preserve exact scope.
  assert.equal(new Set(links.map(url => url.pathname)).size, 18);
  for (const link of links) {
    assert.equal(link.searchParams.get('state'), 'tamil-nadu');
    assert.equal(link.searchParams.get('crop'), 'paddycommon');
  }
  assert.match(result.head + result.html, /rel="canonical"[^>]+href="https:\/\/sahibhav.in\/languages"/);
});

test('chooser header retains the selected language and exact source crop over an editorial topic', { skip: hasSSR ? false : 'Build the SSR bundle first.' }, async () => {
  const result = await renderNavigationPage('/languages?toolLanguage=ur&state=punjab&sourceCrop=paddycommon&crop=paddy');
  const header = result.html.match(/<header\b[^>]*class="sb-language-chooser-header"[^>]*>([\s\S]*?)<\/header>/)?.[1];
  assert.ok(header, 'the chooser has its navigation header');
  const headerLinks = linkedUrls(header);
  assert.equal(headerLinks.length, 2, 'both the brand and market continuation are present');
  for (const link of headerLinks) {
    assert.equal(link.pathname, '/ur/mandi-bhav', 'header continuation keeps the reader’s explicit language');
    assert.equal(link.searchParams.get('state'), 'punjab');
    assert.equal(link.searchParams.get('crop'), 'paddycommon', 'the exact commodity is not replaced by its topic');
    assert.equal(link.hash, '#language-prices');
  }
  const choices = linkedUrls(result.html).filter(url => url.pathname.endsWith('/mandi-bhav'));
  assert.equal(new Set(choices.map(url => url.pathname)).size, 18);
  for (const link of choices) assert.equal(link.searchParams.get('crop'), 'paddycommon');
});

test('preview language chooser labels its actual Hindi guide fallback', { skip: hasSSR ? false : 'Build the SSR bundle first.' }, async () => {
  const result = await renderNavigationPage('/languages?toolLanguage=ks&state=punjab&crop=brinjal');
  assert.ok(result.html.includes('हिन्दी में उपलब्ध गाइड पढ़ें'));
  assert.ok(result.html.includes('हिन्दी में खेती की मार्गदर्शिकाएँ'));
  const guides = linkedUrls(result.html).filter(url => url.pathname.endsWith('/blog'));
  assert.ok(guides.length >= 2);
  for (const link of guides) {
    assert.equal(link.pathname, '/blog', 'fallback points to the actual Hindi library');
    assert.equal(link.searchParams.get('toolLanguage'), 'ks', 'the original tool language survives the guide visit');
    assert.equal(link.searchParams.get('state'), 'punjab');
    assert.equal(link.searchParams.get('sourceCrop'), 'brinjal');
  }
});

test('delivery language choice retains the calculator destination without a saved language', { skip: hasSSR ? false : 'Build the SSR bundle first.' }, async () => {
  const { renderPage } = await import('../dist-ssr/entry-server.js');
  const delivery = await renderPage('/delivery-calculator?state=tamil-nadu&sourceCrop=paddycommon', {});
  const chooser = linkedUrls(delivery.html).find(url => url.pathname === '/languages');
  assert.ok(chooser, 'the delivery page exposes the language chooser before a preference is saved');
  assert.equal(chooser.searchParams.get('toolSection'), 'delivery');
  const result = await renderNavigationPage(`${chooser.pathname}${chooser.search}`);
  // Explicit price/guide task cards are separate from language-choice links.
  const languageChoiceLinks = [...result.html.matchAll(/<a\b[^>]*\bhrefLang="[^"]+"[^>]*>/gi)].map(match => match[0]).join('');
  const choices = linkedUrls(languageChoiceLinks).filter(url => url.pathname.endsWith('/mandi-bhav'));
  assert.equal(choices.length, 18);
  for (const url of choices) {
    assert.equal(url.searchParams.get('state'), 'tamil-nadu');
    assert.equal(url.searchParams.get('crop'), 'paddycommon');
    assert.equal(url.hash, '#language-delivery');
  }
  const native = await renderPage('/ta/mandi-bhav?state=tamil-nadu&crop=paddycommon#language-delivery', {});
  const nativeChooser = linkedUrls(native.html).find(url => url.pathname === '/languages');
  assert.equal(nativeChooser.searchParams.get('toolSection'), 'delivery', 'another language choice keeps the active calculator section');
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
  assert.match(result.head + result.html, /rel="canonical"[^>]+href="https:\/\/sahibhav.in\/ur\/blog\?state=tamil-nadu"/);
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
