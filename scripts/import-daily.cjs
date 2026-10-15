#!/usr/bin/env node
/**
 * Import daily snapshot files from another folder (for example an old checkout) into
 * server/db/data/daily through the same validation and merge rules as the fetchers.
 *
 * Usage: node scripts/import-daily.cjs <folder> [--source agmarknet.gov.in] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { normalizeRecord, recordKey, mergeRecords, arrivalToISO } = require('./lib/daily-store.cjs');

const args = process.argv.slice(2);
const folder = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const sourceIdx = args.indexOf('--source');
const forcedSource = sourceIdx >= 0 ? args[sourceIdx + 1] : null;
if (!folder) { console.error('Usage: node scripts/import-daily.cjs <folder> [--source name] [--dry-run]'); process.exit(1); }

const files = fs.readdirSync(folder).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
let imported = 0, rejected = 0, misfiled = 0;
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf-8'));
  const source = forcedSource || data.source || (Array.isArray(data.sources) ? data.sources[0] : null) || 'unknown';
  const unique = new Map();
  for (const raw of data.records || []) {
    const { record, error } = normalizeRecord(raw);
    if (error) { rejected++; continue; }
    if (arrivalToISO(record.arrival_date) !== f.slice(0, 10)) misfiled++; // kept, but filed under its own date
    unique.set(recordKey(record), record);
  }
  imported += unique.size;
  if (dryRun) { console.log(`${f}: ${unique.size} valid records (${source})`); continue; }
  for (const r of mergeRecords([...unique.values()], { source, fetchedAt: data.fetchedAt })) {
    console.log(`${f} → ${r.date}: ${r.before} → ${r.after} (+${r.added})`);
  }
}
console.log(`\n${files.length} files, ${imported} valid records, ${rejected} rejected, ${misfiled} filed under a different date than their file name.${dryRun ? ' (dry run)' : ''}`);
