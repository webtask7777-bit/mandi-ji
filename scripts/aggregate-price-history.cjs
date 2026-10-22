#!/usr/bin/env node
/**
 * Build monthly mandi price history (2009 onward) from the raw days fetched by
 * scripts/fetch-price-history.cjs (.cache/prices/raw/YYYY/YYYY-MM-DD.ndjson.gz).
 *
 * Per commodity, month and scope (all India, each state):
 * - A mandi's month price is the mean of its variety/grade averages, so a mandi that files
 *   more premium-variety rows in some months does not move its own price by that mix.
 * - The published median is the median over mandis; p25/p75 show the spread across mandis.
 *   A mandi 5× off the month's national median is reporting another unit and is left out.
 * - Agmarknet's coverage roughly tripled after 2009, so the set of mandis changes over time.
 *   The comparable level ("level") is therefore chain-linked: each month's change is the
 *   median log change over the same mandi/variety/grade series present in both months, and
 *   the chain is anchored so its newest month equals the actual median. Prices are
 *   nominal (not adjusted for inflation); the page says so.
 * - A month needs at least MIN_DAYS complete days; the running month is left out.
 *   State months need at least MIN_STATE_MANDIS mandis.
 *
 * The seasonal profile compares each month with a centred 12-month moving average of the
 * level (so trend and inflation are removed and partial years do not tilt it), taking the
 * median ratio per calendar month over at least three years.
 *
 * Output: server/db/data/price-history/index.json and <crop-id>.json
 * Row: [YYYY-MM, median, p25, p75, mandis, level]
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { median } = require('./lib/robust-price.cjs');
const { STATES, STATE_ALIASES, COMMODITY_ALIASES, NON_QUINTAL_COMMODITIES, belowDryFloor, DISTRICT_ALIASES, UNIT_RATIO_OVERRIDES } = require('./lib/source-names.cjs');

const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, '.cache', 'prices', 'raw');
const OUT_DIR = path.join(ROOT, 'server', 'db', 'data', 'price-history');
const UNIT_RATIO = 5;
const THIN_SHARE = 0.2;
const MIN_DAYS = 15;
const MIN_STATE_MANDIS = 5;
const MIN_LINK_SERIES = 3;      // series present in both months needed to link them
const MAX_LINK_GAP = 3;         // months; a longer gap starts a new chain segment
const MIN_SEASON_YEARS = 3;

const slugify = name => name.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
const monthIndex = ym => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const currentMonth = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);

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

function readDay(file) {
  const lines = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').split('\n');
  const meta = JSON.parse(lines[0]);
  if (!meta.complete) return null;
  return lines.slice(1).filter(Boolean).map(line => JSON.parse(line));
}

/** One month: crop → series key (state|district|market|variety|grade) → [sum, count]. Null if too few days. */
function readMonth(files) {
  const days = files.map(readDay).filter(Boolean);
  if (days.length < MIN_DAYS) return null;
  const crops = new Map();
  for (const rows of days) {
    for (const [stateRaw, districtRaw, market, commodityRaw, variety, grade, min, max, modal] of rows) {
      const commodity = COMMODITY_ALIASES[commodityRaw] || commodityRaw;
      if (NON_QUINTAL_COMMODITIES.has(commodity) || belowDryFloor({ modal_price: modal, commodity })) continue;
      // A modal far outside its own min–max range is a typing error.
      if (min > 0 && max >= min && (modal > max * 1.5 || modal < min / 1.5)) continue;
      const stateName = STATE_ALIASES[stateRaw] || stateRaw;
      const stateId = STATES[stateName]?.id;
      if (!stateId) continue;
      const crop = slugify(commodity);
      if (!crop) continue;
      const district = DISTRICT_ALIASES[stateName]?.[districtRaw] || districtRaw;
      let series = crops.get(crop);
      if (!series) { series = new Map(); series.commodity = commodity; crops.set(crop, series); }
      const key = `${stateId}|${district}|${market}|${variety}|${grade}`.toLowerCase();
      const entry = series.get(key) || [0, 0];
      entry[0] += modal; entry[1]++;
      series.set(key, entry);
    }
  }
  return crops;
}

