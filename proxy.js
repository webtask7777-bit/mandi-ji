import { next } from '@vercel/functions';
import manifest from './server/generated/seo/runtime-index.json' with { type: 'json' };
import { isRuntimeIndexable, runtimeSitemap } from './shared/seoLifecycle.js';
import { blogCanonicalSearch, blogRedirectPath, parseBlogLibraryPath } from './shared/blogPagination.js';

const entries = new Map(manifest.entries.map(entry => [entry[0], entry]));

// Runs before Vercel's static filesystem. Source ingestion is not needed to
// expire an old price URL: the response header and sitemap use request time.
export default function proxy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/sitemap.xml') {
    return new Response(request.method === 'HEAD' ? null : runtimeSitemap(manifest), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  if (parseBlogLibraryPath(pathname)) {
    const target = blogRedirectPath(pathname, url.searchParams);
    if (target) return Response.redirect(new URL(target, request.url), 308);
    if (blogCanonicalSearch(url.searchParams)) return next({ headers: { 'X-Robots-Tag': 'noindex, follow' } });
  }
  const entry = entries.get(pathname);
  if (entry && !isRuntimeIndexable(entry)) {
    return next({ headers: { 'X-Robots-Tag': 'noindex, follow', 'Cache-Control': 'no-store' } });
  }
  return next();
}
