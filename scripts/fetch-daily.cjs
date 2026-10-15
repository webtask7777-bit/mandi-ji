#!/usr/bin/env node
/**
 * Fetch the current mandi price dataset from data.gov.in
 * ("Current Daily Price of Various Commodities from Various Markets").
 *
 * - Records are filed under their own arrival date via scripts/lib/daily-store.cjs
 *   (merge, never overwrite; atomic writes).
 * - The dataset is replaced by the publisher during the day, so progress is tied to the
 *   snapshot's `updated_date`. A rerun resumes the same snapshot; a new snapshot starts over.
 * - Nothing is written to daily/ unless the whole snapshot was read (≥ --min-complete of the
 *   reported total). An incomplete run exits 1 and keeps its progress for the next attempt.
 *
 * Usage:
 *   node scripts/fetch-daily.cjs [--concurrency 3] [--min-complete 0.99] [--state Chhattisgarh]
 * Env:
 *   DATA_GOV_API_KEY  registered key (the public sample key returns only 10 rows per call)
 */

const fs = require('fs');
const path = require('path');
const { normalizeRecord, recordKey, mergeRecords, writeAtomic } = require('./lib/daily-store.cjs');

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const API_KEY = process.env.DATA_GOV_API_KEY || SAMPLE_KEY;
const REQUEST_LIMIT = 1000;
const CACHE_DIR = path.join(__dirname, '..', '.cache', 'datagov');
const SOURCE = 'data.gov.in';
// Last fully stored snapshot, committed with the data so scheduled runs skip a repeat.
const LAST_SNAPSHOT_FILE = path.join(__dirname, '..', 'server', 'db', 'data', 'daily', '.datagov-last-snapshot.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { concurrency: 3, minComplete: 0.99, state: null, delayMs: 250 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--concurrency') opts.concurrency = Math.max(1, parseInt(args[++i], 10) || 1);
    else if (args[i] === '--min-complete') opts.minComplete = Math.min(1, parseFloat(args[++i]) || 0.99);
    else if (args[i] === '--state') opts.state = args[++i];
    else if (args[i] === '--delay') opts.delayMs = Math.max(0, parseInt(args[++i], 10) || 0);
  }
  return opts;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPage(offset, opts, retries = 6) {
  const params = new URLSearchParams({ 'api-key': API_KEY, format: 'json', limit: String(REQUEST_LIMIT), offset: String(offset) });
  if (opts.state) params.set('filters[state]', opts.state);
  const url = `${API_BASE}?${params}`;
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
      const data = await res.json();
      if (!Array.isArray(data.records)) throw new Error('response without records');
      return data;
    } catch (e) {
      if (e.fatal) throw e;
      lastError = e;
      await sleep(Math.min(60000, 2000 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`offset ${offset}: ${lastError?.message || 'failed'} after ${retries} attempts`);
}

function loadProgress(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return null; }
}

async function main() {
  const opts = parseArgs();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (API_KEY === SAMPLE_KEY) console.log('Using the public sample key (10 rows per call). Set DATA_GOV_API_KEY for faster runs.');

  const first = await fetchPage(0, opts);
  const snapshot = first.updated_date || String(first.updated || 'unknown');
  const total = Number(first.total) || 0;
  const pageSize = first.records.length;
  console.log(`Snapshot ${snapshot}: ${total} records reported, ${pageSize} per call${opts.state ? `, state=${opts.state}` : ''}`);
  if (total === 0 || pageSize === 0) {
    console.log('Dataset is empty for this query. Nothing to store.');
    process.exit(opts.state ? 0 : 1);
  }

  if (!opts.state) {
    try {
      if (JSON.parse(fs.readFileSync(LAST_SNAPSHOT_FILE, 'utf-8')).snapshot === snapshot) {
        console.log('This snapshot is already stored. Nothing to do.');
        return;
      }
    } catch { /* no previous snapshot recorded */ }
  }

  const progressFile = path.join(CACHE_DIR, `${(opts.state || 'all').replace(/\W+/g, '_')}.json`);
  let progress = loadProgress(progressFile);
  if (!progress || progress.snapshot !== snapshot || progress.pageSize !== pageSize) {
    progress = { snapshot, pageSize, total, doneOffsets: [], rows: [] };
  }
  const done = new Set(progress.doneOffsets);
  const rows = progress.rows;
  if (!done.has(0)) { rows.push(...first.records); done.add(0); }

  const offsets = [];
  for (let o = pageSize; o < total; o += pageSize) if (!done.has(o)) offsets.push(o);
  console.log(`${offsets.length} pages to fetch (${done.size} already done for this snapshot).`);

  const save = () => writeAtomic(progressFile, { ...progress, doneOffsets: [...done], rows });
  let failures = 0, i = 0, sinceSave = 0;
  const worker = async () => {
    while (i < offsets.length) {
      const offset = offsets[i++];
      try {
        const page = await fetchPage(offset, opts);
        const pageSnapshot = page.updated_date || String(page.updated || 'unknown');
        if (pageSnapshot !== snapshot) throw Object.assign(new Error(`dataset changed mid-run (${snapshot} → ${pageSnapshot})`), { fatal: true });
        rows.push(...page.records);
        done.add(offset);
        if (++sinceSave >= 25) { sinceSave = 0; save(); console.log(`  ${done.size * pageSize}/${total}`); }
      } catch (e) {
        if (e.fatal) throw e;
        failures++;
        console.log(`  ${e.message}`);
      }
      if (opts.delayMs) await sleep(opts.delayMs);
    }
  };
  try {
    await Promise.all(Array.from({ length: opts.concurrency }, worker));
  } finally {
    save();
  }

  const unique = new Map();
  const rejected = {};
  for (const raw of rows) {
    const { record, error } = normalizeRecord(raw);
    if (error) { rejected[error] = (rejected[error] || 0) + 1; continue; }
    unique.set(recordKey(record), record);
  }
  const completeness = rows.length / total;
  console.log(`Read ${rows.length}/${total} rows (${(completeness * 100).toFixed(1)}%), ${failures} failed pages, ${unique.size} valid unique records.`);
  if (Object.keys(rejected).length) console.log('Rejected rows:', rejected);

  if (completeness < opts.minComplete) {
    console.error(`Incomplete snapshot: below ${(opts.minComplete * 100).toFixed(0)}%. Nothing written; rerun to resume.`);
    process.exit(1);
  }

  const results = mergeRecords([...unique.values()], { source: SOURCE });
  for (const r of results) console.log(`  ${r.date}: ${r.before} → ${r.after} records (+${r.added}, ${r.replaced} replaced)`);
  fs.rmSync(progressFile, { force: true });
  if (!opts.state) writeAtomic(LAST_SNAPSHOT_FILE, { snapshot, total, storedAt: new Date().toISOString() });
  console.log('Done.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
