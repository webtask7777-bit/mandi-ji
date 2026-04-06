#!/usr/bin/env node
/**
 * Generate CG ticker.json and mandi-compare.json from existing all-records.json
 * Quick add-on to the CG aggregate pipeline
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'scraper', 'data', 'all-records.json');
const OUTPUT = path.join(__dirname, '..', 'server', 'db', 'data');

const CROP_MSP = {
  'paddy': 2183, 'maize': 1870, 'wheat': 2275, 'soyabean': 4892,
  'groundnut': 6783, 'mustard': 5650, 'cotton': 7121,
  'gram': 5440, 'arhar': 7550, 'moong': 8682, 'urad': 6950,
  'masoor': 6425, 'jowar': 3371, 'bajra': 2625,
};

function parseMonth(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}`;
  return null;
}

// Extract Hindi crop category: "धान(Paddy fine)" → "धान"
function getCropCategory(raw) {
  if (!raw) return null;
  const match = raw.match(/^(.+?)\(/);
  return match ? match[1].trim() : raw.trim();
}

// Extract variety: "धान(Paddy fine)" → "Paddy fine"
function getVariety(raw) {
  if (!raw) return null;
  const match = raw.match(/\((.+)\)/);
  return match ? match[1].trim() : null;
}

// Get most common key from frequency object
function getTopKey(freq) {
  if (!freq) return null;
  let top = null, max = 0;
  for (const [k, v] of Object.entries(freq)) {
    if (v > max && k) { max = v; top = k; }
  }
  return top;
}

const records = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
console.log(`Loaded ${records.length} CG records`);

// Load existing crops metadata
const cropsFile = path.join(OUTPUT, 'crops.json');
const cropsData = JSON.parse(fs.readFileSync(cropsFile, 'utf-8'));
const cropsMap = {};
for (const c of cropsData) cropsMap[c.id] = c;

// Build Hindi name → crop id mapping from crops.json
const hindiToCropId = {};
for (const c of cropsData) {
  if (c.nameHi) hindiToCropId[c.nameHi.normalize('NFC').trim()] = c.id;
}

function getCropId(rawCropName) {
  const hindi = getCropCategory(rawCropName);
  if (!hindi) return null;
  const normalized = hindi.normalize('NFC').trim();
  return hindiToCropId[normalized] || null;
}

// ── Build per-crop per-mandi data ──
const cropMandis = {};
const cropMonths = {};

for (const rec of records) {
  const cropId = getCropId(rec.crop);
  if (!cropId) continue;
  const mandi = rec.mandi;
  const price = rec.modal_price;
  const month = parseMonth(rec.arrival_date);

  if (!cropMandis[cropId]) cropMandis[cropId] = {};
  if (!cropMandis[cropId][mandi]) {
    cropMandis[cropId][mandi] = { name: mandi, district: rec.district, prices: [], count: 0, varieties: {} };
  }
  if (price > 0) cropMandis[cropId][mandi].prices.push(price);
  const variety = getVariety(rec.crop);
  if (variety) cropMandis[cropId][mandi].varieties[variety] = (cropMandis[cropId][mandi].varieties[variety] || 0) + 1;
  cropMandis[cropId][mandi].count++;

  // Track monthly prices for ticker
  if (!cropMonths[cropId]) cropMonths[cropId] = {};
  if (month) {
    if (!cropMonths[cropId][month]) cropMonths[cropId][month] = [];
    if (price > 0) cropMonths[cropId][month].push(price);
  }
}

// ── Generate mandi-compare.json ──
const mandiCompare = {};
for (const [cropId, mandis] of Object.entries(cropMandis)) {
  const arr = Object.values(mandis)
    .filter(m => m.prices.length > 0)
    .map(m => ({
      name: m.name,
      district: m.district,
      avgPrice: Math.round(m.prices.reduce((a, b) => a + b, 0) / m.prices.length),
      minPrice: Math.min(...m.prices),
      maxPrice: Math.max(...m.prices),
      records: m.count,
      topVariety: getTopKey(m.varieties) || null,
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);
  if (arr.length > 0) mandiCompare[cropId] = arr;
}

fs.writeFileSync(path.join(OUTPUT, 'mandi-compare.json'), JSON.stringify(mandiCompare, null, 2));
console.log(`Generated mandi-compare.json (${Object.keys(mandiCompare).length} crops)`);

// ── Generate ticker.json ──
const ticker = [];
for (const crop of cropsData) {
  const months = cropMonths[crop.id] ? Object.entries(cropMonths[crop.id]).sort(([a], [b]) => a.localeCompare(b)) : [];
  const latest = months.length > 0 ? months[months.length - 1] : null;
  const prev = months.length > 1 ? months[months.length - 2] : null;
  const latestPrice = latest ? Math.round(latest[1].reduce((a, b) => a + b, 0) / latest[1].length) : crop.avgPrice || 0;
  const prevPrice = prev ? Math.round(prev[1].reduce((a, b) => a + b, 0) / prev[1].length) : 0;
  const change = latestPrice - prevPrice;
  const changePct = prevPrice > 0 ? parseFloat(((change / prevPrice) * 100).toFixed(1)) : 0;
  const msp = crop.msp || CROP_MSP[crop.id] || null;
  const mandiCount = cropMandis[crop.id] ? Object.keys(cropMandis[crop.id]).length : 0;

  // Best and worst mandis
  const mandiArr = mandiCompare[crop.id] || [];
  const bestMandi = mandiArr[0] || null;
  const worstMandi = mandiArr.length > 1 ? mandiArr[mandiArr.length - 1] : null;

  let signal = 'hold', signalHi = 'होल्ड';
  if (msp && latestPrice > msp * 1.1) { signal = 'sell'; signalHi = 'बेचें'; }
  else if (msp && latestPrice < msp * 0.9) { signal = 'buy'; signalHi = 'खरीदें'; }
  else if (change > 0 && changePct > 5) { signal = 'sell'; signalHi = 'बेचें'; }
  else if (change < 0 && changePct < -5) { signal = 'buy'; signalHi = 'खरीदें'; }

  ticker.push({
    id: crop.id,
    name: crop.name,
    nameHi: crop.nameHi || crop.name,
    emoji: crop.emoji,
    price: latestPrice,
    prevPrice,
    change,
    changePct,
    msp,
    mspDiff: msp ? latestPrice - msp : null,
    mspDiffPct: msp ? parseFloat(((latestPrice - msp) / msp * 100).toFixed(1)) : null,
    records: crop.totalRecords || 0,
    mandiCount,
    bestMandi: bestMandi ? { name: bestMandi.name, price: bestMandi.avgPrice } : null,
    worstMandi: worstMandi ? { name: worstMandi.name, price: worstMandi.avgPrice } : null,
    signal,
    signalHi,
  });
}
ticker.sort((a, b) => b.records - a.records);
fs.writeFileSync(path.join(OUTPUT, 'ticker.json'), JSON.stringify(ticker, null, 2));
console.log(`Generated ticker.json (${ticker.length} crops)`);

// Show sample
const sell = ticker.filter(t => t.signal === 'sell');
const buy = ticker.filter(t => t.signal === 'buy');
console.log(`\nSignals: ${sell.length} बेचें, ${buy.length} खरीदें, ${ticker.length - sell.length - buy.length} होल्ड`);
sell.slice(0, 3).forEach(t => console.log(`  🟢 ${t.nameHi}: ₹${t.price} (${t.signalHi})`));
buy.slice(0, 3).forEach(t => console.log(`  🔴 ${t.nameHi}: ₹${t.price} (${t.signalHi})`));
