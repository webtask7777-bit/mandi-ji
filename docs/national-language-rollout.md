# SahiBhav national language rollout

Updated: 31 October 2026 (Asia/Kolkata).

## Delivered scope

The language directory at `/languages` covers the 22 Eighth Schedule languages plus English. Eighteen languages have actual translated **price-search and delivery-calculator interfaces**. This is not a claim that the entire existing dashboard, every crop name or every article has been translated.

| Publication status | Languages |
|---|---|
| Available tools, search-ready routes | Hindi, English, Assamese, Bengali, Gujarati, Kannada, Malayalam, Marathi, Nepali, Odia, Punjabi, Tamil, Telugu, Urdu |
| Available previews, noindex until terminology review | Kashmiri, Maithili, Sanskrit, Sindhi |
| Translation pending, no fabricated language route | Bodo, Dogri, Konkani, Manipuri, Santali |

All new interface translations are editorial drafts, not certified native-reviewed translations. Four previews have additional terminology/orthography uncertainty. The five pending languages need an actual translator; rendering Hindi under another language code is deliberately not used.

There are now 80 published article records: 15 Hindi guides and 5 guides in each of the other 13 editorial languages. The tomato market-versus-delivery guide and four new guides (mustard sowing, chickpea sowing, grain-maize drying/storage, and the dated 31 October–3 November 2026 weather brief) are available in all 14 search-ready languages. This release adds 52 complete translations. The other ten Hindi guides are not presented as translated. Every new translation explicitly discloses AI assistance and pending independent native-language review. Article language and tool-interface language remain separate. All four new translation families retain their exact original commodity applicability, original primary source URLs/access dates and factual numbers. The weather article remains a dated summary, not a live forecast.

## Working flows

- `/en/mandi-bhav`, `/ta/mandi-bhav`, `/te/mandi-bhav`, `/bn/mandi-bhav` and the corresponding available language URLs.
- State and exact crop query selections survive the language switch and the language directory. Blog cards, article translation links and delivery/price calls to action preserve return context separately from editorial crop groups. Article language comes from published content, never from the tool-language preference. Native library routes (`/ta/blog`, `/ur/blog`, etc.) are prerendered in their own language before JavaScript loads; legacy `/blog?language=...` links permanently redirect to the native library URL.
- Example native library: `/ta/blog`; example article: `/blog/tomato-market-delivery-ta`. Native libraries show only available published articles, including an honest empty state for unmatched filters.
- State and crop query selections survive the language switch. Example: `/ta/mandi-bhav?state=tamil-nadu&crop=tomato`.
- Official source identifiers, some crop names and state/market names stay in their source form. Native state names are used where an actual translation exists; fallback names identify their displayed language. Editorial topic labels reuse explicitly equivalent whole-crop labels only for display. Exact localized crop IDs are used; no price identities are merged through broad editorial topics.
- Unknown/no-data states do not silently return all-India prices. Unknown crops do not silently return wheat prices.
- The latest valid daily observation is used unless a newer monthly period exists; same-month daily observations take priority. Observation date is never replaced by ingestion time.
- Daily and monthly histories are separate, selectable, newest-first tables in the chosen tool language. They reuse the existing price response, validate calendar dates and amounts, and do not mutate cached data. Hindi full details remain an explicitly labeled optional link.
- Prices remain INR per quintal. Historical observations are not described as today's price or a guaranteed offer.
- Delivery calculator: trips = ceiling(load / legal usable capacity); charged distance = trips × one-way distance × return multiplier; estimate = charged distance × quoted rate + user-entered total extras.
- Payload and rate are manual inputs confirmed by the user. As in the integrated crop-fix release, changing the category preserves those entered values; a category labels the trip and does not supply or certify capacity or fare. Categories are examples, not manufacturer-certified payload specifications.
- Empty fields are invalid; explicit zero is allowed for rate/extras only. Negative, invalid and unsafe overflow values are rejected. Native numeric scripts, Indian comma grouping and Arabic decimal separators are supported.
- Per-kg result uses the entered total load, including packaging. It is not silently claimed to be per kg of saleable produce.
- Language preference is stored locally only after the user chooses to remember it. The directory suggests it on return. No forced browser-language or location redirect.

## SEO and script support

Each available route has its own translated primary interface, title, description, HTML `lang` and explicit `dir`. Search-ready versions have self-canonicals and reciprocal supported `hreflang` links. `/languages` is `x-default`. Preview routes are excluded from the sitemap and carry noindex. Pending languages are visible in the directory but have no fake translated page.