/** Series means → per scope: { row: [median, p25, p75, mandis], series: Map(key → mean) }. */
function summarizeMonth(seriesSums, unitRatio = UNIT_RATIO) {
  const seriesMeans = new Map([...seriesSums].map(([key, [sum, count]]) => [key, sum / count]));
  // A mandi's price: the mean of its variety/grade series.
  const byMandi = new Map();
  for (const [key, value] of seriesMeans) {
    const mandi = key.split('|').slice(0, 3).join('|');
    (byMandi.get(mandi) || byMandi.set(mandi, []).get(mandi)).push(value);
  }
  const mandis = [...byMandi].map(([mandi, values]) => [mandi, values.reduce((a, b) => a + b, 0) / values.length]);
  const national = median(mandis.map(([, value]) => value));
  const inUnit = value => !(national > 0) || mandis.length < 5 || (value >= national / unitRatio && value <= national * unitRatio);
  const keptMandis = new Set(mandis.filter(([, value]) => inUnit(value)).map(([mandi]) => mandi));
  const row = values => {
    const sorted = values.slice().sort((a, b) => a - b);
    return [Math.round(quantile(sorted, 0.5)), Math.round(quantile(sorted, 0.25)), Math.round(quantile(sorted, 0.75)), sorted.length];
  };
  const scopes = { all: { values: [], series: new Map() } };
  for (const [mandi, value] of mandis) {
    if (!keptMandis.has(mandi)) continue;
    const stateId = mandi.slice(0, mandi.indexOf('|'));
    scopes.all.values.push(value);
    (scopes[stateId] ||= { values: [], series: new Map() }).values.push(value);
  }
  for (const [key, value] of seriesMeans) {
    const mandi = key.split('|').slice(0, 3).join('|');
    if (!keptMandis.has(mandi)) continue;
    scopes.all.series.set(key, value);
    scopes[key.slice(0, key.indexOf('|'))].series.set(key, value);
  }
  const out = {};
  for (const [scope, { values, series }] of Object.entries(scopes)) if (values.length) out[scope] = { row: row(values), series };
  return out;
}

/** Median log change over series present in both months, or null when too few overlap. */
function linkChange(previous, current) {
  const changes = [];
  for (const [key, value] of current) {
    const before = previous.get(key);
    if (before > 0 && value > 0) changes.push(Math.log(value / before));
  }
  return changes.length >= MIN_LINK_SERIES ? median(changes) : null;
}

function dropThin(rows) {
  if (rows.length < 3) return rows;
  const typical = median(rows.map(row => row[4]));
  return rows.filter(row => row[4] >= typical * THIN_SHARE);
}

/**
 * Chain the month-to-month links into a comparable level, anchored to the newest month's actual
 * median. A segment that cannot be linked to the previous one is anchored to its own newest month.
 */
function chainLevel(rows, links) {
  const level = [];
  let segmentStart = 0;
  // The newest month of a segment keeps its actual median, so "सबसे नया महीना" and the line agree.
  const anchor = (from, to) => {
    const factor = rows[to - 1][1] / level[to - 1];
    for (let i = from; i < to; i++) level[i] *= factor;
  };
  rows.forEach((row, i) => {
    const link = i ? links.get(row[0]) : null;
    if (i && link != null && monthIndex(row[0]) - monthIndex(rows[i - 1][0]) <= MAX_LINK_GAP) level[i] = level[i - 1] * Math.exp(link);
    else {
      if (i) anchor(segmentStart, i);
      segmentStart = i;
      level[i] = row[1];
    }
  });
  if (rows.length) anchor(segmentStart, rows.length);
  return rows.map((row, i) => [...row, Math.round(level[i])]);
}

/** Seasonal profile: month level vs centred 12-month moving average, median per calendar month. */
function seasonal(rows) {
  const byIndex = new Map(rows.map(row => [monthIndex(row[0]), row[5] ?? row[1]]));
  const ratios = Array.from({ length: 12 }, () => []);
  const years = new Set();
  for (const [index, value] of byIndex) {
    // 2×12 centred moving average needs t-6 … t+6; allow one missing month in the window.
    const window = [];
    for (let k = -6; k <= 6; k++) window.push(byIndex.get(index + k));
    if (window.filter(v => v == null).length > 1) continue;
    const weights = window.map((_, i) => (i === 0 || i === 12 ? 0.5 : 1));
    let sum = 0; let weight = 0;
    window.forEach((v, i) => { if (v != null) { sum += v * weights[i]; weight += weights[i]; } });
    if (!weight) continue;
    ratios[index % 12].push(value / (sum / weight));
    years.add(Math.floor(index / 12));
  }
  if (years.size < MIN_SEASON_YEARS) return null;
  const pct = ratios.map(list => (list.length >= MIN_SEASON_YEARS ? Math.round((median(list) - 1) * 1000) / 10 : null));
  return pct.filter(v => v != null).length >= 10 ? { years: years.size, pct } : null;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(value));
  fs.renameSync(`${file}.tmp`, file);
}

