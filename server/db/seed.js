import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

// ─── DISTRICTS (33) ──────────────────────────────────────────────────────────
const districts = [
  // Plains (Maidan)
  { id: 1, name: "Raipur", nameHi: "रायपुर", region: "Plains", lat: 21.25, lng: 81.63 },
  { id: 2, name: "Durg", nameHi: "दुर्ग", region: "Plains", lat: 21.19, lng: 81.28 },
  { id: 3, name: "Rajnandgaon", nameHi: "राजनांदगांव", region: "Plains", lat: 21.10, lng: 81.03 },
  { id: 4, name: "Mahasamund", nameHi: "महासमुंद", region: "Plains", lat: 21.11, lng: 82.10 },
  { id: 5, name: "Dhamtari", nameHi: "धमतरी", region: "Plains", lat: 20.71, lng: 81.55 },
  { id: 6, name: "Bilaspur", nameHi: "बिलासपुर", region: "Plains", lat: 22.09, lng: 82.15 },
  { id: 7, name: "Janjgir-Champa", nameHi: "जांजगीर-चांपा", region: "Plains", lat: 22.01, lng: 82.58 },
  { id: 8, name: "Korba", nameHi: "कोरबा", region: "Plains", lat: 22.35, lng: 82.68 },
  { id: 9, name: "Raigarh", nameHi: "रायगढ़", region: "Plains", lat: 21.90, lng: 83.40 },
  { id: 10, name: "Mungeli", nameHi: "मुंगेली", region: "Plains", lat: 22.07, lng: 81.68 },
  { id: 11, name: "Balod", nameHi: "बालोद", region: "Plains", lat: 20.73, lng: 81.20 },
  { id: 12, name: "Bemetara", nameHi: "बेमेतरा", region: "Plains", lat: 21.72, lng: 81.53 },
  { id: 13, name: "Gariaband", nameHi: "गरियाबंद", region: "Plains", lat: 20.63, lng: 82.06 },
  { id: 14, name: "Baloda Bazar", nameHi: "बलौदा बाज़ार", region: "Plains", lat: 21.66, lng: 82.16 },
  { id: 15, name: "Kabirdham", nameHi: "कबीरधाम", region: "Plains", lat: 22.10, lng: 81.25 },
  { id: 16, name: "Sarangarh-Bilaigarh", nameHi: "सारंगढ़-बिलाईगढ़", region: "Plains", lat: 21.59, lng: 83.08 },
  { id: 17, name: "Khairagarh-Gandai", nameHi: "खैरागढ़-गंडई", region: "Plains", lat: 21.42, lng: 80.98 },
  { id: 18, name: "Mohla-Manpur", nameHi: "मोहला-मानपुर", region: "Plains", lat: 20.88, lng: 80.68 },
  { id: 19, name: "Shakti", nameHi: "शक्ति", region: "Plains", lat: 22.18, lng: 82.98 },
  { id: 20, name: "Manendragarh", nameHi: "मनेन्द्रगढ़", region: "Plains", lat: 23.20, lng: 82.22 },
  // Bastar Plateau
  { id: 21, name: "Bastar", nameHi: "बस्तर", region: "Bastar", lat: 19.10, lng: 81.95 },
  { id: 22, name: "Kondagaon", nameHi: "कोंडागांव", region: "Bastar", lat: 19.60, lng: 81.66 },
  { id: 23, name: "Kanker", nameHi: "कांकेर", region: "Bastar", lat: 20.27, lng: 81.49 },
  { id: 24, name: "Narayanpur", nameHi: "नारायणपुर", region: "Bastar", lat: 19.73, lng: 81.10 },
  { id: 25, name: "Dantewada", nameHi: "दंतेवाड़ा", region: "Bastar", lat: 18.90, lng: 81.35 },
  { id: 26, name: "Bijapur", nameHi: "बीजापुर", region: "Bastar", lat: 18.84, lng: 80.77 },
  { id: 27, name: "Sukma", nameHi: "सुकमा", region: "Bastar", lat: 18.39, lng: 81.66 },
  // Northern Hills
  { id: 28, name: "Surguja", nameHi: "सरगुजा", region: "Northern Hills", lat: 23.12, lng: 83.09 },
  { id: 29, name: "Korea", nameHi: "कोरिया", region: "Northern Hills", lat: 23.42, lng: 82.58 },
  { id: 30, name: "Jashpur", nameHi: "जशपुर", region: "Northern Hills", lat: 22.89, lng: 84.14 },
  { id: 31, name: "Surajpur", nameHi: "सूरजपुर", region: "Northern Hills", lat: 23.22, lng: 83.62 },
  { id: 32, name: "Balrampur", nameHi: "बलरामपुर", region: "Northern Hills", lat: 23.63, lng: 83.39 },
  { id: 33, name: "Gaurela-Pendra-Marwahi", nameHi: "गौरेला-पेंड्रा-मरवाही", region: "Northern Hills", lat: 22.74, lng: 81.96 },
];

