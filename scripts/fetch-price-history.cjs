#!/usr/bin/env node
/**
 * Fetch the long mandi price history from data.gov.in
 * ("Variety-wise Daily Market Prices Data of Commodity", Agmarknet, 2009 onward).
 *
 * The dataset only filters by exact arrival date, so it is read one day at a time. Each day
 * is stored as gzip NDJSON under .cache/prices/raw/YYYY/YYYY-MM-DD.ndjson.gz; the first line
 * is the day's metadata ({ date, sourceTotal, stored, complete }). A day is complete when its
 * unique valid records plus rejected rows reach --min-complete of the source total; complete
 * days are skipped on later runs. Raw rows never enter the repository —
 * scripts/aggregate-price-history.cjs publishes monthly summaries.
 *
 * Usage:
 *   node scripts/fetch-price-history.cjs --from 2009-01-01 --to 2026-10-21 [--newest-first]
 *                                        [--delay 300] [--min-complete 0.98]
 * Env:
 *   DATA_GOV_API_KEY  registered key (the public sample key returns only 10 rows per call)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { normalizeRecord, recordKey, arrivalToISO } = require('./lib/daily-store.cjs');

const RESOURCE_ID = '35985678-0d79-46b4-9ed6-6f13308a1d24';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const API_KEY = process.env.DATA_GOV_API_KEY || SAMPLE_KEY;
const REQUEST_LIMIT = 1000;
const RAW_DIR = path.join(__dirname, '..', '.cache', 'prices', 'raw');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { from: '2009-01-01', to: null, delayMs: 300, minComplete: 0.98, newestFirst: false };
  for (let i = 0; i < args.length; i++) {
    const value = args[i + 1];
    if (args[i] === '--from') { opts.from = value; i++; }
    else if (args[i] === '--to') { opts.to = value; i++; }
    else if (args[i] === '--delay') { opts.delayMs = Math.max(0, parseInt(value, 10) || 0); i++; }
    else if (args[i] === '--min-complete') { opts.minComplete = Math.min(1, parseFloat(value) || 0.98); i++; }
    else if (args[i] === '--newest-first') opts.newestFirst = true;
  }
  opts.to ||= new Date(Date.now() + 5.5 * 3600e3 - 86400e3).toISOString().slice(0, 10);
  for (const key of ['from', 'to']) if (!/^\d{4}-\d{2}-\d{2}$/.test(opts[key])) throw new Error(`--${key} must look like 2024-10-31`);
  return opts;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sourceDate = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dayFile = iso => path.join(RAW_DIR, iso.slice(0, 4), `${iso}.ndjson.gz`);

async function fetchPage(params, retries = 10) {
  const query = new URLSearchParams({ 'api-key': API_KEY, format: 'json', limit: String(REQUEST_LIMIT), ...params });
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      const res = await fetch(`${API_BASE}?${query}`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
      const data = await res.json();
      if (!Array.isArray(data.records)) throw new Error('response without records');
      return data;
    } catch (e) {
      if (e.fatal) throw e;
      lastError = e;
      if (attempt > 1) console.log(`  retry ${attempt}/${retries} after ${e.message}`);
      await sleep(Math.min(180000, 3000 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`${JSON.stringify(params)}: ${lastError?.message || 'failed'} after ${retries} attempts`);
}

function readMeta(iso) {
  try {
    const text = zlib.gunzipSync(fs.readFileSync(dayFile(iso))).toString('utf8');
    return JSON.parse(text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n')));
  } catch { return null; }
}

function writeDay(iso, meta, rows) {
  const file = dayFile(iso);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Slim rows: [state, district, market, commodity, variety, grade, min, max, modal]
  const lines = [JSON.stringify(meta), ...rows.map(r => JSON.stringify([r.state, r.district, r.market, r.commodity, r.variety, r.grade, r.min_price, r.max_price, r.modal_price]))];
  fs.writeFileSync(`${file}.tmp`, zlib.gzipSync(lines.join('\n')));
  fs.renameSync(`${file}.tmp`, file);
}

const MAX_PASSES = 4;

/**
 * Recent days are still being re-indexed while they are read, so offset paging skips some
 * rows and repeats others. A day is read again (rows of every pass are kept) until its unique
 * rows reach --min-complete of the total or a pass adds almost nothing new.
 */
async function fetchDay(iso, opts) {
  const filters = { 'filters[Arrival_Date]': sourceDate(iso) };
  const unique = new Map();
  let rejected = 0;
  let read = 0;
  let total = 0;
  let passes = 0;
  let stable = false;
  const keep = rows => {
    read += rows.length;
    for (const raw of rows) {
      const { record } = normalizeRecord(raw);
      // The filter is exact, but a row is filed under its own date or not at all.
      if (record && arrivalToISO(record.arrival_date) === iso) unique.set(recordKey(record), record);
      else rejected++;
    }
  };
  while (passes < MAX_PASSES) {
    passes++;
    const before = unique.size;
    const readBefore = read;
    const rejectedBefore = rejected;
    rejected = 0;
    const first = await fetchPage(filters);
    total = Number(first.total) || 0;
    const pageSize = first.records.length || REQUEST_LIMIT;
    keep(first.records);
    for (let offset = pageSize; offset < total; offset += pageSize) {
      await sleep(opts.delayMs);
      keep((await fetchPage({ ...filters, offset: String(offset) })).records);
    }
    // Rejected rows are counted once per pass, not summed over passes.
    rejected = Math.max(rejected, rejectedBefore);
    if (unique.size + rejected >= total * opts.minComplete) break;
    // A full pass that finds nothing new: the rest are rows the source files twice under the
    // same mandi, commodity, variety, grade and date. The day is complete.
    if (passes > 1 && unique.size - before < total * 0.002) { stable = read - readBefore >= total * opts.minComplete; break; }
  }
  return { total, read, passes, stable, rows: [...unique.values()], rejected };
}

function days(from, to, newestFirst) {
  const out = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86400e3) out.push(new Date(t).toISOString().slice(0, 10));
  return newestFirst ? out.reverse() : out;
}

async function main() {
  const opts = parseArgs();
  if (API_KEY === SAMPLE_KEY) console.log('Using the public sample key (10 rows per call). Set DATA_GOV_API_KEY for full runs.');
  const failed = [];
  let stored = 0;
  for (const iso of days(opts.from, opts.to, opts.newestFirst)) {
    if (readMeta(iso)?.complete) continue;
    try {
      const day = await fetchDay(iso, opts);
      const complete = day.stable || day.rows.length + day.rejected >= day.total * opts.minComplete;
      if (!complete) { failed.push(iso); console.log(`  ${iso}: ${day.rows.length} unique of ${day.total} after ${day.passes} passes; will retry`); continue; }
      writeDay(iso, { date: iso, sourceTotal: day.total, passes: day.passes, stable: day.stable, stored: day.rows.length, rejected: day.rejected, complete, fetchedAt: new Date().toISOString() }, day.rows);
      stored++;
      if (stored % 10 === 0 || day.total === 0) console.log(`  ${iso}: ${day.rows.length} of ${day.total} stored (${stored} days this run)`);
    } catch (e) {
      failed.push(iso);
      console.log(`  ${iso}: ${e.message}; will retry on the next run`);
    }
    await sleep(opts.delayMs);
  }
  if (failed.length) { console.error(`Incomplete days (${failed.length}): ${failed.slice(0, 20).join(', ')}${failed.length > 20 ? ' …' : ''}`); process.exit(1); }
  console.log(`Done: ${stored} days stored this run.`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
