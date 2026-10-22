# SahiBhav: traffic scenarios, competition and implemented gaps

Research date: 22 October 2026 (India). This is a product/SEO review, not a measured traffic forecast. Search Console, analytics, paid keyword-volume data and competitors' private analytics were not available.

## Traffic planning

Monthly organic search clicks = pages actually earning impressions × average monthly impressions per such page × click-through rate.

| Scenario | Effective pages | Assumed impressions/page/month | Assumed CTR | Calculated organic clicks/month |
| --- | ---: | ---: | ---: | ---: |
| Limited traction | 100 | 200 | 2% | 400 |
| Useful regional traction | 300 | 600 | 3% | 5,400 |
| Strong execution across several crop/region groups | 600 | 1,200 | 4% | 28,800 |

All three input columns are assumptions, not measured demand. These are sensitivity scenarios, not a promise for a particular month. Actual traffic can remain near zero. A sensible first operating target is approximately 5,000 monthly organic clicks, then replace assumptions with real Search Console results. Clicks are not unique people or necessarily analytics sessions. Direct, WhatsApp and Discover traffic are excluded. 100,000 monthly search clicks at an assumed 4% CTR would require 2.5 million monthly impressions; that calculation does not prove those impressions are attainable.

## Competition checked

| Service | What the inspected service exposes | Product implication |
| --- | --- | --- |
| [Kisan Samadhan prices](https://kisansamadhan.com/mandi-bhav/) | Crop pages, minimum/maximum/average claims, daily changes, seven-day trends, state/district markets | Basic rates and trends are established expectations. |
| [Kisan Samadhan advice](https://kisansamadhan.com/tips-and-advice-for-farmers/) | Crop management, pests/diseases and weather advice | Advice requires depth and credible sourcing, not just a category label. |
| [Kisan Tak](https://www.kisantak.in/) | News, mandi reports, weather, schemes, videos and regional reporting | Broad agriculture news competes with an established reporting operation. |
| [MandiAgent comparison](https://mandiagent.com/price_compare.php) | Seller asking prices versus official mandi observations | Comparison is not unique by itself. Incorporating the farmer's real costs makes the task more useful. |
| [eNAM logistics](https://enam.gov.in/resources/registration-guideline) | Official guidance describes farm-to-APMC and outbound logistics support | Do not claim to be the first logistics or agriculture linkage service. |
| [CommodityOnline](https://www.commodityonline.com/mandiprices) | First-party indexed excerpts describe mandi prices, marketplace and related services; direct retrieval returned 403 | Limited evidence: service completion, traffic and conversion were not verified. |

Strategic inference: emphasize **dated mandi records → comparable produce → actual costs → net sale receipts or landed cost**. Never present a price gap as guaranteed profit. Source observations, entered quotations and assumptions must stay distinguishable.

## Changes in this release

- Consolidate canonical, OpenGraph, structured-data and sitemap origins on the verified `https://sahibhav.in` domain. Permanently redirect the old production host and `www` while preserving paths and queries.
- Share one crop-price indexability policy across build and browser: usable records, no future dates, and a 90-day limit based on India's current date. Old pages remain available to people but excluded from search indexing. Regular data ingestion and rebuilds remain necessary as static HTML ages.
- Add indexable `/kisan-calendar` with the existing calendar, state-scoped crop lists, month controls, practical explanation and explicit source limitations. Do not manufacture regional calendar pages from the same generic data.
- Add `/kisan-salah` with eight real situation-to-guide paths, search, images, clear unsupported cases, official district-weather links and ICAR KVK directory. This is not photo diagnosis or a pesticide recommendation service.
- Search real article bodies and takeaways using explicit Hindi/English equivalents and Hindi spelling normalization. Keep crop/state/language filters and distinct product identities.
- Add prominent links to calendar, advice and sale comparison. Retain hreflang for genuinely equivalent translated articles/tools; different-sized editorial collections are not mislabeled as equivalent translations.
- Extend the sale calculator with the mandi price needed to match a completed farmgate offer after stated losses and deductions, plus known quote-comparability limitations.
- Add one sourced original Hindi guide on minimum/maximum/modal mandi observations, date/unit/variety/grade checks and net receipt calculations. The release does not fabricate an article for every crop.
- Correct partial-fetch recovery in the data workflow: validate and commit completed state records before caching progress; ignore old inconsistent cache flags; explicitly fail incomplete fetches. This fixes recovery ordering, not the unresolved upstream request failure.

## Remaining growth work

1. **Measurement:** verify the sahibhav.in Search Console property, submit its sitemap, and inspect old/new domain migration. No ownership verification, Search Console submission or Change of Address was performed here. Compare 28-day clicks, impressions and CTR by price pages, tools and original guides. Measure calculator completion and repeat use only after a real analytics setup is selected and implemented.
2. **Coverage:** baseline was 8 Hindi originals plus 13 translations of one tomato guide (21 URLs). This release adds one original, not national coverage. Grow toward 20 genuinely useful original guides selected by real queries, fresh local records and available expertise. Translate after useful content and terminology have been reviewed.
3. **Regional focus:** start with a Hindi/Chhattisgarh crop-and-sale cluster if actual query demand and record freshness support it, then expand by evidence. Do not assume all farmers across India are one audience.
4. **Qualified agronomy:** disease/pest diagnosis and crop-stage-specific interventions still require sourced, locally relevant and genuinely reviewed content. No reviewer credentials should be invented.
5. **Data freshness and return use:** the visible [manual ingestion run of 16 October](https://github.com/webtask7777-bit/mandi-ji/actions/runs/38862985419) failed at the first source request after ten attempts; aggregation and publishing never ran. The logs do not establish the underlying connection cause or an invalid key. Two daily schedules exist in source, but no scheduled runs were visible in the returned history and enabled/disabled status could not be verified. A successful source fetch → validation → data commit → deployment and the next scheduled run remain operational gates. Keep saved tools; price alerts need a real delivery service, freshness threshold and explicit opt-in before advertising.
6. **Acquisition:** useful worked examples and shareable calculations can be distributed through user-run local farmer/FPO groups and demonstrations. No messages or outreach were sent in this release.

## 90-day execution sequence

- Days 1–14: confirm domain/redirect/indexing behavior, collect the first measurable Search Console baseline, test five common farmer tasks with local users.
- Days 15–45: improve pages already receiving impressions; publish a small sourced crop/region series; observe whether users reach and finish the comparison tools.
- Days 46–90: expand the best-performing topic groups, review native-language terminology, and revise the traffic model using actual impressions and CTR. Reduce work on pages without a distinct useful purpose.

## Release checks

- 267 automated tests pass, including crop freshness, search/product identities, sale comparison and partial-fetch recovery checks.
- The stored data's newest observation is 22 October 2026 and the three-day freshness check passes. This does not prove automated ingestion is reliable: the visible failed workflow history is a separate operational issue, and record dates vary by crop/market.
- Production build prepares 2,548 indexable public routes; this is not a count of Google-indexed pages.
- Mobile browser checks at 390 px confirm no horizontal page overflow on the advice hub, calendar and sale comparison.
- Worked calculator check: 10 quintals, farmgate ₹2,000/quintal versus mandi ₹2,300, 2% loss and ₹1,000 freight produces ₹21,540 mandi net receipts and a rounded-up farmgate parity price of ₹2,143/quintal.

## Search guidance used

- [Google: canonical consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: domain moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google: helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- [Google: spam and scaled-content policies](https://developers.google.com/search/docs/essentials/spam-policies)

Published/sitemap URL counts are not Google-indexed page counts. No ranking, Discover placement, traffic or AdSense revenue is guaranteed.
