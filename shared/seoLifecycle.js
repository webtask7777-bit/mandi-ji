const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// The final included day ends at midnight in India, not in the build region.
export function indexDeadline(lastDate, maxAgeDays) {
  const day = /^\d{4}-\d{2}$/.test(lastDate || '') ? `${lastDate}-01` : lastDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return 0;
  const stamp = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== day) return 0;
  return stamp + (maxAgeDays + 1) * DAY_MS - IST_OFFSET_MS;
}

// Compact generated entry: [public path, true content lastmod or null,
// expiration timestamp or null]. Null expiry means a non-price page; zero
// means a known page that did not meet indexability requirements at build time.
export function isRuntimeIndexable(entry, now = Date.now()) {
  return Array.isArray(entry) && (entry[2] === null || (Number.isFinite(entry[2]) && entry[2] > Number(now)));
}

const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function runtimeSitemap(manifest, now = Date.now()) {
  const entries = manifest.entries.filter(entry => isRuntimeIndexable(entry, now));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(([route, date]) => `  <url><loc>${xml(manifest.origin + route)}</loc>${date ? `<lastmod>${xml(date)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}