Google currently documents ISO 639-1 language codes for `hreflang`. Three-letter HTML language tags such as `mai` remain valid language identification, but are not presented as Google-supported hreflang codes. Existing article alternates continue to advertise only real published equivalents. Preview tools emit no hreflang cluster. Library collections have unequal article sets and do not pretend to be equivalent translations.

Ten additional Noto fonts are self-hosted for Bengali/Assamese, Tamil, Telugu, Kannada, Malayalam, Odia, Gurmukhi, Arabic, Meetei Mayek and Ol Chiki. Existing Devanagari/Gujarati fonts remain. Unicode ranges and script-specific stacks apply; Arabic layout uses RTL with isolated numeric values. Font sources, licenses and hashes are recorded in `public/fonts/language-fonts-manifest.json`.

## Maintenance files

- `shared/languages.js`: registry, direction, availability and search-readiness.
- `src/i18n/base.json`: complete 67-key translation schema.
- `src/i18n/locales/*.json`: actual translated interface strings.
- `src/i18n/locales/*.crops.json`: exact known commodity names; missing names retain source identity.
- `src/i18n/translation-pending.json`: outstanding language work.
- `src/pages/LanguagesPage.jsx`: language directory and honest coverage status.
- `src/pages/LanguageToolsPage.jsx`: translated price and delivery tools.
- `src/utils/languageTools.js`: locale-independent numeric and price rules.
- `tests/languages.test.mjs`: meaningful language, arithmetic, date and generated-page checks.
- `shared/editorialLanguages.js`: actual editorial language coverage for CMS and frontend.
- `src/i18n/editorial/*.json`: 83-key article and library interface dictionaries for the 11 added languages.
- `content/editorial/tomato-market-delivery-*.json`: full translated source articles, preserving primary references and worked-example assumptions.
- `src/utils/languageNavigation.js`: safe, local-only language/state/exact-crop navigation context.
- `tests/editorial-languages.test.mjs`, `tests/languageNavigation.test.mjs`: actual article coverage, arithmetic, source parity, direction, canonical and navigation checks.

## Editorial artwork

The 17 October tomato translation batch shares one deliberately text-free tomato transport illustration. Native headlines, image descriptions and AI-illustration disclosures are HTML, so they remain accessible and do not require readers to interpret Hindi image text. Existing Hindi, Marathi and Gujarati covers remain. That tomato cover has responsive 640/960/1672px variants; intrinsic size is 1672×942. `content/editorial/thumbnail-prompts-national-neutral.json` records the exact image-generation prompt and review. The responsive image manifest explicitly marks shared art as text-free; tests reject reused language-specific artwork. The four 31 October guide families share their respective text-free mustard, chickpea, grain-maize and weather illustrations across 14 languages, with 640/960/1600px variants and native alt text/captions.

## Publishing a pending language

1. Obtain a fluent translation of every base key, with particular attention to price dates, payload, return charges and packaging.
2. Review crop names against exact source commodities; omit uncertain identifications.
3. Add the dictionary, mark the registry available but initially noindex, and verify glyph coverage, RTL if relevant, and mobile layout.
4. Have a native reader review interface text and calculations in context. Update status only when supported by that review.
5. Publish actual article translations separately with preserved sources, dates, scope and translation-group metadata. A language selector is not a substitute for article translation.

## Primary references

- Ministry of Home Affairs, Eighth Schedule languages: https://www.mha.gov.in/sites/default/files/Eighth_Schedule.pdf
- Google Search Central, localized versions and supported language codes: https://developers.google.com/search/docs/specialty/international/localized-versions
- Google Search Central, multilingual sites: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- W3C, direction in HTML: https://www.w3.org/International/questions/qa-html-dir
- Font upstream URLs and OFL copies: `public/fonts/language-fonts-manifest.json` and `public/fonts/OFL-noto-*.txt`.

## 31 October release checks and remaining review

The release validates every translation family's complete 14-language coverage, source/date/scope parity, numeric examples, exact commodity applicability, semantic Markdown tables and generated article language/alternates. Targeted navigation tests check that the language directory keeps the selected language and exact source crop; preview-language guide links explicitly identify their Hindi destination. All 14 editorial languages now have localized official district weather-resource panels. Translation diagrams/covers are text-free and shared, with native HTML captions and alt text.

Automated checks do not establish native editorial fluency. Independent native-language review remains pending for the new AI-assisted translations and is visibly disclosed in every article. Preview languages and translation-pending languages retain their existing publication restrictions; this release does not claim that all 23 directory languages have complete articles or tools.