// ─── MANDIS (69 main + sub-yards) ───────────────────────────────────────────
const mandis = [
  // Raipur district
  { id: 1, name: "Raipur", nameHi: "रायपुर", districtId: 1, isMain: true },
  { id: 2, name: "Arang", nameHi: "आरंग", districtId: 1, isMain: false },
  { id: 3, name: "Abhanpur", nameHi: "अभनपुर", districtId: 1, isMain: false },
  // Durg
  { id: 4, name: "Durg", nameHi: "दुर्ग", districtId: 2, isMain: true },
  { id: 5, name: "Bhilai", nameHi: "भिलाई", districtId: 2, isMain: false },
  // Rajnandgaon
  { id: 6, name: "Rajnandgaon", nameHi: "राजनांदगांव", districtId: 3, isMain: true },
  { id: 7, name: "Dongargarh", nameHi: "डोंगरगढ़", districtId: 3, isMain: false },
  // Mahasamund
  { id: 8, name: "Mahasamund", nameHi: "महासमुंद", districtId: 4, isMain: true },
  { id: 9, name: "Pithora", nameHi: "पिथौरा", districtId: 4, isMain: false },
  // Dhamtari
  { id: 10, name: "Dhamtari", nameHi: "धमतरी", districtId: 5, isMain: true },
  { id: 11, name: "Kurud", nameHi: "कुरुद", districtId: 5, isMain: false },
  // Bilaspur
  { id: 12, name: "Bilaspur", nameHi: "बिलासपुर", districtId: 6, isMain: true },
  { id: 13, name: "Takhatpur", nameHi: "तखतपुर", districtId: 6, isMain: false },
  // Janjgir-Champa
  { id: 14, name: "Janjgir", nameHi: "जांजगीर", districtId: 7, isMain: true },
  { id: 15, name: "Champa", nameHi: "चांपा", districtId: 7, isMain: false },
  { id: 16, name: "Naila", nameHi: "नैला", districtId: 7, isMain: false },
  // Korba
  { id: 17, name: "Korba", nameHi: "कोरबा", districtId: 8, isMain: true },
  { id: 18, name: "Katghora", nameHi: "कटघोरा", districtId: 8, isMain: false },
  // Raigarh
  { id: 19, name: "Raigarh", nameHi: "रायगढ़", districtId: 9, isMain: true },
  { id: 20, name: "Dharamjaigarh", nameHi: "धरमजयगढ़", districtId: 9, isMain: false },
  // Mungeli
  { id: 21, name: "Mungeli", nameHi: "मुंगेली", districtId: 10, isMain: true },
  // Balod
  { id: 22, name: "Balod", nameHi: "बालोद", districtId: 11, isMain: true },
  { id: 23, name: "Gunderdehi", nameHi: "गुंडरदेही", districtId: 11, isMain: false },
  // Bemetara
  { id: 24, name: "Bemetara", nameHi: "बेमेतरा", districtId: 12, isMain: true },
  { id: 25, name: "Saja", nameHi: "साजा", districtId: 12, isMain: false },
  // Gariaband
  { id: 26, name: "Gariaband", nameHi: "गरियाबंद", districtId: 13, isMain: true },
  // Baloda Bazar
  { id: 27, name: "Baloda Bazar", nameHi: "बलौदा बाज़ार", districtId: 14, isMain: true },
  { id: 28, name: "Bhatapara", nameHi: "भाटापारा", districtId: 14, isMain: true },
  // Kabirdham
  { id: 29, name: "Kawardha", nameHi: "कवर्धा", districtId: 15, isMain: true },
  // Sarangarh-Bilaigarh
  { id: 30, name: "Sarangarh", nameHi: "सारंगढ़", districtId: 16, isMain: true },
  // Khairagarh-Gandai
  { id: 31, name: "Khairagarh", nameHi: "खैरागढ़", districtId: 17, isMain: true },
  // Mohla-Manpur
  { id: 32, name: "Mohla", nameHi: "मोहला", districtId: 18, isMain: true },
  // Shakti
  { id: 33, name: "Shakti", nameHi: "शक्ति", districtId: 19, isMain: true },
  // Manendragarh
  { id: 34, name: "Manendragarh", nameHi: "मनेन्द्रगढ़", districtId: 20, isMain: true },
  // Bastar
  { id: 35, name: "Jagdalpur", nameHi: "जगदलपुर", districtId: 21, isMain: true },
  { id: 36, name: "Bastar", nameHi: "बस्तर", districtId: 21, isMain: false },
  // Kondagaon
  { id: 37, name: "Kondagaon", nameHi: "कोंडागांव", districtId: 22, isMain: true },
  // Kanker
  { id: 38, name: "Kanker", nameHi: "कांकेर", districtId: 23, isMain: true },
  { id: 39, name: "Antagarh", nameHi: "अंतागढ़", districtId: 23, isMain: false },
  // Narayanpur
  { id: 40, name: "Narayanpur", nameHi: "नारायणपुर", districtId: 24, isMain: true },
  // Dantewada
  { id: 41, name: "Dantewada", nameHi: "दंतेवाड़ा", districtId: 25, isMain: true },
  { id: 42, name: "Geedam", nameHi: "गीदम", districtId: 25, isMain: false },
  // Bijapur
  { id: 43, name: "Bijapur", nameHi: "बीजापुर", districtId: 26, isMain: true },
  // Sukma
  { id: 44, name: "Sukma", nameHi: "सुकमा", districtId: 27, isMain: true },
  // Surguja
  { id: 45, name: "Ambikapur", nameHi: "अम्बिकापुर", districtId: 28, isMain: true },
  { id: 46, name: "Lakhanpur", nameHi: "लखनपुर", districtId: 28, isMain: false },
  // Korea
  { id: 47, name: "Baikunthpur", nameHi: "बैकुंठपुर", districtId: 29, isMain: true },
  { id: 48, name: "Manendragarh-Korea", nameHi: "मनेन्द्रगढ़", districtId: 29, isMain: false },
  // Jashpur
  { id: 49, name: "Jashpur Nagar", nameHi: "जशपुर नगर", districtId: 30, isMain: true },
  { id: 50, name: "Kunkuri", nameHi: "कुनकुरी", districtId: 30, isMain: false },
  // Surajpur
  { id: 51, name: "Surajpur", nameHi: "सूरजपुर", districtId: 31, isMain: true },
  { id: 52, name: "Pratappur", nameHi: "प्रतापपुर", districtId: 31, isMain: false },
  // Balrampur
  { id: 53, name: "Balrampur", nameHi: "बलरामपुर", districtId: 32, isMain: true },
  { id: 54, name: "Ramanujganj", nameHi: "रामानुजगंज", districtId: 32, isMain: false },
  // Gaurela-Pendra-Marwahi
  { id: 55, name: "Gaurela", nameHi: "गौरेला", districtId: 33, isMain: true },
  { id: 56, name: "Pendra", nameHi: "पेंड्रा", districtId: 33, isMain: false },
  // Extra mandis to reach ~69
  { id: 57, name: "Tilda", nameHi: "तिल्दा", districtId: 1, isMain: false },
  { id: 58, name: "Simga", nameHi: "सिमगा", districtId: 12, isMain: false },
  { id: 59, name: "Patan", nameHi: "पाटन", districtId: 5, isMain: false },
  { id: 60, name: "Lormi", nameHi: "लोरमी", districtId: 10, isMain: false },
  { id: 61, name: "Akaltara", nameHi: "अकलतरा", districtId: 7, isMain: false },
  { id: 62, name: "Sakti", nameHi: "साक्ती", districtId: 7, isMain: false },
  { id: 63, name: "Pali", nameHi: "पाली", districtId: 8, isMain: false },
  { id: 64, name: "Lailunga", nameHi: "लैलूंगा", districtId: 9, isMain: false },
  { id: 65, name: "Kharsia", nameHi: "खरसिया", districtId: 9, isMain: false },
  { id: 66, name: "Pathalgaon", nameHi: "पत्थलगांव", districtId: 30, isMain: false },
  { id: 67, name: "Wadrafnagar", nameHi: "वाड्रफनगर", districtId: 32, isMain: false },
  { id: 68, name: "Mainpat", nameHi: "मैनपाट", districtId: 28, isMain: false },
  { id: 69, name: "Sitapur", nameHi: "सीतापुर", districtId: 28, isMain: false },
];

