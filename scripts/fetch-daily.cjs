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
 * - Each state is stored once its slice is complete (unique valid records reach --min-complete
 *   of the state's total), so finished states survive a dataset swap or a failed run. The run
 *   exits 1 until every state is stored; the next run fetches only the missing ones.
 *
 * Usage:
 *   node scripts/fetch-daily.cjs [--min-complete 0.98] [--delay 1300] [--probe]
 * Env:
 *   DATA_GOV_API_KEY  required; use the registered key in the existing operator environment
 */

const fs = require('fs');
const path = require('path');
const { DAILY_DIR, arrivalToISO, normalizeRecord, recordKey, mergeRecords, writeAtomic, listDays, readDay } = require('./lib/daily-store.cjs');
const { createPageFetcher } = require('./lib/datagov-request.cjs');

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const API_KEY = process.env.DATA_GOV_API_KEY;
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

function parseArgs(args = process.argv.slice(2)) {
  const opts = { minComplete: 0.98, delayMs: 1300, probeOnly: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--min-complete') {
      opts.minComplete = Number(args[++i]);
      if (!(opts.minComplete > 0 && opts.minComplete <= 1)) throw new Error('--min-complete must be between 0 (exclusive) and 1');
    } else if (args[i] === '--delay') {
      opts.delayMs = Number(args[++i]);
      if (!Number.isFinite(opts.delayMs) || opts.delayMs < 0) throw new Error('--delay must be a non-negative number');
    } else if (args[i] === '--probe') opts.probeOnly = true;
    else throw new Error('Unknown fetch option');
  }
  return opts;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const snapshotOf = page => String(page.updated_date || page.updated || 'unknown');
const fetchPage = createPageFetcher({ apiBase: API_BASE, apiKey: API_KEY, limit: REQUEST_LIMIT });

// A record count alone cannot prove that prices are unchanged. Reuse only a
// successfully stored slice of the same known source revision and total.
function canReuseSlice(saved, probe) {
  return Boolean(saved && saved.snapshot && saved.snapshot !== 'unknown'
    && saved.snapshot === snapshotOf(probe) && Number(probe.total) === saved.total);
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
async function fetchState(state, opts, { request = fetchPage, wait = sleep, log = console.log } = {}) {
  const rows = [];
  let total = 0;
  let latestSnapshot = 'unknown';
  for (let pass = 1; pass <= MAX_SLICE_PASSES; pass++) {
    const first = await request(0, state);
    total = Number(first.total) || 0;
    latestSnapshot = snapshotOf(first);
    if (total === 0) return { state, total: 0, rows: [], snapshot: latestSnapshot };
    if (!first.records.length) throw new Error('Source reported records but returned an empty first page');
    const passRows = [...first.records];
    rows.push(...first.records);
    let stable = true;
    // Advance by records actually returned. An empty page cannot make progress.
    for (let offset = first.records.length; offset < total;) {
      await wait(opts.delayMs);
      const page = await request(offset, state);
      if (!page.records.length) throw new Error(`Source returned an empty page before offset ${total}`);
      if (snapshotOf(page) !== latestSnapshot || Number(page.total) !== total) stable = false;
      passRows.push(...page.records);
      rows.push(...page.records);
      offset += page.records.length;
    }
    const unique = uniqueValid(rows).unique.size;
    if (stable) return { state, total, rows: passRows, snapshot: latestSnapshot };
    // Valid observations survive a re-index, but its completion cache must not
    // pretend they form a verified single revision.
    if (unique >= total * opts.minComplete) return { state, total, rows, snapshot: null };
    log(`  ${state}: dataset re-indexed during the slice (${unique}/${total} unique), repeating`);
  }
  return { state, total, rows, snapshot: null };
}

/** Progress belongs to the dataset's reporting date(s); the total grows during the day. */
function loadCache(datasetDates) {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (cache.datasetDates === datasetDates && Date.now() - Date.parse(cache.startedAt) < CACHE_MAX_AGE_MS) return cache;
  } catch { /* no usable progress */ }
  return { datasetDates, startedAt: new Date().toISOString(), states: {} };
}

function statesFromRecentDays() {
  const names = new Set();
  for (const day of listDays().slice(-14)) {
    try { for (const r of readDay(path.join(DAILY_DIR, `${day}.json`)).records) names.add(r.state); } catch { /* skip */ }
  }
  return names;
}

async function runIngestion(opts, {
  request = fetchPage, wait = sleep, log = console.log,
  knownStates = KNOWN_STATES, recentStates = statesFromRecentDays,
  readCache = loadCache,
  saveCache = cache => { fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true }); writeAtomic(CACHE_FILE, cache); },
  clearCache = () => fs.rmSync(CACHE_FILE, { force: true }),
  merge = rows => mergeRecords(rows, { source: SOURCE }),
} = {}) {
  const first = await request(0, null, opts.probeOnly ? { retries: 1, timeoutMs: 15000 } : undefined);
  const datasetTotal = Number(first.total) || 0;
  const dates = [...new Set(first.records.map(row => arrivalToISO(row.arrival_date)).filter(Boolean))].sort().join(', ');
  if (!datasetTotal) throw new Error('Source dataset is empty');
  if (!first.records.length) throw new Error('Source reported records but returned an empty first page');
  log(`Dataset: ${datasetTotal} records (sample dates: ${dates || 'not available'})`);
  if (opts.probeOnly) {
    log('Source probe succeeded. No records or cache were written; this does not verify a complete refresh.');
    return { probeOnly: true, datasetTotal };
  }

  // A matching first page says nothing about the rest of the dataset. Always
  // inspect the state slices; durable per-state revision metadata can skip work.
  const cache = readCache(dates);
  const failedStates = [];
  const allRejected = {};
  const states = [...new Set([...knownStates, ...recentStates()])].filter(Boolean).sort();
  for (const state of states) {
    if (cache.states[state]) {
      let probe;
      try { probe = await request(0, state); }
      catch (error) {
        failedStates.push(state);
        log(`  ${state}: ${error.message}; current slice could not be verified`);
        continue;
      }
      if (canReuseSlice(cache.states[state], probe)) continue;
      await wait(opts.delayMs);
    }
    let slice;
    try { slice = await fetchState(state, opts, { request, wait, log }); }
    catch (error) { failedStates.push(state); log(`  ${state}: ${error.message}; will retry on the next run`); continue; }
    const { unique, rejected } = uniqueValid(slice.rows);
    for (const [reason, count] of Object.entries(rejected)) allRejected[reason] = (allRejected[reason] || 0) + count;
    // Repeated rejected rows must never count as successful coverage.
    if (slice.total && unique.size < slice.total * opts.minComplete) {
      failedStates.push(state);
      log(`  ${state}: only ${unique.size}/${slice.total} unique valid records; not stored, will retry`);
      continue;
    }
    if (unique.size) merge([...unique.values()]);
    cache.states[state] = { total: slice.total, stored: unique.size, snapshot: slice.snapshot };
    saveCache(cache);
    if (slice.total) log(`  ${state}: ${slice.total} records, ${unique.size} stored`);
  }

  const covered = Object.values(cache.states).reduce((count, state) => count + Number(state.stored || 0), 0);
  log(`Stored valid records cover ${covered}/${datasetTotal} records of this dataset.`);
  if (Object.keys(allRejected).length) log('Rejected rows:', allRejected);
  if (failedStates.length) log(`Failed states: ${failedStates.join(', ')}`);
  if (failedStates.length || covered < datasetTotal * opts.minComplete) {
    throw new Error('Incomplete refresh: at least one state failed validation or valid-record coverage is below the required threshold. Verified state records remain stored for recovery.');
  }
  clearCache();
  log('Done.');
  return { datasetTotal, covered };
}

async function main() {
  const opts = parseArgs();
  await runIngestion(opts);
}

if (require.main === module) main().catch(error => { console.error('Error:', error.message); process.exitCode = 1; });
module.exports = { parseArgs, uniqueValid, fetchState, canReuseSlice, runIngestion };
