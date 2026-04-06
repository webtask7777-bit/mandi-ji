#!/usr/bin/env node
/**
 * Fetch 1 year of historical mandi prices from data.gov.in API
 * Uses filters[arrival_date] to fetch day-by-day data
 * Saves each day to server/db/data/daily/YYYY-MM-DD.json
 *
 * Usage:
 *   node scripts/fetch-historical.cjs                  # Fetch last 365 days
 *   node scripts/fetch-historical.cjs --days 30        # Fetch last 30 days
 *   node scripts/fetch-historical.cjs --from 2025-04-01 --to 2026-03-12
 *   node scripts/fetch-historical.cjs --skip-existing   # Skip dates that already have data
 */

const fs = require('fs');
const path = require('path');

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const LIMIT = 1000;
const DELAY_BETWEEN_PAGES = 2000;    // 2s between pages
const DELAY_BETWEEN_DAYS = 5000;     // 5s between different dates
const DELAY_RATE_LIMIT = 60000;      // 60s on rate limit (API has aggressive limits)
const MAX_RETRIES = 10;

const DAILY_DIR = path.join(__dirname, '..', 'server', 'db', 'data', 'daily');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  let days = 365;
  let from = null;
  let to = null;
  let skipExisting = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) { days = parseInt(args[i + 1]); i++; }
    else if (args[i] === '--from' && args[i + 1]) { from = args[i + 1]; i++; }
    else if (args[i] === '--to' && args[i + 1]) { to = args[i + 1]; i++; }
    else if (args[i] === '--skip-existing') skipExisting = true;
    else if (args[i] === '--dry-run') dryRun = true;
  }

  const endDate = to ? new Date(to) : new Date();
  let startDate;
  if (from) {
    startDate = new Date(from);
  } else {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
  }

  return { startDate, endDate, skipExisting, dryRun };
}

// Generate list of dates between start and end
function getDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Convert YYYY-MM-DD to DD/MM/YYYY for API filter
function toApiDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

