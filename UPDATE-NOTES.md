# SahiBhav production refresh

Target: the existing `webtask7777-bit/mandi-ji` repository and `mandi-ji.vercel.app` Vercel project.
Baseline: `f889f0739a70b7877f6b2ac87bb7df49f985d41b`.

## Product and visual changes

- Approved path-based सही भाव wordmark and भ app icon; cream, forest, and grain palette.
- Responsive desktop shell, Hindi typography, touch targets, crop-photo selector, price cards, comparison tables, article pages, and authentication surfaces.
- 27 original AI-generated visual assets delivered as optimized WebP files; generic illustrations, not documentary evidence of a market or transaction. Existing brand art is reused unchanged.
- Local licensed Devanagari font, PWA icons, social preview, and lazy-loaded secondary tabs.
- All six main tabs, marketplace, login/registration, transport, crop routes, CMS and administration routes remain available.

## Corrections included

- Show the date of the observed price and mark stale/future/unknown dates; a fetch timestamp is not a quote date.
- Chart controls count available observations and distinguish daily from monthly aggregates. Missing MSP observations remain gaps.
- Do not present a sum of per-crop mandi counts as a unique mandi total.
- Compare matching variety/grade/price-basis cohorts; per-mandi quote dates remain explicitly unknown where the source omits them.
- Preserve `/api/arbitrage` as a descriptive price-gap endpoint. Unsupported road distance, cost, profit and ROI now return `null`; consumers must handle these values. The UI calculates a scenario only after the user explicitly enters costs and quantity loss.
- Prevent old crop/state responses and late network results from appearing under a newly selected crop/state.
- Use same-origin transport API requests; remove unverified directory telephone links.
- Do not cache market/authenticated API responses in the service worker. Offline prices are not advertised as current.
- Vercel SPA rewrites preserve direct links. Canonical, robots and sitemap URLs use the actual deployed domain instead of the previous unconnected name.
- Render the packaged India state/district map without an external tile service; fit the national overview to the viewport.
- Calendar rows only show crops with available phase data, with a regional/seasonal variation notice.

## Domain

Brand name: SahiBhav / सही भाव. Public target remains `https://mandi-ji.vercel.app`.
No ownership or DNS change for `sahibhav.in` is included. After attaching a verified custom domain, set `VITE_SITE_URL`, update the robots/sitemap origin, and redeploy. Existing legal/contact email addresses are unchanged.

## Validation

- `npm ci --no-audit --no-fund`
- `npm run build`
- `npm test` — freshness, same-cohort comparisons, outliers, date handling and cost/loss arithmetic.
- Local read-only API smoke checks: health, crops, wheat history, wheat mandi comparison, all-India/Chhattisgarh price comparisons and states.
- React hook race checks: crop switch, A→B→A, late results and error recovery.
- Chart rendering checks: monthly fallback, missing MSP values, single records and multiple chart instances.

The underlying dataset and ingestion schedule are not refreshed by this UI release. Live market freshness requires a working upstream ingestion job. Payments, KYC and real transactions are not exercised by smoke tests.
