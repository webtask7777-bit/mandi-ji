# Crop visual and name update — 17 October 2026

Supersedes the coverage figures in `CROP-UPDATE-2026-10-16.md`. Since then every served crop has artwork: an exact commodity photograph where the ID establishes the commodity form, otherwise clearly labelled category artwork (≈ badge and note "प्रतीकात्मक चित्र"), or neutral generic artwork where the identity is not established.

## Served catalogue (price pages)

| Catalogue | Served crops | Exact photo | Category artwork | Neutral (generic) | Historical records covered by an exact photo |
|---|---:|---:|---:|---:|---:|
| All India | 339 | 126 | 179 | 34 | 94.46% |
| Chhattisgarh | 90 | 68 | 18 | 4 | 96.94% |

Mapping: 163 exact IDs → 115 photo families; 116 `crop-*.webp` and 13 `category-*.webp` files, all 512×512 WebP. `crop-flat-beans.webp` remains prepared but unmapped.

Historical record coverage weights rows already present in the source data; it is not traffic, demand or trade volume.

## Rules (unchanged in intent, now enforced in code and tests)

- Only an exact source ID selects a photograph. Whole pulses and dal, seeds and leaves, raw and ripe, fresh and processed stay separate.
- Category artwork is always labelled as representative; it never stands in for the commodity's own photo.
- Neutral generic artwork for IDs whose identity or form is not established: `beans`, `peas`, `cowpea`, `chilly-capsicum` and ambiguous regional names. Raw `sugarcane`, `tobacco`, `rubber` and `tendu` leaves also use neutral artwork rather than a misleading category (processed food, fibre).
- 16 non-crop IDs are excluded from every ₹/quintal context — price APIs, tickers, comparisons and now marketplace listings (422): cow, bull, calf, goat, cock, duck, he-buffalo, she-buffalo, pigs, fish, egg, ox, hen, prawn, sheep, she-goat.

## Name corrections in this update

- Generic `beans` is "बीन्स" (it is not one specific bean); specific beans keep "सेम (…)" qualifiers.
- `lime` is "कागज़ी नींबू (लाइम)" (was visually identical to `lemon` "नींबू"); `chow-chow` "चाउ-चाउ"; `same-savi` "कुटकी (सामे/सावी)".
- Groundnut is spelled "मूँगफली" everywhere.
- No two served crops share a Hindi name (test-enforced).
- Same commodity, same picture: `squashchappal-kadoo` and `chhappan-kaddu` (चप्पन कद्दू); `suvarna-gadde` and the elephant foot yam (जिमीकंद).

No price feed change is claimed by this visual release.
