# SahiBhav organic traffic rollout

Prepared: 25 October 2026. This is an implementation and measurement checklist, not a traffic or ranking guarantee.

## Release status

The inspected production site was older than repository main. Main already contains permanent legacy-host redirects, crawlable mandi pages, mandi directories, historical-price separation and WhatsApp sharing. Verify their production release before treating the original audit findings as still unfixed.

The latest main update already moves crop prices and mandi search to the first screen. This change preserves that layout and adds Hindi mandi discovery, route-specific dashboard loading, removal of map-only requests from the price screen, explicit average-price provenance and custom-domain listing canonicals. It does not add or fabricate market observations.

## 1. Release and verify

1. Confirm Vercel project `sahibhav` is linked to `webtask7777-bit/mandi-ji`, and confirm the intended production branch and source SHA. The connected project currently needs team authorization before these details or deployments can be inspected.
2. Build the exact source revision; run `npm test` after `npm run build` so SEO artifact tests run rather than skip.
3. Test a preview: national crop search → crop detail; Chhattisgarh search → mandi detail; browser Back; change state; empty search; API error; mobile widths 360 and 390 px; keyboard navigation. Confirm visible prices against API records and dates.
4. In production, check that `/`, `/mandi-bhav/chhattisgarh`, `/crop/wheat`, `/mandi/chhattisgarh/raipur`, `/blog`, `/data-status` and `/sitemap.xml` return the intended content. Each indexable page needs one self-canonical and no `noindex` response header.
5. Verify actual HTTP 301/308 responses from both `mandi-ji.vercel.app` and `www.sahibhav.in`, including `/` and an inner path with query parameters. A matching canonical alone is not proof of a redirect. Do not redirect unrelated URLs to the homepage.
6. Check a nonexistent mandi and crop: genuine HTTP 404, not a 200 application shell.

## 2. Establish the search baseline

Use the verified Search Console domain property for `sahibhav.in`. Record the previous 28 and 90 days before comparing later changes. Do not interpret public `site:` results as an exhaustive index report.

Export these reports:

| Report | Record | Decision |
| --- | --- | --- |
| Performance → Search results | Clicks, impressions, CTR, position; by page and query; India/mobile splits | Distinguish no visibility from poor ranking and weak snippets |
| Page indexing | Indexed; discovered-not-indexed; crawled-not-indexed; canonical exclusions | Investigate examples individually before expanding pages |
| Sitemaps | Submitted URL, last fetch, success/error | Submit `https://sahibhav.in/sitemap.xml` and inspect parsing |
| URL Inspection | Google-selected canonical, crawl date, indexed HTML and live test | Compare home, Raipur mandi, one crop, one state-crop and one article |
| Core Web Vitals | Real mobile field data if available | Do not substitute a local bundle size or a single Lighthouse score for field performance |

After the redirects are active, use Search Console's supported Change of Address flow if the old property is verified and eligible. Keep redirects for at least a year. Do not submit thousands of manual indexing requests.

## 3. Start with useful local coverage

Use real recent records. Every mandi URL already has an eligibility policy; do not remove `noindex` solely to increase page counts.

| Topic/query family | Existing destination or source | Next useful addition |
| --- | --- | --- |
| रायपुर मंडी भाव / Raipur mandi bhav | `/mandi/chhattisgarh/raipur` | Recent crop averages, individual dates, variety and source-period explanation |
| दुर्ग मंडी सब्जी भाव | `/mandi/chhattisgarh/durg` | Compare the same variety/date against nearby reported mandis |
| राजनांदगांव मंडी भाव | `/mandi/chhattisgarh/rajnandgaon` | Crop-specific entry links and real transport-cost calculation |
| बिलासपुर तिफरा सब्जी मंडी भाव | `/mandi/chhattisgarh/tiphra` | Source-named mandi and district; do not merge Tiphra with a distinct Bilaspur mandi |
| छत्तीसगढ़ धान भाव | `/mandi-bhav/chhattisgarh/paddycommon` | Explain private mandi quotes versus government procurement; independently verify current procurement rules before publishing them |
| धमतरी / अभनपुर धान मंडी | Source catalog has these mandis | Improve actual current crop coverage; assess current index eligibility before prioritizing them in search |

Current pages show record-period averages. Do not label those values “today's modal auction rate,” put a newly fetched timestamp in place of the observation date, or present a state median as a Raipur quote.

## 4. Improve existing articles before scaling

The site has existing Hindi guides. Read their current content, check live official sources and update only what materially changes. Start with:

- `/blog/mandi-bhav-min-max-modal-kaise-padhen`: link to a real state-crop page and explain why an average across records differs from the last auction's modal quote.
- `/blog/mandi-taul-katauti-bhugtan-checklist`: use an explicitly hypothetical worked sale, clearly labelled costs, and the sale calculator.
- `/blog/bheega-dhan-sukhana-nami-bhandaran`: link to the relevant current official advisory; local requirements vary.
- `/blog/dhan-ke-baad-rabi-fasal-chhattisgarh`: local water, soil and planting-window decisions; identify the actual expert/reviewer, if any.
- `/blog/tamatar-mandi-dhulai-ke-baad-bachat`: compare two actual source-dated market observations and let users enter transport, loss and packaging costs.

Put relevant guide links near their crop/mandi information. Add a truthful byline, source links, editorial review date and correction channel. Never invent an expert, field visit, transport quotation or firsthand interview. Publish a new local article only when it answers an uncovered question with evidence beyond an existing price table.

## 5. Distribution and return visits

Create shareable summaries from the source record: mandi, crop, amount, unit, variety, individual quote date, link and average-price label. The existing WhatsApp buttons open a user-controlled draft. Send only to people who have agreed to receive updates; this task does not send or subscribe anybody.

For independently verified local partners, prepare useful mandi-page links and invite corrections. Do not purchase backlinks, invent directory listings or submit other people's contact details. Local transport cost examples require an actual quotation or a clearly identified estimate.

## 6. Review after release

| Checkpoint | Review | Next action |
| --- | --- | --- |
| First 7 days | Redirects, sitemap fetch, crawl errors, canonical selection and data freshness | Fix technical failures before publishing more URLs |
| Days 8–28 | Which intended local pages receive impressions; queries and mobile usability | Improve the matching pages and their internal links |
| Days 29–60 | Compare 28-day periods; identify ranking and CTR opportunities | Rewrite misleading/weak titles; deepen pages with real data |
| Days 61–90 | Pages with sustained impressions/clicks; useful shares and return visits | Expand the same successful data-supported cluster |

If impressions remain zero, investigate crawl/index coverage first. If impressions exist but positions are low, improve the specific query-page fit and evidence. If position is competitive but CTR is low, review the actual search snippet. These are diagnostic rules, not universal numeric thresholds.

## Primary references

- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
