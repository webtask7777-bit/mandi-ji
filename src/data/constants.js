export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const REGION_COLORS = {
  Plains: "#4CAF50",
  Bastar: "#8D6E63",
  "Northern Hills": "#26A69A",
};

export const SEASON_COLORS = {
  kharif: "#4CAF50",
  rabi: "#2196F3",
  zaid: "#FF9800",
};

export const PHASE_COLORS = {
  "Buvai": "#8D6E63",
  "Ugna": "#4CAF50",
  "Katai": "#FF8C00",
  "Peak Arrival": "#FFD700",
};

// Fallback data used when API is loading
// Shown only while the catalogue loads or if it fails: current crop IDs, no MSP (the live
// catalogue carries the sourced MSP), no slogans. Months are 0-based (0 = January).
export const FALLBACK_CROPS = [
  { id: "paddycommon", name: "Paddy(Common)", nameHi: "धान", emoji: "🌾", color: "#4CAF50", bg: "rgba(76,175,80,0.12)", sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0,1] },
  { id: "maize", name: "Maize", nameHi: "मक्का", emoji: "🌽", color: "#FFB300", bg: "rgba(255,179,0,0.12)", sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [8,9], peakMonths: [9,10] },
  { id: "bengal-gramgramwhole", name: "Bengal Gram(Gram)(Whole)", nameHi: "चना", emoji: "🫘", color: "#8D6E63", bg: "rgba(141,110,99,0.12)", sowingMonths: [9,10], growingMonths: [11,0], harvestMonths: [1,2], peakMonths: [2,3] },
  { id: "soyabean", name: "Soyabean", nameHi: "सोयाबीन", emoji: "🟤", color: "#66BB6A", bg: "rgba(102,187,106,0.12)", sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [9], peakMonths: [9,10] },
  { id: "wheat", name: "Wheat", nameHi: "गेहूँ", emoji: "🌿", color: "#FFA726", bg: "rgba(255,167,38,0.12)", sowingMonths: [10,11], growingMonths: [0,1], harvestMonths: [2,3], peakMonths: [3,4] },
];

export const FALLBACK_SEASONS = [
  { id: "kharif", name: "Kharif", nameHi: "खरीफ", months: [5,6,7,8,9,10,11], color: "#4CAF50", icon: "☀️", desc: "जून–दिसंबर" },
  { id: "rabi", name: "Rabi", nameHi: "रबी", months: [9,10,11,0,1,2,3], color: "#2196F3", icon: "❄️", desc: "अक्टूबर–अप्रैल" },
  { id: "zaid", name: "Zaid", nameHi: "ज़ायद", months: [2,3,4,5], color: "#FF9800", icon: "🌤️", desc: "मार्च–जून" },
];

// Chhattisgarh's three agro-climatic zones (ICAR): names and districts in Hindi.
export const FALLBACK_REGIONS = [
  { name: "छत्तीसगढ़ के मैदान", color: "#4CAF50", crops: ["धान", "गेहूँ", "चना"], districts: "रायपुर, दुर्ग, राजनांदगांव, महासमुंद, बिलासपुर" },
  { name: "बस्तर पठार", color: "#8D6E63", crops: ["धान", "मक्का", "कोदो-कुटकी"], districts: "बस्तर, कोंडागांव, कांकेर, नारायणपुर, दंतेवाड़ा" },
  { name: "उत्तरी पहाड़ी क्षेत्र", color: "#26A69A", crops: ["धान", "मक्का", "रामतिल"], districts: "सरगुजा, जशपुर, कोरिया, बलरामपुर, सूरजपुर" },
]