// ─── CROPS ───────────────────────────────────────────────────────────────────
const crops = [
  {
    id: "paddy", name: "Paddy", nameHi: "धान", emoji: "🌾",
    region: "Plains", color: "#4CAF50", bg: "rgba(76,175,80,0.12)",
    msp: 2183,
    sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0,1],
    desc: "Chhattisgarh ka mukhya fasal — 'Rice Bowl of India' ka dil"
  },
  {
    id: "maize", name: "Maize", nameHi: "मक्का", emoji: "🌽",
    region: "Plains", color: "#FFB300", bg: "rgba(255,179,0,0.12)",
    msp: 1870,
    sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10,11], peakMonths: [11,0],
    desc: "Kharif season ki doosri sabse badi fasal"
  },
  {
    id: "gram", name: "Gram", nameHi: "चना", emoji: "🫘",
    region: "Northern Hills", color: "#8D6E63", bg: "rgba(141,110,99,0.12)",
    msp: 5440,
    sowingMonths: [9,10], growingMonths: [11,0], harvestMonths: [2,3], peakMonths: [3,4],
    desc: "Rabi season mein Northern Hills ki pehchan"
  },
  {
    id: "soybean", name: "Soyabean", nameHi: "सोयाबीन", emoji: "🟤",
    region: "Bastar", color: "#66BB6A", bg: "rgba(102,187,106,0.12)",
    msp: 4600,
    sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [9,10], peakMonths: [10,11],
    desc: "Bastar Plateau ki nayee pehchan — export potential high"
  },
  {
    id: "wheat", name: "Wheat", nameHi: "गेहूँ", emoji: "🌿",
    region: "Plains", color: "#FFA726", bg: "rgba(255,167,38,0.12)",
    msp: 2275,
    sowingMonths: [10,11], growingMonths: [0,1], harvestMonths: [3,4], peakMonths: [4,5],
    desc: "Rabi ki safe bet — MSP assured procurement"
  },
  {
    id: "millets", name: "Millets", nameHi: "कोदो-कुटकी", emoji: "🌱",
    region: "Bastar", color: "#26A69A", bg: "rgba(38,166,154,0.12)",
    msp: 3578,
    sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [9,10], peakMonths: [10,11],
    desc: "Tribal economy ki aadhaarshila — nutritional superfood"
  },
];

