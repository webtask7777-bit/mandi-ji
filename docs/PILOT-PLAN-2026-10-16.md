# SahiBhav pilot plan — review of the 16 Oct 2026 growth playbook

Reviewed against the code and data on branch `fix/price-feed` (16 Oct 2026). The playbook's direction holds: prove one useful sale decision in one cluster before chasing reach. This note records where the repository now stands against it and what blocks the pilot.

## What changed on this branch

| Playbook item | Status |
|---|---|
| P0 reliable ingestion: retries, atomic merges, dates survive | **Done for data.gov.in.** `scripts/lib/daily-store.cjs` files records by arrival date, merges instead of overwriting, writes atomically and refuses to replace a corrupt file. `fetch-daily.cjs` reads one dataset snapshot fully (resumable) or writes nothing. Aggregation skips duplicates across files. |
| P0 freshness dashboard | **Partly.** `scripts/check-freshness.cjs` reports the newest observation date (IST), per-day states and Chhattisgarh rows, and fails a job when data is older than 3 days. Not yet a page. |
| Scheduled ingestion | **Running from the founder's Mac** (twice daily, 08:30 and 20:30 IST): fetch with the personal data.gov.in key, re-aggregate, commit data only, push to main; Vercel deploys. The GitHub workflow is disabled because data.gov.in refuses connections from GitHub's servers. The Mac must be on with the Claude app open; a missed morning run loses the previous day once the dataset rolls over (~09:30 IST). |
| State names | **Fixed.** data.gov.in now writes "Keralam"; 18,632 Kerala rows (Jun–Jul) were being dropped silently. Alias added, and aggregation now logs any unknown state instead of skipping it quietly. |
| Stranded data | **Recovered.** 52 days (5 Apr–19 Jul 2026) fetched by the old laptop task but never committed are imported. Newest stored observation moved from 4 Apr to 19 Jul, then to 15 Oct once the running fetch completes. The fetcher works state by state because the publisher re-indexes about hourly and reshuffles row order, which breaks offset paging across a whole 3-hour run. |
| P0 farmer mode "Meri fasal kahan bechun?" | **Done.** `/bechne-ka-hisab`: farmgate offer plus up to three mandis; freight, loss, handling, commission, market fee, other costs; net receipt ranked; close calls flagged; blanks never treated as zero; draft kept in the browser; copyable dated summary. Reproduces the playbook illustration (₹18,500 / ₹18,400 / ₹18,960). |
| P1 save last comparison | **Done locally** (browser storage). No account needed. |
| P1 dated share card | **Partly.** Copy-to-clipboard text includes quote dates and the not-a-guarantee line. No image card yet. |

## Blockers the playbook does not yet account for

1. **Chhattisgarh coverage is thin and uneven.** data.gov.in spells the state "Chattisgarh" (180 records in the 15 Oct dataset). In the stored 10–18 July days it reports 39–63 records a day from 5–9 markets. **Durg** appears on most days, Raipur on one day in ten, and Dhamtari not at all. Of the three candidate clusters only Dhamdha–Patan (Durg) currently has a near-daily official series. For Arang–Abhanpur or Dhamtari–Magarload, decide before Day 1 between a maintained CG Mandi Board source and prices collected with field partners and labelled as such, or start in Durg. Run the coverage report for the two candidate crops first: a market can report most days without reporting your crop.
2. **Agmarknet is closed to automation.** Its report endpoint now requires a captcha and the filter endpoint returns 403 to scripts. The script stops with a clear message. The gap from 20 Jul to 14 Oct 2026 cannot be backfilled from data.gov.in, which serves only the current snapshot.
3. **Resolved: API key.** A personal data.gov.in key returns up to 10,000 rows per call; a full day takes about a minute.
4. **Resolved: MSP.** Values now come from PIB (Kharif 2026-27, 13 May 2026; Rabi 2026-27, 1 Oct 2025), only for the exact whole-grain/seed commodity, labelled with season and source. Update when the next season is notified (Rabi 2027-28 was notified 30 Sep 2026 and applies from April 2027). Previously: **MSP values were stale.** The price card shows a "दर्ज MSP" of ₹5,440 for chana (2024-25). An uncommitted local edit has newer figures with no official source. The playbook says to keep procurement/MSP separate and link current official rules: source each value from the CACP/PIB notification with its season, or remove the line.
5. **Resolved: fetch time label** now reads "स्रोत से डेटा लिया गया"; observation dates per state are on `/data-status`. Previously: **"डेटा अपडेट" showed fetch time, not observation time.** The playbook's freshness metric uses observation date. The price card already shows the observation date and its age; the footer timestamp should say what it is or go.
6. **No pilot analytics yet.** None of the events in the playbook (`price_viewed`, `comparison_completed`, `preference_saved`, `referral_landing`, `alert_opt_in/out`, `actual_sale_saved`) exist. Activation and 28-day repeat use cannot be measured until they do. Keep names and phone numbers out of events.
7. **Contact channel unverified.** Contact, privacy and legal pages use `@mandiji.in` addresses; that domain has no mail (MX) records. Choose a working email or WhatsApp number before the pilot; a "wrong price" report (playbook P1) needs the same channel.
8. **Old laptop tasks must stay disabled.** `mandi-rate-update` and `mandi-rate-update-evening` run `vercel --prod` from `~/Projects/mandi-ji`, which is on the 6 April code. Re-enabling them would replace the live SahiBhav app with the old one. Delete them once the GitHub workflow is running.
9. **Repository weight.** `server/db/data/daily` is about 230 MB in git and grows by about 3 MB per day of data. Fine for the pilot; move raw daily files to object storage or a database before national scale.

## Task plan (owners as in the playbook)

### Before Day 1
- [x] Merge `fix/price-feed`; personal data.gov.in key in use; daily update running from the Mac. *(Done 16 Oct)*
- [ ] Decide the cluster's price source (blocker 1): data.gov.in covers Durg most days, other CG districts rarely. Record unit, grade and date conventions. *(Founder)*
- [x] MSP from official PIB releases with season and source. *(Done 16 Oct)*
- [ ] Choose the public contact email/WhatsApp and replace `@mandiji.in` (blocker 7). *(Founder)*
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

## Logic audit, 16 Oct 2026

Three audits (aggregation, API, screens) found about 30 issues; fixed in PRs #2–#6 and the gap-fill PR: day-over-day and month changes across data gaps, ₹0 placeholders, national price dominated by one state, same-name mandis merged across states, per-bunch units in per-quintal figures, mandi ranking mixing old and recent prices, Chhattisgarh served from March 2026 legacy files, chart scaling, outlier flags, mandi-pair gaps, delivery prefill zeroing tolls, sale-calculator ties, MSP applied to rice/dal. Still open: photos for 280 low-volume commodities (12.5% of records), pilot analytics events, price alerts.
