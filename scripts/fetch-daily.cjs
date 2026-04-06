#!/usr/bin/env node
/**
 * Fetch daily mandi prices from data.gov.in API
 * Saves to server/db/data/daily/YYYY-MM-DD.json
 * Supports resume: if partial file exists, continues from last offset
 */

const fs = require('fs');
const path = require('path');

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const LIMIT = 1000;
const DELAY_MS = 1200; // 1.2s between requests to stay under rate limit

const DAILY_DIR = path.join(__dirname, '..', 'server', 'db', 'data', 'daily');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(offset, retries = 5) {
  const url = `${API_BASE}?api-key=${API_KEY}&format=json&limit=${LIMIT}&offset=${offset}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = attempt * 5000;
        console.log(`  Rate limited, waiting ${wait/1000}s (attempt ${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) {
        const wait = attempt * 8000;
        console.log(`  Server error ${res.status}, waiting ${wait/1000}s (attempt ${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      return res.json();
    } catch (e) {
      if (attempt < retries) {
        const wait = attempt * 5000;
        console.log(`  Network error: ${e.message}, retrying in ${wait/1000}s (${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      console.log(`  Failed after ${retries} attempts: ${e.message}`);
      return null;
    }
  }
  return null;
}

function saveOutput(outFile, allRecords, today) {
  const states = new Set(allRecords.map(r => r.state));
  const commodities = new Set(allRecords.map(r => r.commodity));
  const output = {
    date: today,
    fetchedAt: new Date().toISOString(),
    total: allRecords.length,
    states: states.size,
    commodities: commodities.size,
    records: allRecords,
  };
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`\nSaved ${allRecords.length} records to ${outFile}`);
  console.log(`States: ${states.size}, Commodities: ${commodities.size}`);
  console.log(`File size: ${(fs.statSync(outFile).size / 1024).toFixed(1)}KB`);
}

async function main() {
  fs.mkdirSync(DAILY_DIR, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const outFile = path.join(DAILY_DIR, `${today}.json`);

  // Resume support: load existing records if partial file exists
  let allRecords = [];
  if (fs.existsSync(outFile)) {
    const existing = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    allRecords = existing.records || [];
    console.log(`Resuming from ${allRecords.length} existing records...`);
  }

  console.log(`Fetching mandi data for ${today}...`);

  let offset = allRecords.length;
  let total = null;
  let pageSize = LIMIT;
  let pageNum = 0;

  while (true) {
    const data = await fetchPage(offset);

    if (!data) {
      console.log(`  Stopping due to rate limits. Saving ${allRecords.length} records...`);
      break;
    }

    if (total === null) {
      total = data.total;
      // API sometimes reports lower totals when server is under load
      // Use the higher of reported total and previous fetch count
      if (total <= offset) {
        console.log(`  API reports total=${total} <= offset=${offset}, server may be unstable. Stopping.`);
        break;
      }
      console.log(`Total records available: ${total}, starting from offset ${offset}`);
    }

    const records = (data.records || []).map(r => ({
      state: r.State || r.state,
      district: r.District || r.district,
      market: r.Market || r.market,
      commodity: r.Commodity || r.commodity,
      variety: r.Variety || r.variety,
      grade: r.Grade || r.grade,
      arrival_date: r.Arrival_Date || r.arrival_date,
      min_price: parseFloat(r.Min_Price || r.min_price) || 0,
      max_price: parseFloat(r.Max_Price || r.max_price) || 0,
      modal_price: parseFloat(r.Modal_Price || r.modal_price) || 0,
    }));

    allRecords.push(...records);
    pageNum++;

    // Detect actual page size (API may cap lower than requested)
    if (pageNum === 1 && records.length < LIMIT && records.length > 0) {
      pageSize = records.length;
      console.log(`  API page size capped at ${pageSize}`);
    }

    if (pageNum % 50 === 0) {
      console.log(`  ${allRecords.length}/${total} records fetched (page ${pageNum})...`);
      // Save periodically to avoid losing progress
      saveOutput(outFile, allRecords, today);
    }

    // Increment offset by actual page size
    offset += records.length || pageSize;
    if (offset >= total || records.length === 0) break;
    await sleep(DELAY_MS);
  }

  console.log(`  Fetched ${allRecords.length} total records in ${pageNum} new pages`);
  saveOutput(outFile, allRecords, today);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
