// Hindi names of KCC districts, keyed "<state id>/<KCC district id>".
//
// Only districts whose identity is certain are listed: the Hindi names come from the site's own
// Chhattisgarh district list (server/db/data/districts.json), matched on the KCC id. Five KCC
// spellings differ from that list but name the same district (Kabeerdham = Kabirdham,
// Gariyaband = Gariaband, Koriya = Korea, Uttar Bastar Kanker = Kanker, Dakshin Bastar
// Dantewada = Dantewada); they carry their official full Hindi names. Districts carved out after
// the KCC records (Sarangarh-Bilaigarh, Khairagarh-Gandai, Mohla-Manpur, Shakti, Manendragarh,
// Gaurela-Pendra-Marwahi) have no KCC page of their own and are not mapped onto a parent.
// Districts not listed here are still found by a Hindi search through transliteration
// (src/utils/kccAdvice.js); add a state here only from a verified source.
export const DISTRICT_NAME_HI = {
  'chhattisgarh/balod': 'बालोद',
  'chhattisgarh/balodabazar': 'बलौदा बाज़ार',
  'chhattisgarh/balrampur': 'बलरामपुर',
  'chhattisgarh/bastar': 'बस्तर',
  'chhattisgarh/bemetara': 'बेमेतरा',
  'chhattisgarh/bijapur': 'बीजापुर',
  'chhattisgarh/bilaspur': 'बिलासपुर',
  'chhattisgarh/dakshin-bastar-dantewada': 'दक्षिण बस्तर दंतेवाड़ा',
  'chhattisgarh/dhamtari': 'धमतरी',
  'chhattisgarh/durg': 'दुर्ग',
  'chhattisgarh/gariyaband': 'गरियाबंद',
  'chhattisgarh/janjgir-champa': 'जांजगीर-चांपा',
  'chhattisgarh/jashpur': 'जशपुर',
  'chhattisgarh/kabeerdham': 'कबीरधाम',
  'chhattisgarh/kondagaon': 'कोंडागांव',
  'chhattisgarh/korba': 'कोरबा',
  'chhattisgarh/koriya': 'कोरिया',
  'chhattisgarh/mahasamund': 'महासमुंद',
  'chhattisgarh/mungeli': 'मुंगेली',
  'chhattisgarh/narayanpur': 'नारायणपुर',
  'chhattisgarh/raigarh': 'रायगढ़',
  'chhattisgarh/raipur': 'रायपुर',
  'chhattisgarh/raj-nandgaon': 'राजनांदगांव',
  'chhattisgarh/sukma': 'सुकमा',
  'chhattisgarh/surajpur': 'सूरजपुर',
  'chhattisgarh/surguja': 'सरगुजा',
  'chhattisgarh/uttar-bastar-kanker': 'उत्तर बस्तर कांकेर',
};

// Other spellings people search for, mapped to the same KCC district (never to a different one).
export const DISTRICT_ALIASES = {
  'chhattisgarh/kabeerdham': ['Kabirdham', 'Kawardha', 'कवर्धा'],
  'chhattisgarh/uttar-bastar-kanker': ['Kanker', 'कांकेर'],
  'chhattisgarh/dakshin-bastar-dantewada': ['Dantewada', 'दंतेवाड़ा'],
  'chhattisgarh/gariyaband': ['Gariaband'],
  'chhattisgarh/koriya': ['Korea'],
  'chhattisgarh/raj-nandgaon': ['Rajnandgaon'],
  'chhattisgarh/balodabazar': ['Baloda Bazar', 'Baloda Bazar-Bhatapara'],
};

export const districtNameHi = (stateId, districtId) => DISTRICT_NAME_HI[`${stateId}/${districtId}`] || null;

/** KCC writes an unknown district as "0", "9999", "NA"…: such entries are not districts. */
export const isRealDistrict = district => {
  const id = String(district?.id || '');
  return /[a-z]/.test(id) && !/^(na|n-a|null|none|others?|unknown|not-available)$/.test(id);
};
