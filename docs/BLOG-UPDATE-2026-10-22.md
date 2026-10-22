# Blog update — 22 October 2026

Added two original Hindi guides: `enam-kisan-registration-bikri-bhugtan` and `mandi-taul-katauti-bhugtan-checklist`. Each has SEO metadata, primary-source references, reader takeaways, related articles and delivery/net-sale calculator links. Expanded the existing mandi-price reading guide without changing its identity or publication time.

The guides distinguish official eNAM information from editorial preparation suggestions. All numerical examples are hypothetical; no current price, uniform local fee, sale guarantee or expert review is claimed. Sources were read through indexed official-page retrieval on 22 October; direct eNAM page fetches were intermittently unavailable. Registration reference: https://www.enam.gov.in/web/resources/registration-guideline . Farmer reference: https://www.enam.gov.in/web/stakeholders-Involved/farmers . Payment reference: https://www.enam.gov.in/web/resources/online-payments .

Added one original generated cover shared by the related sale guides: `/editorial/mandi-vikray-hisab-v1.webp`, with 640px and 960px versions and accurate alt/caption. Built-in image generation prompt: premium 16:9 SahiBhav editorial illustration; ivory, forest-green and harvest-gold palette; farmer, mandi shed, grain sacks, sample tray, weighing platform and abstract phone; exact headline “मंडी में बिक्री / पूरा हिसाब रखें”, SAHIBHAV wordmark and “सांकेतिक चित्र” disclosure; no real logo, price or certificate. Shared imagery illustrates the same sale workflow; it is not field evidence.

Blog listing now renders the featured post once, removing its duplicate grid card while preserving the API page size and pagination.

Publication uses the existing GitHub/Vercel project. No separate prototype or hosting identity is created.

## Validation and publication status

`npm run build` passed: 24 articles and 2,550 indexable public pages. `npm test` passed: 267/267, no skipped tests. Additional generated-HTML checks verified both new canonicals, source links, responsive art, sitemap entries, the unique featured card and the original publication date of the expanded guide. Existing build warnings about JSON import attributes and chunk size remain.

Live publication is pending: automatic approval review rejected upload of the runtime blog database even after confirming the scoped diff (21 existing articles unchanged, two added, one expanded). Main was not changed. This package contains the complete validated update for review.

Base commit: `c567ec6a47bec90425fc114808dfcc01d7d5e55d`. The binary patch can be applied to that checkout with `git apply --check SahiBhav-Blog-Update-2026-10-22.patch`, followed by `git apply SahiBhav-Blog-Update-2026-10-22.patch`. On a newer checkout, reconcile intervening edits rather than overwriting them. Re-run sync, editorial checks, build and tests before publishing.
