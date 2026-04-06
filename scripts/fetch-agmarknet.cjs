#!/usr/bin/env node
/**
 * Fetch historical mandi prices from agmarknet.gov.in API
 * This API has NO rate limiting and data goes back to 2021-01-01
 *
 * Strategy: Fetch commodity-by-commodity with 7-day windows,
 * running CONCURRENT requests for speed.
 * Records are saved per-day in server/db/data/daily/YYYY-MM-DD.json
 *
 * Usage:
 *   node scripts/fetch-agmarknet.cjs                   # Fetch last 365 days
 *   node scripts/fetch-agmarknet.cjs --days 30         # Fetch last 30 days
 *   node scripts/fetch-agmarknet.cjs --from 2025-04-01 --to 2026-03-12
 *   node scripts/fetch-agmarknet.cjs --skip-existing   # Skip dates that already have data
 *   node scripts/fetch-agmarknet.cjs --dry-run         # Just show what would be fetched
 *   node scripts/fetch-agmarknet.cjs --concurrency 15  # Parallel requests (default 10)
 */

const fs = require('fs');
const path = require('path');

// ── API Config ──────────────────────────────────────────────
const API_BASE = 'https://api.agmarknet.gov.in/v1/daily-price-arrival';
const PAGE_LIMIT = 5000;
const MAX_RETRIES = 3;
const DATE_WINDOW_DAYS = 7;      // 7-day windows (fast: ~8s per call)
const DEFAULT_CONCURRENCY = 10;  // 10 parallel requests

const DAILY_DIR = path.join(__dirname, '..', 'server', 'db', 'data', 'daily');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Commodity Groups ────────────────────────────────────────
const COMMODITY_GROUPS = [
  { id: 1, name: 'Cereals' },
  { id: 2, name: 'Pulses' },
  { id: 3, name: 'Oil Seeds' },
  { id: 4, name: 'Fibre Crops' },
  { id: 5, name: 'Fruits' },
  { id: 6, name: 'Vegetables' },
  { id: 7, name: 'Spices' },
  { id: 8, name: 'Dry Fruits' },
  { id: 9, name: 'Beverages' },
  { id: 10, name: 'Others' },
  { id: 11, name: 'Drug and Narcotics' },
  { id: 12, name: 'Forest Products' },
  { id: 13, name: 'Live Stock,Poultry,Fisheries' },
  { id: 14, name: 'Flowers' },
  { id: 15, name: 'Oils and Fats' },
];

// ── Parse CLI args ──────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let days = 365;
  let from = null;
  let to = null;
  let skipExisting = false;
  let dryRun = false;
  let concurrency = DEFAULT_CONCURRENCY;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) { days = parseInt(args[i + 1]); i++; }
    else if (args[i] === '--from' && args[i + 1]) { from = args[i + 1]; i++; }
    else if (args[i] === '--to' && args[i + 1]) { to = args[i + 1]; i++; }
    else if (args[i] === '--skip-existing') skipExisting = true;
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--concurrency' && args[i + 1]) { concurrency = parseInt(args[i + 1]); i++; }
  }

  const endDate = to ? new Date(to) : new Date();
  let startDate;
  if (from) {
    startDate = new Date(from);
  } else {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
  }

  return { startDate, endDate, skipExisting, dryRun, concurrency };
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function getDateWindows(start, end, windowDays = DATE_WINDOW_DAYS) {
  const windows = [];
  const current = new Date(start);
  while (current <= end) {
    const windowEnd = new Date(current);
    windowEnd.setDate(windowEnd.getDate() + windowDays - 1);
    if (windowEnd > end) windowEnd.setTime(end.getTime());
    windows.push({ from: toISODate(current), to: toISODate(windowEnd) });
    current.setDate(current.getDate() + windowDays);
  }
  return windows;
}

// ── Fetch commodities list from API ─────────────────────────
async function fetchCommodities() {
  console.log('  Fetching commodity list from API...');
  const res = await fetch(`${API_BASE}/filters`);
  if (!res.ok) throw new Error(`Failed to fetch filters: ${res.status}`);
  const data = await res.json();
  return data.data.cmdt_data.map(c => ({
    id: c.cmdt_id,
    name: c.cmdt_name,
    groupId: c.cmdt_group_id,
  }));
}

