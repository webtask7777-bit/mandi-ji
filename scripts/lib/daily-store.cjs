/**
 * Shared storage for daily mandi snapshots (server/db/data/daily/YYYY-MM-DD.json).
 *
 * Rules every fetcher must follow:
 * - A record is filed under its own reported arrival date, never the fetch date.
 * - Writes merge into the existing day: a record with the same identity key replaces
 *   the old copy, every other existing record is kept. A partial run can add data but
 *   can never remove data another run stored.
 * - Files are written to a temporary path and renamed, so a crash cannot leave a
 *   truncated JSON file behind.
 * - An unreadable existing file stops the write instead of being replaced.
 */

const fs = require('fs');
const path = require('path');

const DAILY_DIR = path.join(__dirname, '..', '..', 'server', 'db', 'data', 'daily');

// Source placeholders such as ₹0.01 are not prices. Nothing real trades below ₹1 per quintal.
const MIN_PLAUSIBLE_PRICE = 1;

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** "15/10/2026" or "15-10-2026" → "2026-10-15"; anything else (or an impossible date) → null. */
function arrivalToISO(value) {
  const m = clean(value).match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

function toPrice(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Normalise one source row into the stored shape, or return { error } explaining why it
 * cannot be stored. Field names from data.gov.in (State / state) are both accepted.
 */
function normalizeRecord(raw) {
  const pick = (...keys) => clean(keys.map(k => raw[k]).find(v => v !== undefined && v !== null && v !== ''));
  const rec = {
    state: pick('state', 'State'),
    district: pick('district', 'District'),
    market: pick('market', 'Market'),
    commodity: pick('commodity', 'Commodity'),
    variety: pick('variety', 'Variety'),
    grade: pick('grade', 'Grade'),
    arrival_date: pick('arrival_date', 'Arrival_Date').replace(/-/g, '/'),
    min_price: toPrice(raw.min_price ?? raw.Min_Price),
    max_price: toPrice(raw.max_price ?? raw.Max_Price),
    modal_price: toPrice(raw.modal_price ?? raw.Modal_Price),
  };
  if (!rec.state || !rec.market || !rec.commodity) return { error: 'missing state/market/commodity' };
  if (!arrivalToISO(rec.arrival_date)) return { error: 'invalid arrival date' };
  if (!(rec.modal_price > 0)) return { error: 'missing modal price' };
  if (rec.modal_price < MIN_PLAUSIBLE_PRICE) return { error: 'placeholder price below ₹1' };
  for (const k of ['min_price', 'max_price']) if (!(rec[k] >= MIN_PLAUSIBLE_PRICE)) rec[k] = 0;
  return { record: rec };
}

function recordKey(r) {
  return [r.state, r.district, r.market, r.commodity, r.variety, r.grade, r.arrival_date]
    .map(v => clean(v).toLowerCase()).join('|');
}

function readDay(file) {
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8')); // throws on a corrupt file: never overwrite it
  if (!Array.isArray(data.records)) throw new Error(`${path.basename(file)} has no records array`);
  return data;
}

function writeAtomic(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

/**
 * Merge records (already normalised, all with the same arrival date) into that day's file.
 * Returns { date, before, after, added, replaced }.
 */
function mergeDay(isoDate, records, { source, dir = DAILY_DIR, fetchedAt = new Date().toISOString() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${isoDate}.json`);
  const existing = readDay(file);
  const byKey = new Map();
  for (const r of existing?.records || []) byKey.set(recordKey(r), r);
  const before = byKey.size;
  let replaced = 0;
  for (const r of records) {
    if (arrivalToISO(r.arrival_date) !== isoDate) throw new Error(`record dated ${r.arrival_date} cannot be filed under ${isoDate}`);
    const key = recordKey(r);
    if (byKey.has(key)) replaced++;
    byKey.set(key, r);
  }
  const merged = [...byKey.values()];
  const sources = new Set([...(existing?.sources || (existing?.source ? [existing.source] : [])), ...(source ? [source] : [])]);
  writeAtomic(file, {
    date: isoDate,
    fetchedAt,
    sources: [...sources].sort(),
    total: merged.length,
    states: new Set(merged.map(r => r.state)).size,
    commodities: new Set(merged.map(r => r.commodity)).size,
    records: merged,
  });
  return { date: isoDate, before, after: merged.length, added: merged.length - before, replaced };
}

/** Group normalised records by arrival date and merge each day. */
function mergeRecords(records, opts = {}) {
  const byDate = new Map();
  for (const r of records) {
    const iso = arrivalToISO(r.arrival_date);
    if (!byDate.has(iso)) byDate.set(iso, []);
    byDate.get(iso).push(r);
  }
  return [...byDate.keys()].sort().map(iso => mergeDay(iso, byDate.get(iso), opts));
}

function listDays(dir = DAILY_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => f.slice(0, 10)).sort();
}

/** Calendar date in India (UTC+5:30) for a Date. */
function istDate(now = new Date()) {
  return new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

module.exports = { MIN_PLAUSIBLE_PRICE, DAILY_DIR, arrivalToISO, normalizeRecord, recordKey, readDay, writeAtomic, mergeDay, mergeRecords, listDays, istDate };
