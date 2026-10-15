#!/usr/bin/env node
/**
 * Report how current the stored mandi observations are, by arrival (observation) date in
 * India time, not by fetch time. Exits 1 when the newest observation is older than
 * --max-age-days, so a scheduled job fails visibly instead of publishing stale data as new.
 *
 * Usage: node scripts/check-freshness.cjs [--max-age-days 3] [--json]
 */

const { DAILY_DIR, listDays, readDay, istDate } = require('./lib/daily-store.cjs');
const path = require('path');

const args = process.argv.slice(2);
const maxIdx = args.indexOf('--max-age-days');
const maxAge = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 3;

const days = listDays();
const today = istDate();
const latest = days[days.length - 1] || null;
const ageDays = latest ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latest}T00:00:00Z`)) / 86400000) : null;

const recent = days.slice(-7).map(d => {
  const data = readDay(path.join(DAILY_DIR, `${d}.json`));
  const states = {};
  for (const r of data.records) states[r.state] = (states[r.state] || 0) + 1;
  return { date: d, records: data.records.length, states: Object.keys(states).length, chhattisgarh: (states.Chhattisgarh || 0) + (states.Chattisgarh || 0), sources: data.sources || (data.source ? [data.source] : []) };
});

const report = { today, latestObservation: latest, ageDays, maxAgeDays: maxAge, ok: ageDays !== null && ageDays <= maxAge, recent };
if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Today (IST): ${today}. Newest observation: ${latest || 'none'}${ageDays !== null ? ` (${ageDays} days old)` : ''}.`);
  for (const r of recent) console.log(`  ${r.date}: ${r.records} records, ${r.states} states, Chhattisgarh ${r.chhattisgarh}, ${r.sources.join(', ') || 'source unknown'}`);
  console.log(report.ok ? 'Fresh enough.' : `STALE: newest observation is older than ${maxAge} days.`);
}
process.exit(report.ok ? 0 : 1);
