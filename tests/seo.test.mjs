import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import page from '../api/page.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const generated = path.join(root, 'server/generated/seo');
const built = existsSync(path.join(generated, 'routes.json')) && existsSync(path.join(dist, 'sitemap.xml'));
const artifactOptions = { skip: built ? false : 'Run npm run build first; complete SEO build artifacts are unavailable.' };
const read = file => readFileSync(file, 'utf8');
const htmlFor = route => read(path.join(dist, route === '/' ? 'index.html' : `${route.slice(1)}.html`));
const decodeEntities = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key.toLowerCase(), decodeEntities(value)]));
const plainText = html => decodeEntities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!--[^]*?-->/g, '').replace(/<[^>]*>/g, ''));

test('Vercel clean URLs route rewrites to extensionless function endpoints', () => {
  const config = JSON.parse(read(path.join(root, 'vercel.json')));
  assert.equal(config.cleanUrls, true, 'public sitemap routes rely on clean URLs');
  const destinations = (config.rewrites || []).map(rewrite => rewrite.destination).filter(destination => destination.startsWith('/'));
  assert.ok(destinations.some(destination => destination.split('?')[0] === '/api/page'), 'missing-page handler remains reachable');
  assert.ok(destinations.some(destination => destination.split('?')[0] === '/api'), 'public API uses its clean index endpoint');
  for (const destination of destinations) assert.doesNotMatch(destination.split(/[?#]/)[0], /\.(?:html|[cm]?js)$/i, `${destination}: cleanUrls must not target a file extension`);
});

function headMetadata(html, label) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, `${label}: document head exists`);
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0]));
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]));
  const canonical = links.filter(link => link.rel === 'canonical');
  const description = metas.filter(meta => meta.name === 'description');
  const robots = metas.filter(meta => meta.name === 'robots');
  assert.equal(titles.length, 1, `${label}: one document title; SVG titles are outside the head`);
  assert.equal(canonical.length, 1, `${label}: one canonical`);
  assert.equal(description.length, 1, `${label}: one description`);
  assert.equal(robots.length, 1, `${label}: one robots directive`);
  assert.ok(description[0].content?.trim(), `${label}: nonempty description`);
  return { title: plainText(titles[0][1]), canonical: canonical[0].href, description: description[0].content, robots: robots[0].content };
}

function validatePublicSnapshot(html, label) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(match => ({ attrs: attributes(match[1]), text: match[2] }));
  const snapshots = scripts.filter(script => script.attrs.id === 'sahibhav-public-data');
  assert.equal(snapshots.length, 1, `${label}: one public data snapshot`);
  assert.equal(snapshots[0].attrs.type, 'application/json');
  assert.ok(!snapshots[0].text.includes('<'), `${label}: script-opening characters must be escaped in embedded JSON`);
  const snapshot = JSON.parse(snapshots[0].text);
  assert.ok(snapshot && !Array.isArray(snapshot) && typeof snapshot === 'object');
  const allowed = new Set(['crops', 'mandis', 'districts', 'states', 'ticker', 'prices', 'mandi-compare', 'arbitrage', 'stats']);
  for (const request of Object.keys(snapshot)) {
    const url = new URL(request, 'https://public-snapshot.invalid');
    assert.equal(url.origin, 'https://public-snapshot.invalid', `${label}: snapshot cannot reference another origin`);
    const segments = url.pathname.split('/').filter(Boolean);
    const isPublicCms = segments[0] === 'cms' && ['blog', 'banners', 'notifications'].includes(segments[1]);
    assert.ok(request.startsWith('/') && (allowed.has(segments[0]) || isPublicCms), `${label}: private API response must not enter HTML: ${request}`);
    assert.ok(!request.includes('..'), `${label}: traversal is not a public data request`);
  }
  function checkFields(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!/^(?:password|passwordHash|token|accessToken|refreshToken|secret|jwtSecret|userPhone|razorpayKeySecret)$/i.test(key), `${label}: private field ${key} in public snapshot`);
      checkFields(child);
    }
  }
  checkFields(snapshot);
  const structured = scripts.filter(script => script.attrs.type === 'application/ld+json');
  assert.ok(structured.length > 0, `${label}: structured data is present`);
  for (const script of structured) {
    const value = JSON.parse(script.text);
    assert.ok(value && typeof value === 'object', `${label}: structured data is valid JSON`);
  }
  return snapshot;
}

