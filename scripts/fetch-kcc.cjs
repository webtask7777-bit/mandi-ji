#!/usr/bin/env node
/**
 * Fetch Kisan Call Centre (KCC) query transcripts from data.gov.in
 * ("Kisan Call Centre (KCC) - Transcripts of farmers queries & answers").
 *
 * The dataset holds every call since 2009 (tens of millions of rows) and is filtered by
 * the source's own year/month fields, one month per slice. Each month is stored as slim
 * NDJSON (gzip) under .cache/kcc/raw/YYYY-MM.ndjson.gz together with a sidecar that says
 * how many rows the source reported and how many unique calls were kept. A month is
 * complete when the unique calls reach --min-complete of the source total; complete
 * months are skipped on later runs, except the newest months, which can still grow.
 *
 * scripts/aggregate-kcc.cjs turns the raw months into the published summaries. Raw rows
 * never enter the repository.
 *
 * Usage:
 *   node scripts/fetch-kcc.cjs [--from 2022-01] [--to 2025-07] [--delay 1300]
 *                              [--sample 40] [--refresh-recent 2] [--min-complete 0.98]
 *   --to defaults to the month of the newest call in the dataset.
 *   --sample N reads N pages at random offsets per month instead of the whole month: a
 *              representative development sample, marked as such and never complete.
 * Env:
 *   DATA_GOV_API_KEY  registered key (the public sample key returns only 10 rows per call)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESOURCE_ID = 'cef25fe2-9231-4128-8aec-2c948fedd43f';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const API_KEY = process.env.DATA_GOV_API_KEY || SAMPLE_KEY;
const REQUEST_LIMIT = 1000;
const RAW_DIR = path.join(__dirname, '..', '.cache', 'kcc', 'raw');
const MAX_QUESTION = 300;
const MAX_ANSWER = 700;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { from: '2022-01', to: null, delayMs: 1300, sample: 0, refreshRecent: 2, minComplete: 0.98 };
  for (let i = 0; i < args.length; i++) {
    const value = args[i + 1];
    if (args[i] === '--from') { opts.from = value; i++; }
    else if (args[i] === '--to') { opts.to = value; i++; }
    else if (args[i] === '--delay') { opts.delayMs = Math.max(0, parseInt(value, 10) || 0); i++; }
    else if (args[i] === '--sample') { opts.sample = Math.max(0, parseInt(value, 10) || 0); i++; }
    else if (args[i] === '--refresh-recent') { opts.refreshRecent = Math.max(0, parseInt(value, 10) || 0); i++; }
    else if (args[i] === '--min-complete') { opts.minComplete = Math.min(1, parseFloat(value) || 0.98); i++; }
  }
  for (const key of ['from', 'to']) {
    if (opts[key] && !/^\d{4}-(0[1-9]|1[0-2])$/.test(opts[key])) throw new Error(`--${key} must look like 2024-10`);
  }
  return opts;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const clip = (value, max) => { const text = clean(value); return text.length > max ? `${text.slice(0, max - 1)}…` : text; };

async function fetchPage(params, retries = 10) {
  const query = new URLSearchParams({ 'api-key': API_KEY, format: 'json', limit: String(REQUEST_LIMIT), ...params });
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
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

/** One source row → the slim stored shape, or null when it has no usable date or place. */
function slim(row) {
  const created = clean(row.CreatedOn);
  const date = created.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const state = clean(row.StateName).toUpperCase();
  const district = clean(row.DistrictName).toUpperCase();
  if (!state || !district || state === 'NA' || district === 'NA') return null;
  return {
    id: row.KCCCallID ?? null,
    t: created,
    s: state,
    d: district,
    sec: clean(row.Sector).toUpperCase(),
    cat: clean(row.Category),
    c: clean(row.Crop),
    qt: clean(row.QueryType),
    q: clip(row.QueryText, MAX_QUESTION),
    a: clip(row.KccAns, MAX_ANSWER),
  };
}

const rowKey = row => row.id != null ? `id:${row.id}` : `${row.t}|${row.d}|${row.q}`;

