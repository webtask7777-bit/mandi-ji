#!/usr/bin/env node
/**
 * CG Mandi Portal Scraper
 * Scrapes data from https://agriportal.cg.nic.in/agrimandi/RptDateWiseEntry.aspx
 * Fetches last 5 years of mandi data in monthly chunks
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const BASE_URL = 'https://agriportal.cg.nic.in/agrimandi/RptDateWiseEntry.aspx';
const OUTPUT_DIR = path.join(__dirname, 'data');
const COMBINED_CSV = path.join(OUTPUT_DIR, 'cg-mandi-5yr.csv');

// Ignore SSL errors (government site has cert issues)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// CSV headers
const CSV_HEADERS = [
  'serial', 'transaction_id', 'district', 'mandi', 'arrival_date',
  'entry_date', 'crop', 'min_price', 'modal_price', 'max_price',
  'arrival_qty', 'dispatch_qty', 'state_in_out', 'trader_type', 'faq_status'
].join(',');

// Districts from the portal
const DISTRICTS = [
  { value: '1', name: 'समस्त (All)' }
  // Using "समस्त" (All) to get all districts in one request per date range
];

// Generate monthly date ranges for last 5 years
function generateDateRanges() {
  const ranges = [];
  const now = new Date();
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);

  let current = new Date(fiveYearsAgo.getFullYear(), fiveYearsAgo.getMonth(), 1);

  while (current <= now) {
    const start = new Date(current);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0); // last day of month

    // Don't go past today
    if (end > now) {
      end.setTime(now.getTime());
    }

    ranges.push({
      start: `${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`,
      end: `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`,
      label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
    });

    current.setMonth(current.getMonth() + 1);
  }

  return ranges;
}

// Make HTTP(S) request with auto-redirect and cookie handling
function makeRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,hi;q=0.3',
        'Accept-Encoding': 'identity',
        ...(options.headers || {})
      },
      timeout: 60000,
      rejectUnauthorized: false
    };

    if (postData) {
      reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = protocol.request(reqOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        resolve(makeRequest(redirectUrl, options, postData));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookies: (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; '),
          body
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (postData) req.write(postData);
    req.end();
  });
}

// Extract ASP.NET hidden fields from HTML
function extractAspNetFields(html) {
  const fields = {};
  const fieldNames = ['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__EVENTVALIDATION', '__EVENTTARGET', '__EVENTARGUMENT'];

  for (const name of fieldNames) {
    const regex = new RegExp(`name="${name}"[^>]*value="([^"]*)"`, 'i');
    const match = html.match(regex);
    if (match) {
      fields[name] = match[1];
    }
  }
  return fields;
}

// Parse HTML table rows into data
function parseTable(html) {
  const rows = [];

  // Find the report table
  const tableMatch = html.match(/<table[^>]*id="grdRpt"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;

  const tableHtml = tableMatch[1];

  // Match all data rows (skip header row)
  const rowRegex = /<tr>\s*<td>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    const rowContent = '<td>' + rowMatch[1];

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      // Strip HTML tags and trim
      const text = cellMatch[1].replace(/<[^>]*>/g, '').trim();
      cells.push(text);
    }

    if (cells.length >= 13) {
      // Parse price field "min/modal/max"
      const prices = cells[7].split('/');
      rows.push({
        serial: cells[0],
        transaction_id: cells[1],
        district: cells[2],
        mandi: cells[3],
        arrival_date: cells[4],
        entry_date: cells[5],
        crop: cells[6],
        min_price: prices[0] || '0',
        modal_price: prices[1] || '0',
        max_price: prices[2] || '0',
        arrival_qty: cells[8],
        dispatch_qty: cells[9],
        state_in_out: cells[10],
        trader_type: cells[11],
        faq_status: cells[12]
      });
    }
  }

  return rows;
}

// Convert row to CSV line
function rowToCSV(row) {
  const escape = (val) => {
    val = String(val);
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
  };

  return [
    row.serial, row.transaction_id, escape(row.district), escape(row.mandi),
    row.arrival_date, row.entry_date, escape(row.crop),
    row.min_price, row.modal_price, row.max_price,
    row.arrival_qty, row.dispatch_qty,
    escape(row.state_in_out), escape(row.trader_type), row.faq_status
  ].join(',');
}

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main scraper
async function scrape() {
  console.log('=== CG Mandi Portal Scraper ===');
  console.log(`Fetching 5 years of data from ${BASE_URL}\n`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Track progress
  const progressFile = path.join(OUTPUT_DIR, 'progress.json');
  let progress = {};
  if (fs.existsSync(progressFile)) {
    progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    console.log(`Resuming from previous session. ${Object.keys(progress).length} months already done.\n`);
  }

  // Generate date ranges
  const ranges = generateDateRanges();
  console.log(`Total months to scrape: ${ranges.length}`);
  console.log(`Date range: ${ranges[0].start} to ${ranges[ranges.length - 1].end}\n`);

  // Initialize CSV if new
  if (!fs.existsSync(COMBINED_CSV)) {
    fs.writeFileSync(COMBINED_CSV, CSV_HEADERS + '\n');
  }

  let totalRows = 0;
  let sessionCookies = '';

  // Step 1: GET the page first to get initial ViewState
  console.log('Fetching initial page for ViewState...');
  let response;
  try {
    response = await makeRequest(BASE_URL);
    if (response.cookies) sessionCookies = response.cookies;
    console.log(`Initial page loaded (${response.statusCode}), HTML size: ${response.body.length}\n`);
  } catch (err) {
    console.error('Failed to load initial page:', err.message);
    console.error('\nThe site may be unreachable. Retry later or check connectivity.');
    process.exit(1);
  }

  let aspFields = extractAspNetFields(response.body);

  if (!aspFields.__VIEWSTATE) {
    console.error('Could not extract __VIEWSTATE. Page may have changed or failed to load.');
    console.log('Saving page HTML for debugging...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'debug-page.html'), response.body);
    process.exit(1);
  }

  // Step 2: Iterate monthly
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];

    // Skip already completed months
    if (progress[range.label]) {
      console.log(`[${i + 1}/${ranges.length}] ${range.label} — already scraped (${progress[range.label]} rows), skipping`);
      totalRows += progress[range.label];
      continue;
    }

    console.log(`[${i + 1}/${ranges.length}] Scraping ${range.label} (${range.start} to ${range.end})...`);

    // Build POST data
    const postData = new URLSearchParams({
      '__EVENTTARGET': '',
      '__EVENTARGUMENT': '',
      '__VIEWSTATE': aspFields.__VIEWSTATE,
      '__VIEWSTATEGENERATOR': aspFields.__VIEWSTATEGENERATOR || '',
      '__EVENTVALIDATION': aspFields.__EVENTVALIDATION || '',
      'cmbDist': '1',    // समस्त (All)
      'cmbMandi': '1',   // समस्त (All)
      'cmbCrop': '1',    // समस्त (All)
      'DaintyDate1': range.start,
      'DaintyDate2': range.end,
      'btnShow': 'देखें'
    }).toString();

    try {
      response = await makeRequest(BASE_URL, {
        method: 'POST',
        headers: {
          'Referer': BASE_URL,
          'Origin': 'https://agriportal.cg.nic.in',
          'Cookie': sessionCookies,
          'Cache-Control': 'no-cache'
        }
      }, postData);

      if (response.cookies) {
        sessionCookies = response.cookies || sessionCookies;
      }

      // Update ViewState for next request
      const newFields = extractAspNetFields(response.body);
      if (newFields.__VIEWSTATE) {
        aspFields = newFields;
      }

      // Parse the table
      const rows = parseTable(response.body);

      if (rows.length > 0) {
        // Append to combined CSV
        const csvLines = rows.map(rowToCSV).join('\n') + '\n';
        fs.appendFileSync(COMBINED_CSV, csvLines);

        // Also save monthly JSON for granular access
        const monthFile = path.join(OUTPUT_DIR, `${range.label}.json`);
        fs.writeFileSync(monthFile, JSON.stringify(rows, null, 2));
      }

      console.log(`   → ${rows.length} rows fetched`);
      totalRows += rows.length;

      // Update progress
      progress[range.label] = rows.length;
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));

    } catch (err) {
      console.error(`   ✘ Error for ${range.label}: ${err.message}`);
      console.log('   Retrying after 10s...');
      await delay(10000);

      // Re-fetch initial page for fresh ViewState
      try {
        response = await makeRequest(BASE_URL);
        aspFields = extractAspNetFields(response.body);
        if (response.cookies) sessionCookies = response.cookies;
        i--; // Retry this month
      } catch (retryErr) {
        console.error(`   ✘ Retry failed: ${retryErr.message}. Skipping ${range.label}`);
      }
      continue;
    }

    // Be polite - wait between requests (2-4 seconds)
    const waitTime = 2000 + Math.random() * 2000;
    await delay(waitTime);
  }

  console.log(`\n=== SCRAPING COMPLETE ===`);
  console.log(`Total rows: ${totalRows}`);
  console.log(`Combined CSV: ${COMBINED_CSV}`);
  console.log(`Monthly JSON files: ${OUTPUT_DIR}/`);

  // Generate summary
  const summary = {
    scrapedAt: new Date().toISOString(),
    totalRows,
    monthsCovered: Object.keys(progress).length,
    dateRange: {
      from: ranges[0].start,
      to: ranges[ranges.length - 1].end
    },
    source: BASE_URL
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(`Summary saved to ${path.join(OUTPUT_DIR, 'summary.json')}`);
}

// Run
scrape().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
