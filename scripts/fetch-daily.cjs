#!/usr/bin/env node
/**
 * Fetch the current mandi price dataset from data.gov.in
 * ("Current Daily Price of Various Commodities from Various Markets").
 *
 * The publisher re-indexes the dataset about hourly and the row order changes each time,
 * so paging the whole dataset by offset across a re-index skips and repeats rows.
 * This script therefore fetches one state at a time (each slice is small enough to finish
 * between re-indexes), repeats a slice if a re-index happened during it, and judges
 * completeness by unique records rather than by pages read.
 *
 * - Records are filed under their own arrival date via scripts/lib/daily-store.cjs
 *   (merge, never overwrite; atomic writes).
 * - Nothing is written to daily/ unless unique valid records reach --min-complete of the
 *   dataset total. An incomplete run exits 1 and keeps finished states for the next run.
 *
 * Usage:
 *   node scripts/fetch-daily.cjs [--min-complete 0.98] [--delay 1300]
 * Env:
 *   DATA_GOV_API_KEY  registered key (the public sample key returns only 10 rows per call)
 */

const fs = require('fs');
const path = require('path');
const { DAILY_DIR, arrivalToISO, normalizeRecord, recordKey, mergeRecords, writeAtomic, listDays, readDay } = require('./lib/daily-store.cjs');

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const API_KEY = process.env.DATA_GOV_API_KEY || SAMPLE_KEY;
const REQUEST_LIMIT = 1000;
const MAX_SLICE_PASSES = 3;
const CACHE_FILE = path.join(__dirname, '..', '.cache', 'datagov', 'states.json');
const CACHE_MAX_AGE_MS = 18 * 3600 * 1000;
const SOURCE = 'data.gov.in';

// Source spellings seen on data.gov.in. States found in recent day files are added at run
// time; if the slices still do not add up to the dataset total, the run fails and says so.
const KNOWN_STATES = [
  'Andaman and Nicobar', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Keralam', 'Ladakh',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'NCT of Delhi', 'Nagaland',
  'Odisha', 'Pondicherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { minComplete: 0.98, delayMs: 1300 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--min-complete') opts.minComplete = Math.min(1, parseFloat(args[++i]) || 0.98);
    else if (args[i] === '--delay') opts.delayMs = Math.max(0, parseInt(args[++i], 10) || 0);
  }
  return opts;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const snapshotOf = (page) => page.updated_date || String(page.updated || 'unknown');

async function fetchPage(offset, state, retries = 10) {
  const params = new URLSearchParams({ 'api-key': API_KEY, format: 'json', limit: String(REQUEST_LIMIT), offset: String(offset) });
  if (state) params.set('filters[state.keyword]', state);
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(`${API_BASE}?${params}`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
      const data = await res.json();
      if (!Array.isArray(data.records)) throw new Error('response without records');
      return data;
    } catch (e) {
      if (e.fatal) throw e;
      lastError = e;
      await sleep(Math.min(180000, 3000 * 2 ** (attempt - 1))); // 429s clear within a few minutes
    }
  }
  throw new Error(`${state || 'all'} offset ${offset}: ${lastError?.message || 'failed'} after ${retries} attempts`);
}

function uniqueValid(rows) {
  const unique = new Map();
  const rejected = {};
  for (const raw of rows) {
    const { record, error } = normalizeRecord(raw);
    if (error) { rejected[error] = (rejected[error] || 0) + 1; continue; }
    unique.set(recordKey(record), record);
  }
  return { unique, rejected };
}

/** Fetch one state's slice; repeat when a re-index happened mid-slice. */
async function fetchState(state, opts) {
  const rows = [];
  let total = 0;
  for (let pass = 1; pass <= MAX_SLICE_PASSES; pass++) {
    const first = await fetchPage(0, state);
    total = Number(first.total) || 0;
    if (total === 0) return { state, total: 0, rows: [] };
    const snapshot = snapshotOf(first);
    rows.push(...first.records);
    let stable = true;
    for (let offset = first.records.length; offset < total; offset += first.records.length) {
      await sleep(opts.delayMs);
      const page = await fetchPage(offset, state);
      if (snapshotOf(page) !== snapshot) stable = false;
      rows.push(...page.records);
    }
    // Every row read is a real observation whatever the order, so passes accumulate.
    const unique = uniqueValid(rows).unique.size;
    if (stable || unique >= total * opts.minComplete) return { state, total, rows };
    console.log(`  ${state}: dataset re-indexed during the slice (${unique}/${total} unique), repeating`);
  }
  return { state, total, rows };
}

