/**
 * Source spellings shared by the mandi aggregators: states, their aliases and codes,
 * commodity aliases, non-quintal commodities, the dry-commodity price floor and district aliases.
 */

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
  'Cardamom': 'Cardamoms',
  'Ladies Finger': 'Bhindi(Ladies Finger)',
  'Sunflower Seed': 'Sunflower/Sunflower Seed',
  // Regional names the source also files separately (data.gov.in variety-wise resource).
  'Sajje': 'Bajra(Pearl Millet/Cumbu)',
  'Gurellu': 'Niger Seed(Ramtil)',
  'Marasebu': 'Pear(Marasebu)',
  'Antawala': 'Soapnut(Antawala/Retha)',
  'Thinai(Italian Millet)': 'Foxtail Millet(Navane)',
  'Hippe Seed': 'Mahua Seed(Hippe seed)',
};

// Commodities the source reports per piece, bunch, nut or animal (betelnut ₹4, lotus ₹8,
// flowers ₹20–₹250, sheep and goats per head) or in another small unit (saffron ₹65,000,
// a fraction of its per-kg price): a per-quintal page would be false, so they are not published.
// Commodities whose other-unit series sit closer than 10x to the per-quintal price:
// coconut per 1000 nuts (Karnataka, Andhra ₹15,000–24,000) vs per quintal (Tamil Nadu, Kerala ~₹5,500).
const UNIT_RATIO_OVERRIDES = { Coconut: 2.5 };

const NON_QUINTAL_COMMODITIES = new Set([
  'Betelnuts', 'Lotus', 'Chrysanthemum', 'Jarbara', 'Anthorium', 'Tube Rose(Single)',
  'Tube Rose(Double)', 'BOP', 'Carnation', 'Orchid', 'Ram', 'Sheep', 'She Goat', 'Saffron',
]);

// Dry grains, pulses, oilseeds and dried produce never trade below ₹1,000 a quintal (₹10/kg); a modal
// price under that (white peas ₹200–500 in a few Chhattisgarh mandis while Gujarat reports
// ₹3,000–4,500) is a per-kg or typing error. Fresh forms (green peas, peas wet/cod) are
// vegetables and keep their own range.
const DRY_COMMODITY = /\b(white peas|peas\(dry\)|gram|arhar|tur|moong|urd|masur|lentil|wheat|paddy|maize|jowar|bajra|ragi|soyabean|mustard|groundnut|sesamum|kabuli|chana|barley|hippe seed|mahua seed|myrobolan)\b/i;
const FRESH_FORM = /green peas|peas wet|peas cod|green chilli|gram raw|green gram leaves|chana sag|groundnut pods \(raw\)/i;
const DRY_FLOOR = 1000;
const belowDryFloor = r => r.modal_price > 0 && r.modal_price < DRY_FLOOR && DRY_COMMODITY.test(r.commodity) && !FRESH_FORM.test(r.commodity);

// The source spells some districts two ways (old and current names, transliterations).
// One current official name per district, so a mandi and its district are not counted twice.
const DISTRICT_ALIASES = {
  Karnataka: {
    Belgaum: 'Belagavi', Bijapur: 'Vijayapura', Chamrajnagar: 'Chamarajanagar', Chikmagalur: 'Chikkamagaluru',
    Kalburgi: 'Kalaburagi', Gulbarga: 'Kalaburagi', Mysore: 'Mysuru', Tumkur: 'Tumakuru', Yadgiri: 'Yadgir',
  },
  Maharashtra: { Ahmednagar: 'Ahilyanagar', Jalana: 'Jalna', Sholapur: 'Solapur', Vashim: 'Washim' },
  'Tamil Nadu': {
    Chengalpet: 'Chengalpattu', Kallakuruchi: 'Kallakurichi', Sivagangai: 'Sivaganga', Thenkasi: 'Tenkasi',
    Thiruvallur: 'Tiruvallur', Thiruvellore: 'Tiruvallur', Thiruvarur: 'Tiruvarur', Tuticorin: 'Thoothukudi',
  },
  Telangana: { Hanmakonda: 'Hanumakonda' },
};

module.exports = { UNIT_RATIO_OVERRIDES, STATES, STATE_CODES, STATE_ALIASES, COMMODITY_ALIASES, NON_QUINTAL_COMMODITIES, DRY_COMMODITY, FRESH_FORM, DRY_FLOOR, belowDryFloor, DISTRICT_ALIASES };
