# SahiBhav pilot plan — review of the 16 Oct 2026 growth playbook

Reviewed against the code and data on branch `fix/price-feed` (16 Oct 2026). The playbook's direction holds: prove one useful sale decision in one cluster before chasing reach. This note records where the repository now stands against it and what blocks the pilot.

## What changed on this branch

| Playbook item | Status |
|---|---|
| P0 reliable ingestion: retries, atomic merges, dates survive | **Done for data.gov.in.** `scripts/lib/daily-store.cjs` files records by arrival date, merges instead of overwriting, writes atomically and refuses to replace a corrupt file. `fetch-daily.cjs` reads one dataset snapshot fully (resumable) or writes nothing. Aggregation skips duplicates across files. |
| P0 freshness dashboard | **Partly.** `scripts/check-freshness.cjs` reports the newest observation date (IST), per-day states and Chhattisgarh rows, and fails a job when data is older than 3 days. Not yet a page. |
| Scheduled ingestion | **Ready, not running.** `.github/workflows/mandi-prices.yml` fetches twice daily, re-aggregates, commits; Vercel deploys the push. Runs only after this branch is merged. |
| Stranded data | **Recovered.** 52 days (5 Apr–19 Jul 2026) fetched by the old laptop task but never committed are imported. Newest stored observation moved from 4 Apr to 19 Jul, then to 15 Oct once the running fetch completes. |
| P0 farmer mode "Meri fasal kahan bechun?" | **Done.** `/bechne-ka-hisab`: farmgate offer plus up to three mandis; freight, loss, handling, commission, market fee, other costs; net receipt ranked; close calls flagged; blanks never treated as zero; draft kept in the browser; copyable dated summary. Reproduces the playbook illustration (₹18,500 / ₹18,400 / ₹18,960). |
| P1 save last comparison | **Done locally** (browser storage). No account needed. |
| P1 dated share card | **Partly.** Copy-to-clipboard text includes quote dates and the not-a-guarantee line. No image card yet. |

## Blockers the playbook does not yet account for

1. **Chhattisgarh has no current feed.** data.gov.in's current dataset (snapshot 15 Oct) returns **0 Chhattisgarh records**. The July Agmarknet data had about 47 CG rows a day. The CG history in the app came from a one-off scrape of agriportal.cg.nic.in (`scraper/`). All three candidate clusters (Arang–Abhanpur, Dhamdha–Patan, Dhamtari–Magarload) are in Chhattisgarh, so the playbook's own selection rule ("usable current data… if missing, reduce the pilot scope") currently fails. Decide before Day 1: a maintained CG Mandi Board source, prices collected with field partners and labelled as such, or a first cluster in a state the feed covers.
2. **Agmarknet is closed to automation.** Its report endpoint now requires a captcha and the filter endpoint returns 403 to scripts. The script stops with a clear message. The gap from 20 Jul to 14 Oct 2026 cannot be backfilled from data.gov.in, which serves only the current snapshot.
3. **The public sample API key is slow.** 10 rows per call and frequent 429s: one full day takes about 3 hours. Register a free data.gov.in key and add it as the `DATA_GOV_API_KEY` repository secret; the workflow already reads it.
4. **MSP values are stale.** The price card shows a "दर्ज MSP" of ₹5,440 for chana (2024-25). An uncommitted local edit has newer figures with no official source. The playbook says to keep procurement/MSP separate and link current official rules: source each value from the CACP/PIB notification with its season, or remove the line.
5. **"डेटा अपडेट" shows fetch time, not observation time.** The playbook's freshness metric uses observation date. The price card already shows the observation date and its age; the footer timestamp should say what it is or go.
6. **No pilot analytics yet.** None of the events in the playbook (`price_viewed`, `comparison_completed`, `preference_saved`, `referral_landing`, `alert_opt_in/out`, `actual_sale_saved`) exist. Activation and 28-day repeat use cannot be measured until they do. Keep names and phone numbers out of events.
7. **Old laptop tasks must stay disabled.** `mandi-rate-update` and `mandi-rate-update-evening` run `vercel --prod` from `~/Projects/mandi-ji`, which is on the 6 April code. Re-enabling them would replace the live SahiBhav app with the old one. Delete them once the GitHub workflow is running.
8. **Repository weight.** `server/db/data/daily` is about 230 MB in git and grows by about 3 MB per day of data. Fine for the pilot; move raw daily files to object storage or a database before national scale.

## Task plan (owners as in the playbook)

### Before Day 1
- [ ] Merge `fix/price-feed`; add the `DATA_GOV_API_KEY` secret; run the workflow once by hand and check the freshness step. *(Founder + developer)*
- [ ] Decide the Chhattisgarh price source (blocker 1) and record its unit, grade and date conventions. *(Founder)*
- [ ] Fix or remove the MSP line (blocker 4). *(Developer)*
- [ ] Add the six pilot events with campaign, crop, mandi and quote age; no PII. *(Developer)*
- [ ] Delete the two laptop scheduled tasks. *(Founder)*

### Days 1–14
- [ ] Coverage report for the two candidate crops in the chosen cluster: observation dates, units, grades, missing-day rate. *(Developer)*
- [ ] 30 interviews; ask each grower to run `/bechne-ka-hisab` on their last real sale and note confusion. *(Field owner)*
- [ ] Select the cluster with the playbook's rule; shrink scope if data is thin. *(Founder)*

### Days 15–30
- [ ] Closed pilot of 100 growers with assisted demos; record estimate versus actual sale. *(Field owner)*
- [ ] Fix comprehension issues seen in demos before any outreach. *(Developer)*

### Days 31–90
Follow the playbook's channel tests, gates and stop rules unchanged. Count repeat use only for mature cohorts.

Targets, budget and gates remain the playbook's planning assumptions; nothing on this branch measures demand.
