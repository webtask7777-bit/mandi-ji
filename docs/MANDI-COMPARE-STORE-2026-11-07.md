# mandi-compare storage, 2026-11-07

GitHub warned on `server/db/data/india/mandi-compare.json` in the 7 Nov data push; it refuses files over 100 MB, which would stop the price updates.

## Cause

The file was about 20.7 MB through 29 Oct. Commit `110ab7d20` (30 Oct) made a row one crop + mandi + variety + grade instead of one crop + mandi, and added fields. The first data push on that code took the file to 56.8 MB: 76,655 rows at 741 bytes each, 16 MB of it indentation. Rows are never retired, so the file also grows as new combinations appear: about 7,500 a month across 2026.

## Fix

`shared/mandiCompareStore.cjs` keeps each market once and each quote as a short array, without constants or values derivable from the quote. `server/db/connection.js` rebuilds the public rows on load, so routes, prerender and the API are unchanged. Files in the old format still load.

## Sizes (same 7 Nov data)

| File | Before | After |
| --- | --- | --- |
| `india/mandi-compare.json` | 56,812,739 B | 5,015,691 B |
| Largest state file (Tamil Nadu) | not measured | 756,645 B |
| All 32 `mandi-compare.json` files | 113,986,291 B | 10,003,305 B |

At 65 bytes a row, 7,500 new rows a month adds about 0.5 MB a month, against about 5.6 MB before. The aggregator logs a ⚠️ line if a file ever passes 50 MB.

## Verification

Hashes of 11,712 responses (`/api/mandi-compare` for every crop in all 32 scopes, and `/api/arbitrage`) are identical before and after, with both the new and the old file format.
