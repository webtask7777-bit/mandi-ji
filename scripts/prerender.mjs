import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData, loadIndiaData, loadStateData, loadCropPrices, loadIndiaCropPrices, loadStateCropPrices } from '../server/db/connection.js';
import { isCropPriceCommodity } from '../src/utils/cropEligibility.js';
import { cropDetailPath } from '../src/utils/cropUrls.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.NODE_ENV = 'production';
const { renderPage } = await import('../dist-ssr/entry-server.js');
const dist = path.join(root, 'dist');
const generated = path.join(root, 'server/generated/seo');
const siteUrl = (process.env.VITE_SITE_URL || 'https://mandi-ji.vercel.app').replace(/\/$/, '');
if (!/^https:\/\/[^/?#]+$/.test(siteUrl)) throw new Error('VITE_SITE_URL must be an HTTPS origin');
// The production API must not bind its usual port while used during a build.
process.env.VERCEL = '1';
const { default: app } = await import('../server/index.js');
const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
const origin = `http://127.0.0.1:${server.address().port}`;
const template = (await readFile(path.join(dist, 'index.html'), 'utf8'))
  .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
  .replace(/<meta\b[^>]*data-rh="true"[^>]*>/gi, '');
const publicApi = /^\/(?:crops|mandis|districts|states|ticker|prices|mandi-compare|arbitrage|stats)(?:[/?]|$)|^\/cms\/(?:blog|banners|notifications)(?:[/?]|$)/;
const cache = new Map();
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'));
function routeAssets(route) {
  const page = /^\/crop\/|^\/mandi-bhav\/[^/]+\//.test(route) ? 'CropDetailPage' : route.startsWith('/blog/') ? 'BlogArticlePage' : ({ '/blog':'BlogPage', '/about':'AboutPage', '/contact':'ContactPage', '/privacy':'PrivacyPolicyPage', '/terms':'TermsPage', '/delivery-calculator':'TransportPage', '/bechne-ka-hisab':'SellComparePage', '/__not-found__':'NotFoundPage' })[route];
  const css = new Set();
  const seen = new Set();
  function visit(key) { if (seen.has(key)) return; seen.add(key); const entry = manifest[key]; if (!entry) return; (entry.css || []).forEach(file => css.add(file)); (entry.imports || []).forEach(visit); }
  const key = page ? `src/pages/${page}.jsx` : 'index.html';
  visit(key);
  const originalCss = new Set(manifest['index.html']?.css || []);
  return [...css].filter(file => !originalCss.has(file)).map(file => `<link rel="stylesheet" href="/${file}" />`).join('') + (manifest[key]?.file && page ? `<link rel="modulepreload" href="/${manifest[key].file}" />` : '');
}
const escapeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
async function responseFor(request) {
  if (!publicApi.test(request) || request.includes('..') || request.includes('://')) throw new Error(`Non-public prerender request: ${request}`);
  if (!cache.has(request)) {
    const response = await fetch(`${origin}/api${request}`, { redirect: 'error' });
    if (!response.ok && response.status !== 404) throw new Error(`Prerender API ${response.status}: ${request}`);
    cache.set(request, response.ok ? { data: await response.json() } : { data: null, error: `API 404: ${request}` });
  }
  return cache.get(request);
}
async function render(route) {
  const responses = {};
  let rendered;
  for (let pass = 0; pass < 5; pass++) {
    rendered = await renderPage(route, responses);
    const missing = rendered.requested.filter(request => !Object.hasOwn(responses, request));
    if (!missing.length) break;
    for (const request of missing) {
      let entry = await responseFor(request);
      const cropId = route.match(/^\/crop\/([^/]+)$|^\/mandi-bhav\/[^/]+\/([^/]+)$/);
      if (cropId && request.startsWith('/ticker?') && Array.isArray(entry.data)) {
        entry = { data: entry.data.filter(crop => crop.id === decodeURIComponent(cropId[1] || cropId[2])) };
      }
      responses[request] = entry;
    }
    if (pass === 4) throw new Error(`Unresolved public API requests: ${route}`);
  }
  const pageResponses = Object.fromEntries(rendered.requested.map(key => [key, responses[key]]));
  // React 19 hoists metadata into the beginning of its HTML stream; older
  // Helmet versions use the context. Do not collect SVG <title> elements.
  const nativeHead = rendered.html.match(/^(?:(?:<title\b[^>]*>[\s\S]*?<\/title>)|(?:<(?:meta|link)\b[^>]*\/?>))+/)?.[0] || '';
  const body = rendered.html.slice(nativeHead.length);
  const head = (nativeHead + rendered.head).replace(/<(title|meta|link)\b/g, '<$1 data-sb-seo="true"');
  return template.replace('</head>', `${head}${routeAssets(route)}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body.replaceAll('आज का उपलब्ध रिकॉर्ड', 'उपलब्ध दर्ज रिकॉर्ड').replace(/\d+ दिन पुराना रिकॉर्ड/g, 'पुराना रिकॉर्ड · तारीख देखें')}</div><script id="sahibhav-public-data" type="application/json">${escapeJson(pageResponses)}</script>`);
}
function hasPrice(detail) {
  return [...(detail?.dailyHistory || []), ...(detail?.history || [])].some(row => Number(row.market) > 0);
}
async function writePage(route, html) {
  const output = path.join(dist, route === '/' ? 'index.html' : `${route.slice(1)}.html`);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
}
try {
  await mkdir(generated, { recursive: true });
  const routes = new Set(['/', '/delivery-calculator', '/bechne-ka-hisab', '/about', '/contact', '/privacy', '/terms', '/blog']);
  const knownCrops = new Set();
  const states = (loadIndiaData('states') || []).filter(state => state.hasData);
  const scopes = ['all', ...new Set([...states.map(state => state.id), 'chhattisgarh'])];
  for (const scope of scopes) {
    const crops = scope === 'all' ? loadIndiaData('crops') : scope === 'chhattisgarh' ? loadData('crops') : loadStateData(scope, 'crops');
    if (!Array.isArray(crops) || !crops.length) continue;
    if (scope !== 'all') routes.add(`/mandi-bhav/${scope}`);
    for (const crop of crops.filter(crop => isCropPriceCommodity(crop.id))) {
      const route = cropDetailPath(crop.id, scope);
      knownCrops.add(route);
      let detail;
      try { detail = scope === 'all' ? loadIndiaCropPrices(crop.id) : scope === 'chhattisgarh' ? loadCropPrices(crop.id) : loadStateCropPrices(scope, crop.id); } catch { /* no observed prices: keep out of sitemap */ }
      if (hasPrice(detail)) routes.add(route);
    }
  }
  const posts = JSON.parse(await readFile(path.join(root, 'server/db/data/blog-posts.json'), 'utf8'));
  for (const post of posts.filter(post => post.status === 'published' && post.slug && post.content?.trim())) routes.add(`/blog/${encodeURIComponent(post.slug)}`);
  let count = 0;
  for (const route of routes) {
    const html = await render(route);
    if ((html.match(/<link[^>]*rel="canonical"/g) || []).length !== 1) throw new Error(`Canonical count: ${route}`);
    if ((html.split('</head>')[0].match(/<title\b/g) || []).length !== 1) throw new Error(`Title count: ${route}`);
    if (/name="robots" content="noindex/.test(html)) throw new Error(`Unexpected noindex: ${route}`);
    await writePage(route, html);
    if (++count % 100 === 0) console.log(`Prerendered ${count}/${routes.size} public pages`);
  }
  // Empty catalog entries remain usable but are not advertised to search engines.
  for (const route of knownCrops) if (!routes.has(route)) await writePage(route, (await render(route)).replace(/content="index, follow, max-image-preview:large"/g, 'content="noindex, follow"'));
  const notFound = (await render('/__not-found__')).replace(/<link[^>]*rel="canonical"[^>]*>/g, '').replace(/<meta[^>]*property="og:url"[^>]*>/g, '');
  await writeFile(path.join(dist, '404.html'), notFound);
  await writeFile(path.join(generated, '404.html'), notFound);
  const shell = template.replace('</head>', '<meta name="robots" content="noindex, follow" data-rh="true" /><title data-rh="true">आपका खाता | SahiBhav</title></head>');
  await writeFile(path.join(generated, 'shell.html'), shell);
  await writeFile(path.join(generated, 'routes.json'), JSON.stringify({ routes: [...routes], knownCrops: [...knownCrops] }));
  await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...routes].sort().map(route => `  <url><loc>${xml(siteUrl + route)}</loc></url>`).join('\n')}\n</urlset>\n`);
  const robots = (await readFile(path.join(root, 'public/robots.txt'), 'utf8')).replace(/^Sitemap:.*$/m, `Sitemap: ${siteUrl}/sitemap.xml`);
  await writeFile(path.join(dist, 'robots.txt'), robots);
  console.log(`SEO build complete: ${routes.size} indexable pages; real records only; dates preserved.`);
} finally { await new Promise(resolve => server.close(resolve)); }