function loadCache(datasetTotal) {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (cache.datasetTotal === datasetTotal && Date.now() - Date.parse(cache.startedAt) < CACHE_MAX_AGE_MS) return cache;
  } catch { /* no usable progress */ }
  return { datasetTotal, startedAt: new Date().toISOString(), states: {} };
}

function statesFromRecentDays() {
  const names = new Set();
  for (const day of listDays().slice(-14)) {
    try { for (const r of readDay(path.join(DAILY_DIR, `${day}.json`)).records) names.add(r.state); } catch { /* skip */ }
  }
  return names;
}

async function main() {
  const opts = parseArgs();
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  if (API_KEY === SAMPLE_KEY) console.log('Using the public sample key (10 rows per call). Set DATA_GOV_API_KEY for faster runs.');

  const first = await fetchPage(0, null);
  const datasetTotal = Number(first.total) || 0;
  const snapshot = snapshotOf(first);
  const dates = [...new Set(first.records.map(r => r.arrival_date))].join(', ');
  console.log(`Dataset ${snapshot}: ${datasetTotal} records (sample dates: ${dates})`);
  if (!datasetTotal) { console.error('Dataset is empty.'); process.exit(1); }

  // Skip when the first page is already stored with the same prices (rows are shuffled on
  // re-index, so this compares content, not position).
  const sample = first.records.map(r => normalizeRecord(r).record).filter(Boolean);
  const stored = new Map();
  for (const day of new Set(sample.map(r => arrivalToISO(r.arrival_date)))) {
    try { for (const r of readDay(path.join(DAILY_DIR, `${day}.json`))?.records || []) stored.set(recordKey(r), r.modal_price); } catch { /* not stored */ }
  }
  if (sample.length && sample.every(r => stored.get(recordKey(r)) === r.modal_price)) {
    console.log('This dataset is already stored. Nothing to do.');
    return;
  }

  const cache = loadCache(datasetTotal);
  const failedStates = [];
  const states = [...new Set([...KNOWN_STATES, ...statesFromRecentDays()])].filter(Boolean).sort();
  for (const state of states) {
    if (cache.states[state]) continue;
    let slice;
    try { slice = await fetchState(state, opts); }
    catch (e) { failedStates.push(state); console.log(`  ${state}: ${e.message}; will retry on the next run`); continue; }
    cache.states[state] = slice;
    writeAtomic(CACHE_FILE, cache);
    if (slice.total) console.log(`  ${state}: ${slice.total} records`);
  }

  const covered = Object.values(cache.states).reduce((n, s) => n + s.total, 0);
  const { unique, rejected } = uniqueValid(Object.values(cache.states).flatMap(s => s.rows));
  console.log(`State slices cover ${covered}/${datasetTotal}; ${unique.size} valid unique records.`);
  if (Object.keys(rejected).length) console.log('Rejected rows:', rejected);
  if (covered < datasetTotal) console.log(`  ${datasetTotal - covered} records belong to a state name not in the list; add it to KNOWN_STATES.`);

  if (failedStates.length) console.log(`Failed states: ${failedStates.join(', ')}`);
  if (unique.size < datasetTotal * opts.minComplete) {
    console.error(`Incomplete: below ${(opts.minComplete * 100).toFixed(0)}% of the dataset. Nothing written; finished states are kept for the next run.`);
    process.exit(1);
  }

  const results = mergeRecords([...unique.values()], { source: SOURCE });
  for (const r of results) console.log(`  ${r.date}: ${r.before} → ${r.after} records (+${r.added}, ${r.replaced} replaced)`);
  fs.rmSync(CACHE_FILE, { force: true });
  console.log('Done.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
