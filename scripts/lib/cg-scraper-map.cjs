/**
 * Mapping of the Chhattisgarh Mandi Board scraper (agriportal.cg.nic.in, Hindi names) to the
 * names data.gov.in uses for the same Chhattisgarh records. Both come from the same source
 * family: varieties match exactly (e.g. धान(I.R. 64) ↔ Paddy(Common) / I.R. 64).
 *
 * Only unambiguous commodity forms are mapped. Anything that could be a different form
 * (whole vs dal, dry vs green pod, leaf vs seed, raw vs ripe, flower vs seed) is skipped.
 */

// category (text before the first bracket) → data.gov.in commodity
const CATEGORY = {
  'धान': 'Paddy(Common)', 'मक्का': 'Maize', 'गेहूँ': 'Wheat', 'टमाटर': 'Tomato', 'आलू': 'Potato',
  'पत्ता गोभी': 'Cabbage', 'कुम्हड़ा': 'Pumpkin', 'फूल गोभी': 'Cauliflower', 'करेला': 'Bitter gourd',
  'लौकी': 'Bottle gourd', 'बैंगन': 'Brinjal', 'भिण्डी': 'Bhindi(Ladies Finger)', 'शिमला मिर्च': 'Chilly Capsicum',
  'प्याज': 'Onion', 'कुंदरू': 'Little gourd(Kundru)', 'नींबू': 'Lemon', 'गाजर': 'Carrot', 'पालक भाजी': 'Spinach',
  'मूली': 'Raddish', 'सोयाबीन': 'Soyabean', 'चुकंदर': 'Beetroot', 'हरी मिर्च': 'Green Chilli', 'मुनगा': 'Drumstick',
  'अनार': 'Pomegranate', 'सेव': 'Apple', 'मोसम्बी': 'Mousambi(Sweet Lime)', 'परवल': 'Pointed gourd(Parval)',
  'पपीता': 'Papaya', 'संतरा': 'Orange', 'चैलाई साग': 'Amaranthus', 'अरबी': 'Colacasia', 'तुरई': 'Ridgeguard(Tori)',
  'अंगूर': 'Grapes', 'आम': 'Mango', 'ककड़ी': 'Cucumbar(Kheera)', 'तरबूज': 'Water Melon', 'सरसों': 'Mustard',
  'मूँगफली': 'Groundnut', 'अमरूद': 'Guava', 'टिण्डा': 'Tinda', 'चीकू': 'Chikoos(Sapota)', 'खरबूज': 'Karbuja(Musk Melon)',
  'लहसून': 'Garlic', 'शकरकंद': 'Sweet Potato', 'गांठ गोभी': 'Knool Khol', 'अलसी': 'Linseed', 'तिल': 'Sesamum(Sesame,Gingelly,Til)',
  'रागी': 'Ragi(Finger Millet)', 'बाजरा': 'Bajra(Pearl Millet/Cumbu)', 'ज्वार': 'Jowar(Sorghum)', 'हल्दी': 'Turmeric',
  'जीरा': 'Cummin Seed(Jeera)', 'सूरजमुखी': 'Sunflower', 'जौ': 'Barley(Jau)', 'गन्ना': 'Sugarcane',
};

// Pulses only when the variety says the grain is whole; otherwise it may be dal.
const WHOLE_PULSE = {
  'चना': 'Bengal Gram(Gram)(Whole)', 'उड़द': 'Black Gram(Urd Beans)(Whole)',
  'मूंग': 'Green Gram(Moong)(Whole)', 'मसूर': 'Lentil(Masur)(Whole)',
};

// Hindi district → data.gov.in spelling
const DISTRICT = {
  'कबीरधाम': 'Kabirdham', 'कांकेर': 'Kanker', 'कोंडागांव': 'Kondagaon', 'कोरबा': 'Korba', 'कोरिया': 'Koriya',
  'खैरागढ़ छुईखदान गण्डई': 'Khairagarh Chhuikhadan Gandai', 'गरियाबंद': 'Gariyaband',
  'गौरेला पेन्ड्रा मरवाही': 'Gourela Pendra Marwahi', 'जशपुर': 'Jashpur', 'जांजगीर-चाम्पा': 'Janjgir',
  'दन्तेवाड़ा': 'Dantewada', 'दुर्ग': 'Durg', 'धमतरी': 'Dhamtari', 'नारायणपुर': 'Narayanpur', 'बलरामपुर': 'Balrampur',
  'बलौदा बाजार': 'Balodabazar', 'बस्तर': 'Bastar', 'बालोद': 'Balod', 'बिलासपुर': 'Bilaspur', 'बीजापुर': 'Bijapur',
  'बेमेतरा': 'Bemetara', 'मनेन्द्रगढ़ चिरमिरी भरतपुर': 'Manendragarh Chirmiri Bhartpur', 'महासमुंद': 'Mahasamund',
  'मुंगेली': 'Mungeli', 'मोहला मानपुर अं.चौकी': 'Mohla Manpur Ambagarh Chowki', 'राजनांदगांव': 'Rajnandgaon',
  'रायगढ़': 'Raigarh', 'रायपुर': 'Raipur', 'सक्ती': 'Sakti', 'सरगुजा': 'Surguja', 'सारंगढ़ बिलाईगढ़': 'Sarangarh Bilaigarh',
  'सुकमा': 'Sukma', 'सुरजपुर': 'Surajpur',
};