test('raw crop HTML contains source-dated public content in the correct geographic scope', artifactOptions, () => {
  for (const example of [
    { route: '/crop/tomato', scope: 'भारत', source: 'india/crop-prices/tomato.json', crop: 'टमाटर', request: '/prices/tomato?months=13&state=all' },
    { route: '/mandi-bhav/chhattisgarh/ladyfinger', scope: 'छत्तीसगढ़', source: 'crop-prices/ladyfinger.json', crop: 'भिण्डी', request: '/prices/ladyfinger?months=13&state=chhattisgarh' },
  ]) {
    const html = htmlFor(example.route);
    const metadata = headMetadata(html, example.route);
    const snapshot = validatePublicSnapshot(html, example.route);
    const source = JSON.parse(read(path.join(root, 'server/db/data', example.source)));
    const dated = (source.dailyHistory || []).filter(row => Number(row.market) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.date || '')).sort((a, b) => a.date.localeCompare(b.date));
    const latest = dated.at(-1) || (source.history || []).filter(row => Number(row.market) > 0).at(-1);
    assert.ok(latest?.date, `${example.route}: recorded quote has a date`);
    const isDaily = latest.date.length === 10;
    const date = new Date(`${latest.date}${isDaily ? '' : '-01'}T12:00:00Z`);
    const dateLabel = date.toLocaleDateString('hi-IN', { ...(isDaily ? { day: 'numeric' } : {}), month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    assert.ok(metadata.title.includes(example.scope), `${example.route}: correct geographic title`);
    assert.ok(metadata.title.includes(dateLabel), `${example.route}: title uses source quote date`);
    assert.ok(!/आज|live|real.time/i.test(metadata.title), `${example.route}: old records are not promoted as current`);
    assert.equal(new URL(metadata.canonical).pathname, example.route);
    assert.ok(snapshot[example.request]?.data, `${example.route}: snapshot data uses the route's geographic scope`);
    const h1 = plainText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
    assert.ok(h1.includes(example.crop), `${example.route}: crop heading exists without JavaScript`);
    const visible = plainText(html.split('</head>')[1]);
    for (const text of ['₹', 'भाव का इतिहास', 'मंडी तुलना', dateLabel]) assert.ok(visible.includes(text), `${example.route}: ${text} is server-rendered`);
    assert.ok(!/\d+ दिन पुराना रिकॉर्ड/.test(visible), `${example.route}: relative age must not freeze at build time`);
  }
});

test('every sitemap URL resolves to indexable HTML with unique metadata and safe JSON', artifactOptions, () => {
  const xml = read(path.join(dist, 'sitemap.xml'));
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decodeEntities(match[1]));
  assert.ok(urls.length > 20, 'sitemap contains substantive public coverage');
  assert.equal(new Set(urls).size, urls.length, 'no duplicate sitemap URLs');
  assert.ok(!/<lastmod\b/i.test(xml), 'unknown modification dates must not be replaced with deployment dates');
  const blockedCommodities = new Set(['cow', 'bull', 'calf', 'goat', 'cock', 'duck', 'he-buffalo', 'she-buffalo', 'pigs', 'fish', 'egg']);
  const origin = new URL(urls[0]).origin;
  for (const entry of urls) {
    const url = new URL(entry);
    assert.equal(url.origin, origin, 'canonical host is consistent');
    assert.equal(url.protocol, 'https:');
    assert.equal(url.search, '', 'query permutations stay outside sitemap');
    assert.equal(url.hash, '');
    assert.ok(!/^\/(?:api|admin|login|register|listing|my-listings|my-eway-bills|eway-bill|transport)(?:\/|$)/.test(url.pathname), `${entry}: not a private, user listing, or redirect route`);
    if (/^\/crop\/|^\/mandi-bhav\/[^/]+\//.test(url.pathname)) assert.ok(!blockedCommodities.has(decodeURIComponent(url.pathname.split('/').at(-1))), `${entry}: non-crop unit excluded`);
    const html = htmlFor(url.pathname);
    const metadata = headMetadata(html, entry);
    assert.equal(metadata.canonical, entry, `${entry}: self-canonical matches sitemap`);
    assert.match(metadata.robots, /(?:^|,\s*)index(?:,|$)/, `${entry}: indexable document`);
    assert.doesNotMatch(metadata.robots, /noindex/);
    validatePublicSnapshot(html, entry);
  }
});

test('raw home and state pages contain navigable crop links and the blog index exposes articles', artifactOptions, () => {
  const home = htmlFor('/');
  const state = htmlFor('/mandi-bhav/chhattisgarh');
  assert.match(home, /href="\/crop\/tomato"/, 'national crop landing is linked without JavaScript');
  assert.match(state, /href="\/mandi-bhav\/chhattisgarh\/ladyfinger"/, 'state catalog keeps its own source ID and scope');
  assert.doesNotMatch(state, /href="\/crop\/ladyfinger"/, 'CG-only ID must not be sent to the national dataset');
  const regionalCrop = htmlFor('/mandi-bhav/chhattisgarh/ladyfinger');
  assert.match(regionalCrop, /href="\/mandi-bhav\/chhattisgarh\/ladyfinger"/, 'comparison detail link retains the regional source ID and scope');
  assert.doesNotMatch(regionalCrop, /href="\/crop\/ladyfinger(?:[?"#])/, 'regional comparison must not link to the nonexistent national crop ID');
  const published = JSON.parse(read(path.join(root, 'server/db/data/blog-posts.json'))).filter(post => post.status === 'published' && post.slug && post.content?.trim());
  const blog = htmlFor('/blog');
  for (const post of published.slice(0, 10)) assert.ok(blog.includes(`href="/blog/${encodeURIComponent(post.slug)}"`), 'published article is discoverable from blog HTML');
});

function callGuard(url, query = {}) {
  const result = { headers: {}, statusCode: null, body: null };
  const response = {
    setHeader(name, value) { result.headers[name.toLowerCase()] = value; },
    status(code) { result.statusCode = code; return this; },
    send(body) { result.body = body; return this; },
  };
  page({ url, query }, response);
  return result;
}

test('missing public pages and listings return real 404 responses with noindex', artifactOptions, () => {
  const expected = read(path.join(generated, '404.html'));
  for (const route of ['/not-a-real-sahibhav-page', '/crop/unknown-crop-for-seo-test', '/mandi-bhav/unknown-state/wheat', '/blog/unknown-article-for-seo-test', '/listing/unknown-listing-for-seo-test']) {
    const response = callGuard(route);
    assert.equal(response.statusCode, 404, route);
    assert.equal(response.body, expected, route);
    assert.match(response.headers['x-robots-tag'], /noindex/);
    assert.match(response.headers['cache-control'], /no-store/);
    const head = response.body.split('</head>')[0];
    const robots = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).filter(meta => meta.name === 'robots');
    assert.equal(robots.length, 1, `${route}: one noindex directive`);
    assert.match(robots[0].content, /noindex/);
    assert.doesNotMatch(head, /rel="canonical"/, 'missing pages must not canonicalize to a placeholder URL');
    assert.doesNotMatch(head, /property="og:url"/, 'missing pages must not advertise a placeholder sharing URL');
  }
});

test('private routes retain an accessible 200 shell while remaining non-indexable', artifactOptions, () => {
  const shell = read(path.join(generated, 'shell.html'));
  for (const route of ['/login', '/register', '/my-listings', '/my-eway-bills', '/eway-bill/new', '/listing/new', '/admin', '/admin/crops']) {
    const response = callGuard(route);
    assert.equal(response.statusCode, 200, route);
    assert.equal(response.body, shell);
    assert.match(response.headers['x-robots-tag'], /noindex/);
    assert.match(response.body, /name="robots"[^>]*content="noindex/);
    assert.ok(!response.body.includes('sahibhav-public-data'), 'private shell has no embedded account data');
  }
});

test('existing public listing routes retain their runtime shell without exporting contact data', artifactOptions, t => {
  const listing = JSON.parse(read(path.join(root, 'server/db/data/listings.json'))).find(item => typeof item.id === 'string');
  if (!listing) return t.skip('No listing fixture exists in the repository.');
  const response = callGuard(`/listing/${encodeURIComponent(listing.id)}`);
  assert.equal(response.statusCode, 200);
  const metadata = headMetadata(response.body, 'existing listing');
  assert.equal(new URL(metadata.canonical).pathname, `/listing/${encodeURIComponent(listing.id)}`);
  assert.match(metadata.robots, /noindex/);
  assert.match(response.body, /<div id="root"><\/div>/, 'listing details remain a runtime fetch');
  assert.ok(!response.body.includes('sahibhav-public-data'), 'no embedded listing or account response');
  assert.doesNotMatch(response.body, /"(?:userPhone|phone|passwordHash)"\s*:/, 'contact and authentication fields are not serialized');
  assert.match(response.headers['x-robots-tag'], /noindex/);
});

test('URL traversal and rewritten path input can only return fixed shells, never filesystem contents', artifactOptions, () => {
  const safeBodies = new Set([read(path.join(generated, 'shell.html')), read(path.join(generated, '404.html'))]);
  for (const [url, query] of [
    ['/../../server/db/data/users.json', {}],
    ['/%2e%2e/%2e%2e/server/db/data/users.json', {}],
    ['/api/page?path=../../server/db/data/users.json', {}],
    ['/api/page', { path: '../../server/db/data/users.json' }],
    ['/api/page', { path: '/admin/../../server/db/data/users.json' }],
    ['/api/page', { path: '/crop/%2e%2e%2f%2e%2e%2fserver/db/data/users' }],
    ['/api/page', { path: '/server/generated/seo/routes.json' }],
  ]) {
    const response = callGuard(url, query);
    assert.ok(safeBodies.has(response.body), 'request-controlled paths never become arbitrary file reads');
    assert.ok([200, 404].includes(response.statusCode));
    assert.match(response.headers['x-robots-tag'], /noindex/);
  }
});
