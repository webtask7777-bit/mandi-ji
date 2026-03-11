#!/usr/bin/env node
/**
 * Aggregate 96K real CG Mandi records into dashboard-ready JSON files
 * Reads: scraper/data/all-records.json
 * Outputs: server/db/data/*.json + server/db/data/crop-prices/*.json
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'scraper', 'data', 'all-records.json');
const OUTPUT = path.join(__dirname, '..', 'server', 'db', 'data');
const CROP_PRICES_DIR = path.join(OUTPUT, 'crop-prices');

// ─── District Name Mapping (scraped Hindi → existing district ID) ────────────
const DISTRICT_MAP = {
  "रायपुर": 1,
  "दुर्ग": 2,
  "राजनांदगांव": 3,
  "महासमुंद": 4,
  "धमतरी": 5,
  "बिलासपुर": 6,
  "जांजगीर-चाम्पा": 7,
  "कोरबा": 8,
  "रायगढ़": 9,
  "मुंगेली": 10,
  "बालोद": 11,
  "बेमेतरा": 12,
  "गरियाबंद": 13,
  "बलौदा बाजार": 14,
  "कबीरधाम": 15,
  "सारंगढ़ बिलाईगढ़": 16,
  "खैरागढ़ छुईखदान गण्डई": 17,
  "मोहला मानपुर अं.चौकी": 18,
  "सक्ती": 19,
  "मनेन्द्रगढ़ चिरमिरी भरतपुर": 20,
  "बस्तर": 21,
  "कोंडागांव": 22,
  "कांकेर": 23,
  "नारायणपुर": 24,
  "दन्तेवाड़ा": 25,
  "बीजापुर": 26,
  "सुकमा": 27,
  "सरगुजा": 28,
  "कोरिया": 29,
  "जशपुर": 30,
  "सुरजपुर": 31,
  "बलरामपुर": 32,
  "गौरेला पेन्ड्रा मरवाही": 33,
  // Spelling variations in scraped data
  "सारंगढ़ बिलाईगढ़": 16,   // scraped (no hyphen)
  "खैरागढ़ छुईखदान गण्डई": 17, // scraped (no hyphen)
  "मनेन्द्रगढ़ चिरमिरी भरतपुर": 20, // scraped (full name)
  // Handle empty/unknown
  "": null,
  "नारायणपुर ": 24,  // trailing space
};

// Existing districts metadata
const EXISTING_DISTRICTS = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'districts.json'), 'utf-8'));

// ─── Crop Category Definitions ────────────────────────────────────────────────
// Top crops with full metadata. id must be URL-safe.
const CROP_META = {
  "धान": { id: "paddy", name: "Paddy", emoji: "🌾", color: "#4CAF50", bg: "rgba(76,175,80,0.12)", region: "Plains", msp: 2183, season: "kharif", sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0,1], desc: "Chhattisgarh ka mukhya fasal — 'Rice Bowl of India' ka dil" },
  "मक्का": { id: "maize", name: "Maize", emoji: "🌽", color: "#FFB300", bg: "rgba(255,179,0,0.12)", region: "Plains", msp: 1870, season: "kharif", sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Kharif ka pramukh dana fasal" },
  "गेहूँ": { id: "wheat", name: "Wheat", emoji: "🌿", color: "#FFA726", bg: "rgba(255,167,38,0.12)", region: "Plains", msp: 2275, season: "rabi", sowingMonths: [10,11], growingMonths: [0,1], harvestMonths: [2,3], peakMonths: [3,4], desc: "Rabi ki mukhya fasal" },
  "चना": { id: "gram", name: "Gram", emoji: "🫘", color: "#8D6E63", bg: "rgba(141,110,99,0.12)", region: "Northern Hills", msp: 5440, season: "rabi", sowingMonths: [9,10], growingMonths: [11,0], harvestMonths: [1,2], peakMonths: [2,3], desc: "Rabi dalhan — Northern Hills ki pramukh fasal" },
  "सोयाबीन": { id: "soybean", name: "Soyabean", emoji: "🟤", color: "#66BB6A", bg: "rgba(102,187,106,0.12)", region: "Bastar", msp: 4600, season: "kharif", sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Tilhan ki mukhya fasal" },
  "कोदो-कुटकी": { id: "millets", name: "Millets", emoji: "🌱", color: "#26A69A", bg: "rgba(38,166,154,0.12)", region: "Bastar", msp: 3578, season: "kharif", sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0,1], desc: "Aadivasi kshetra ka paramparagat anaj" },
  "तुअर": { id: "arhar", name: "Arhar/Toor", emoji: "🫘", color: "#FF7043", bg: "rgba(255,112,67,0.12)", region: "Plains", msp: 7000, season: "kharif", sowingMonths: [5,6], growingMonths: [7,8,9,10], harvestMonths: [11,0], peakMonths: [1,2], desc: "Kharif dalhan — daal ki mukhya fasal" },
  "मसूर": { id: "masoor", name: "Masoor", emoji: "🟠", color: "#E65100", bg: "rgba(230,81,0,0.12)", region: "Plains", msp: 6425, season: "rabi", sowingMonths: [10,11], growingMonths: [0,1], harvestMonths: [2,3], peakMonths: [3,4], desc: "Rabi ki daal fasal" },
  "सरसों": { id: "mustard", name: "Mustard", emoji: "🌻", color: "#FDD835", bg: "rgba(253,216,53,0.12)", region: "Plains", msp: 5650, season: "rabi", sowingMonths: [9,10], growingMonths: [11,0,1], harvestMonths: [2,3], peakMonths: [3,4], desc: "Rabi tilhan fasal" },
  "अलसी": { id: "linseed", name: "Linseed", emoji: "🌰", color: "#795548", bg: "rgba(121,85,72,0.12)", region: "Plains", msp: 6485, season: "rabi", sowingMonths: [10,11], growingMonths: [0,1], harvestMonths: [2,3], peakMonths: [3,4], desc: "Tilhan fasal — alsi ka tel" },
  "महुवे के फूल": { id: "mahua", name: "Mahua Flower", emoji: "🌸", color: "#AB47BC", bg: "rgba(171,71,188,0.12)", region: "Bastar", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [2,3,4], peakMonths: [3,4,5], desc: "Van upaj — aadivasi kshetra ka mukhya upaj" },
  "टमाटर": { id: "tomato", name: "Tomato", emoji: "🍅", color: "#F44336", bg: "rgba(244,67,54,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Sabzi mandi ki pramukh fasal" },
  "प्याज": { id: "onion", name: "Onion", emoji: "🧅", color: "#9C27B0", bg: "rgba(156,39,176,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Sabzi — saal bhar ki maang" },
  "आलू": { id: "potato", name: "Potato", emoji: "🥔", color: "#795548", bg: "rgba(121,85,72,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Mukhya sabzi fasal" },
  "पत्ता गोभी": { id: "cabbage", name: "Cabbage", emoji: "🥬", color: "#66BB6A", bg: "rgba(102,187,106,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Sardi ki sabzi" },
  "बैंगन": { id: "brinjal", name: "Brinjal", emoji: "🍆", color: "#7B1FA2", bg: "rgba(123,31,162,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Sabzi mandi mein niyamit" },
  "भिण्डी": { id: "ladyfinger", name: "Lady Finger", emoji: "🥒", color: "#388E3C", bg: "rgba(56,142,60,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Garmi ki mukhya sabzi" },
  "लौकी": { id: "bottlegourd", name: "Bottle Gourd", emoji: "🫛", color: "#43A047", bg: "rgba(67,160,71,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Sabzi — lauki" },
  "करेला": { id: "bittergourd", name: "Bitter Gourd", emoji: "🥒", color: "#2E7D32", bg: "rgba(46,125,50,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Garmi ki sabzi" },
  "कुम्हड़ा": { id: "pumpkin", name: "Pumpkin", emoji: "🎃", color: "#E65100", bg: "rgba(230,81,0,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Kaddu / kumhda" },
  "शिमला मिर्च ": { id: "capsicum", name: "Capsicum", emoji: "🫑", color: "#F44336", bg: "rgba(244,67,54,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Shimla mirch" },
  "नींबू": { id: "lemon", name: "Lemon", emoji: "🍋", color: "#FDD835", bg: "rgba(253,216,53,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Nimbu — saal bhar" },
  "कुंदरू": { id: "kundru", name: "Ivy Gourd", emoji: "🥒", color: "#4CAF50", bg: "rgba(76,175,80,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Kundru / tindora" },
  "मूंग": { id: "moong", name: "Moong", emoji: "🟢", color: "#8BC34A", bg: "rgba(139,195,74,0.12)", region: "Plains", msp: 8682, season: "kharif", sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10], peakMonths: [10,11], desc: "Kharif dalhan" },
  "उड़द": { id: "urad", name: "Urad", emoji: "⚫", color: "#37474F", bg: "rgba(55,71,79,0.12)", region: "Plains", msp: 6950, season: "kharif", sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10], peakMonths: [10,11], desc: "Kharif dalhan — urad daal" },
  "मूँगफली": { id: "groundnut", name: "Groundnut", emoji: "🥜", color: "#A1887F", bg: "rgba(161,136,127,0.12)", region: "Plains", msp: 6377, season: "kharif", sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Kharif tilhan" },
  "तिल": { id: "sesame", name: "Sesame", emoji: "🌰", color: "#8D6E63", bg: "rgba(141,110,99,0.12)", region: "Plains", msp: 7830, season: "kharif", sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Til — tilhan fasal" },
  "धनिया": { id: "coriander", name: "Coriander", emoji: "🌿", color: "#689F38", bg: "rgba(104,159,56,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Masala fasal" },
  "हल्दी": { id: "turmeric", name: "Turmeric", emoji: "🟡", color: "#F9A825", bg: "rgba(249,168,37,0.12)", region: "Bastar", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Masala — haldi" },
  "मिर्च": { id: "chilli", name: "Chilli", emoji: "🌶️", color: "#D32F2F", bg: "rgba(211,47,47,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Lal mirch" },
  "लहसून": { id: "garlic", name: "Garlic", emoji: "🧄", color: "#F5F5F5", bg: "rgba(245,245,245,0.08)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Lahsun — masala sabzi" },
  "इमली": { id: "tamarind", name: "Tamarind", emoji: "🌰", color: "#6D4C41", bg: "rgba(109,76,65,0.12)", region: "Bastar", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [1,2,3], desc: "Van upaj — imli" },
  "फूल गोभी": { id: "cauliflower", name: "Cauliflower", emoji: "🥦", color: "#E8F5E9", bg: "rgba(232,245,233,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Sardi ki sabzi" },
  "सेम बरबटी": { id: "cowpea", name: "Cowpea/Barbati", emoji: "🫘", color: "#558B2F", bg: "rgba(85,139,47,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Sem barbati" },
  "चवली (लाल)": { id: "redcowpea", name: "Red Cowpea", emoji: "🔴", color: "#C62828", bg: "rgba(198,40,40,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Lal chawli" },
  "चवली ": { id: "redcowpea", name: "Red Cowpea", emoji: "🔴", color: "#C62828", bg: "rgba(198,40,40,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Chawli" },
  "पालक भाजी": { id: "spinach", name: "Spinach", emoji: "🥬", color: "#1B5E20", bg: "rgba(27,94,32,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Palak bhaji" },
  "गाजर": { id: "carrot", name: "Carrot", emoji: "🥕", color: "#E65100", bg: "rgba(230,81,0,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Gajar — sardi ki sabzi" },
  "मूली": { id: "radish", name: "Radish", emoji: "🥕", color: "#F8BBD0", bg: "rgba(248,187,208,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Mooli" },
  "तिवड़ा": { id: "tivda", name: "Tivda/Lathyrus", emoji: "🫘", color: "#5D4037", bg: "rgba(93,64,55,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Tivda daal" },
  "केला": { id: "banana", name: "Banana", emoji: "🍌", color: "#FFD600", bg: "rgba(255,214,0,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Kela — saal bhar" },
  "गंवार फली": { id: "clusterbean", name: "Cluster Bean", emoji: "🫛", color: "#33691E", bg: "rgba(51,105,30,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Gawar phali" },
  "चुकंदर": { id: "beetroot", name: "Beetroot", emoji: "🟣", color: "#880E4F", bg: "rgba(136,14,79,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Chukandar" },
  "हरी मिर्च ": { id: "greenchilli", name: "Green Chilli", emoji: "🌶️", color: "#2E7D32", bg: "rgba(46,125,50,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Hari mirch" },
  "अन्य हरी एवं ताजी सब्जियाँ": { id: "otherveg", name: "Other Vegetables", emoji: "🥗", color: "#4CAF50", bg: "rgba(76,175,80,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Anya sabziyaan" },
  "अनार": { id: "pomegranate", name: "Pomegranate", emoji: "🍎", color: "#B71C1C", bg: "rgba(183,28,28,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Anaar" },
  "मटर": { id: "peas", name: "Peas", emoji: "🟢", color: "#4CAF50", bg: "rgba(76,175,80,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Matar — sardi ki sabzi" },
  "तुरई": { id: "ridgegourd", name: "Ridge Gourd", emoji: "🥒", color: "#558B2F", bg: "rgba(85,139,47,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Turai" },
  "परवल": { id: "parwal", name: "Pointed Gourd", emoji: "🥒", color: "#689F38", bg: "rgba(104,159,56,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Parwal" },
  "अरबी": { id: "colocasia", name: "Colocasia/Arbi", emoji: "🥔", color: "#5D4037", bg: "rgba(93,64,55,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Arbi" },
  "सावां": { id: "barnyard", name: "Barnyard Millet", emoji: "🌾", color: "#A1887F", bg: "rgba(161,136,127,0.12)", region: "Northern Hills", msp: null, season: "kharif", sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Sawan — mota anaj" },
  "मूंग/उड़द": { id: "moong-urad", name: "Moong/Urad", emoji: "🫘", color: "#7CB342", bg: "rgba(124,179,66,0.12)", region: "Plains", msp: 8682, season: "kharif", sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10], peakMonths: [10,11], desc: "Moong aur urad" },
  "ज्वार": { id: "jowar", name: "Jowar/Sorghum", emoji: "🌾", color: "#8D6E63", bg: "rgba(141,110,99,0.12)", region: "Plains", msp: 3180, season: "kharif", sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Jowar — mota anaj" },
  "संतरा": { id: "orange", name: "Orange", emoji: "🍊", color: "#E65100", bg: "rgba(230,81,0,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Santra" },
  "आम": { id: "mango", name: "Mango", emoji: "🥭", color: "#FF8F00", bg: "rgba(255,143,0,0.12)", region: "Plains", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [4,5,6], desc: "Aam — phalon ka raja" },
  "चिरौंजी": { id: "chironji", name: "Chironji", emoji: "🌰", color: "#795548", bg: "rgba(121,85,72,0.12)", region: "Bastar", msp: null, season: "zaid", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [3,4,5], desc: "Van upaj — chironji" },
  "रागी": { id: "ragi", name: "Finger Millet", emoji: "🌾", color: "#6D4C41", bg: "rgba(109,76,65,0.12)", region: "Bastar", msp: 3846, season: "kharif", sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Ragi — mandua" },
  "घोल भाजी": { id: "gholbhaji", name: "Ghol Bhaji", emoji: "🥬", color: "#2E7D32", bg: "rgba(46,125,50,0.12)", region: "Plains", msp: null, season: "kharif", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Ghol bhaji — local saag" },
  "मैथी": { id: "fenugreek", name: "Fenugreek", emoji: "🌿", color: "#558B2F", bg: "rgba(85,139,47,0.12)", region: "Plains", msp: null, season: "rabi", sowingMonths: [], growingMonths: [], harvestMonths: [], peakMonths: [], desc: "Methi bhaji" },
  "सूरजमुखी": { id: "sunflower", name: "Sunflower", emoji: "🌻", color: "#F9A825", bg: "rgba(249,168,37,0.12)", region: "Plains", msp: 5650, season: "kharif", sowingMonths: [6,7], growingMonths: [8,9,10], harvestMonths: [11,0], peakMonths: [0,1], desc: "Surajmukhi — tilhan" },
};

// Normalize Hindi Unicode (NFC form) for consistent matching
function normalizeHindi(str) {
  return str ? str.normalize('NFC').trim() : '';
}

// Build a normalized lookup from DISTRICT_MAP
const DISTRICT_MAP_NORMALIZED = {};
for (const [key, val] of Object.entries(DISTRICT_MAP)) {
  DISTRICT_MAP_NORMALIZED[normalizeHindi(key)] = val;
}

// Build a normalized lookup from CROP_META
const CROP_META_NORMALIZED = {};
for (const [key, val] of Object.entries(CROP_META)) {
  CROP_META_NORMALIZED[normalizeHindi(key)] = val;
}

// Extract crop category from raw string: "धान(I.R. 64)" → "धान"
function getCropCategory(raw) {
  if (!raw) return null;
  const match = raw.match(/^(.+?)\(/);
  return match ? match[1].trim() : raw.trim();
}

// Extract variety: "धान(I.R. 64)" → "I.R. 64"
function getVariety(raw) {
  if (!raw) return '';
  const match = raw.match(/\((.+)\)/);
  return match ? match[1].trim() : 'Local';
}

// Parse date "10/03/2026" → { month: "2026-03", day, year, monthIdx }
function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length < 3) return null;
  const [d, m, y] = parts;
  return {
    day: parseInt(d),
    month: `${y}-${m.padStart(2, '0')}`,
    year: parseInt(y),
    monthIdx: parseInt(m) - 1 // 0-based
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

console.log('=== MandiJi Data Aggregation ===\n');

// Load raw records
console.log('Loading raw records...');
const raw = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
console.log(`Loaded ${raw.length} records\n`);

// Create output dirs
if (!fs.existsSync(CROP_PRICES_DIR)) fs.mkdirSync(CROP_PRICES_DIR, { recursive: true });

// ─── Pass 1: Collect unique mappings & stats ──────────────────────────────────
const cropCategoryStats = {}; // "धान" → { records, volume, priceSum, priceCount, varieties, districts, mandis, monthlyPrices, monthlyVolumes }
const districtStats = {};     // districtId → { records, volume, crops, mandis, monthly }
const mandiMap = {};          // "रायपुर" → { districtHi, count }
const monthlyRecords = {};    // "2025-03" → count
let unmappedDistricts = new Set();
let unmappedCropCategories = new Set();

for (const r of raw) {
  // Skip empty records
  if (!r.district && !r.crop) continue;

  const cropCat = getCropCategory(r.crop);
  if (!cropCat) continue;

  const variety = getVariety(r.crop);
  const distId = DISTRICT_MAP_NORMALIZED[normalizeHindi(r.district)];
  const date = parseDate(r.arrival_date);
  if (!date) continue;

  if (distId === undefined) {
    unmappedDistricts.add(r.district);
    continue;
  }
  if (distId === null) continue; // empty district

  // Track mandi → district
  if (r.mandi && !mandiMap[r.mandi]) {
    mandiMap[r.mandi] = { districtHi: r.district, districtId: distId, count: 0, volume: 0, crops: {} };
  }
  if (r.mandi && mandiMap[r.mandi]) {
    mandiMap[r.mandi].count++;
    mandiMap[r.mandi].volume += r.arrival_qty;
    mandiMap[r.mandi].crops[cropCat] = (mandiMap[r.mandi].crops[cropCat] || 0) + 1;
  }

  // Crop category stats
  if (!cropCategoryStats[cropCat]) {
    cropCategoryStats[cropCat] = {
      records: 0, volume: 0, priceSum: 0, priceCount: 0,
      varieties: new Set(), districts: new Set(), mandis: new Set(),
      monthlyPrices: {}, monthlyVolumes: {}
    };
  }
  const cs = cropCategoryStats[cropCat];
  cs.records++;
  cs.volume += r.arrival_qty;
  if (variety) cs.varieties.add(variety);
  cs.districts.add(distId);
  if (r.mandi) cs.mandis.add(r.mandi);

  // Price aggregation (skip zero prices)
  if (r.modal_price > 0) {
    cs.priceSum += r.modal_price;
    cs.priceCount++;
    if (!cs.monthlyPrices[date.month]) {
      cs.monthlyPrices[date.month] = { sum: 0, count: 0, min: Infinity, max: 0, volume: 0 };
    }
    const mp = cs.monthlyPrices[date.month];
    mp.sum += r.modal_price;
    mp.count++;
    mp.min = Math.min(mp.min, r.min_price > 0 ? r.min_price : r.modal_price);
    mp.max = Math.max(mp.max, r.max_price);
    mp.volume += r.arrival_qty;
  }
  if (!cs.monthlyVolumes[date.month]) cs.monthlyVolumes[date.month] = 0;
  cs.monthlyVolumes[date.month] += r.arrival_qty;

  // District stats
  if (!districtStats[distId]) {
    districtStats[distId] = { records: 0, volume: 0, crops: {}, mandis: new Set(), monthly: {} };
  }
  const ds = districtStats[distId];
  ds.records++;
  ds.volume += r.arrival_qty;
  ds.crops[cropCat] = (ds.crops[cropCat] || 0) + 1;
  if (r.mandi) ds.mandis.add(r.mandi);
  if (!ds.monthly[date.month]) ds.monthly[date.month] = 0;
  ds.monthly[date.month]++;

  // Monthly total
  monthlyRecords[date.month] = (monthlyRecords[date.month] || 0) + 1;
}

if (unmappedDistricts.size > 0) {
  console.log('⚠ Unmapped districts:', [...unmappedDistricts]);
}

// ─── Generate Output Files ────────────────────────────────────────────────────

// 1. CROPS.JSON — Top crop categories with real stats
console.log('\n--- Generating crops.json ---');
const sortedCrops = Object.entries(cropCategoryStats)
  .sort((a, b) => b[1].records - a[1].records);

const topCrops = [];
for (const [nameHi, stats] of sortedCrops) {
  const meta = CROP_META_NORMALIZED[normalizeHindi(nameHi)];
  if (!meta) {
    if (stats.records >= 100) unmappedCropCategories.add(`${nameHi} (${stats.records} records)`);
    continue;
  }

  const topDistricts = [...stats.districts]
    .map(id => EXISTING_DISTRICTS.find(d => d.id === id))
    .filter(Boolean)
    .slice(0, 5)
    .map(d => d.nameHi);

  topCrops.push({
    ...meta,
    nameHi,
    totalRecords: stats.records,
    totalVolume: stats.volume,
    avgPrice: stats.priceCount > 0 ? Math.round(stats.priceSum / stats.priceCount) : null,
    varieties: [...stats.varieties].slice(0, 15),
    topDistricts
  });
}

console.log(`  ${topCrops.length} crop categories (from ${sortedCrops.length} total)`);
if (unmappedCropCategories.size > 0) {
  console.log('  ⚠ Unmapped crop categories with 100+ records:', [...unmappedCropCategories].slice(0, 15));
}
fs.writeFileSync(path.join(OUTPUT, 'crops.json'), JSON.stringify(topCrops, null, 2));

// 2. MANDIS.JSON — Real mandis from scraped data
console.log('\n--- Generating mandis.json ---');
const mandis = [];
let mandiId = 1;
const sortedMandis = Object.entries(mandiMap).sort((a, b) => b[1].count - a[1].count);

for (const [nameHi, info] of sortedMandis) {
  if (!nameHi) continue;
  const topCropEntries = Object.entries(info.crops).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCropsIds = topCropEntries
    .map(([cat]) => CROP_META_NORMALIZED[normalizeHindi(cat)]?.id)
    .filter(Boolean);

  mandis.push({
    id: mandiId,
    name: nameHi, // keep Hindi as primary since we have no English mapping
    nameHi: nameHi,
    districtId: info.districtId,
    isMain: info.count > 500,
    totalRecords: info.count,
    totalVolume: info.volume,
    topCrops: topCropsIds
  });
  mandiId++;
}
console.log(`  ${mandis.length} mandis`);
fs.writeFileSync(path.join(OUTPUT, 'mandis.json'), JSON.stringify(mandis, null, 2));

// 3. DISTRICTS.JSON — Enhanced with real stats
console.log('\n--- Generating districts.json ---');
const districts = EXISTING_DISTRICTS.map(d => {
  const stats = districtStats[d.id];
  if (!stats) return d;

  const topCropEntries = Object.entries(stats.crops).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    ...d,
    totalRecords: stats.records,
    totalVolume: stats.volume,
    mandiCount: stats.mandis.size,
    topCrops: topCropEntries.map(([cat, count]) => ({
      nameHi: cat,
      id: CROP_META_NORMALIZED[normalizeHindi(cat)]?.id || cat,
      records: count
    }))
  };
});
fs.writeFileSync(path.join(OUTPUT, 'districts.json'), JSON.stringify(districts, null, 2));

// 4. HEATMAP.JSON — Real monthly transaction counts per mandi (normalized 1-10)
console.log('\n--- Generating heatmap.json ---');
const months = Object.keys(monthlyRecords).sort();
const heatmap = {};

// For top 20 mandis, compute monthly counts
const top20Mandis = sortedMandis.slice(0, 20);
// First collect raw monthly counts per mandi from raw data
const mandiMonthly = {};
for (const r of raw) {
  if (!r.mandi || !r.arrival_date) continue;
  const date = parseDate(r.arrival_date);
  if (!date) continue;
  if (!mandiMonthly[r.mandi]) mandiMonthly[r.mandi] = {};
  mandiMonthly[r.mandi][date.month] = (mandiMonthly[r.mandi][date.month] || 0) + 1;
}

// Aggregate into 12 calendar months (Jan=0 ... Dec=11), summing across years
const mandiCalendarMonthly = {};
for (const [name] of top20Mandis) {
  const mm = mandiMonthly[name] || {};
  const calMonths = new Array(12).fill(0);
  for (const [monthKey, count] of Object.entries(mm)) {
    const mIdx = parseInt(monthKey.split('-')[1]) - 1; // 0-based
    calMonths[mIdx] += count;
  }
  mandiCalendarMonthly[name] = calMonths;
}

// Find global max for normalization
let globalMax = 0;
for (const [name] of top20Mandis) {
  const vals = mandiCalendarMonthly[name] || [];
  for (const v of vals) globalMax = Math.max(globalMax, v);
}

for (const [name] of top20Mandis) {
  const vals = mandiCalendarMonthly[name] || new Array(12).fill(0);
  heatmap[name] = vals.map(v => {
    if (v === 0) return 0;
    return Math.max(1, Math.round((v / globalMax) * 10));
  });
}
fs.writeFileSync(path.join(OUTPUT, 'heatmap.json'), JSON.stringify(heatmap, null, 2));

// 5. CROP-PRICES/*.JSON — Per-crop monthly price history
console.log('\n--- Generating crop-prices/*.json ---');
let cropPriceCount = 0;

for (const crop of topCrops) {
  const stats = cropCategoryStats[crop.nameHi];
  if (!stats) continue;

  const history = months.map(m => {
    const mp = stats.monthlyPrices[m];
    const vol = stats.monthlyVolumes[m] || 0;
    if (!mp || mp.count === 0) {
      return { month: monthLabel(m), date: m, msp: crop.msp, market: null, volume: vol, minPrice: null, maxPrice: null, recordCount: 0 };
    }
    return {
      month: monthLabel(m),
      date: m,
      msp: crop.msp,
      market: Math.round(mp.sum / mp.count),
      volume: mp.volume,
      minPrice: mp.min === Infinity ? 0 : mp.min,
      maxPrice: mp.max,
      recordCount: mp.count
    };
  }).filter(h => h.volume > 0 || h.recordCount > 0);

  // District breakdown
  const distBreakdown = [];
  for (const distId of stats.districts) {
    const ds = districtStats[distId];
    if (!ds) continue;
    const cropRecordsInDist = ds.crops[crop.nameHi] || 0;
    if (cropRecordsInDist < 5) continue;
    const dist = EXISTING_DISTRICTS.find(d => d.id === distId);
    distBreakdown.push({
      districtId: distId,
      name: dist?.name || `District ${distId}`,
      nameHi: dist?.nameHi || '',
      records: cropRecordsInDist
    });
  }
  distBreakdown.sort((a, b) => b.records - a.records);

  const cropFile = {
    crop: { id: crop.id, name: crop.name, nameHi: crop.nameHi, emoji: crop.emoji, msp: crop.msp, color: crop.color },
    history,
    districtBreakdown: distBreakdown.slice(0, 10)
  };

  fs.writeFileSync(path.join(CROP_PRICES_DIR, `${crop.id}.json`), JSON.stringify(cropFile, null, 2));
  cropPriceCount++;
}
console.log(`  ${cropPriceCount} crop price files`);

// 6. DASHBOARD-STATS.JSON
console.log('\n--- Generating dashboard-stats.json ---');
const dashStats = {
  totalRecords: raw.length,
  totalMandis: mandis.length,
  totalDistricts: Object.keys(districtStats).length,
  totalCrops: Object.keys(cropCategoryStats).length,
  cropCategories: topCrops.length,
  dateRange: { from: months[0], to: months[months.length - 1] },
  lastUpdated: months[months.length - 1],
  topCropByVolume: topCrops[0]?.id || 'paddy',
  topDistrictByRecords: 'दुर्ग',
  monthlyTrend: months.map(m => ({ month: m, label: monthLabel(m), records: monthlyRecords[m] || 0 })),
  months: months
};
fs.writeFileSync(path.join(OUTPUT, 'dashboard-stats.json'), JSON.stringify(dashStats, null, 2));

// 7. DISTRICT-STATS.JSON
console.log('\n--- Generating district-stats.json ---');
const distStatsOut = {};
for (const [id, stats] of Object.entries(districtStats)) {
  const topCropEntries = Object.entries(stats.crops)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, count]) => ({
      nameHi: cat,
      id: CROP_META_NORMALIZED[normalizeHindi(cat)]?.id || null,
      emoji: CROP_META_NORMALIZED[normalizeHindi(cat)]?.emoji || '📦',
      records: count
    }));

  distStatsOut[id] = {
    totalRecords: stats.records,
    totalVolume: stats.volume,
    mandiCount: stats.mandis.size,
    topCrops: topCropEntries,
    monthlyActivity: months.map(m => stats.monthly[m] || 0)
  };
}
fs.writeFileSync(path.join(OUTPUT, 'district-stats.json'), JSON.stringify(distStatsOut, null, 2));

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n=== AGGREGATION COMPLETE ===');
console.log(`Input: ${raw.length} records`);
console.log(`Output files:`);
const files = ['crops.json', 'mandis.json', 'districts.json', 'heatmap.json', 'dashboard-stats.json', 'district-stats.json'];
for (const f of files) {
  const size = fs.statSync(path.join(OUTPUT, f)).size;
  console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB`);
}
// Crop prices
const cpFiles = fs.readdirSync(CROP_PRICES_DIR);
let cpTotal = 0;
for (const f of cpFiles) cpTotal += fs.statSync(path.join(CROP_PRICES_DIR, f)).size;
console.log(`  crop-prices/: ${cpFiles.length} files, ${(cpTotal / 1024).toFixed(1)} KB total`);


// ─── Helper ───────────────────────────────────────────────────────────────────
function monthLabel(dateKey) {
  const [y, m] = dateKey.split('-');
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return labels[parseInt(m) - 1] || m;
}
