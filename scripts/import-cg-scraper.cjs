#!/usr/bin/env node
/**
 * Import the Chhattisgarh Mandi Board scraper history (scraper/data/all-records.json) into the
 * daily store. The scraper lists individual transactions; they are combined per mandi,
 * commodity, variety, grade and day: min of minimums, max of maximums and a modal price
 * weighted by arrival quantity (plain mean when quantities are missing).
 *
 * Usage: node scripts/import-cg-scraper.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { normalizeRecord, mergeRecords } = require('./lib/daily-store.cjs');
const { districtFor, mandiFor, splitCrop, commodityFor } = require('./lib/cg-scraper-map.cjs');

const SOURCE = 'agriportal.cg.nic.in';
const INPUT = path.join(__dirname, '..', 'scraper', 'data', 'all-records.json');
const dryRun = process.argv.includes('--dry-run');

function combine(rows) {
  const groups = new Map();
  const skipped = { commodity: {}, place: {}, date: 0 };
  for (const row of rows) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(row.arrival_date))) { skipped.date++; continue; }
    const commodity = commodityFor(row.crop);
    if (!commodity) { skipped.commodity[row.crop] = (skipped.commodity[row.crop] || 0) + 1; continue; }
    const district = districtFor(row.district);
    const mandi = mandiFor(row.mandi);
    if (!district || !mandi) { const k = `${row.district}|${row.mandi}`; skipped.place[k] = (skipped.place[k] || 0) + 1; continue; }
    const { variety } = splitCrop(row.crop);
    const grade = row.faq_status === 'FAQ' ? 'FAQ' : 'Non-FAQ';
    const key = [district, mandi, commodity, variety, grade, row.arrival_date].join('|');
    if (!groups.has(key)) groups.set(key, { district, mandi, commodity, variety, grade, date: row.arrival_date, rows: [] });
    groups.get(key).rows.push(row);
  }
  const records = [];
  for (const g of groups.values()) {
    const priced = g.rows.filter(r => Number(r.modal_price) > 0);
    if (!priced.length) continue;
    const qty = priced.map(r => Number(r.arrival_qty) > 0 ? Number(r.arrival_qty) : 0);
    const totalQty = qty.reduce((a, b) => a + b, 0);
    const modal = totalQty > 0
      ? priced.reduce((sum, r, i) => sum + Number(r.modal_price) * qty[i], 0) / totalQty
      : priced.reduce((sum, r) => sum + Number(r.modal_price), 0) / priced.length;
    const { record } = normalizeRecord({
      state: 'Chhattisgarh', district: g.district, market: `${g.mandi} APMC`, commodity: g.commodity,
      variety: g.variety, grade: g.grade, arrival_date: g.date,
      min_price: Math.min(...priced.map(r => Number(r.min_price) || Infinity)),
      max_price: Math.max(...priced.map(r => Number(r.max_price) || 0)),
      modal_price: Math.round(modal),
    });
    if (record) records.push(record);
  }
  return { records, skipped, transactions: rows.length };
}

function main() {
  const rows = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const { records, skipped, transactions } = combine(rows);
  const byCommodity = {};
  for (const r of records) byCommodity[r.commodity] = (byCommodity[r.commodity] || 0) + 1;
  const skippedTx = Object.values(skipped.commodity).reduce((a, b) => a + b, 0);
  console.log(`${transactions} transactions → ${records.length} daily records (${skippedTx} transactions skipped as ambiguous commodity, ${skipped.date} without date).`);
  console.log('Records per commodity:', Object.entries(byCommodity).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(', '));
  if (Object.keys(skipped.place).length) console.log('Unmapped places:', skipped.place);
  const topSkipped = Object.entries(skipped.commodity).sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log('Most frequent skipped crops:', topSkipped.map(([c, n]) => `${c} ${n}`).join(', '));
  if (dryRun) return;
  const results = mergeRecords(records, { source: SOURCE });
  console.log(`Merged into ${results.length} day files.`);
}

if (require.main === module) main();
module.exports = { combine };
