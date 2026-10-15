import { readFileSync } from 'node:fs';
import path from 'node:path';
import { readJSON } from '../server/db/json-store.js';

const generated = path.join(process.cwd(), 'server/generated/seo');
const shell = () => readFileSync(path.join(generated, 'shell.html'), 'utf8');
const notFound = () => readFileSync(path.join(generated, '404.html'), 'utf8');
const PRIVATE_PATH = /^\/(?:login|register|my-listings|my-eway-bills|eway-bill\/new|listing\/new)$|^\/admin(?:\/|$)/;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export default function page(req, res) {
  // Read only fixed filenames. A request URL never becomes a filesystem path.
  let requested;
  try {
    const url = new URL(req.url, 'https://mandi-ji.vercel.app');
    requested = `/${String(req.query?.path ?? url.searchParams.get('path') ?? url.pathname).replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/';
  } catch { requested = '/__invalid__'; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, follow');
  if (PRIVATE_PATH.test(requested)) return res.status(200).send(shell());
  const listing = requested.match(/^\/listing\/([^/]+)$/);
  if (listing) {
    const item = readJSON('listings.json').find(item => item.id === listing[1]);
    if (item) {
      const expires = Date.parse(item.expiresAt);
      const active = item.status === 'active' && (!Number.isFinite(expires) || expires > Date.now());
      const robots = active ? 'index, follow' : 'noindex, follow';
      const title = [item.cropName || 'फसल', item.type === 'sell' ? 'बिक्री का प्रस्ताव' : 'खरीद की माँग', item.mandiName || item.district || item.state].filter(Boolean).join(' · ') + ' | SahiBhav';
      const description = 'उपयोगकर्ता का फसल प्रस्ताव। मात्रा, दिया गया भाव और स्थान देखें; उपलब्धता और सौदे की पुष्टि करें।';
      const site = (process.env.VITE_SITE_URL || 'https://mandi-ji.vercel.app').replace(/\/$/, '');
      const head = `<title data-sb-seo="true">${escapeHtml(title)}</title><meta data-sb-seo="true" name="robots" content="${robots}"><meta data-sb-seo="true" name="description" content="${escapeHtml(description)}"><link data-sb-seo="true" rel="canonical" href="${escapeHtml(site + requested)}">`;
      const html = shell().replace(/<title\b[^>]*>[\s\S]*?<\/title>/g, '').replace(/<meta[^>]*name="robots"[^>]*>/g, '').replace('</head>', `${head}</head>`);
      res.setHeader('X-Robots-Tag', robots);
      return res.status(200).send(html);
    }
  }
  return res.status(404).send(notFound());
}
