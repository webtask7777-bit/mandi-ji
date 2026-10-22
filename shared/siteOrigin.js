// One public origin for metadata and generated search files.
// Legacy environment values must not undo the verified custom-domain migration.
export const PRODUCTION_SITE_ORIGIN = 'https://sahibhav.in';
const LEGACY_HOSTS = new Set(['mandi-ji.vercel.app', 'www.sahibhav.in']);

export function resolveSiteOrigin(configured) {
  const value = String(configured || PRODUCTION_SITE_ORIGIN).trim().replace(/\/$/, '');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_SITE_URL must be an HTTPS origin without credentials, path, query or fragment');
  }
  return LEGACY_HOSTS.has(url.hostname) ? PRODUCTION_SITE_ORIGIN : url.origin;
}
