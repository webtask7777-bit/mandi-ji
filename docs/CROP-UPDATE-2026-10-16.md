# Crop visual update — 16 October 2026

This update adds commodity photographs, corrects Hindi display names and excludes source entries whose units cannot safely be treated as crop prices. Catalog IDs include aliases, processed products and different commodity forms; **285 raw entries does not mean 285 distinct crops**.

## Raw catalog photo coverage

| Catalog | Before: photo mapped | After: photo mapped | Historical record coverage before → after |
|---|---:|---:|---:|
| All India | 22/285 | 73/285 | 60.86% → 91.46% |
| Active Chhattisgarh | 11/56 | 46/56 | 54.78% → 90.96% |

Historical record coverage weights rows already present in source data. It is **not traffic, current prices, demand, sales or transaction volume**. Raw datasets remain unchanged.

## Catalog served in the crop-price API

| Catalog | Eligible entries | Mapped photos | Historical record coverage |
|---|---:|---:|---:|
| All India | 274 | 73 | 91.76% |
| Active Chhattisgarh | 56 | 46 | 90.96% |

The API excludes these **11 exact source IDs** from crop-price contexts: `bull`, `calf`, `cock`, `cow`, `duck`, `egg`, `fish`, `goat`, `he-buffalo`, `pigs`, `she-buffalo`. Raw JSON is preserved; the exclusion prevents livestock or other unsupported units from being presented as a uniform crop price.

Photo families: **20 before → 66 mapped**. At this audit, **66 files exist; 0 are pending**. A prepared flat-bean image is additional and intentionally unmapped.

## Remaining Chhattisgarh entries

| Source ID | Source name | Historical records |
|---|---|---:|
| `cowpea` | Cowpea/Barbati | 1,409 |
| `redcowpea` | Red Cowpea | 1,266 |
| `tivda` | Tivda/Lathyrus | 1,135 |
| `otherveg` | Other Vegetables | 1,088 |
| `millets` | Millets | 927 |
| `peas` | Peas | 769 |
| `coriander` | Coriander | 484 |
| `fenugreek` | Fenugreek | 426 |
| `chilli` | Chilli | 160 |
| `turmeric` | Turmeric | 35 |

Broad or uncertain categories retain a neutral symbol until their identity is established. Missing images are not missing price records.

## Next national catalog priorities

| Source ID | Display name | Historical records |
|---|---|---:|
| `beans` | सेम | 15,701 |
| `cummin-seedjeera` | जीरा | 2,611 |
| `corriander-seed` | धनिया बीज | 2,313 |
| `chilly-capsicum` | शिमला मिर्च | 2,042 |
| `field-pea` | मटर | 1,767 |
| `betal-leaves` | पान | 1,732 |
| `barleyjau` | जौ | 1,700 |
| `custard-applesharifa` | सीताफल | 1,471 |
| `arhar-daltur-dal` | अरहर दाल | 1,459 |
| `black-pepper` | काली मिर्च | 1,449 |
| `dry-chillies` | सूखी मिर्च | 1,428 |
| `berzizyphus-borehannu` | बेर | 1,388 |
| `snakeguard` | चचिंडा | 1,225 |
| `onion-green` | हरा प्याज | 1,143 |
| `papaya` | पपीता | 1,134 |
| `green-avarew` | हरी अवरे | 1,106 |
| `chili-red` | लाल मिर्च | 1,075 |
| `mintpudina` | पुदीना | 1,028 |
| `mangoraw-ripe` | आम | 892 |
| `gingerdry` | सोंठ (सूखी अदरक) | 878 |

The JSON includes the complete raw and eligible catalog backlogs.

## Correctness and source limitations

- Only exact IDs select photographs and corrected names. Whole pulses, dal, seeds, leaves and processed products remain separate.
- Hindi correction changes `nameHi` only in crop/ticker arrays and the top-level crop object in price detail. English source names, prices, dates, varieties, editorial prose and location labels remain intact.
- Generic `coriander`, `peas`, `cowpea` and `beans` retain a neutral symbol. Explicit leaf/fresh-pod IDs still receive matching photos.
- Legacy CG `coriander` mixes seed/leaf varieties; `peas` includes dry peas; `cowpea` has conflicting gourd varieties. These require source review.
- `crop-flat-beans.webp` is prepared but intentionally unmapped until a source ID establishes the specific commodity form.
- Unknown scientific or regional names retain source wording.
- No price feed refresh is claimed by this visual release.

## Asset readiness snapshot

All 66 mapped files are present and decode successfully as 512×512 WebP. This asset check does not itself establish deployment success or visual quality.

Full audit: `CROP-COVERAGE-UPDATE.json`. Preserved baseline: `CROP-COVERAGE-AUDIT.json`.