function main() {
  const months = monthsOnDisk();
  if (!months.size) { console.error('No raw price days in .cache/prices/raw. Run scripts/fetch-price-history.cjs first.'); process.exit(1); }
  const running = currentMonth();
  const crops = new Map(); // crop → { commodity, scopes: Map(scope → rows), links: Map(scope → Map(ym → change)), last: Map(scope → { ym, series }) }
  let usedMonths = 0;
  let skipped = 0;
  for (const [month, files] of [...months.entries()].sort()) {
    if (month >= running) continue;
    const read = readMonth(files);
    if (!read) { skipped++; continue; }
    usedMonths++;
    for (const [crop, series] of read) {
      const entry = crops.get(crop) || crops.set(crop, { commodity: series.commodity, scopes: new Map(), links: new Map(), last: new Map() }).get(crop);
      for (const [scope, { row, series: scopeSeries }] of Object.entries(summarizeMonth(series, UNIT_RATIO_OVERRIDES[series.commodity] || UNIT_RATIO))) {
        if (!(row[0] > 0)) continue;
        if (scope !== 'all' && row[3] < MIN_STATE_MANDIS) continue;
        (entry.scopes.get(scope) || entry.scopes.set(scope, []).get(scope)).push([month, ...row]);
        const last = entry.last.get(scope);
        if (last && monthIndex(month) - monthIndex(last.ym) <= MAX_LINK_GAP) {
          const change = linkChange(last.series, scopeSeries);
          if (change != null) (entry.links.get(scope) || entry.links.set(scope, new Map()).get(scope)).set(month, change);
        }
        entry.last.set(scope, { ym: month, series: scopeSeries });
      }
    }
    if (month.endsWith('-12')) console.log(`  ${month.slice(0, 4)} read`);
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  const index = [];
  for (const [crop, { commodity, scopes, links }] of [...crops.entries()].sort()) {
    const all = chainLevel(dropThin(scopes.get('all') || []), links.get('all') || new Map());
    // Too little to be a history: fewer than 12 national months.
    if (all.length < 12) continue;
    const states = {};
    const seasonalStates = {};
    for (const [scope, rows] of scopes) {
      if (scope === 'all') continue;
      const kept = chainLevel(dropThin(rows), links.get(scope) || new Map());
      if (kept.length < 12) continue;
      states[scope] = kept;
      const profile = seasonal(kept);
      if (profile) seasonalStates[scope] = profile;
    }
    const coverage = { from: all[0][0], to: all.at(-1)[0], months: all.length };
    writeJson(path.join(OUT_DIR, `${crop}.json`), { id: crop, commodity, unit: '₹/क्विंटल', nominal: true, coverage, all, states, seasonal: { all: seasonal(all), states: seasonalStates } });
    index.push({ id: crop, commodity, ...coverage, states: Object.keys(states).length });
  }
  const allMonths = [...months.keys()].sort();
  writeJson(path.join(OUT_DIR, 'index.json'), {
    source: 'Variety-wise Daily Market Prices Data of Commodity (Agmarknet), data.gov.in',
    sourceUrl: 'https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity',
    resourceId: '35985678-0d79-46b4-9ed6-6f13308a1d24',
    coverage: { from: allMonths[0], to: allMonths.at(-1), months: usedMonths, skippedMonths: skipped },
    crops: index,
  });
  console.log(`Price history: ${index.length} crops, ${usedMonths} months used (${skipped} with under ${MIN_DAYS} days skipped).`);
}

if (require.main === module) main();

module.exports = { summarizeMonth, linkChange, chainLevel, seasonal, dropThin, quantile };
