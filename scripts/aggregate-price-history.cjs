#!/usr/bin/env node
/**
 * Build monthly mandi price history (2009 onward) from the raw days fetched by
 * scripts/fetch-price-history.cjs (.cache/prices/raw/YYYY/YYYY-MM-DD.ndjson.gz).
 *
 * For every commodity, month and scope (all India, each state) the published price is the
 * median of the mandis' own monthly average modal prices — the same rule as the daily
 * aggregates (scripts/lib/robust-price.cjs), so one state filing many varieties counts once
 * per mandi. A mandi whose month average is ten times off that month's national median for
 * the commodity is reporting another unit and is left out. Months with too few mandis for
 * their series are dropped rather than shown as a national price.
 *
 * The seasonal profile says how far each calendar month usually sits from that year's own
 * average (median over years with at least 8 months of data), so inflation does not decide it.
 *
 * Output: server/db/data/price-history/index.json and <crop-id>.json
 * Row: [YYYY-MM, median, p25, p75, mandis]
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { median } = require('./lib/robust-price.cjs');
const { STATES, STATE_ALIASES, COMMODITY_ALIASES, NON_QUINTAL_COMMODITIES, belowDryFloor } = require('./lib/source-names.cjs');

const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, '.cache', 'prices', 'raw');
const OUT_DIR = path.join(ROOT, 'server', 'db', 'data', 'price-history');
const UNIT_RATIO = 10;
const THIN_SHARE = 0.2;
const MIN_SEASON_YEARS = 3;

const slugify = name => name.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

function monthsOnDisk() {
  const byMonth = new Map();
  if (!fs.existsSync(RAW_DIR)) return byMonth;
  for (const year of fs.readdirSync(RAW_DIR).filter(name => /^\d{4}$/.test(name)).sort()) {
    for (const file of fs.readdirSync(path.join(RAW_DIR, year)).filter(name => /^\d{4}-\d{2}-\d{2}\.ndjson\.gz$/.test(name)).sort()) {
      const month = file.slice(0, 7);
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month).push(path.join(RAW_DIR, year, file));
    }
  }
  return byMonth;
}

function* readDay(file) {
  const lines = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').split('\n');
  const meta = JSON.parse(lines[0]);
  if (!meta.complete) return;
  for (let i = 1; i < lines.length; i++) if (lines[i]) yield JSON.parse(lines[i]);
}

/** One month: crop → scope → mandi → [sum, count]. */
function readMonth(files) {
  const crops = new Map();
  for (const file of files) {
    for (const [stateRaw, district, market, commodityRaw, , , min, max, modal] of readDay(file)) {
      const commodity = COMMODITY_ALIASES[commodityRaw] || commodityRaw;
      if (NON_QUINTAL_COMMODITIES.has(commodity) || belowDryFloor({ modal_price: modal, commodity })) continue;
      // A modal far outside its own min–max range is a typing error.
      if (min > 0 && max >= min && (modal > max * 1.5 || modal < min / 1.5)) continue;
      const stateName = STATE_ALIASES[stateRaw] || stateRaw;
      const stateId = STATES[stateName]?.id;
      if (!stateId) continue;
      const crop = slugify(commodity);
      if (!crop) continue;
      let byMandi = crops.get(crop);
      if (!byMandi) { byMandi = new Map(); byMandi.commodity = commodity; crops.set(crop, byMandi); }
      const key = `${stateId}|${district}|${market}`.toLowerCase();
      const entry = byMandi.get(key) || [0, 0];
      entry[0] += modal; entry[1]++;
      byMandi.set(key, entry);
    }
  }
  return crops;
}

function summarizeMonth(byMandi) {
  const means = [...byMandi.entries()].map(([key, [sum, count]]) => [key.slice(0, key.indexOf('|')), sum / count]);
  const national = median(means.map(([, mean]) => mean));
  const kept = means.length >= 5 && national > 0 ? means.filter(([, mean]) => mean >= national / UNIT_RATIO && mean <= national * UNIT_RATIO) : means;
  const row = list => {
    const sorted = list.slice().sort((a, b) => a - b);
    return [Math.round(quantile(sorted, 0.5)), Math.round(quantile(sorted, 0.25)), Math.round(quantile(sorted, 0.75)), sorted.length];
  };
  const out = { all: row(kept.map(([, mean]) => mean)) };
  const byState = new Map();
  for (const [stateId, mean] of kept) (byState.get(stateId) || byState.set(stateId, []).get(stateId)).push(mean);
  for (const [stateId, list] of byState) out[stateId] = row(list);
  return out;
}

