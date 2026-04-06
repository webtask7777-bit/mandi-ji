#!/usr/bin/env node
/**
 * Aggregate daily data.gov.in snapshots into India-level dashboard data
 * Reads: server/db/data/daily/*.json
 * Outputs: server/db/data/india/
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'server', 'db', 'data');
const DAILY_DIR = path.join(DATA_DIR, 'daily');
const INDIA_DIR = path.join(DATA_DIR, 'india');

// ─── State Master Data ─────────────────────────────────────────────────
const STATES = {
  'Andhra Pradesh': { id: 'andhra-pradesh', nameHi: 'आन्ध्र प्रदेश' },
  'Arunachal Pradesh': { id: 'arunachal-pradesh', nameHi: 'अरुणाचल प्रदेश' },
  'Assam': { id: 'assam', nameHi: 'असम' },
  'Bihar': { id: 'bihar', nameHi: 'बिहार' },
  'Chhattisgarh': { id: 'chhattisgarh', nameHi: 'छत्तीसगढ़' },
  'Goa': { id: 'goa', nameHi: 'गोवा' },
  'Gujarat': { id: 'gujarat', nameHi: 'गुजरात' },
  'Haryana': { id: 'haryana', nameHi: 'हरियाणा' },
  'Himachal Pradesh': { id: 'himachal-pradesh', nameHi: 'हिमाचल प्रदेश' },
  'Jharkhand': { id: 'jharkhand', nameHi: 'झारखण्ड' },
  'Karnataka': { id: 'karnataka', nameHi: 'कर्नाटक' },
  'Kerala': { id: 'kerala', nameHi: 'केरल' },
  'Madhya Pradesh': { id: 'madhya-pradesh', nameHi: 'मध्य प्रदेश' },
  'Maharashtra': { id: 'maharashtra', nameHi: 'महाराष्ट्र' },
  'Manipur': { id: 'manipur', nameHi: 'मणिपुर' },
  'Meghalaya': { id: 'meghalaya', nameHi: 'मेघालय' },
  'Mizoram': { id: 'mizoram', nameHi: 'मिज़ोरम' },
  'Nagaland': { id: 'nagaland', nameHi: 'नागालैंड' },
  'Odisha': { id: 'odisha', nameHi: 'ओडिशा' },
  'Punjab': { id: 'punjab', nameHi: 'पंजाब' },
  'Rajasthan': { id: 'rajasthan', nameHi: 'राजस्थान' },
  'Sikkim': { id: 'sikkim', nameHi: 'सिक्किम' },
  'Tamil Nadu': { id: 'tamil-nadu', nameHi: 'तमिल नाडु' },
  'Telangana': { id: 'telangana', nameHi: 'तेलंगाना' },
  'Tripura': { id: 'tripura', nameHi: 'त्रिपुरा' },
  'Uttar Pradesh': { id: 'uttar-pradesh', nameHi: 'उत्तर प्रदेश' },
  'Uttarakhand': { id: 'uttarakhand', nameHi: 'उत्तराखण्ड' },
  'West Bengal': { id: 'west-bengal', nameHi: 'पश्चिम बंगाल' },
  // UTs
  'Chandigarh': { id: 'chandigarh', nameHi: 'चंडीगढ़' },
  'NCT of Delhi': { id: 'delhi', nameHi: 'दिल्ली' },
  'Jammu and Kashmir': { id: 'jammu-kashmir', nameHi: 'जम्मू-कश्मीर' },
  'Ladakh': { id: 'ladakh', nameHi: 'लद्दाख' },
  'Puducherry': { id: 'puducherry', nameHi: 'पुदुचेरी' },
  'Andaman and Nicobar': { id: 'andaman-nicobar', nameHi: 'अंडमान निकोबार' },
  'Dadra and Nagar Haveli and Daman and Diu': { id: 'dadra-daman', nameHi: 'दादरा एवं दमन' },
  'Lakshadweep': { id: 'lakshadweep', nameHi: 'लक्षद्वीप' },
};

// ─── State Abbreviation Codes ────────────────────────────────────────
const STATE_CODES = {
  'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS',
  'Bihar': 'BR', 'Chhattisgarh': 'CG', 'Goa': 'GA', 'Gujarat': 'GJ',
  'Haryana': 'HR', 'Himachal Pradesh': 'HP', 'Jharkhand': 'JH',
  'Karnataka': 'KA', 'Kerala': 'KL', 'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML',
  'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OD', 'Punjab': 'PB',
  'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN',
  'Telangana': 'TS', 'Tripura': 'TR', 'Uttar Pradesh': 'UP',
  'Uttarakhand': 'UK', 'West Bengal': 'WB',
  'Chandigarh': 'CH', 'NCT of Delhi': 'DL', 'Jammu and Kashmir': 'JK',
  'Ladakh': 'LA', 'Puducherry': 'PY',
  'Andaman and Nicobar': 'AN', 'Dadra and Nagar Haveli and Daman and Diu': 'DD',
  'Lakshadweep': 'LD',
};

// ─── State Name Aliases (agmarknet.gov.in uses different spellings) ──
const STATE_ALIASES = {
  'Chattisgarh': 'Chhattisgarh',
  'Pondicherry': 'Puducherry',
  'Daman and Diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'Dadra and Nagar Haveli': 'Dadra and Nagar Haveli and Daman and Diu',
};

// ─── Hindi Crop Name Mapping ───────────────────────────────────────────
const CROP_HINDI = {
  'potato': 'आलू', 'tomato': 'टमाटर', 'onion': 'प्याज',
  'cabbage': 'पत्तागोभी', 'brinjal': 'बैंगन', 'bottle-gourd': 'लौकी',
  'green-chilli': 'हरी मिर्च', 'beetroot': 'चुकंदर', 'banana': 'केला',
  'bhindiladies-finger': 'भिंडी', 'pumpkin': 'कद्दू', 'carrot': 'गाजर',
  'cauliflower': 'फूलगोभी', 'gingergreen': 'अदरक', 'lemon': 'नींबू',
  'cucumbarkheera': 'खीरा', 'bitter-gourd': 'करेला', 'ashgourd': 'पेठा',
  'corianderleaves': 'धनिया', 'raddish': 'मूली', 'guava': 'अमरूद',
  'green-avarew': 'हरी अवरे', 'snakeguard': 'चचिंडा', 'beans': 'सेम',
  'papaya': 'पपीता', 'onion-green': 'हरा प्याज', 'banana-green': 'कच्चा केला',
  'ridgeguardtori': 'तोरई', 'mintpudina': 'पुदीना', 'garlic': 'लहसुन',
  'amaranthus': 'चौलाई', 'coconut': 'नारियल', 'chow-chow': 'चायोटे',
  'cluster-beans': 'ग्वारफली', 'capsicum': 'शिमला मिर्च',
  'yamratalu': 'रतालू', 'elephant-yamsuran-amorphophallus': 'सूरन',
  'apple': 'सेब', 'chikoossapota': 'चीकू', 'cowpeaveg': 'लोबिया',
  'thondekai': 'तोंडेकाई', 'tapioca': 'कसावा', 'drumstick': 'सहजन',
  'amlanelli-kai': 'आँवला', 'grapes': 'अंगूर', 'mangoraw-ripe': 'आम',
  'sweet-potato': 'शकरकंद', 'tender-coconut': 'नारियल पानी',
  'lime': 'नीबू', 'pomegranate': 'अनार', 'pineapple': 'अनानास',
  'paddycommon': 'धान', 'french-beansfrasbean': 'फ्रेंच बीन',
  'indian-beansseam': 'सेम', 'colacasia': 'अरबी', 'wheat': 'गेहूँ',
  'orange': 'संतरा', 'knool-khol': 'गाँठ गोभी',
  'mousambisweet-lime': 'मौसम्बी', 'water-melon': 'तरबूज',
  'groundnut': 'मूँगफली', 'pea-pod-pea-cod': 'हरी मटर',
  'green-peas': 'हरी मटर', 'kinnow': 'किन्नू', 'peas-wet': 'हरी मटर',
  'spinach': 'पालक', 'field-pea': 'मटर', 'turnip': 'शलगम',
  'mashrooms': 'मशरूम', 'betal-leaves': 'पान', 'little-gourdkundru': 'कुंदरू',
  'round-gourd': 'टिंडा', 'rice': 'चावल', 'turmericraw': 'कच्ची हल्दी',
  'jack-fruitripe': 'कटहल', 'mango': 'आम',
  'chili-red': 'लाल मिर्च', 'tamarind-fruit': 'इमली',
  'karbujamusk-melon': 'खरबूजा', 'gingerdry': 'सोंठ',
  'bajrapearl-millet-cumbu': 'बाजरा', 'methileaves': 'मेथी',
  'soyabean': 'सोयाबीन', 'methi-seeds': 'मेथी दाना',
  'bengal-gramgramwhole': 'चना', 'pegeon-peaarhar-fali': 'अरहर फली',
  'sponge-gourd': 'नेनुआ', 'surat-beanspapadi': 'पापड़ी',
  'rat-tail-radishmogari': 'मूली फली', 'arhartur-red-gramwhole': 'अरहर',
  'black-gram-dalurd-dal': 'उड़द दाल', 'mustard': 'सरसों',
  'guar': 'ग्वार', 'arecanutbetelnut-supari': 'सुपारी',
  'cotton': 'कपास', 'maize': 'मक्का',
  'green-grammoongwhole': 'मूंग', 'masur-dal': 'मसूर दाल',
  'dry-chillies': 'सूखी मिर्च', 'tube-roseloose': 'रजनीगंधा',
  'jasmine': 'चमेली', 'tube-rosedouble': 'रजनीगंधा',
  'marigoldcalcutta': 'गेंदा', 'roselocal': 'गुलाब',
  'wood': 'लकड़ी', 'firewood': 'जलाऊ लकड़ी', 'fish': 'मछली',
};

// ─── MSP 2024-25 (₹ per quintal) ──────────────────────────────────────
const CROP_MSP = {
  'paddycommon': 2300, 'rice': 2300, 'wheat': 2275, 'maize': 2090,
  'bajrapearl-millet-cumbu': 2625, 'soyabean': 4892,
  'groundnut': 6783, 'mustard': 5650,
  'cotton': 7121, 'bengal-gramgramwhole': 5440,
  'arhartur-red-gramwhole': 7550, 'green-grammoongwhole': 8682,
  'black-gram-dalurd-dal': 6950, 'masur-dal': 6425,
};

// ─── Season data for common crops ──────────────────────────────────────
// sowingMonths, growingMonths, harvestMonths = month indices (0=Jan)
const CROP_SEASONS = {
  // Vegetables (mostly year-round but with peak seasons)
  'potato':       { sowingMonths: [9,10], growingMonths: [11,0,1], harvestMonths: [1,2,3], peakMonths: [2,3,4] },
  'tomato':       { sowingMonths: [6,7,10,11], growingMonths: [7,8,9,11,0], harvestMonths: [9,10,11,1,2], peakMonths: [0,1,2,11] },
  'onion':        { sowingMonths: [10,11], growingMonths: [0,1,2], harvestMonths: [3,4,5], peakMonths: [4,5,6] },
  'cabbage':      { sowingMonths: [8,9], growingMonths: [10,11,0], harvestMonths: [0,1,2], peakMonths: [11,0,1] },
  'brinjal':      { sowingMonths: [5,6,9,10], growingMonths: [7,8,11,0], harvestMonths: [8,9,1,2], peakMonths: [9,10,1,2] },
  'cauliflower':  { sowingMonths: [7,8,9], growingMonths: [9,10,11], harvestMonths: [11,0,1,2], peakMonths: [11,0,1] },
  'carrot':       { sowingMonths: [8,9,10], growingMonths: [10,11,0], harvestMonths: [0,1,2], peakMonths: [0,1,2] },
  'pumpkin':      { sowingMonths: [1,2,5,6], growingMonths: [3,4,7,8], harvestMonths: [4,5,9,10], peakMonths: [5,6,10,11] },
  'capsicum':     { sowingMonths: [6,7,10,11], growingMonths: [8,9,0,1], harvestMonths: [9,10,2,3], peakMonths: [10,11,2,3] },
  'spinach':      { sowingMonths: [9,10,11], growingMonths: [10,11,0], harvestMonths: [11,0,1,2], peakMonths: [0,1,2] },
  'bitter-gourd': { sowingMonths: [1,2,5,6], growingMonths: [3,4,7,8], harvestMonths: [4,5,8,9], peakMonths: [5,6,9,10] },
  'bottle-gourd': { sowingMonths: [1,2,6,7], growingMonths: [3,4,8,9], harvestMonths: [4,5,9,10], peakMonths: [5,6,10,11] },
  'green-chilli':  { sowingMonths: [1,2,6,7], growingMonths: [3,4,8,9], harvestMonths: [4,5,9,10], peakMonths: [5,6,10,11] },
  // Fruits
  'banana':       { sowingMonths: [1,2,5,6], growingMonths: [3,4,5,7,8,9], harvestMonths: [9,10,11,0,1], peakMonths: [10,11,0,1] },
  'apple':        { sowingMonths: [], growingMonths: [3,4,5,6], harvestMonths: [7,8,9], peakMonths: [8,9] },
  'mango':        { sowingMonths: [], growingMonths: [1,2,3], harvestMonths: [4,5,6], peakMonths: [5,6] },
  'guava':        { sowingMonths: [], growingMonths: [6,7,8,9], harvestMonths: [10,11,0,1], peakMonths: [11,0,1] },
  'orange':       { sowingMonths: [], growingMonths: [6,7,8,9], harvestMonths: [10,11,0], peakMonths: [11,0] },
  'pomegranate':  { sowingMonths: [], growingMonths: [5,6,7,8], harvestMonths: [9,10,11], peakMonths: [10,11] },
  'grapes':       { sowingMonths: [], growingMonths: [11,0,1], harvestMonths: [2,3,4], peakMonths: [2,3] },
  'coconut':      { sowingMonths: [], growingMonths: [0,1,2,3,4,5,6,7,8,9,10,11], harvestMonths: [0,1,2,3,4,5,6,7,8,9,10,11], peakMonths: [0,1,2,3,4,5,6,7,8,9,10,11] },
  // Grains & Pulses
  'paddycommon':  { sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0,1] },
  'wheat':        { sowingMonths: [10,11], growingMonths: [0,1], harvestMonths: [3,4], peakMonths: [4,5] },
  'maize':        { sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [9,10], peakMonths: [10,11] },
  'rice':         { sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0] },
  'bajrapearl-millet-cumbu': { sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [9,10], peakMonths: [10,11] },
  'soyabean':     { sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [9,10], peakMonths: [10,11] },
  'groundnut':    { sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0] },
  'mustard':      { sowingMonths: [9,10], growingMonths: [11,0], harvestMonths: [2,3], peakMonths: [3,4] },
  'bengal-gramgramwhole': { sowingMonths: [9,10], growingMonths: [11,0], harvestMonths: [2,3], peakMonths: [3,4] },
  'arhartur-red-gramwhole': { sowingMonths: [5,6], growingMonths: [7,8,9,10], harvestMonths: [11,0,1], peakMonths: [0,1] },
  'green-grammoongwhole': { sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [9,10], peakMonths: [10,11] },
  'cotton':       { sowingMonths: [4,5], growingMonths: [6,7,8,9], harvestMonths: [10,11,0], peakMonths: [11,0,1] },
};

// Common crop emoji mapping
const CROP_EMOJI = {
  'paddy': '\u{1F33E}', 'rice': '\u{1F33E}', 'wheat': '\u{1F33F}', 'maize': '\u{1F33D}',
  'onion': '\u{1F9C5}', 'potato': '\u{1F954}', 'tomato': '\u{1F345}', 'gram': '\u{1FAD8}',
  'soyabean': '\u{1F7E4}', 'mustard': '\u{1F33B}', 'groundnut': '\u{1F95C}', 'sugar': '\u{1F36C}',
  'cotton': '\u2601\uFE0F', 'jowar': '\u{1F33E}', 'bajra': '\u{1F33E}', 'barley': '\u{1F33E}',
  'lentil': '\u{1F7E0}', 'arhar': '\u{1FAD8}', 'moong': '\u{1F7E2}', 'urad': '\u26AB',
  'chilli': '\u{1F336}\uFE0F', 'turmeric': '\u{1F7E1}', 'ginger': '\u{1FAD0}', 'garlic': '\u{1F9C4}',
  'apple': '\u{1F34E}', 'banana': '\u{1F34C}', 'mango': '\u{1F96D}', 'orange': '\u{1F34A}',
  'lemon': '\u{1F34B}', 'brinjal': '\u{1F346}', 'cabbage': '\u{1F96C}', 'cauliflower': '\u{1F966}',
  'peas': '\u{1F7E2}', 'carrot': '\u{1F955}', 'cucumber': '\u{1F952}', 'lady finger': '\u{1F33F}',
  'pumpkin': '\u{1F383}', 'bitter gourd': '\u{1F952}', 'bottle gourd': '\u{1F952}',
  'coriander': '\u{1F33F}', 'capsicum': '\u{1FAD1}', 'coconut': '\u{1F965}',
  'guava': '\u{1F34F}', 'papaya': '\u{1F34F}', 'pomegranate': '\u{1F34E}',
  'grapes': '\u{1F347}', 'pineapple': '\u{1F34D}', 'watermelon': '\u{1F349}',
  'spinach': '\u{1F96C}', 'beetroot': '\u{1F96C}', 'drumstick': '\u{1F33F}',
  'mushroom': '\u{1F344}', 'fish': '\u{1F41F}',
};

// ─── Mandi name cleanup patterns ───────────────────────────────────────
const MANDI_STRIP_SUFFIXES = [
  /\s*\(Uzhavar\s+San[dt]hai\s*\)/gi,
  /\s*\(Regulated Market\)/gi,
  /\s*\(Sub Yard\)/gi,
  /\s*\(APMC\)/gi,
  /\s*\(Krishi Upaj Mandi\)/gi,
  /\s*\(Fruit Market\)/gi,
  /\s*\(Sabzi Mandi\)/gi,
  /\s*\(F&V\)/gi,
  /\s*APMC$/gi,
];

function cleanMandiName(name) {
  let cleaned = name;
  for (const pattern of MANDI_STRIP_SUFFIXES) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim();
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getCropEmoji(name) {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '\u{1F331}';
}

function getCropHindi(slug, originalName) {
  if (CROP_HINDI[slug]) return CROP_HINDI[slug];
  // Try partial match
  const lower = slug.toLowerCase();
  for (const [key, hindi] of Object.entries(CROP_HINDI)) {
    if (lower.includes(key) || key.includes(lower)) return hindi;
  }
  return null;
}

function getCropMSP(slug) {
  return CROP_MSP[slug] || null;
}

function getCropSeasonData(slug) {
  return CROP_SEASONS[slug] || null;
}

function parseDate(dateStr) {
  // "11/03/2026" -> "2026-03"
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}`;
  return null;
}

function parseDateFull(dateStr) {
  // "11/03/2026" -> "2026-03-11"
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return null;
}

function writeJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function main() {
  // ─── Load all daily snapshots ────────────────────────────────────────
  const dailyFiles = fs.readdirSync(DAILY_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('.'))
    .sort();

  if (dailyFiles.length === 0) {
    console.error('No daily files found. Run fetch-daily.cjs first.');
    process.exit(1);
  }

  console.log(`Loading ${dailyFiles.length} daily snapshot(s)...`);

  // Extract lastUpdated from the latest daily file
  const latestDailyData = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, dailyFiles[dailyFiles.length - 1]), 'utf-8'));
  const lastUpdated = latestDailyData.fetchedAt || new Date().toISOString();

  // Compute recent cutoff (last 7 days from latest file date)
  const latestFileName = dailyFiles[dailyFiles.length - 1].replace('.json', '');
  const latestDateObj = new Date(latestFileName + 'T00:00:00');
  latestDateObj.setDate(latestDateObj.getDate() - 7);
  const recentCutoff = latestDateObj.toISOString().slice(0, 10); // "YYYY-MM-DD"
  console.log(`Recent cutoff date: ${recentCutoff}`);

  const allRecords = [];
  for (const file of dailyFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, file), 'utf-8'));
    allRecords.push(...(data.records || []));
  }

  console.log(`Total records: ${allRecords.length}`);

  // ─── Group by state ──────────────────────────────────────────────────
  const byState = {};
  for (const rec of allRecords) {
    // Normalize state name via aliases (agmarknet uses different spellings)
    if (STATE_ALIASES[rec.state]) rec.state = STATE_ALIASES[rec.state];

    const stateInfo = STATES[rec.state];
    if (!stateInfo) {
      const match = Object.keys(STATES).find(s => s.toLowerCase() === rec.state?.toLowerCase());
      if (!match) continue;
      rec.state = match;
    }
    const sid = (STATES[rec.state] || {}).id || slugify(rec.state);
    if (!byState[sid]) byState[sid] = { name: rec.state, records: [] };
    byState[sid].records.push(rec);
  }

  // ─── All-India aggregation ───────────────────────────────────────────
  const statesList = [];
  const allCrops = {};
  const allDistricts = new Set();
  const allMarkets = new Set();
  // Track All-India per-crop district breakdown
  const allCropDistricts = {};

  for (const [stateId, stateData] of Object.entries(byState)) {
    const meta = STATES[stateData.name] || { id: stateId, nameHi: stateData.name };
    const records = stateData.records;

    const districts = new Set(records.map(r => r.district));
    const markets = new Set(records.map(r => r.market));
    const crops = {};

    for (const rec of records) {
      const cropSlug = slugify(rec.commodity);
      if (!crops[cropSlug]) {
        crops[cropSlug] = {
          id: cropSlug,
          name: rec.commodity,
          emoji: getCropEmoji(rec.commodity),
          records: 0,
          priceCount: 0,
          totalModal: 0,
          minPrice: Infinity,
          maxPrice: 0,
          byMonth: {},
          byDay: {},
          byDistrict: {},
          varieties: new Set(),
        };
      }
      const c = crops[cropSlug];
      c.records++;
      if (rec.modal_price > 0) { c.totalModal += rec.modal_price; c.priceCount++; }
      if (rec.min_price > 0) c.minPrice = Math.min(c.minPrice, rec.min_price);
      if (rec.max_price > 0) c.maxPrice = Math.max(c.maxPrice, rec.max_price);
      if (rec.variety) c.varieties.add(rec.variety);

      const month = parseDate(rec.arrival_date);
      if (month) {
        if (!c.byMonth[month]) c.byMonth[month] = { prices: [], count: 0 };
        if (rec.modal_price > 0) c.byMonth[month].prices.push(rec.modal_price);
        c.byMonth[month].count++;
      }

      const fullDate = parseDateFull(rec.arrival_date);
      if (fullDate) {
        if (!c.byDay[fullDate]) c.byDay[fullDate] = { prices: [], minPrices: [], maxPrices: [], count: 0 };
        if (rec.modal_price > 0) c.byDay[fullDate].prices.push(rec.modal_price);
        if (rec.min_price > 0) c.byDay[fullDate].minPrices.push(rec.min_price);
        if (rec.max_price > 0) c.byDay[fullDate].maxPrices.push(rec.max_price);
        c.byDay[fullDate].count++;
      }

      if (rec.district) {
        if (!c.byDistrict[rec.district]) c.byDistrict[rec.district] = { prices: [], count: 0 };
        if (rec.modal_price > 0) c.byDistrict[rec.district].prices.push(rec.modal_price);
        c.byDistrict[rec.district].count++;
      }

      // Track all-India
      if (!allCrops[cropSlug]) {
        allCrops[cropSlug] = { id: cropSlug, name: rec.commodity, emoji: getCropEmoji(rec.commodity), records: 0, priceCount: 0, totalModal: 0, byMonth: {}, byDay: {} };
      }
      allCrops[cropSlug].records++;
      if (rec.modal_price > 0) { allCrops[cropSlug].totalModal += rec.modal_price; allCrops[cropSlug].priceCount++; }
      const m2 = parseDate(rec.arrival_date);
      if (m2) {
        if (!allCrops[cropSlug].byMonth[m2]) allCrops[cropSlug].byMonth[m2] = { prices: [], count: 0 };
        if (rec.modal_price > 0) allCrops[cropSlug].byMonth[m2].prices.push(rec.modal_price);
        allCrops[cropSlug].byMonth[m2].count++;
      }
      const fullDate2 = parseDateFull(rec.arrival_date);
      if (fullDate2) {
        if (!allCrops[cropSlug].byDay[fullDate2]) allCrops[cropSlug].byDay[fullDate2] = { prices: [], minPrices: [], maxPrices: [], count: 0 };
        if (rec.modal_price > 0) allCrops[cropSlug].byDay[fullDate2].prices.push(rec.modal_price);
        if (rec.min_price > 0) allCrops[cropSlug].byDay[fullDate2].minPrices.push(rec.min_price);
        if (rec.max_price > 0) allCrops[cropSlug].byDay[fullDate2].maxPrices.push(rec.max_price);
        allCrops[cropSlug].byDay[fullDate2].count++;
      }

      // Track All-India district breakdown per crop
      if (rec.district) {
        if (!allCropDistricts[cropSlug]) allCropDistricts[cropSlug] = {};
        const distKey = `${rec.district} (${meta.nameHi})`;
        if (!allCropDistricts[cropSlug][distKey]) allCropDistricts[cropSlug][distKey] = { prices: [], count: 0 };
        if (rec.modal_price > 0) allCropDistricts[cropSlug][distKey].prices.push(rec.modal_price);
        allCropDistricts[cropSlug][distKey].count++;
      }
    }

    districts.forEach(d => allDistricts.add(d));
    markets.forEach(m => allMarkets.add(m));

    // ─── Write state-level files ──────────────────────────────────────
    const stateDir = path.join(INDIA_DIR, 'states', stateId);

    // State crops (with Hindi names, MSP, seasons)
    const cropsArr = Object.values(crops)
      .map(c => {
        const seasonData = getCropSeasonData(c.id) || {};
        return {
          id: c.id,
          name: c.name,
          nameHi: getCropHindi(c.id, c.name) || c.name,
          emoji: c.emoji,
          totalRecords: c.records,
          avgPrice: c.priceCount > 0 ? Math.round(c.totalModal / c.priceCount) : 0,
          minPrice: c.minPrice === Infinity ? 0 : c.minPrice,
          maxPrice: c.maxPrice,
          varieties: [...c.varieties].slice(0, 10),
          ...(getCropMSP(c.id) ? { msp: getCropMSP(c.id) } : {}),
          ...(seasonData.sowingMonths ? { sowingMonths: seasonData.sowingMonths } : {}),
          ...(seasonData.growingMonths ? { growingMonths: seasonData.growingMonths } : {}),
          ...(seasonData.harvestMonths ? { harvestMonths: seasonData.harvestMonths } : {}),
          ...(seasonData.peakMonths ? { peakMonths: seasonData.peakMonths } : {}),
        };
      })
      .sort((a, b) => b.totalRecords - a.totalRecords);

    writeJSON(path.join(stateDir, 'crops.json'), cropsArr);

    // State districts
    const districtsArr = [...districts].map(d => {
      const distRecords = records.filter(r => r.district === d);
      return {
        name: d,
        totalRecords: distRecords.length,
        topCrops: Object.entries(
          distRecords.reduce((acc, r) => { acc[getCropHindi(slugify(r.commodity), r.commodity) || r.commodity] = (acc[getCropHindi(slugify(r.commodity), r.commodity) || r.commodity] || 0) + 1; return acc; }, {})
        ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
      };
    }).sort((a, b) => b.totalRecords - a.totalRecords);

    writeJSON(path.join(stateDir, 'districts.json'), districtsArr);

    // State mandis (with cleaned names)
    const mandisArr = [...markets].map(m => {
      const mRecords = records.filter(r => r.market === m);
      return {
        name: cleanMandiName(m),
        originalName: m,
        district: mRecords[0]?.district || '',
        totalRecords: mRecords.length,
        topCrops: Object.entries(
          mRecords.reduce((acc, r) => { const hi = getCropHindi(slugify(r.commodity), r.commodity) || r.commodity; acc[hi] = (acc[hi] || 0) + 1; return acc; }, {})
        ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
      };
    }).sort((a, b) => b.totalRecords - a.totalRecords);

    writeJSON(path.join(stateDir, 'mandis.json'), mandisArr);

    // State crop prices (with Hindi names, MSP)
    for (const [cropId, c] of Object.entries(crops)) {
      const msp = getCropMSP(cropId);
      const history = Object.entries(c.byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: month.slice(5),
          date: month,
          market: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
          volume: data.count,
          ...(msp ? { msp } : {}),
        }));

      const districtBreakdown = Object.entries(c.byDistrict)
        .map(([district, data]) => ({
          district,
          nameHi: district,
          avgPrice: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
          records: data.count,
        }))
        .sort((a, b) => b.records - a.records)
        .slice(0, 15);

      const dailyHistory = Object.entries(c.byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          market: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
          volume: data.count,
          minPrice: data.minPrices.length > 0 ? Math.min(...data.minPrices) : 0,
          maxPrice: data.maxPrices.length > 0 ? Math.max(...data.maxPrices) : 0,
        }));

      writeJSON(path.join(stateDir, 'crop-prices', `${cropId}.json`), {
        crop: { id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji, ...(msp ? { msp } : {}) },
        history,
        dailyHistory,
        lastUpdated,
        districtBreakdown,
      });
    }

    // State heatmap (top 30 mandis, cleaned names)
    const heatmapData = {};
    for (const m of mandisArr.slice(0, 30)) {
      const mRecords = records.filter(r => r.market === m.originalName);
      const byMonthCount = {};
      for (const r of mRecords) {
        const month = parseDate(r.arrival_date);
        if (month) byMonthCount[month] = (byMonthCount[month] || 0) + 1;
      }
      const vals = Array(12).fill(0).map((_, i) => {
        const key = Object.keys(byMonthCount).find(k => parseInt(k.split('-')[1]) === i + 1);
        return key ? Math.min(10, Math.ceil(byMonthCount[key] / 5)) : 0;
      });
      heatmapData[m.name] = vals;
    }

    writeJSON(path.join(stateDir, 'heatmap.json'), heatmapData);

    // State stats
    writeJSON(path.join(stateDir, 'stats.json'), {
      totalRecords: records.length,
      totalDistricts: districts.size,
      totalMandis: markets.size,
      totalCrops: Object.keys(crops).length,
      topCrops: cropsArr.slice(0, 5).map(c => ({ id: c.id, name: c.name, nameHi: c.nameHi, emoji: c.emoji, records: c.totalRecords })),
    });

    statesList.push({
      id: meta.id,
      name: stateData.name,
      nameHi: meta.nameHi,
      totalRecords: records.length,
      totalDistricts: districts.size,
      totalMandis: markets.size,
      totalCrops: Object.keys(crops).length,
    });

    console.log(`  ${stateData.name}: ${records.length} records, ${districts.size} districts, ${markets.size} mandis, ${Object.keys(crops).length} crops`);
  }

  // ─── Mandi Comparison Data (per crop, per mandi prices) ─────────────
  // Helper: get most common key from frequency object { "Nendran": 45, "Local": 12 } → "Nendran"
  function getTopKey(freq) {
    if (!freq) return null;
    let top = null, max = 0;
    for (const [k, v] of Object.entries(freq)) {
      if (v > max && k && k !== 'Other' && k !== 'Unspecified') { max = v; top = k; }
    }
    return top;
  }

  const allCropMandis = {};
  for (const rec of allRecords) {
    const cropSlug = slugify(rec.commodity);
    const mandiName = cleanMandiName(rec.market);
    const stateInfo = STATES[rec.state];
    const stateHi = stateInfo ? stateInfo.nameHi : rec.state;
    if (!allCropMandis[cropSlug]) allCropMandis[cropSlug] = {};
    if (!allCropMandis[cropSlug][mandiName]) {
      allCropMandis[cropSlug][mandiName] = { name: mandiName, state: stateHi, stateId: stateInfo ? stateInfo.id : slugify(rec.state), stateCode: STATE_CODES[rec.state] || null, district: rec.district, prices: [], recentPrices: [], count: 0, varieties: {}, grades: {} };
    }
    if (rec.modal_price > 0) {
      allCropMandis[cropSlug][mandiName].prices.push(rec.modal_price);
      // Track recent prices (last 7 days) for accurate best/worst mandi
      const fullDate = parseDateFull(rec.arrival_date);
      if (fullDate && fullDate >= recentCutoff) {
        allCropMandis[cropSlug][mandiName].recentPrices.push(rec.modal_price);
      }
    }
    if (rec.variety) allCropMandis[cropSlug][mandiName].varieties[rec.variety] = (allCropMandis[cropSlug][mandiName].varieties[rec.variety] || 0) + 1;
    if (rec.grade) allCropMandis[cropSlug][mandiName].grades[rec.grade] = (allCropMandis[cropSlug][mandiName].grades[rec.grade] || 0) + 1;
    allCropMandis[cropSlug][mandiName].count++;
  }

  // Per-state mandi comparison
  for (const [stateId, stateData] of Object.entries(byState)) {
    const meta = STATES[stateData.name] || { id: stateId, nameHi: stateData.name };
    const stateCropMandis = {};
    for (const rec of stateData.records) {
      const cropSlug = slugify(rec.commodity);
      const mandiName = cleanMandiName(rec.market);
      if (!stateCropMandis[cropSlug]) stateCropMandis[cropSlug] = {};
      if (!stateCropMandis[cropSlug][mandiName]) stateCropMandis[cropSlug][mandiName] = { name: mandiName, district: rec.district, prices: [], recentPrices: [], count: 0, varieties: {}, grades: {} };
      if (rec.modal_price > 0) {
        stateCropMandis[cropSlug][mandiName].prices.push(rec.modal_price);
        const fullDate = parseDateFull(rec.arrival_date);
        if (fullDate && fullDate >= recentCutoff) {
          stateCropMandis[cropSlug][mandiName].recentPrices.push(rec.modal_price);
        }
      }
      if (rec.variety) stateCropMandis[cropSlug][mandiName].varieties[rec.variety] = (stateCropMandis[cropSlug][mandiName].varieties[rec.variety] || 0) + 1;
      if (rec.grade) stateCropMandis[cropSlug][mandiName].grades[rec.grade] = (stateCropMandis[cropSlug][mandiName].grades[rec.grade] || 0) + 1;
      stateCropMandis[cropSlug][mandiName].count++;
    }
    const stateMandiCompare = {};
    for (const [cropId, mandis] of Object.entries(stateCropMandis)) {
      const arr = Object.values(mandis).filter(m => m.prices.length > 0).map(m => ({
        name: m.name, district: m.district,
        avgPrice: Math.round(m.prices.reduce((a, b) => a + b, 0) / m.prices.length),
        recentPrice: m.recentPrices.length > 0 ? Math.round(m.recentPrices.reduce((a, b) => a + b, 0) / m.recentPrices.length) : null,
        minPrice: Math.min(...m.prices), maxPrice: Math.max(...m.prices), records: m.count,
        topVariety: getTopKey(m.varieties) || null, grade: getTopKey(m.grades) || null,
      })).sort((a, b) => (b.recentPrice || b.avgPrice) - (a.recentPrice || a.avgPrice));
      if (arr.length > 0) stateMandiCompare[cropId] = arr;
    }
    writeJSON(path.join(INDIA_DIR, 'states', meta.id, 'mandi-compare.json'), stateMandiCompare);
  }

  // All-India mandi-compare
  const indiaMandiCompare = {};
  for (const [cropId, mandis] of Object.entries(allCropMandis)) {
    const arr = Object.values(mandis).filter(m => m.prices.length > 0).map(m => ({
      name: m.name, state: m.state, stateId: m.stateId, stateCode: m.stateCode, district: m.district,
      avgPrice: Math.round(m.prices.reduce((a, b) => a + b, 0) / m.prices.length),
      recentPrice: m.recentPrices.length > 0 ? Math.round(m.recentPrices.reduce((a, b) => a + b, 0) / m.recentPrices.length) : null,
      minPrice: Math.min(...m.prices), maxPrice: Math.max(...m.prices), records: m.count,
      topVariety: getTopKey(m.varieties) || null, grade: getTopKey(m.grades) || null,
    })).sort((a, b) => (b.recentPrice || b.avgPrice) - (a.recentPrice || a.avgPrice));
    if (arr.length > 0) indiaMandiCompare[cropId] = arr;
  }
  writeJSON(path.join(INDIA_DIR, 'mandi-compare.json'), indiaMandiCompare);

  // ─── Ticker/Signal Data (per crop quick stats for Digital Board) ────
  const tickerData = [];
  for (const [cropId, c] of Object.entries(allCrops)) {
    const months = Object.entries(c.byMonth).sort(([a], [b]) => a.localeCompare(b));
    const latest = months.length > 0 ? months[months.length - 1] : null;
    const prev = months.length > 1 ? months[months.length - 2] : null;
    const latestPrice = latest && latest[1].prices.length > 0 ? Math.round(latest[1].prices.reduce((a, b) => a + b, 0) / latest[1].prices.length) : 0;
    const prevPrice = prev && prev[1].prices.length > 0 ? Math.round(prev[1].prices.reduce((a, b) => a + b, 0) / prev[1].prices.length) : 0;
    const change = latestPrice - prevPrice;
    const changePct = prevPrice > 0 ? ((change / prevPrice) * 100).toFixed(1) : '0.0';
    const msp = getCropMSP(cropId);
    const mandiCount = allCropMandis[cropId] ? Object.keys(allCropMandis[cropId]).length : 0;
    // Use recent (last 7 days) prices for best/worst mandi — not all-time average
    const bestMandi = allCropMandis[cropId]
      ? Object.values(allCropMandis[cropId]).filter(m => m.recentPrices.length > 0).sort((a, b) => {
          const avgB = b.recentPrices.reduce((x, y) => x + y, 0) / b.recentPrices.length;
          const avgA = a.recentPrices.reduce((x, y) => x + y, 0) / a.recentPrices.length;
          return avgB - avgA;
        })[0] : null;
    const worstMandi = allCropMandis[cropId]
      ? Object.values(allCropMandis[cropId]).filter(m => m.recentPrices.length > 0).sort((a, b) => {
          const avgA = a.recentPrices.reduce((x, y) => x + y, 0) / a.recentPrices.length;
          const avgB = b.recentPrices.reduce((x, y) => x + y, 0) / b.recentPrices.length;
          return avgA - avgB;
        })[0] : null;

    let signal = 'hold', signalHi = 'होल्ड';
    if (msp && latestPrice > msp * 1.1) { signal = 'sell'; signalHi = 'बेचें'; }
    else if (msp && latestPrice < msp * 0.9) { signal = 'buy'; signalHi = 'खरीदें'; }
    else if (change > 0 && parseFloat(changePct) > 5) { signal = 'sell'; signalHi = 'बेचें'; }
    else if (change < 0 && parseFloat(changePct) < -5) { signal = 'buy'; signalHi = 'खरीदें'; }

    tickerData.push({
      id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji,
      price: latestPrice, prevPrice, change, changePct: parseFloat(changePct),
      msp: msp || null,
      mspDiff: msp ? latestPrice - msp : null,
      mspDiffPct: msp ? parseFloat(((latestPrice - msp) / msp * 100).toFixed(1)) : null,
      records: c.records, mandiCount,
      bestMandi: bestMandi ? { name: bestMandi.name, state: bestMandi.state, stateCode: bestMandi.stateCode, price: Math.round(bestMandi.recentPrices.reduce((a, b) => a + b, 0) / bestMandi.recentPrices.length) } : null,
      worstMandi: worstMandi ? { name: worstMandi.name, state: worstMandi.state, stateCode: worstMandi.stateCode, price: Math.round(worstMandi.recentPrices.reduce((a, b) => a + b, 0) / worstMandi.recentPrices.length) } : null,
      signal, signalHi,
    });
  }
  tickerData.sort((a, b) => b.records - a.records);
  writeJSON(path.join(INDIA_DIR, 'ticker.json'), tickerData);

  // Per-state ticker
  for (const [stateId, stateData] of Object.entries(byState)) {
    const meta = STATES[stateData.name] || { id: stateId, nameHi: stateData.name };
    const stateCrops = {};
    for (const rec of stateData.records) {
      const slug = slugify(rec.commodity);
      if (!stateCrops[slug]) stateCrops[slug] = { name: rec.commodity, emoji: getCropEmoji(rec.commodity), records: 0, priceCount: 0, totalModal: 0, byMonth: {} };
      stateCrops[slug].records++;
      if (rec.modal_price > 0) { stateCrops[slug].totalModal += rec.modal_price; stateCrops[slug].priceCount++; }
      const m = parseDate(rec.arrival_date);
      if (m) {
        if (!stateCrops[slug].byMonth[m]) stateCrops[slug].byMonth[m] = { prices: [], count: 0 };
        if (rec.modal_price > 0) stateCrops[slug].byMonth[m].prices.push(rec.modal_price);
        stateCrops[slug].byMonth[m].count++;
      }
    }
    const stTicker = [];
    for (const [cropId, c] of Object.entries(stateCrops)) {
      const months = Object.entries(c.byMonth).sort(([a], [b]) => a.localeCompare(b));
      const latest = months.length > 0 ? months[months.length - 1] : null;
      const prev = months.length > 1 ? months[months.length - 2] : null;
      const lp = latest && latest[1].prices.length > 0 ? Math.round(latest[1].prices.reduce((a, b) => a + b, 0) / latest[1].prices.length) : 0;
      const pp = prev && prev[1].prices.length > 0 ? Math.round(prev[1].prices.reduce((a, b) => a + b, 0) / prev[1].prices.length) : 0;
      const ch = lp - pp;
      const chPct = pp > 0 ? ((ch / pp) * 100).toFixed(1) : '0.0';
      const msp = getCropMSP(cropId);
      let sig = 'hold', sigHi = 'होल्ड';
      if (msp && lp > msp * 1.1) { sig = 'sell'; sigHi = 'बेचें'; }
      else if (msp && lp < msp * 0.9) { sig = 'buy'; sigHi = 'खरीदें'; }
      else if (ch > 0 && parseFloat(chPct) > 5) { sig = 'sell'; sigHi = 'बेचें'; }
      else if (ch < 0 && parseFloat(chPct) < -5) { sig = 'buy'; sigHi = 'खरीदें'; }
      stTicker.push({
        id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji,
        price: lp, prevPrice: pp, change: ch, changePct: parseFloat(chPct),
        msp: msp || null, records: c.records, signal: sig, signalHi: sigHi,
      });
    }
    stTicker.sort((a, b) => b.records - a.records);
    writeJSON(path.join(INDIA_DIR, 'states', meta.id, 'ticker.json'), stTicker);
  }

  console.log(`  Generated mandi-compare and ticker data`);

  // ─── All-India files ─────────────────────────────────────────────────

  // All-India crops (with Hindi, MSP, seasons)
  const indiaCrops = Object.values(allCrops)
    .map(c => {
      const seasonData = getCropSeasonData(c.id) || {};
      return {
        id: c.id,
        name: c.name,
        nameHi: getCropHindi(c.id, c.name) || c.name,
        emoji: c.emoji,
        totalRecords: c.records,
        avgPrice: c.priceCount > 0 ? Math.round(c.totalModal / c.priceCount) : 0,
        ...(getCropMSP(c.id) ? { msp: getCropMSP(c.id) } : {}),
        ...(seasonData.sowingMonths ? { sowingMonths: seasonData.sowingMonths } : {}),
        ...(seasonData.growingMonths ? { growingMonths: seasonData.growingMonths } : {}),
        ...(seasonData.harvestMonths ? { harvestMonths: seasonData.harvestMonths } : {}),
        ...(seasonData.peakMonths ? { peakMonths: seasonData.peakMonths } : {}),
      };
    })
    .sort((a, b) => b.totalRecords - a.totalRecords);

  writeJSON(path.join(INDIA_DIR, 'crops.json'), indiaCrops);

  // All-India crop prices (with district breakdown + MSP)
  for (const [cropId, c] of Object.entries(allCrops)) {
    const msp = getCropMSP(cropId);
    const history = Object.entries(c.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: month.slice(5),
        date: month,
        market: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
        volume: data.count,
        ...(msp ? { msp } : {}),
      }));

    // All-India district breakdown for this crop
    const distBreakdown = allCropDistricts[cropId]
      ? Object.entries(allCropDistricts[cropId])
          .map(([district, data]) => ({
            district,
            nameHi: district,
            avgPrice: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
            records: data.count,
          }))
          .sort((a, b) => b.records - a.records)
          .slice(0, 15)
      : [];

    const dailyHistory = Object.entries(c.byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        market: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
        volume: data.count,
        minPrice: data.minPrices.length > 0 ? Math.min(...data.minPrices) : 0,
        maxPrice: data.maxPrices.length > 0 ? Math.max(...data.maxPrices) : 0,
      }));

    writeJSON(path.join(INDIA_DIR, 'crop-prices', `${cropId}.json`), {
      crop: { id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji, ...(msp ? { msp } : {}) },
      history,
      dailyHistory,
      lastUpdated,
      districtBreakdown: distBreakdown,
    });
  }

  // All-India heatmap (top 30 mandis, cleaned names)
  const allMandiCounts = {};
  const allMandiOriginal = {};
  for (const rec of allRecords) {
    const cleaned = cleanMandiName(rec.market);
    allMandiCounts[cleaned] = (allMandiCounts[cleaned] || 0) + 1;
    allMandiOriginal[cleaned] = rec.market;
  }
  const topMandis = Object.entries(allMandiCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  const indiaHeatmap = {};
  for (const [market] of topMandis) {
    const original = allMandiOriginal[market];
    const mRecords = allRecords.filter(r => r.market === original);
    const byMonthCount = {};
    for (const r of mRecords) {
      const month = parseDate(r.arrival_date);
      if (month) byMonthCount[month] = (byMonthCount[month] || 0) + 1;
    }
    const vals = Array(12).fill(0).map((_, i) => {
      const key = Object.keys(byMonthCount).find(k => parseInt(k.split('-')[1]) === i + 1);
      return key ? Math.min(10, Math.ceil(byMonthCount[key] / 3)) : 0;
    });
    indiaHeatmap[market] = vals;
  }

  writeJSON(path.join(INDIA_DIR, 'heatmap.json'), indiaHeatmap);

  // Ensure ALL states appear in states list
  for (const [stateName, meta] of Object.entries(STATES)) {
    if (!statesList.find(s => s.id === meta.id)) {
      statesList.push({
        id: meta.id,
        name: stateName,
        nameHi: meta.nameHi,
        totalRecords: 0,
        totalDistricts: 0,
        totalMandis: 0,
        totalCrops: 0,
        hasData: false,
      });
    }
  }

  // Inject CG scraper stats (CG data comes from scraper, not data.gov.in)
  try {
    const cgCrops = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'crops.json'), 'utf-8'));
    const cgMandis = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'mandis.json'), 'utf-8'));
    const cgDistricts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'districts.json'), 'utf-8'));
    const cgRecords = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scraper', 'data', 'all-records.json'), 'utf-8'));
    const cgIdx = statesList.findIndex(s => s.id === 'chhattisgarh');
    const cgStats = {
      id: 'chhattisgarh',
      name: 'Chhattisgarh',
      nameHi: 'छत्तीसगढ़',
      totalRecords: cgRecords.length,
      totalDistricts: cgDistricts.length,
      totalMandis: cgMandis.length,
      totalCrops: cgCrops.length,
      hasData: true,
    };
    if (cgIdx >= 0) statesList[cgIdx] = cgStats;
    else statesList.push(cgStats);
    console.log(`Injected CG scraper stats: ${cgRecords.length} records, ${cgMandis.length} mandis`);
  } catch (e) {
    console.log('Note: CG scraper data not available, skipping CG injection');
  }

  for (const s of statesList) {
    if (s.hasData === undefined) s.hasData = s.totalRecords > 0;
  }

  statesList.sort((a, b) => b.totalRecords - a.totalRecords);
  writeJSON(path.join(INDIA_DIR, 'states.json'), statesList);

  // All-India stats
  writeJSON(path.join(INDIA_DIR, 'stats.json'), {
    totalRecords: allRecords.length,
    totalStates: Object.keys(byState).length,
    totalStatesExpected: Object.keys(STATES).length,
    totalDistricts: allDistricts.size,
    totalMandis: allMarkets.size,
    totalCrops: Object.keys(allCrops).length,
    topStates: statesList.filter(s => s.hasData).slice(0, 5),
    dateRange: dailyFiles.map(f => f.replace('.json', '')),
    lastUpdated,
  });

  console.log(`\n=== All India Summary ===`);
  console.log(`States: ${Object.keys(byState).length}`);
  console.log(`Districts: ${allDistricts.size}`);
  console.log(`Markets: ${allMarkets.size}`);
  console.log(`Crops: ${Object.keys(allCrops).length}`);
  console.log(`Total Records: ${allRecords.length}`);
  console.log(`Output: ${INDIA_DIR}`);
}

main();