// Hindi mandi → data.gov.in market name (without the " APMC" suffix the source adds)
const MANDI = {
  'कवर्धा': 'Kawardha', 'पंडरिया': 'Pandariya', 'कांकेर': 'Kanker', 'चारामा': 'Charama', 'पखांजूर': 'Pakhanjur',
  'सम्बलपुर': 'Sambalpur', 'केशकाल': 'Keshkal', 'कोण्डागांव': 'Kondagaon', 'कटघोरा': 'Katghora', 'बैकुंठपुर': 'Baikunthpur',
  'खैरागढ़': 'Kheragarh', 'गण्डई': 'Gandai', 'गरियाबंद': 'Gariyaband', 'राजिम': 'Rajim', 'पेण्ड्रारोड': 'Pendraroad',
  'जशपुरनगर': 'Jashpur', 'पत्थलगांव': 'Pathalgaon', 'अकलतरा': 'Akaltara', 'चांपा': 'Champa', 'नैला': 'Naila',
  'गीदम': 'Gidam', 'दुर्ग': 'Durg', 'कुरूद': 'Kurud', 'धमतरी': 'Dhamtari', 'नगरी': 'Nagari', 'नारायणपुर': 'Narayanpur',
  'कुसमी': 'Kusmee', 'रामानुजगंज': 'Ramanujganj', 'कसडोल': 'Kasdol', 'बलौदाबाजार': 'Balodabazar', 'भाटापारा': 'Bhatapara',
  'जगदलपुर': 'Jagdalpur', 'बालौद': 'Balod', 'कोटा': 'Kota', 'जयरामनगर': 'Jairamnagar', 'तखतपुर': 'Takhatpur',
  'बिलासपुर': 'Bilaspur', 'बीजापुर': 'Bijapur', 'बेमेतरा': 'Bemetara', 'मनेन्द्रगढ़': 'Manendragarh', 'पिथौरा': 'Pithoura',
  'बसना': 'Basana', 'बागबहरा': 'Bagbahra', 'महासमुंद': 'Mahasamund', 'सरायपाली': 'Sarayapali', 'मुंगेली': 'Mungeli',
  'लोरमी': 'Lormi', 'बांधाबाजार': 'Bandhabazar', 'डोंगरगढ़': 'Dongargarh', 'डोंगरगांव': 'Dongargaon',
  'राजनांदगांव': 'Rajnandgaon', 'खरसिया': 'Kharsiya', 'घरघोड़ा': 'Gharghoda', 'रायगढ़': 'Raigarh', 'अभनपुर': 'Abhanpur',
  'आरंग': 'Arang', 'नवापारा': 'Navapara', 'नेवरा': 'Nevra', 'रायपुर': 'Raipur', 'अमनदुल्ला': 'Amandulla',
  'जैजेपुर': 'Jaijaipur', 'सक्ती': 'Shakti', 'अंबिकापुर': 'Ambikapur', 'बरमकेला': 'Baramkela', 'भठगॉव': 'Bhatgaon',
  'सारंगढ़': 'Sarangarh', 'कोन्टा': 'Konta', 'प्रतापपुर': 'Pratappur', 'सुरजपुर': 'Surajpur',
};

/** "चना(Desi (Whole))" → { category: 'चना', variety: 'Desi (Whole)' } */
function splitCrop(crop) {
  const text = String(crop || '').trim();
  const at = text.indexOf('(');
  if (at < 0 || !text.endsWith(')')) return { category: text, variety: '' };
  return { category: text.slice(0, at).trim(), variety: text.slice(at + 1, -1).trim() };
}

/** data.gov.in commodity for a scraper crop string, or null when it is skipped. */
function commodityFor(crop) {
  const { category: raw, variety } = splitCrop(crop);
  const category = raw.normalize('NFC');
  if (CATEGORY[category]) return CATEGORY[category];
  if (WHOLE_PULSE[category]) return /whole/i.test(variety) ? WHOLE_PULSE[category] : null;
  return null;
}

// Source text mixes precomposed and combining nukta forms (ढ़ / ढ़); compare normalised text.
const norm = text => String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
const lookup = table => {
  const normalised = new Map(Object.entries(table).map(([k, v]) => [norm(k), v]));
  return key => normalised.get(norm(key)) || null;
};
const districtFor = lookup(DISTRICT);
const mandiFor = lookup(MANDI);

module.exports = { CATEGORY, WHOLE_PULSE, DISTRICT, MANDI, splitCrop, commodityFor, districtFor, mandiFor };
