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
export const FALLBACK_CROPS = [
  { id: "paddy", name: "Paddy", nameHi: "धान", emoji: "🌾", region: "Plains", color: "#4CAF50", bg: "rgba(76,175,80,0.12)", msp: 2183, sowingMonths: [5,6], growingMonths: [7,8,9], harvestMonths: [10,11], peakMonths: [11,0,1], desc: "Chhattisgarh ka mukhya fasal" },
  { id: "maize", name: "Maize", nameHi: "मक्का", emoji: "🌽", region: "Plains", color: "#FFB300", bg: "rgba(255,179,0,0.12)", msp: 1870, sowingMonths: [6,7], growingMonths: [8,9], harvestMonths: [10,11], peakMonths: [11,0], desc: "Kharif ki doosri badi fasal" },
  { id: "gram", name: "Gram", nameHi: "चना", emoji: "🫘", region: "Northern Hills", color: "#8D6E63", bg: "rgba(141,110,99,0.12)", msp: 5440, sowingMonths: [9,10], growingMonths: [11,0], harvestMonths: [2,3], peakMonths: [3,4], desc: "Rabi season ki pehchan" },
  { id: "soybean", name: "Soyabean", nameHi: "सोयाबीन", emoji: "🟤", region: "Bastar", color: "#66BB6A", bg: "rgba(102,187,106,0.12)", msp: 4600, sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [9,10], peakMonths: [10,11], desc: "Bastar ki nayee pehchan" },
  { id: "wheat", name: "Wheat", nameHi: "गेहूँ", emoji: "🌿", region: "Plains", color: "#FFA726", bg: "rgba(255,167,38,0.12)", msp: 2275, sowingMonths: [10,11], growingMonths: [0,1], harvestMonths: [3,4], peakMonths: [4,5], desc: "Rabi ki safe bet" },
  { id: "millets", name: "Millets", nameHi: "कोदो-कुटकी", emoji: "🌱", region: "Bastar", color: "#26A69A", bg: "rgba(38,166,154,0.12)", msp: 3578, sowingMonths: [5,6], growingMonths: [7,8], harvestMonths: [9,10], peakMonths: [10,11], desc: "Tribal superfood" },
];

export const FALLBACK_SEASONS = [
  { id: "kharif", name: "Kharif", nameHi: "खरीफ", months: [5,6,7,8,9,10,11], color: "#4CAF50", icon: "☀️", desc: "June–December" },
  { id: "rabi", name: "Rabi", nameHi: "रबी", months: [9,10,11,0,1,2,3], color: "#2196F3", icon: "❄️", desc: "October–April" },
  { id: "zaid", name: "Zaid", nameHi: "ज़ायद", months: [3,4,5], color: "#FF9800", icon: "🌤️", desc: "March–June" },
];

export const FALLBACK_REGIONS = [
  { name: "Maidan (Plains)", color: "#4CAF50", crops: ["Paddy","Wheat","Maize"], districts: "Raipur, Durg, Rajnandgaon, Mahasamund" },
  { name: "Bastar Plateau", color: "#8D6E63", crops: ["Millets","Soyabean","Paddy"], districts: "Jagdalpur, Kondagaon, Kanker, Narayanpur" },
  { name: "Northern Hills", color: "#26A69A", crops: ["Gram","Wheat","Maize"], districts: "Ambikapur, Raigarh, Korba, Korea" },
];