// ─── SEASONS ─────────────────────────────────────────────────────────────────
const seasons = [
  { id: "kharif", name: "Kharif", nameHi: "खरीफ", months: [5,6,7,8,9,10,11], color: "#4CAF50", icon: "☀️", desc: "June–December" },
  { id: "rabi", name: "Rabi", nameHi: "रबी", months: [9,10,11,0,1,2,3], color: "#2196F3", icon: "❄️", desc: "October–April" },
  { id: "zaid", name: "Zaid", nameHi: "ज़ायद", months: [3,4,5], color: "#FF9800", icon: "🌤️", desc: "March–June" },
];

// ─── GENERATE PRICES ─────────────────────────────────────────────────────────
// Which crop regions map to which districts
const cropRegionMap = {
  paddy: ["Plains", "Bastar"],
  maize: ["Plains", "Northern Hills"],
  gram: ["Northern Hills", "Plains"],
  soybean: ["Bastar"],
  wheat: ["Plains", "Northern Hills"],
  millets: ["Bastar"],
};

function generatePrice(msp, month, peakMonths) {
  const isPeak = peakMonths.includes(month);
  const mult = isPeak ? 1.03 + Math.random() * 0.10 : 0.90 + Math.random() * 0.12;
  return Math.round(msp * mult);
}

const prices = [];
let priceId = 1;
const now = new Date(2026, 2, 11); // March 11 2026

for (const crop of crops) {
  const regions = cropRegionMap[crop.id];
  const cropMandis = mandis.filter(m => {
    const d = districts.find(dd => dd.id === m.districtId);
    return d && regions.includes(d.region);
  });

  // Generate 6 months of data
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - monthOffset);
    const month = date.getMonth();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;

    for (const mandi of cropMandis.slice(0, 15)) { // top 15 mandis per crop
      prices.push({
        id: priceId++,
        cropId: crop.id,
        mandiId: mandi.id,
        date: dateStr,
        marketPrice: generatePrice(crop.msp, month, crop.peakMonths),
        volume: Math.floor(Math.random() * 500) + 50,
      });
    }
  }
}