async function fetchPage(arrivalDate, offset, retries = MAX_RETRIES) {
  const params = new URLSearchParams({
    'api-key': API_KEY,
    'format': 'json',
    'limit': String(LIMIT),
    'offset': String(offset),
    'filters[arrival_date]': arrivalDate,
  });
  const url = `${API_BASE}?${params.toString()}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);

      if (res.status === 429) {
        const wait = DELAY_RATE_LIMIT * attempt;
        console.log(`    ⏳ Rate limited, waiting ${wait / 1000}s (attempt ${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) {
        const wait = attempt * 10000;
        console.log(`    ⚠️  Server error ${res.status}, waiting ${wait / 1000}s (attempt ${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);

      const data = await res.json();

      // Handle API returning error in JSON body
      if (data.error) {
        if (data.error.includes('Rate limit')) {
          const wait = DELAY_RATE_LIMIT * attempt;
          console.log(`    ⏳ Rate limited (JSON), waiting ${wait / 1000}s (attempt ${attempt}/${retries})...`);
          await sleep(wait);
          continue;
        }
        throw new Error(`API error: ${data.error}`);
      }

      return data;
    } catch (e) {
      if (attempt < retries) {
        const wait = attempt * 5000;
        console.log(`    ❌ ${e.message}, retrying in ${wait / 1000}s (${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      console.log(`    💀 Failed after ${retries} attempts: ${e.message}`);
      return null;
    }
  }
  return null;
}

function normalizeRecord(r) {
  return {
    state: r.State || r.state || '',
    district: r.District || r.district || '',
    market: r.Market || r.market || '',
    commodity: r.Commodity || r.commodity || '',
    variety: r.Variety || r.variety || '',
    grade: r.Grade || r.grade || '',
    arrival_date: r.Arrival_Date || r.arrival_date || '',
    min_price: parseFloat(r.Min_Price || r.min_price) || 0,
    max_price: parseFloat(r.Max_Price || r.max_price) || 0,
    modal_price: parseFloat(r.Modal_Price || r.modal_price) || 0,
  };
}

async function fetchDay(isoDate, skipExisting) {
  const outFile = path.join(DAILY_DIR, `${isoDate}.json`);

  // Skip if already fetched
  if (skipExisting && fs.existsSync(outFile)) {
    const existing = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    if (existing.records && existing.records.length > 0) {
      return { date: isoDate, records: existing.records.length, skipped: true };
    }
  }

  const apiDate = toApiDate(isoDate);
  let allRecords = [];
  let offset = 0;
  let total = null;
  let pageNum = 0;

  while (true) {
    const data = await fetchPage(apiDate, offset);

    if (!data) {
      // API failure — save what we have and move on
      break;
    }

    // First page: check total
    if (total === null) {
      total = data.total || 0;
      if (total === 0) {
        // No data for this date
        return { date: isoDate, records: 0, skipped: false, noData: true };
      }
    }

    const records = (data.records || []).map(normalizeRecord);
    if (records.length === 0) break;

    allRecords.push(...records);
    pageNum++;
    offset += records.length;

    if (offset >= total) break;
    await sleep(DELAY_BETWEEN_PAGES);
  }

  if (allRecords.length > 0) {
    const states = new Set(allRecords.map(r => r.state));
    const commodities = new Set(allRecords.map(r => r.commodity));
    const output = {
      date: isoDate,
      fetchedAt: new Date().toISOString(),
      total: allRecords.length,
      states: states.size,
      commodities: commodities.size,
      records: allRecords,
    };
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  }

  return { date: isoDate, records: allRecords.length, skipped: false, pages: pageNum };
}

async function main() {
  const { startDate, endDate, skipExisting, dryRun } = parseArgs();
  const dates = getDateRange(startDate, endDate);

  fs.mkdirSync(DAILY_DIR, { recursive: true });

  // Reverse: fetch most recent dates first (most valuable)
  dates.reverse();

  console.log(`\n📅 Historical Mandi Data Fetch`);
  console.log(`   Range: ${dates[dates.length - 1]} → ${dates[0]} (newest first)`);
  console.log(`   Total dates: ${dates.length}`);
  console.log(`   Skip existing: ${skipExisting}`);
  console.log(`   Output: ${DAILY_DIR}\n`);

  if (dryRun) {
    console.log('Dry run — listing dates to fetch:');
    for (const d of dates) {
      const exists = fs.existsSync(path.join(DAILY_DIR, `${d}.json`));
      console.log(`  ${d} ${exists ? '(exists)' : '(to fetch)'}`);
    }
    return;
  }

  let totalRecords = 0;
  let daysWithData = 0;
  let daysNoData = 0;
  let daysSkipped = 0;
  let daysFailed = 0;
  let consecutiveEmpty = 0;

  // Progress file for resuming
  const progressFile = path.join(DAILY_DIR, '.fetch-progress.json');
  let lastCompletedIdx = -1;
  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    const idx = dates.indexOf(progress.lastDate);
    if (idx >= 0) {
      lastCompletedIdx = idx;
      console.log(`  Resuming from ${progress.lastDate} (${idx + 1}/${dates.length})\n`);
    }
  }

  for (let i = lastCompletedIdx + 1; i < dates.length; i++) {
    const d = dates[i];
    process.stdout.write(`[${i + 1}/${dates.length}] ${d} ... `);

    try {
      const result = await fetchDay(d, skipExisting);

      if (result.skipped) {
        console.log(`⏭️  skipped (${result.records} records)`);
        daysSkipped++;
        totalRecords += result.records;
        if (result.records > 0) daysWithData++;
        consecutiveEmpty = 0;
      } else if (result.noData) {
        console.log(`📭 no data`);
        daysNoData++;
        consecutiveEmpty++;
      } else if (result.records > 0) {
        console.log(`✅ ${result.records} records (${result.pages} pages)`);
        daysWithData++;
        totalRecords += result.records;
        consecutiveEmpty = 0;
      } else {
        console.log(`❌ failed`);
        daysFailed++;
        consecutiveEmpty++;
      }

      // Save progress
      fs.writeFileSync(progressFile, JSON.stringify({ lastDate: d, index: i }));

      // If we get 14+ consecutive empty days, the API might not have data this far back
      if (consecutiveEmpty >= 14) {
        console.log(`\n⚠️  14 consecutive empty days — API may not have data before ${d}`);
        console.log(`   Stopping early. Use --from to specify a different start date.\n`);
        break;
      }

    } catch (e) {
      console.log(`💀 error: ${e.message}`);
      daysFailed++;
    }

    // Delay between days
    if (i < dates.length - 1) {
      await sleep(DELAY_BETWEEN_DAYS);
    }
  }

  // Cleanup progress file
  if (fs.existsSync(progressFile)) fs.unlinkSync(progressFile);

  console.log(`\n═══════════════════════════════════════`);
  console.log(`📊 Historical Fetch Summary`);
  console.log(`   Days with data:  ${daysWithData}`);
  console.log(`   Days no data:    ${daysNoData}`);
  console.log(`   Days skipped:    ${daysSkipped}`);
  console.log(`   Days failed:     ${daysFailed}`);
  console.log(`   Total records:   ${totalRecords.toLocaleString()}`);
  console.log(`═══════════════════════════════════════\n`);

  if (daysWithData > 0) {
    console.log(`✅ Now run: node scripts/aggregate-india.cjs`);
    console.log(`   to rebuild dashboards with historical data.\n`);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
