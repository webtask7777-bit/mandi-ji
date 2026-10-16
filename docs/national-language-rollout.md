# SahiBhav national language rollout

Updated: 17 October 2026 (Asia/Kolkata).

## Delivered scope

The language directory at `/languages` covers the 22 Eighth Schedule languages plus English. Eighteen languages have actual translated **price-search and delivery-calculator interfaces**. This is not a claim that the entire existing dashboard, every crop name or every article has been translated.

| Publication status | Languages |
|---|---|
| Available tools, search-ready routes | Hindi, English, Assamese, Bengali, Gujarati, Kannada, Malayalam, Marathi, Nepali, Odia, Punjabi, Tamil, Telugu, Urdu |
| Available previews, noindex until terminology review | Kashmiri, Maithili, Sanskrit, Sindhi |
| Translation pending, no fabricated language route | Bodo, Dogri, Konkani, Manipuri, Santali |

All new interface translations are editorial drafts, not certified native-reviewed translations. Four previews have additional terminology/orthography uncertainty. The five pending languages need an actual translator; rendering Hindi under another language code is deliberately not used.

The existing ten articles remain in their actual published languages: Hindi, Marathi and Gujarati. The localized tools link to them with their language explicitly indicated. Article language and tool-interface language are separate.

## Working flows

- `/en/mandi-bhav`, `/ta/mandi-bhav`, `/te/mandi-bhav`, `/bn/mandi-bhav` and the corresponding available language URLs.
- State and crop query selections survive the language switch. Example: `/ta/mandi-bhav?state=tamil-nadu&crop=tomato`.
- Official source identifiers, some crop names and state/market names stay in their source form. Exact localized crop IDs are used; no price identities are merged through broad editorial topics.
- Unknown/no-data states do not silently return all-India prices. Unknown crops do not silently return wheat prices.
- The latest valid daily observation is used unless a newer monthly period exists; same-month daily observations take priority. Observation date is never replaced by ingestion time.
- Prices remain INR per quintal. Historical observations are not described as today's price or a guaranteed offer.
- Delivery calculator: trips = ceiling(load / legal usable capacity); charged distance = trips × one-way distance × return multiplier; estimate = charged distance × quoted rate + user-entered total extras.
- Payload and rate must be entered for the chosen category. Changing category clears these vehicle-specific fields. Categories are examples, not manufacturer-certified payload specifications.
- Empty fields are invalid; explicit zero is allowed for rate/extras only. Negative, invalid and unsafe overflow values are rejected. Native numeric scripts, Indian comma grouping and Arabic decimal separators are supported.
- Per-kg result uses the entered total load, including packaging. It is not silently claimed to be per kg of saleable produce.
- Language preference is stored locally only after the user chooses to remember it. The directory suggests it on return. No forced browser-language or location redirect.

## SEO and script support

Each available route has its own translated primary interface, title, description, HTML `lang` and explicit `dir`. Search-ready versions have self-canonicals and reciprocal supported `hreflang` links. `/languages` is `x-default`. Preview routes are excluded from the sitemap and carry noindex. Pending languages are visible in the directory but have no fake translated page.

Google currently documents ISO 639-1 language codes for `hreflang`. Three-letter HTML language tags such as `mai` remain valid language identification, but are not presented as Google-supported hreflang codes. Existing article alternates continue to advertise only real published equivalents.

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

## Validation and remaining QA

The implementation passed 187 automated tests and targeted ESLint checks. Font cmap checks covered 1,129 character requirements across all 23 language names and the available dictionaries, with zero missing glyphs. Browser screenshot validation could not run because the available Chromium download was incomplete; do not interpret these checks as completed mobile/RTL screenshot review. Native-language editorial review remains necessary as described above.
