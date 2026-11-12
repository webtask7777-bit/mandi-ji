// Account, form and admin screens: always "noindex, follow", never in the sitemap.
// One list for the serverless shell (api/page.mjs, HTTP header + HTML) and the
// browser's robots tag (src/components/SEO.jsx), so the two never disagree.
export const PRIVATE_PATH = /^\/(?:login|register|my-listings|my-eway-bills|eway-bill\/new|listing\/new)$|^\/admin(?:\/|$)/;

export function isPrivatePath(pathname) {
  const clean = String(pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return PRIVATE_PATH.test(clean);
}
