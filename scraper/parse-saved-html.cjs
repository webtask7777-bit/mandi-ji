#!/usr/bin/env node
/**
 * Parse saved CG Mandi HTML file and extract all data rows
 */
const fs = require('fs');
const path = require('path');

const HTML_FILE = '/Users/vivekkumar/Downloads/C.G.State Agriculture Marketing(Mandi) Board.html';
const OUTPUT_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Reading HTML file...');
const html = fs.readFileSync(HTML_FILE, 'utf-8');
console.log(`File size: ${(html.length / 1024 / 1024).toFixed(1)} MB`);

// Find the report table
const tableMatch = html.match(/<table[^>]*id="grdRpt"[^>]*>([\s\S]*?)<\/table>/i);
if (!tableMatch) {
  console.error('Could not find grdRpt table!');
  process.exit(1);
}

const tableHtml = tableMatch[1];
console.log('Found report table, parsing rows...');

// Parse all rows
const rows = [];
const trRegex = /<tr>\s*([\s\S]*?)<\/tr>/gi;
let trMatch;
let isHeader = true;

while ((trMatch = trRegex.exec(tableHtml)) !== null) {
  if (isHeader) { isHeader = false; continue; } // skip header

  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const cells = [];
  let cellMatch;
  while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
    cells.push(cellMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim());
  }

  if (cells.length >= 13) {
    const prices = cells[7].split('/');
    rows.push({
      serial: parseInt(cells[0]) || 0,
      transaction_id: cells[1],
      district: cells[2],
      mandi: cells[3],
      arrival_date: cells[4],
      entry_date: cells[5],
      crop: cells[6],
      min_price: parseFloat(prices[0]) || 0,
      modal_price: parseFloat(prices[1]) || 0,
      max_price: parseFloat(prices[2]) || 0,
      arrival_qty: parseFloat(cells[8]) || 0,
      dispatch_qty: parseFloat(cells[9]) || 0,
      state_in_out: cells[10],
      trader_type: cells[11],
      faq_status: cells[12]
    });
  }
}

console.log(`\nTotal rows parsed: ${rows.length}`);

// Analyze the data
const districts = [...new Set(rows.map(r => r.district))].sort();
const mandis = [...new Set(rows.map(r => r.mandi))].sort();
const crops = [...new Set(rows.map(r => r.crop))].sort();

// Date range
const dates = rows.map(r => {
  const [d, m, y] = r.arrival_date.split('/');
  return new Date(y, m - 1, d);
}).filter(d => !isNaN(d));
dates.sort((a, b) => a - b);

console.log(`\n=== DATA SUMMARY ===`);
console.log(`Date range: ${dates[0]?.toLocaleDateString('en-IN')} → ${dates[dates.length - 1]?.toLocaleDateString('en-IN')}`);
console.log(`Districts: ${districts.length}`);
console.log(`Mandis: ${mandis.length}`);
console.log(`Crops: ${crops.length}`);

// District-wise counts
console.log(`\n--- Districts ---`);
const distCounts = {};
rows.forEach(r => { distCounts[r.district] = (distCounts[r.district] || 0) + 1; });
Object.entries(distCounts).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => {
  console.log(`  ${d}: ${c} records`);
});

// Crop-wise counts (top 20)
console.log(`\n--- Top 20 Crops ---`);
const cropCounts = {};
rows.forEach(r => { cropCounts[r.crop] = (cropCounts[r.crop] || 0) + 1; });
Object.entries(cropCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([c, n]) => {
  console.log(`  ${c}: ${n} records`);
});

// Monthly distribution
console.log(`\n--- Monthly Distribution ---`);
const monthDist = {};
rows.forEach(r => {
  const parts = r.arrival_date.split('/');
  if (parts.length >= 3) {
    const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
    monthDist[key] = (monthDist[key] || 0) + 1;
  }
});
Object.keys(monthDist).sort().forEach(k => {
  console.log(`  ${k}: ${monthDist[k]} records`);
});

// Save full data as JSON
console.log('\nSaving parsed data...');
fs.writeFileSync(path.join(OUTPUT_DIR, 'all-records.json'), JSON.stringify(rows));
console.log(`  → all-records.json (${(fs.statSync(path.join(OUTPUT_DIR, 'all-records.json')).size / 1024 / 1024).toFixed(1)} MB)`);

// Save summary
const summary = {
  totalRecords: rows.length,
  dateRange: { from: dates[0]?.toISOString(), to: dates[dates.length - 1]?.toISOString() },
  districts: districts,
  districtCount: districts.length,
  mandis: mandis,
  mandiCount: mandis.length,
  crops: crops,
  cropCount: crops.length,
  districtWise: distCounts,
  cropWise: cropCounts,
  monthlyDistribution: monthDist
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`  → summary.json`);

// Save CSV
const csvHeader = 'serial,transaction_id,district,mandi,arrival_date,entry_date,crop,min_price,modal_price,max_price,arrival_qty,dispatch_qty,state_in_out,trader_type,faq_status';
const csvRows = rows.map(r => {
  const esc = v => String(v).includes(',') ? `"${v}"` : v;
  return [r.serial, r.transaction_id, esc(r.district), esc(r.mandi), r.arrival_date, r.entry_date, esc(r.crop), r.min_price, r.modal_price, r.max_price, r.arrival_qty, r.dispatch_qty, esc(r.state_in_out), esc(r.trader_type), r.faq_status].join(',');
});
fs.writeFileSync(path.join(OUTPUT_DIR, 'cg-mandi-data.csv'), csvHeader + '\n' + csvRows.join('\n'));
console.log(`  → cg-mandi-data.csv`);

console.log('\nDone!');
