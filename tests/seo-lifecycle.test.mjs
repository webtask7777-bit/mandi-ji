import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { indexDeadline, isRuntimeIndexable, runtimeSitemap } from '../shared/seoLifecycle.js';
import { getCropIndexability } from '../shared/cropIndexability.js';
import { getMandiIndexability } from '../shared/mandiPages.js';
import { blogCanonicalSearch, blogLibraryPath, blogRedirectPath, parseBlogLibraryPath } from '../shared/blogPagination.js';

test('crop index expiration matches the shared policy at the India midnight boundary', () => {
  const detail = { dailyHistory: [{ date: '2026-07-31', market: 1000 }] };
  const entry = ['/crop/example', '2026-07-31', indexDeadline('2026-07-31', 90)];
  assert.equal(new Date(entry[2]).toISOString(), '2026-10-29T18:30:00.000Z');
  for (const stamp of ['2026-10-29T18:29:59.999Z', '2026-10-29T18:30:00.000Z', '2026-11-02T00:00:00Z']) {
    assert.equal(isRuntimeIndexable(entry, Date.parse(stamp)), !getCropIndexability(detail, { asOf: stamp }).noIndex);
  }
  const monthly = { history: [{ date: '2026-07', market: 1000 }] };
  assert.equal(indexDeadline('2026-07', 90), indexDeadline('2026-07-01', 90));
  assert.equal(isRuntimeIndexable(['/crop/monthly', '2026-07', indexDeadline('2026-07', 90)], Date.parse('2026-10-01T00:00:00Z')), !getCropIndexability(monthly, { asOf: '2026-10-01T00:00:00Z' }).noIndex);
  assert.equal(indexDeadline('2026-02-30', 90), 0);
});

test('mandi expiration depends on three recent crops, not just its newest quote', () => {
  const mandi = { crops: [{ id: 'wheat', lastDate: '2026-10-29' }, { id: 'paddycommon', lastDate: '2026-10-28' }, { id: 'maize', lastDate: '2026-09-30' }] };
  const entry = ['/mandi/example/market', '2026-10-29', indexDeadline('2026-09-30', 30)];
  for (const stamp of ['2026-10-30T18:29:59.999Z', '2026-10-30T18:30:00.000Z']) {
    assert.equal(isRuntimeIndexable(entry, Date.parse(stamp)), !getMandiIndexability(mandi, { asOf: stamp }).noIndex);
  }
});

test('request-time sitemap expires price pages while retaining dated editorial and state hubs', () => {
  const manifest = { origin: 'https://sahibhav.in', entries: [
    ['/blog/old-but-useful-guide', '2025-01-01', null],
    ['/mandi-bhav/punjab', null, null],
    ['/mandi-bhav/punjab/litchi', '2026-07-31', indexDeadline('2026-07-31', 90)],
    ['/crop/already-stale', null, 0],
  ] };
  const before = runtimeSitemap(manifest, Date.parse('2026-10-29T18:29:59Z'));
  const after = runtimeSitemap(manifest, Date.parse('2026-10-29T18:30:00Z'));
  assert.match(before, /\/punjab\/litchi</);
  assert.doesNotMatch(after, /\/punjab\/litchi</);
  assert.doesNotMatch(before, /already-stale/);
  assert.match(after, /old-but-useful-guide/);
  assert.match(after, /<loc>https:\/\/sahibhav.in\/mandi-bhav\/punjab<\/loc>/);
  assert.match(after, /<lastmod>2025-01-01<\/lastmod>/, 'content dates are not replaced by crawl dates');
});

