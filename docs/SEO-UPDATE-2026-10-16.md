# SahiBhav SEO update — 16 October 2026

## What changed

- The production build pre-renders the actual React pages and their public API responses. Crop prices, source dates, history, headings and links are available in the initial HTML without JavaScript.
- The current dataset produces 1,965 indexable pages: national crops, supported state/crop combinations, state directories, public information pages and published articles. Sitemap coverage is derived from available price history; empty catalog entries are not indexed.
- State crop URLs use `/mandi-bhav/:state/:crop`. National crop URLs use `/crop/:crop`. Source IDs remain distinct across catalogs. Refreshing, sharing or following a link preserves its geographic scope.
- Every indexable page has one title, description and self-canonical URL. Crop titles include the recorded quote date. Article and breadcrumb structured data use visible, actual content.
- Homepage and state pages expose crawlable crop and state links. The blog index exposes published article links.
- Unknown pages return HTTP 404 and noindex. Account/admin pages retain their application routes with noindex. Existing listing routes retain runtime access; expired listings are noindex.
- `/transport` permanently redirects to `/delivery-calculator`. Supported legacy `?state=` landing URLs redirect to state directories.
- Robots rules permit the public API requests needed to render pages. Account/API authorization is unchanged.
- Unused raw daily ingestion files are excluded from the deployed API function; source data remains in the repository. The HTML route guard includes only its generated shells and listing data.

## Build and verification

Run `npm run build`, then `npm test`. The build creates the client bundle, server render bundle, static HTML, sitemap, robots file and server route shells. `scripts/prerender.mjs` expects a fresh Vite build; use the full build command when rebuilding.

Seven SEO integration checks cover all sitemap destinations and raw metadata, source dates, public snapshot safety, crawlable links, 404 responses, private/listing routes and traversal inputs. The existing business logic tests remain in place.

## Operational follow-up

- Price observations were not changed. Latest bundled national records remain April 2026; some state records are older. Fresh ingestion is still required for a useful daily price product. Old records are not relabelled as today's prices.
- Changes to bundled prices/catalogs or published CMS articles require a production rebuild to refresh initial HTML and sitemap. Client requests revalidate after loading; they do not replace a new static build for crawlers.
- Canonical host defaults to `https://mandi-ji.vercel.app`. Set `VITE_SITE_URL` to a verified HTTPS origin only when the production domain is connected, then rebuild. Domain ownership, DNS and redirects for `sahibhav.in` were not changed.
- Search Console ownership and sitemap submission require the site's verified account. They were not performed in this change. Sitemap URL: `https://mandi-ji.vercel.app/sitemap.xml`.
- Search indexing and ranking are controlled by search engines; page count is not a traffic forecast.
