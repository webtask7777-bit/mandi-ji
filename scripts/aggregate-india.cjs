#!/usr/bin/env node
/**
 * Aggregate daily data.gov.in snapshots into India-level dashboard data
 * Reads: server/db/data/daily/*.json
 * Outputs: server/db/data/india/
 */

const fs = require('fs');
const path = require('path');
const { recordKey, MIN_PLAUSIBLE_PRICE } = require('./lib/daily-store.cjs');
const { monthChange, changeSignal } = require('./lib/month-change.cjs');
const { newBucket, addPrice, bucketPrice, unitMismatchedSeries } = require('./lib/robust-price.cjs');

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
  'Keralam': 'Kerala',
  'Pondicherry': 'Puducherry',
  'Daman and Diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'Dadra and Nagar Haveli': 'Dadra and Nagar Haveli and Daman and Diu',
};

// ─── Commodity Aliases (agmarknet.gov.in spellings of the same commodity form) ──
// Exact source names only; whole pulses and dal stay separate.
const COMMODITY_ALIASES = {
  'Red gram/Arhar/Tur(whole)': 'Arhar(Tur/Red Gram)(Whole)',
  'Red gram split/Arhar dal/Tur dal': 'Arhar Dal(Tur Dal)',
  'Spiny Gourd / Kartali(Kantola)': 'Kartali(Kantola)',
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

// ─── MSP (₹ per quintal), official PIB releases ───────────────────────
// Only the exact commodity form the release names (whole grain/seed). Basmati, dal, atta and
// oil carry no MSP. Each value keeps its season and source so the site can say which it is.
const MSP_SOURCES = {
  'kharif-2026-27': { label: 'खरीफ 2026-27', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2260618' }, // 13 May 2026
  'rabi-2026-27': { label: 'रबी 2026-27', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2173567' },   // 1 Oct 2025
};
const CROP_MSP_TABLE = {
  // Kharif marketing season 2026-27
  'paddycommon': [2441, 'kharif-2026-27'], 'jowarsorghum': [4023, 'kharif-2026-27'],
  'bajrapearl-millet-cumbu': [2900, 'kharif-2026-27'], 'ragifinger-millet': [5205, 'kharif-2026-27'],
  'maize': [2410, 'kharif-2026-27'], 'arhartur-red-gramwhole': [8450, 'kharif-2026-27'],
  'green-grammoongwhole': [8780, 'kharif-2026-27'], 'black-gramurd-beanswhole': [8200, 'kharif-2026-27'],
  'groundnut': [7517, 'kharif-2026-27'], 'sunflower-seed': [8343, 'kharif-2026-27'],
  'sunflower-sunflower-seed': [8343, 'kharif-2026-27'], 'soyabean': [5708, 'kharif-2026-27'],
  'sesamumsesame-gingelly-til': [10346, 'kharif-2026-27'], 'niger-seedramtil': [10052, 'kharif-2026-27'],
  'cotton': [8267, 'kharif-2026-27'],
  // Rabi marketing season 2026-27 (the season of the wheat and gram now being sold)
  'wheat': [2585, 'rabi-2026-27'], 'barleyjau': [2150, 'rabi-2026-27'],
  'bengal-gramgramwhole': [5875, 'rabi-2026-27'], 'lentilmasurwhole': [7000, 'rabi-2026-27'],
  'mustard': [6200, 'rabi-2026-27'], 'safflower': [6540, 'rabi-2026-27'],
};
const CROP_MSP = Object.fromEntries(Object.entries(CROP_MSP_TABLE).map(([id, [msp]]) => [id, msp]));
const mspInfo = id => {
  const row = CROP_MSP_TABLE[id];
  if (!row) return {};
  const src = MSP_SOURCES[row[1]];
  return { msp: row[0], mspSeason: src.label, mspSource: src.url };
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
  /^APMC\s+/gi,
];

function cleanMandiName(name) {
  let cleaned = name;
  for (const pattern of MANDI_STRIP_SUFFIXES) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim();
}

// A mandi is identified by state + district + cleaned name; same-name markets in different
// states (Jalalabad PB / UP, Gorakhpur MP / UP) stay separate.
const mandiKeyOf = rec => `${rec.state}|${rec.district}|${cleanMandiName(rec.market || '')}`;

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


  // The same observation can sit in two files (older fetches filed by fetch date, overlapping
  // snapshots). Keep one copy per identity key; the later file wins.
  const byKey = new Map();
  let rawCount = 0;
  for (const file of dailyFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, file), 'utf-8'));
    for (const rec of data.records || []) { rawCount++; byKey.set(recordKey(rec), rec); }
  }
  const dedupedRecords = [...byKey.values()];

  // Leave out series reported in another unit (per bunch, per nut): they are not ₹/quintal.
  const seriesKey = r => `${r.commodity}|${r.state}|${r.district}|${r.market}`;
  const unitExcluded = unitMismatchedSeries(dedupedRecords, { seriesKey, commodityKey: r => r.commodity });
  const allRecords = dedupedRecords.filter(r => !unitExcluded.has(seriesKey(r)));
  console.log(`Unit check: ${unitExcluded.size} series (${dedupedRecords.length - allRecords.length} records) left out as not per quintal`);

  // "Recent" = the 7 days before the newest observation (UTC dates), not the newest file name.
  let newestObservation = '';
  for (const r of allRecords) { const d = parseDateFull(r.arrival_date); if (d && d > newestObservation) newestObservation = d; }
  const recentCutoff = newestObservation ? new Date(Date.parse(`${newestObservation}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10) : '';
  console.log(`Newest observation ${newestObservation}; recent cutoff ${recentCutoff}`);

  console.log(`Total records: ${allRecords.length} (${rawCount - dedupedRecords.length} duplicates across files skipped)`);

  // ─── Group by state ──────────────────────────────────────────────────
  const byState = {};
  const droppedStates = {};
  for (const rec of allRecords) {
    // Normalize state name via aliases (agmarknet uses different spellings)
    if (STATE_ALIASES[rec.state]) rec.state = STATE_ALIASES[rec.state];
    if (COMMODITY_ALIASES[rec.commodity]) rec.commodity = COMMODITY_ALIASES[rec.commodity];

    const stateInfo = STATES[rec.state];
    if (!stateInfo) {
      const match = Object.keys(STATES).find(s => s.toLowerCase() === rec.state?.toLowerCase());
      if (!match) { droppedStates[rec.state] = (droppedStates[rec.state] || 0) + 1; continue; }
      rec.state = match;
    }
    const sid = (STATES[rec.state] || {}).id || slugify(rec.state);
    if (!byState[sid]) byState[sid] = { name: rec.state, records: [] };
    byState[sid].records.push(rec);
  }

  if (Object.keys(droppedStates).length) console.warn('⚠️  Records with an unknown state name were skipped (add an alias):', droppedStates);

  // District reorganisations (e.g. Chhattisgarh 2020-22: Sarangarh moved from Raigarh to
  // Sarangarh-Bilaigarh) and renames (Ahmednagar → Ahilyanagar) would split one mandi in two.
  // Within a state, a market name's districts are unified only when one label replaced the
  // other over time (their date ranges do not overlap); same-name markets reporting in the
  // same period under different districts (Puthur VFPCK, Kollam and Thrissur) stay separate.
  const spans = new Map();
  for (const rec of allRecords) {
    const key = `${rec.state}|${cleanMandiName(rec.market || '')}`;
    const date = parseDateFull(rec.arrival_date) || '';
    if (!date) continue;
    if (!spans.has(key)) spans.set(key, new Map());
    const byDistrict = spans.get(key);
    const span = byDistrict.get(rec.district) || { first: date, last: date };
    if (date < span.first) span.first = date;
    if (date > span.last) span.last = date;
    byDistrict.set(rec.district, span);
  }
  const canonicalDistrict = new Map();
  const reassigned = [];
  for (const [key, byDistrict] of spans) {
    if (byDistrict.size < 2) continue;
    const ordered = [...byDistrict.entries()].sort((a, b) => a[1].first.localeCompare(b[1].first));
    const sequential = ordered.every(([, span], k) => k === 0 || span.first > ordered[k - 1][1].last);
    if (!sequential) continue;
    const newest = ordered.at(-1)[0];
    for (const [district] of ordered) canonicalDistrict.set(`${key}|${district}`, newest);
    reassigned.push(`${key} → ${newest} (${ordered.map(([d]) => d).join(' → ')})`);
  }
  for (const rec of allRecords) {
    const target = canonicalDistrict.get(`${rec.state}|${cleanMandiName(rec.market || '')}|${rec.district}`);
    if (target) rec.district = target;
  }
  // Chhattisgarh's 2020-22 districts, as the state now names them. The two sources label these
  // mandis with old and new districts in the same period, so the time rule above cannot decide.
  const CURRENT_DISTRICT = {
    Chhattisgarh: {
      Pendraroad: 'Gourela Pendra Marwahi', Manendragarh: 'Manendragarh Chirmiri Bhartpur', Baikunthpur: 'Koriya',
      Kheragarh: 'Khairagarh Chhuikhadan Gandai', Gandai: 'Khairagarh Chhuikhadan Gandai',
      Sarangarh: 'Sarangarh Bilaigarh', Baramkela: 'Sarangarh Bilaigarh', Bhatgaon: 'Sarangarh Bilaigarh',
      Shakti: 'Sakti', Jaijaipur: 'Sakti', Amandulla: 'Sakti', Bandhabazar: 'Mohla Manpur Ambagarh Chowki',
    },
  };
  for (const rec of allRecords) {
    const district = CURRENT_DISTRICT[rec.state]?.[cleanMandiName(rec.market || '')];
    if (district) rec.district = district;
  }
  if (reassigned.length) console.log(`District unified for ${reassigned.length} mandis:\n  ${reassigned.join('\n  ')}`);

  // ─── National coverage ───────────────────────────────────────────────
  // National figures use only days on which at least MIN_NATIONAL_STATES states reported.
  // Earlier days hold a single state's history (Chhattisgarh, Mar–Nov 2025); they stay on that
  // state's pages and are never presented as an all-India price.
  const MIN_NATIONAL_STATES = 5;
  const statesByDay = new Map();
  for (const [sid, sd] of Object.entries(byState)) {
    for (const rec of sd.records) {
      const d = parseDateFull(rec.arrival_date);
      if (!d) continue;
      if (!statesByDay.has(d)) statesByDay.set(d, new Set());
      statesByDay.get(d).add(sid);
    }
  }
  const nationalDays = new Set([...statesByDay].filter(([, set]) => set.size >= MIN_NATIONAL_STATES).map(([d]) => d));
  const isNational = rec => nationalDays.has(parseDateFull(rec.arrival_date));
  console.log(`National days: ${nationalDays.size} of ${statesByDay.size} (≥${MIN_NATIONAL_STATES} states reporting)`);

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
      if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) { c.totalModal += rec.modal_price; c.priceCount++; }
      if (rec.min_price >= MIN_PLAUSIBLE_PRICE) c.minPrice = Math.min(c.minPrice, rec.min_price);
      if (rec.max_price >= MIN_PLAUSIBLE_PRICE) c.maxPrice = Math.max(c.maxPrice, rec.max_price);
      if (rec.variety) c.varieties.add(rec.variety);

      const month = parseDate(rec.arrival_date);
      if (month) {
        if (!c.byMonth[month]) c.byMonth[month] = newBucket();
        if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) addPrice(c.byMonth[month], mandiKeyOf(rec), rec.modal_price, parseDateFull(rec.arrival_date));
        c.byMonth[month].count++;
      }

      const fullDate = parseDateFull(rec.arrival_date);
      if (fullDate) {
        if (!c.byDay[fullDate]) c.byDay[fullDate] = { ...newBucket(), minPrices: [], maxPrices: [] };
        if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) addPrice(c.byDay[fullDate], mandiKeyOf(rec), rec.modal_price, fullDate);
        if (rec.min_price >= MIN_PLAUSIBLE_PRICE) c.byDay[fullDate].minPrices.push(rec.min_price);
        if (rec.max_price >= MIN_PLAUSIBLE_PRICE) c.byDay[fullDate].maxPrices.push(rec.max_price);
        c.byDay[fullDate].count++;
      }

      if (rec.district) {
        if (!c.byDistrict[rec.district]) c.byDistrict[rec.district] = { prices: [], count: 0 };
        if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) c.byDistrict[rec.district].prices.push(rec.modal_price);
        c.byDistrict[rec.district].count++;
      }

      // Track all-India
      if (!allCrops[cropSlug]) {
        allCrops[cropSlug] = { id: cropSlug, name: rec.commodity, emoji: getCropEmoji(rec.commodity), records: 0, priceCount: 0, totalModal: 0, byMonth: {}, byDay: {} };
      }
      allCrops[cropSlug].records++;
      if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) { allCrops[cropSlug].totalModal += rec.modal_price; allCrops[cropSlug].priceCount++; }
      const national = isNational(rec);
      const m2 = national ? parseDate(rec.arrival_date) : null;
      if (m2) {
        if (!allCrops[cropSlug].byMonth[m2]) allCrops[cropSlug].byMonth[m2] = newBucket();
        if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) addPrice(allCrops[cropSlug].byMonth[m2], mandiKeyOf(rec), rec.modal_price, parseDateFull(rec.arrival_date));
        allCrops[cropSlug].byMonth[m2].count++;
      }
      const fullDate2 = national ? parseDateFull(rec.arrival_date) : null;
      if (fullDate2) {
        if (!allCrops[cropSlug].byDay[fullDate2]) allCrops[cropSlug].byDay[fullDate2] = { ...newBucket(), minPrices: [], maxPrices: [] };
        if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) addPrice(allCrops[cropSlug].byDay[fullDate2], mandiKeyOf(rec), rec.modal_price, fullDate2);
        if (rec.min_price >= MIN_PLAUSIBLE_PRICE) allCrops[cropSlug].byDay[fullDate2].minPrices.push(rec.min_price);
        if (rec.max_price >= MIN_PLAUSIBLE_PRICE) allCrops[cropSlug].byDay[fullDate2].maxPrices.push(rec.max_price);
        allCrops[cropSlug].byDay[fullDate2].count++;
      }

      // Track All-India district breakdown per crop
      if (national && rec.district) {
        if (!allCropDistricts[cropSlug]) allCropDistricts[cropSlug] = {};
        const distKey = `${rec.district} (${meta.nameHi})`;
        if (!allCropDistricts[cropSlug][distKey]) allCropDistricts[cropSlug][distKey] = { prices: [], count: 0 };
        if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) allCropDistricts[cropSlug][distKey].prices.push(rec.modal_price);
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
          ...mspInfo(c.id),
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
          market: bucketPrice(data),
          volume: data.count,
          days: data.days.size,
          mandis: Object.keys(data.byMandi).length,
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
          market: bucketPrice(data),
          volume: data.count,
          mandis: Object.keys(data.byMandi).length,
          minPrice: data.minPrices.length > 0 ? Math.min(...data.minPrices) : 0,
          maxPrice: data.maxPrices.length > 0 ? Math.max(...data.maxPrices) : 0,
        }));

      writeJSON(path.join(stateDir, 'crop-prices', `${cropId}.json`), {
        crop: { id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji, ...mspInfo(cropId) },
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

    // Freshness by observation date, for the public data-status page.
    let latestObservation = '';
    const recentMandis = new Set();
    let recentRecords = 0;
    for (const r of records) {
      const d = parseDateFull(r.arrival_date);
      if (!d) continue;
      if (d > latestObservation) latestObservation = d;
      if (d >= recentCutoff) { recentRecords++; recentMandis.add(mandiKeyOf(r)); }
    }
    statesList.push({
      id: meta.id,
      name: stateData.name,
      nameHi: meta.nameHi,
      totalRecords: records.length,
      totalDistricts: districts.size,
      totalMandis: markets.size,
      totalCrops: Object.keys(crops).length,
      latestObservation: latestObservation || null,
      recentRecords,
      recentMandis: recentMandis.size,
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

  // Mandi-compare row: a recent price (last 7 days before the newest observation) with the
  // min/max of that same window; mandis without recent data keep their historical average and
  // last date, and are listed after every mandi with a recent price.
  const avg = list => Math.round(list.reduce((a, b) => a + b, 0) / list.length);
  const compareFields = m => {
    const window = m.recentPrices.length ? m.recentPrices : m.prices;
    return {
      avgPrice: avg(m.prices),
      recentPrice: m.recentPrices.length ? avg(m.recentPrices) : null,
      minPrice: Math.min(...window), maxPrice: Math.max(...window),
      rangeBasis: m.recentPrices.length ? 'recent' : 'all',
      lastDate: m.lastDate || null, records: m.count,
    };
  };
  const compareOrder = (a, b) => (b.recentPrice != null) - (a.recentPrice != null) || (b.recentPrice ?? b.avgPrice) - (a.recentPrice ?? a.avgPrice);

  const allCropMandis = {};
  for (const rec of allRecords) {
    if (!isNational(rec)) continue;
    const cropSlug = slugify(rec.commodity);
    const mandiName = cleanMandiName(rec.market);
    const stateInfo = STATES[rec.state];
    const stateHi = stateInfo ? stateInfo.nameHi : rec.state;
    if (!allCropMandis[cropSlug]) allCropMandis[cropSlug] = {};
    const key = mandiKeyOf(rec);
    if (!allCropMandis[cropSlug][key]) {
      allCropMandis[cropSlug][key] = { name: mandiName, state: stateHi, stateId: stateInfo ? stateInfo.id : slugify(rec.state), stateCode: STATE_CODES[rec.state] || null, district: rec.district, prices: [], recentPrices: [], lastDate: '', count: 0, varieties: {}, grades: {} };
    }
    const entry = allCropMandis[cropSlug][key];
    if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) {
      entry.prices.push(rec.modal_price);
      // Track recent prices (last 7 days) for accurate best/worst mandi
      const fullDate = parseDateFull(rec.arrival_date);
      if (fullDate && fullDate > entry.lastDate) entry.lastDate = fullDate;
      if (fullDate && fullDate >= recentCutoff) entry.recentPrices.push(rec.modal_price);
    }
    if (rec.variety) entry.varieties[rec.variety] = (entry.varieties[rec.variety] || 0) + 1;
    if (rec.grade) entry.grades[rec.grade] = (entry.grades[rec.grade] || 0) + 1;
    entry.count++;
  }

  // Per-state mandi comparison
  for (const [stateId, stateData] of Object.entries(byState)) {
    const meta = STATES[stateData.name] || { id: stateId, nameHi: stateData.name };
    const stateCropMandis = {};
    for (const rec of stateData.records) {
      const cropSlug = slugify(rec.commodity);
      const mandiName = cleanMandiName(rec.market);
      if (!stateCropMandis[cropSlug]) stateCropMandis[cropSlug] = {};
      const key = mandiKeyOf(rec);
      if (!stateCropMandis[cropSlug][key]) stateCropMandis[cropSlug][key] = { name: mandiName, district: rec.district, prices: [], recentPrices: [], lastDate: '', count: 0, varieties: {}, grades: {} };
      const entry = stateCropMandis[cropSlug][key];
      if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) {
        entry.prices.push(rec.modal_price);
        const fullDate = parseDateFull(rec.arrival_date);
        if (fullDate && fullDate > entry.lastDate) entry.lastDate = fullDate;
        if (fullDate && fullDate >= recentCutoff) entry.recentPrices.push(rec.modal_price);
      }
      if (rec.variety) entry.varieties[rec.variety] = (entry.varieties[rec.variety] || 0) + 1;
      if (rec.grade) entry.grades[rec.grade] = (entry.grades[rec.grade] || 0) + 1;
      entry.count++;
    }
    const stateMandiCompare = {};
    for (const [cropId, mandis] of Object.entries(stateCropMandis)) {
      const arr = Object.values(mandis).filter(m => m.prices.length > 0).map(m => ({
        name: m.name, district: m.district, ...compareFields(m),
        topVariety: getTopKey(m.varieties) || null, grade: getTopKey(m.grades) || null,
      })).sort(compareOrder);
      if (arr.length > 0) stateMandiCompare[cropId] = arr;
    }
    writeJSON(path.join(INDIA_DIR, 'states', meta.id, 'mandi-compare.json'), stateMandiCompare);
  }

  // All-India mandi-compare
  const indiaMandiCompare = {};
  for (const [cropId, mandis] of Object.entries(allCropMandis)) {
    const arr = Object.values(mandis).filter(m => m.prices.length > 0).map(m => ({
      name: m.name, state: m.state, stateId: m.stateId, stateCode: m.stateCode, district: m.district, ...compareFields(m),
      topVariety: getTopKey(m.varieties) || null, grade: getTopKey(m.grades) || null,
    })).sort(compareOrder);
    if (arr.length > 0) indiaMandiCompare[cropId] = arr;
  }
  writeJSON(path.join(INDIA_DIR, 'mandi-compare.json'), indiaMandiCompare);

  // ─── Ticker/Signal Data (per crop quick stats for Digital Board) ────
  const tickerData = [];
  for (const [cropId, c] of Object.entries(allCrops)) {
    const months = Object.entries(c.byMonth).sort(([a], [b]) => a.localeCompare(b));
    // Change only between consecutive months; null across a data gap.
    const { price: latestPrice, prevPrice, change, changePct, month: priceMonth, days: priceDays, mandis: priceMandis } = monthChange(months);
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

    // Signals come only from a valid month-over-month change. MSP comparisons are not used:
    // the MSP table is a past season's figures.
    let signal = 'hold', signalHi = 'होल्ड';
    if (changeSignal(changePct)) ({ signal, signalHi } = changeSignal(changePct));

    tickerData.push({
      id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji,
      price: latestPrice, priceMonth, priceDays, priceMandis, prevPrice, change, changePct,
      msp: msp || null, mspSeason: mspInfo(cropId).mspSeason || null, mspSource: mspInfo(cropId).mspSource || null,
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
      if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) { stateCrops[slug].totalModal += rec.modal_price; stateCrops[slug].priceCount++; }
      const m = parseDate(rec.arrival_date);
      if (m) {
        if (!stateCrops[slug].byMonth[m]) stateCrops[slug].byMonth[m] = newBucket();
        if (rec.modal_price >= MIN_PLAUSIBLE_PRICE) addPrice(stateCrops[slug].byMonth[m], mandiKeyOf(rec), rec.modal_price, parseDateFull(rec.arrival_date));
        stateCrops[slug].byMonth[m].count++;
      }
    }
    const stTicker = [];
    for (const [cropId, c] of Object.entries(stateCrops)) {
      const months = Object.entries(c.byMonth).sort(([a], [b]) => a.localeCompare(b));
      const { price: lp, prevPrice: pp, change: ch, changePct: chPct, month: pMonth, days: pDays, mandis: pMandis } = monthChange(months);
      const msp = getCropMSP(cropId);
      let sig = 'hold', sigHi = 'होल्ड';
      if (changeSignal(chPct)) ({ signal: sig, signalHi: sigHi } = changeSignal(chPct));
      stTicker.push({
        id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji,
        price: lp, priceMonth: pMonth, priceDays: pDays, priceMandis: pMandis, prevPrice: pp, change: ch, changePct: chPct,
        msp: msp || null, mspSeason: mspInfo(cropId).mspSeason || null, mspSource: mspInfo(cropId).mspSource || null, records: c.records, signal: sig, signalHi: sigHi,
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
        ...mspInfo(c.id),
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
        market: bucketPrice(data),
        volume: data.count,
        days: data.days.size,
        mandis: Object.keys(data.byMandi).length,
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
        market: bucketPrice(data),
        volume: data.count,
        mandis: Object.keys(data.byMandi).length,
        minPrice: data.minPrices.length > 0 ? Math.min(...data.minPrices) : 0,
        maxPrice: data.maxPrices.length > 0 ? Math.max(...data.maxPrices) : 0,
      }));

    writeJSON(path.join(INDIA_DIR, 'crop-prices', `${cropId}.json`), {
      crop: { id: cropId, name: c.name, nameHi: getCropHindi(cropId, c.name) || c.name, emoji: c.emoji, ...mspInfo(cropId) },
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

  // Chhattisgarh is counted from the same daily data as every other state; the legacy
  // scraper files are no longer served for prices, so their counts are not injected.

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
    newestObservation: newestObservation || null,
    recentCutoff: recentCutoff || null,
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