function monthsBetween(from, to) {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

function readSidecar(month) {
  try { return JSON.parse(fs.readFileSync(path.join(RAW_DIR, `${month}.json`), 'utf8')); } catch { return null; }
}

function writeMonth(month, rows, meta) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const target = path.join(RAW_DIR, `${month}.ndjson.gz`);
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, zlib.gzipSync(rows.map(row => JSON.stringify(row)).join('\n')));
  fs.renameSync(temp, target);
  const sidecar = path.join(RAW_DIR, `${month}.json`);
  fs.writeFileSync(`${sidecar}.tmp`, JSON.stringify(meta, null, 2));
  fs.renameSync(`${sidecar}.tmp`, sidecar);
}

async function newestMonth() {
  const page = await fetchPage({ limit: '1', 'sort[CreatedOn]': 'desc' });
  const created = clean(page.records[0]?.CreatedOn);
  if (!/^\d{4}-\d{2}/.test(created)) throw new Error('could not read the newest call date');
  return { month: created.slice(0, 7), newestCall: created, datasetTotal: Number(page.total) || 0 };
}

async function fetchMonth(month, opts) {
  const [year, mon] = month.split('-').map(Number);
  const filters = { 'filters[year]': String(year), 'filters[month]': String(mon) };
  const first = await fetchPage(filters);
  const total = Number(first.total) || 0;
  const pageSize = first.records.length || REQUEST_LIMIT;
  const unique = new Map();
  let rejected = 0;
  const keep = rows => { for (const raw of rows) { const row = slim(raw); if (row) unique.set(rowKey(row), row); else rejected++; } };
  keep(first.records);
  if (!total) return { total, unique, rejected, sample: false };

  if (opts.sample) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const offsets = new Set();
    while (offsets.size < Math.min(opts.sample, pages - 1)) offsets.add((1 + Math.floor(Math.random() * (pages - 1))) * pageSize);
    for (const offset of offsets) {
      await sleep(opts.delayMs);
      keep((await fetchPage({ ...filters, offset: String(offset) })).records);
    }
    return { total, unique, rejected, sample: true };
  }

  for (let offset = pageSize; offset < total; offset += pageSize) {
    await sleep(opts.delayMs);
    keep((await fetchPage({ ...filters, offset: String(offset) })).records);
    if ((offset / pageSize) % 50 === 0) console.log(`  ${month}: ${offset}/${total}`);
  }
  return { total, unique, rejected, sample: false };
}

async function main() {
  const opts = parseArgs();
  if (API_KEY === SAMPLE_KEY) console.log('Using the public sample key (10 rows per call). Set DATA_GOV_API_KEY for full runs.');
  const newest = await newestMonth();
  console.log(`KCC dataset: ${newest.datasetTotal} calls, newest call ${newest.newestCall}`);
  const to = opts.to && opts.to < newest.month ? opts.to : newest.month;
  const months = monthsBetween(opts.from, to);
  // slice(-0) would be the whole list: 0 must mean no month is refreshed.
  const recent = new Set(opts.refreshRecent ? months.slice(-opts.refreshRecent) : []);
  const failed = [];
  for (const month of months) {
    const existing = readSidecar(month);
    if (existing?.complete && !recent.has(month)) continue;
    if (existing?.sample && opts.sample && !recent.has(month)) continue;
    try {
      const result = await fetchMonth(month, opts);
      const rows = [...result.unique.values()].sort((a, b) => a.t.localeCompare(b.t));
      const complete = !result.sample && rows.length + result.rejected >= result.total * opts.minComplete;
      if (!result.sample && !complete) {
        failed.push(month);
        console.log(`  ${month}: only ${rows.length}/${result.total} unique calls; not stored, will retry`);
        continue;
      }
      writeMonth(month, rows, {
        month, sourceTotal: result.total, stored: rows.length, rejected: result.rejected,
        sample: result.sample, complete, fetchedAt: new Date().toISOString(), newestCall: newest.newestCall,
      });
      console.log(`  ${month}: ${rows.length}${result.sample ? ' sampled' : ''} of ${result.total} calls stored`);
    } catch (e) {
      failed.push(month);
      console.log(`  ${month}: ${e.message}; will retry on the next run`);
    }
  }
  if (failed.length) {
    console.error(`Incomplete months: ${failed.join(', ')}. The next run fetches only these.`);
    process.exit(1);
  }
  console.log('Done.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