// ── Fetch a single page of data ─────────────────────────────
async function fetchPage(groupId, commodityId, fromDate, toDate, page = 1) {
  const params = new URLSearchParams({
    from_date: fromDate, to_date: toDate,
    data_type: '100004', group: String(groupId),
    commodity: String(commodityId),
    state: '[100000]', district: '[100001]',
    market: '[100002]', grade: '[100003]',
    variety: '[100007]',
    page: String(page), limit: String(PAGE_LIMIT),
  });
  const url = `${API_BASE}/report?${params.toString()}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429) {
        await sleep(attempt * 10000);
        continue;
      }
      if (res.status === 404) return { records: [] };
      if (res.status >= 500) {
        await sleep(attempt * 5000);
        continue;
      }
      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json();
      if (data.status === 404 || !data.data?.records?.length) return { records: [] };
      return { records: data.data.records[0]?.data || [] };
    } catch (e) {
      if (e.name === 'AbortError') {
        if (attempt < MAX_RETRIES) { await sleep(2000); continue; }
        return { records: [] };
      }
      if (attempt < MAX_RETRIES) { await sleep(attempt * 2000); continue; }
      return { records: [] };
    }
  }
  return { records: [] };
}

// ── Normalize record ────────────────────────────────────────
function normalizeRecord(r) {
  const arrivalDate = (r.arrival_date || '').replace(/-/g, '/');
  const parsePrice = (p) => p ? (parseFloat(String(p).replace(/,/g, '')) || 0) : 0;
  return {
    state: r.state_name || '', district: r.district_name || '',
    market: r.market_name || '', commodity: r.cmdt_name || '',
    variety: r.variety_name || '', grade: r.grade_name || '',
    arrival_date: arrivalDate,
    min_price: parsePrice(r.min_price),
    max_price: parsePrice(r.max_price),
    modal_price: parsePrice(r.model_price),
  };
}

function arrivalDateToISO(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// ── Concurrent task runner ──────────────────────────────────
async function runConcurrent(tasks, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const { startDate, endDate, skipExisting, dryRun, concurrency } = parseArgs();
  fs.mkdirSync(DAILY_DIR, { recursive: true });

  console.log(`\n🏪 AgMarkNet Historical Mandi Data Fetch`);
  console.log(`   API: ${API_BASE}`);
  console.log(`   Range: ${toISODate(startDate)} → ${toISODate(endDate)}`);
  console.log(`   Concurrency: ${concurrency} parallel requests`);
  console.log(`   Window size: ${DATE_WINDOW_DAYS} days`);
  console.log(`   Output: ${DAILY_DIR}\n`);

  const commodities = await fetchCommodities();
  const dateWindows = getDateWindows(startDate, endDate);
  const totalCalls = commodities.length * dateWindows.length;

  console.log(`   Commodities: ${commodities.length}`);
  console.log(`   Date windows: ${dateWindows.length}`);
  console.log(`   Total API calls: ~${totalCalls}`);
  console.log(`   Estimated time: ~${Math.ceil(totalCalls * 8 / concurrency / 60)} minutes\n`);

  if (dryRun) {
    console.log('📋 Dry run — date windows:');
    for (const w of dateWindows) console.log(`  ${w.from} → ${w.to}`);
    for (const g of COMMODITY_GROUPS) {
      const count = commodities.filter(c => c.groupId === g.id).length;
      console.log(`  ${g.name}: ${count} commodities`);
    }
    return;
  }

  // Progress tracking
  const progressFile = path.join(DAILY_DIR, '.agmarknet-progress.json');
  let progress = { completedCommodities: [], totalRecords: 0 };
  if (fs.existsSync(progressFile)) {
    progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    console.log(`  📂 Resuming: ${progress.completedCommodities.length} commodities done\n`);
  }

  // Daily buckets (shared across workers, protected by single-threaded nature)
  const dailyBuckets = {};
  let totalNewRecords = 0;
  let apiCalls = 0;
  let commoditiesDone = 0;
  let commoditiesEmpty = 0;
  const startTime = Date.now();

  // Build task list: for each commodity, create a single task that fetches all windows
  const pendingCommodities = commodities.filter(c => !progress.completedCommodities.includes(c.id));
  console.log(`  📦 ${pendingCommodities.length} commodities to fetch (${progress.completedCommodities.length} already done)\n`);

  // Process in batches of concurrency
  const BATCH_SIZE = concurrency;

  for (let batchStart = 0; batchStart < pendingCommodities.length; batchStart += BATCH_SIZE) {
    const batch = pendingCommodities.slice(batchStart, batchStart + BATCH_SIZE);

    // Create tasks for this batch: each commodity fetches all its date windows
    const batchTasks = batch.map(commodity => async () => {
      const group = COMMODITY_GROUPS.find(g => g.id === commodity.groupId);
      if (!group) return { commodity, records: 0 };

      let commodityRecords = 0;

      for (const window of dateWindows) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const result = await fetchPage(group.id, commodity.id, window.from, window.to, page);
          apiCalls++;

          if (result.records.length === 0) { hasMore = false; break; }

          for (const raw of result.records) {
            const rec = normalizeRecord(raw);
            const isoDate = arrivalDateToISO(rec.arrival_date);
            if (!isoDate) continue;
            if (!dailyBuckets[isoDate]) dailyBuckets[isoDate] = [];
            dailyBuckets[isoDate].push(rec);
            commodityRecords++;
          }

          hasMore = result.records.length >= PAGE_LIMIT;
          if (hasMore) page++;
        }
      }

      return { commodity, records: commodityRecords };
    });

    // Run batch concurrently
    const results = await Promise.all(batchTasks.map(fn => fn()));

    // Process results
    for (const r of results) {
      if (r.records > 0) {
        totalNewRecords += r.records;
        process.stdout.write(`  ✅ ${r.commodity.name}: ${r.records.toLocaleString()} | `);
      } else {
        commoditiesEmpty++;
      }
      commoditiesDone++;
      progress.completedCommodities.push(r.commodity.id);
    }

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const totalDone = commoditiesDone + progress.completedCommodities.length - pendingCommodities.length + batchStart;
    const pct = ((commoditiesDone / pendingCommodities.length) * 100).toFixed(0);
    const eta = elapsed > 0 ? ((elapsed / commoditiesDone) * (pendingCommodities.length - commoditiesDone) / 60).toFixed(1) : '?';
    console.log(`\n  📊 [${pct}%] ${commoditiesDone}/${pendingCommodities.length} commodities | ${totalNewRecords.toLocaleString()} records | ${apiCalls} calls | ETA: ${eta}min`);

    // Save progress & flush every batch
    progress.totalRecords = totalNewRecords;
    fs.writeFileSync(progressFile, JSON.stringify(progress));
    flushDailyBuckets(dailyBuckets);
  }

  // Final flush
  console.log(`\n💾 Final save...`);
  const fileCount = flushDailyBuckets(dailyBuckets);

  if (fs.existsSync(progressFile)) fs.unlinkSync(progressFile);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n═══════════════════════════════════════`);
  console.log(`📊 AgMarkNet Fetch Summary`);
  console.log(`   Time elapsed:       ${elapsed} minutes`);
  console.log(`   API calls:          ${apiCalls}`);
  console.log(`   Commodities done:   ${commoditiesDone}`);
  console.log(`   Commodities empty:  ${commoditiesEmpty}`);
  console.log(`   New records:        ${totalNewRecords.toLocaleString()}`);
  console.log(`   Daily files saved:  ${fileCount}`);
  console.log(`═══════════════════════════════════════\n`);

  if (totalNewRecords > 0) {
    console.log(`✅ Now run: node scripts/aggregate-india.cjs`);
    console.log(`   to rebuild dashboards with historical data.\n`);
  }
}

// ── Flush daily buckets to disk ─────────────────────────────
function flushDailyBuckets(buckets) {
  let count = 0;
  for (const [date, records] of Object.entries(buckets)) {
    if (records.length === 0) continue;

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const r of records) {
      const key = `${r.state}|${r.district}|${r.market}|${r.commodity}|${r.variety}|${r.grade}|${r.arrival_date}`;
      if (!seen.has(key)) { seen.add(key); unique.push(r); }
    }

    const states = new Set(unique.map(r => r.state));
    const commodities = new Set(unique.map(r => r.commodity));
    const output = {
      date,
      fetchedAt: new Date().toISOString(),
      source: 'agmarknet.gov.in',
      total: unique.length,
      states: states.size,
      commodities: commodities.size,
      records: unique,
    };

    fs.writeFileSync(path.join(DAILY_DIR, `${date}.json`), JSON.stringify(output, null, 2));
    buckets[date] = unique;
    count++;
  }
  return count;
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
