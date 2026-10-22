// Canonical state/UT identities shared with the national price dataset.
// Historical merged-UT IDs are accepted as aliases, not separate places.
export const INDIA_REGIONS = Object.freeze([
  {
    "id": "tamil-nadu",
    "name": "Tamil Nadu",
    "nameHi": "तमिल नाडु"
  },
  {
    "id": "kerala",
    "name": "Kerala",
    "nameHi": "केरल"
  },
  {
    "id": "chhattisgarh",
    "name": "Chhattisgarh",
    "nameHi": "छत्तीसगढ़"
  },
  {
    "id": "maharashtra",
    "name": "Maharashtra",
    "nameHi": "महाराष्ट्र"
  },
  {
    "id": "uttar-pradesh",
    "name": "Uttar Pradesh",
    "nameHi": "उत्तर प्रदेश"
  },
  {
    "id": "gujarat",
    "name": "Gujarat",
    "nameHi": "गुजरात"
  },
  {
    "id": "madhya-pradesh",
    "name": "Madhya Pradesh",
    "nameHi": "मध्य प्रदेश"
  },
  {
    "id": "punjab",
    "name": "Punjab",
    "nameHi": "पंजाब"
  },
  {
    "id": "haryana",
    "name": "Haryana",
    "nameHi": "हरियाणा"
  },
  {
    "id": "himachal-pradesh",
    "name": "Himachal Pradesh",
    "nameHi": "हिमाचल प्रदेश"
  },
  {
    "id": "karnataka",
    "name": "Karnataka",
    "nameHi": "कर्नाटक"
  },
  {
    "id": "rajasthan",
    "name": "Rajasthan",
    "nameHi": "राजस्थान"
  },
  {
    "id": "west-bengal",
    "name": "West Bengal",
    "nameHi": "पश्चिम बंगाल"
  },
  {
    "id": "odisha",
    "name": "Odisha",
    "nameHi": "ओडिशा"
  },
  {
    "id": "telangana",
    "name": "Telangana",
    "nameHi": "तेलंगाना"
  },
  {
    "id": "tripura",
    "name": "Tripura",
    "nameHi": "त्रिपुरा"
  },
  {
    "id": "uttarakhand",
    "name": "Uttarakhand",
    "nameHi": "उत्तराखण्ड"
  },
  {
    "id": "assam",
    "name": "Assam",
    "nameHi": "असम"
  },
  {
    "id": "delhi",
    "name": "NCT of Delhi",
    "nameHi": "दिल्ली"
  },
  {
    "id": "jammu-kashmir",
    "name": "Jammu and Kashmir",
    "nameHi": "जम्मू-कश्मीर"
  },
  {
    "id": "andhra-pradesh",
    "name": "Andhra Pradesh",
    "nameHi": "आन्ध्र प्रदेश"
  },
  {
    "id": "manipur",
    "name": "Manipur",
    "nameHi": "मणिपुर"
  },
  {
    "id": "chandigarh",
    "name": "Chandigarh",
    "nameHi": "चंडीगढ़"
  },
  {
    "id": "bihar",
    "name": "Bihar",
    "nameHi": "बिहार"
  },
  {
    "id": "nagaland",
    "name": "Nagaland",
    "nameHi": "नागालैंड"
  },
  {
    "id": "meghalaya",
    "name": "Meghalaya",
    "nameHi": "मेघालय"
  },
  {
    "id": "goa",
    "name": "Goa",
    "nameHi": "गोवा"
  },
  {
    "id": "andaman-nicobar",
    "name": "Andaman and Nicobar",
    "nameHi": "अंडमान निकोबार"
  },
  {
    "id": "puducherry",
    "name": "Puducherry",
    "nameHi": "पुदुचेरी"
  },
  {
    "id": "arunachal-pradesh",
    "name": "Arunachal Pradesh",
    "nameHi": "अरुणाचल प्रदेश"
  },
  {
    "id": "mizoram",
    "name": "Mizoram",
    "nameHi": "मिज़ोरम"
  },
  {
    "id": "jharkhand",
    "name": "Jharkhand",
    "nameHi": "झारखण्ड"
  },
  {
    "id": "sikkim",
    "name": "Sikkim",
    "nameHi": "सिक्किम"
  },
  {
    "id": "ladakh",
    "name": "Ladakh",
    "nameHi": "लद्दाख"
  },
  {
    "id": "dadra-daman",
    "name": "Dadra and Nagar Haveli and Daman and Diu",
    "nameHi": "दादरा और नगर हवेली और दमन और दीव"
  },
  {
    "id": "lakshadweep",
    "name": "Lakshadweep",
    "nameHi": "लक्षद्वीप"
  }
].map(region => Object.freeze(region)));

const aliases = Object.freeze({
  'dadra-nagar-haveli': 'dadra-daman',
  'daman-diu': 'dadra-daman',
  'dadra-nagar-haveli-daman-diu': 'dadra-daman',
});

export function normalizeRegionId(id) {
  return Object.hasOwn(aliases, id) ? aliases[id] : id;
}

export function getIndiaRegion(id) {
  return INDIA_REGIONS.find(region => region.id === normalizeRegionId(id)) || null;
}