function dropThin(rows) {
  if (rows.length < 3) return rows;
  const typical = median(rows.map(row => row[4]));
  return rows.filter(row => row[4] >= typical * THIN_SHARE);
}

function seasonal(rows) {
  const byYear = new Map();
  for (const [ym, price] of rows) {
    const year = ym.slice(0, 4);
    (byYear.get(year) || byYear.set(year, []).get(year)).push([Number(ym.slice(5, 7)) - 1, price]);
  }
  const ratios = Array.from({ length: 12 }, () => []);
  let years = 0;
  for (const months of byYear.values()) {
    if (months.length < 8) continue;
    years++;
    const average = months.reduce((sum, [, price]) => sum + price, 0) / months.length;
    for (const [month, price] of months) ratios[month].push(price / average);
  }
  if (years < MIN_SEASON_YEARS) return null;
  return { years, pct: ratios.map(list => (list.length >= MIN_SEASON_YEARS ? Math.round((median(list) - 1) * 1000) / 10 : null)) };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(value));
  fs.renameSync(`${file}.tmp`, file);
}

function main() {
  const months = monthsOnDisk();
  if (!months.size) { console.error('No raw price days in .cache/prices/raw. Run scripts/fetch-price-history.cjs first.'); process.exit(1); }
  const series = new Map(); // crop → { commodity, scopes: Map(scope → rows) }
  let days = 0;
  for (const [month, files] of [...months.entries()].sort()) {
    days += files.length;
    for (const [crop, byMandi] of readMonth(files)) {
      const entry = series.get(crop) || series.set(crop, { commodity: byMandi.commodity, scopes: new Map() }).get(crop);
      for (const [scope, row] of Object.entries(summarizeMonth(byMandi))) {
        if (!(row[0] > 0)) continue;
        (entry.scopes.get(scope) || entry.scopes.set(scope, []).get(scope)).push([month, ...row]);
      }
    }
    if (month.endsWith('-12')) console.log(`  ${month.slice(0, 4)} read`);
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  const index = [];
  for (const [crop, { commodity, scopes }] of [...series.entries()].sort()) {
    const all = dropThin(scopes.get('all') || []);
    // Too little to be a history: fewer than 12 national months.
    if (all.length < 12) continue;
    const states = {};
    const seasonalStates = {};
    for (const [scope, rows] of scopes) {
      if (scope === 'all') continue;
      const kept = dropThin(rows);
      if (kept.length < 12) continue;
      states[scope] = kept;
      const profile = seasonal(kept);
      if (profile) seasonalStates[scope] = profile;
    }
    const coverage = { from: all[0][0], to: all.at(-1)[0], months: all.length };
    writeJson(path.join(OUT_DIR, `${crop}.json`), { id: crop, commodity, unit: '₹/क्विंटल', coverage, all, states, seasonal: { all: seasonal(all), states: seasonalStates } });
    index.push({ id: crop, commodity, ...coverage, states: Object.keys(states).length });
  }
  const allMonths = [...months.keys()].sort();
  writeJson(path.join(OUT_DIR, 'index.json'), {
    source: 'Variety-wise Daily Market Prices Data of Commodity (Agmarknet), data.gov.in',
    sourceUrl: 'https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity',
    resourceId: '35985678-0d79-46b4-9ed6-6f13308a1d24',
    coverage: { from: allMonths[0], to: allMonths.at(-1), days },
    builtOn: new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10),
    crops: index,
  });
  console.log(`Price history: ${index.length} crops, ${days} days, ${allMonths[0]} – ${allMonths.at(-1)}.`);
}

if (require.main === module) main();

module.exports = { summarizeMonth, seasonal, dropThin, quantile };