// ─── GENERATE WEATHER ────────────────────────────────────────────────────────
const advisories = {
  3: [ // March
    "Rabi fasal ki katai ka samay — gehu aur chana ki harvesting karein",
    "Zaid ki taiyari shuru karein — moong aur sunflower ki buvai ka plan banayein",
    "Garmi badh rahi hai — sinchai ka pura dhyan rakhein",
  ],
  2: [ // Feb
    "Rabi fasal pak rahi hai — keetnashak spray check karein",
    "Gehu mein last sinchai karein — dano mein bhari increase hoga",
    "Chana ki phali bhar rahi hai — pakshiyon se suraksha karein",
  ],
  1: [ // Jan
    "Thandi mein fasal ko pala se bachayein — dhuan karein",
    "Rabi fasal ki growth period — urea ki top dressing karein",
    "Gehu mein 2nd sinchai zaruri hai abhi",
  ],
  0: [ // Dec
    "Rabi fasal ki dekhbhal jaruri — kharpatwar hatayein",
    "Paddy ka MSP procurement window hai — mandi mein bechein",
    "Chane ki fasal mein pod borer ka dhyan rakhein",
  ],
  11: [ // Nov
    "Kharif fasal ki aamdani shuru — mandi mein dhan bechein",
    "Rabi buvai ka aakhri mauka — gehu zarur lagayein",
    "Mandi mein bheed hai — sahi samay par pahunchein",
  ],
  10: [ // Oct
    "Dhan ki katai shuru — combine harvester book karein",
    "Rabi buvai ki taiyari — khet ki jotai aur beej taiyar karein",
    "Soybean ki fasal pak gayi — jaldi kaat lein",
  ],
};

const conditions = ["sunny", "partly_cloudy", "cloudy", "rainy"];
const weather = [];
let weatherId = 1;

for (const district of districts) {
  // Generate 30 days of weather
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const month = date.getMonth();
    const dateStr = date.toISOString().split('T')[0];

    const isBastar = district.region === "Bastar";
    const isHills = district.region === "Northern Hills";

    // March temps (summer starting)
    const baseTempMax = isHills ? 30 : isBastar ? 34 : 36;
    const baseTempMin = isHills ? 14 : isBastar ? 18 : 20;

    const tempMax = baseTempMax + Math.floor(Math.random() * 5 - 2);
    const tempMin = baseTempMin + Math.floor(Math.random() * 4 - 2);
    const humidity = isBastar ? 55 + Math.floor(Math.random() * 20) : 35 + Math.floor(Math.random() * 25);
    const rainfall = Math.random() < 0.15 ? Math.round(Math.random() * 12) : 0;
    const condition = rainfall > 0 ? "rainy" : Math.random() < 0.3 ? "partly_cloudy" : "sunny";

    const monthAdvisories = advisories[month] || advisories[3];
    const advisory = monthAdvisories[Math.floor(Math.random() * monthAdvisories.length)];

    weather.push({
      id: weatherId++,
      districtId: district.id,
      date: dateStr,
      tempMax, tempMin, humidity, rainfall, condition, advisory,
    });
  }
}

// ─── GENERATE HEATMAP DATA ──────────────────────────────────────────────────
// Activity level per mandi per month (1-10)
const heatmap = {};
for (const mandi of mandis.filter(m => m.isMain)) {
  const district = districts.find(d => d.id === mandi.districtId);
  const isPlains = district?.region === "Plains";
  heatmap[mandi.name] = Array.from({ length: 12 }, (_, month) => {
    // Peak activity Oct-Dec for plains (paddy harvest)
    if (isPlains && [9,10,11].includes(month)) return 6 + Math.floor(Math.random() * 4);
    if (isPlains && [0,1,2].includes(month)) return 1 + Math.floor(Math.random() * 3);
    if ([6,7,8].includes(month)) return 3 + Math.floor(Math.random() * 3);
    return 1 + Math.floor(Math.random() * 3);
  });
}

// ─── WRITE DATA FILES ───────────────────────────────────────────────────────
const data = { districts, mandis, crops, seasons, prices, weather, heatmap };

for (const [key, value] of Object.entries(data)) {
  writeFileSync(path.join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  console.log(`  ✅ ${key}.json — ${Array.isArray(value) ? value.length + ' records' : Object.keys(value).length + ' entries'}`);
}

console.log('\n🌾 MandiJi database seeded successfully!');
console.log(`   📁 Data saved to: ${DATA_DIR}`);