test('blog pagination uses clean paths and legacy redirects preserve meaningful navigation', () => {
  assert.equal(blogLibraryPath('hi', 1), '/blog');
  assert.equal(blogLibraryPath('hi', 2), '/blog/page/2');
  assert.equal(blogLibraryPath('pa', 3), '/pa/blog/page/3');
  assert.equal(blogRedirectPath('/blog', new URLSearchParams('page=2&state=punjab&toolLanguage=hi')), '/blog/page/2?state=punjab&toolLanguage=hi');
  assert.equal(blogRedirectPath('/blog/page/1', new URLSearchParams()), '/blog');
  assert.equal(blogRedirectPath('/en/blog', new URLSearchParams('language=hi')), '/en/blog', 'path language wins over stale legacy query');
  assert.equal(blogRedirectPath('/blog', new URLSearchParams('language=en&page=2')), '/en/blog/page/2');
  assert.equal(blogRedirectPath('/blog/page/2', new URLSearchParams()), null);
  for (const value of ['/blog/page/../../admin', '/blog/page/2x', '/unknown/blog', '/blog/page/0']) assert.equal(parseBlogLibraryPath(value), null);
});

test('filtered blog canonicals include only content filters and retain exact crop identities', () => {
  assert.equal(blogCanonicalSearch('toolLanguage=pa&sourceCrop=paddycommon&utm_source=test'), '');
  assert.equal(blogCanonicalSearch('q=नमी&crop=rice&state=all&page=2'), 'crop=rice&q=%E0%A4%A8%E0%A4%AE%E0%A5%80');
  assert.equal(blogCanonicalSearch('crop=paddy&state=punjab&toolLanguage=hi'), 'crop=paddy&state=punjab');
});

const pageTwoFile = new URL('../dist/blog/page/2.html', import.meta.url);
const artifactOptions = { skip: existsSync(pageTwoFile) ? false : 'Run the production build first.' };
test('page two has its own initial content, self-canonical and crawlable previous link', artifactOptions, () => {
  const html = readFileSync(pageTwoFile, 'utf8');
  assert.match(html, /rel="canonical"[^>]*href="https:\/\/sahibhav.in\/blog\/page\/2"/);
  assert.match(html, /name="robots"[^>]*content="index, follow/);
  assert.match(html, /href="\/blog"[^>]*rel="prev"|rel="prev"[^>]*href="\/blog"/);
  assert.match(html, /href="\/blog\/gehun-ki-buvai-sahi-samay-aur-tarika(?:"|\?)/);
  assert.doesNotMatch(html, /sb-journal-feature__image/);
  assert.doesNotMatch(html.split('</head>')[0], /hrefLang=/i, 'unequal language collections have no hreflang');
  const snapshot = JSON.parse(html.match(/<script id="sahibhav-public-data" type="application\/json">([^]*?)<\/script>/)[1]);
  assert.equal(snapshot['/cms/blog?page=2&limit=10'].data.page, 2);
});

const manifestFile = new URL('../server/generated/seo/runtime-index.json', import.meta.url);
test('routing middleware preserves intentional noindex and redirects pagination before static files', { skip: existsSync(manifestFile) ? false : 'Run the production build first.' }, async () => {
  const { default: proxy } = await import('../proxy.js');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const redirect = proxy(new Request('https://sahibhav.in/blog?page=2&state=punjab'));
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://sahibhav.in/blog/page/2?state=punjab');
  const filtered = proxy(new Request('https://sahibhav.in/blog?q=wheat'));
  assert.equal(filtered.headers.get('x-robots-tag'), 'noindex, follow');
  const context = proxy(new Request('https://sahibhav.in/blog?toolLanguage=pa'));
  assert.equal(context.headers.get('x-robots-tag'), null, 'navigation-only context is not a content filter');
  const stale = manifest.entries.find(entry => entry[2] !== null && !isRuntimeIndexable(entry));
  assert.ok(stale, 'build contains a known stale price fixture');
  const page = proxy(new Request(`https://sahibhav.in${stale[0]}`));
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, follow');
  const sitemap = proxy(new Request('https://sahibhav.in/sitemap.xml'));
  assert.match(sitemap.headers.get('content-type'), /application\/xml/);
  assert.equal(sitemap.headers.get('cache-control'), 'no-store');
  const xml = await sitemap.text();
  assert.ok(!xml.includes(`<loc>https://sahibhav.in${stale[0]}</loc>`));
  assert.match(xml, /<loc>https:\/\/sahibhav.in\/blog\/page\/2<\/loc>/);
});
