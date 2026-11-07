// Hindi display names for the markets farmers search for in Hindi. The data keeps
// its source spelling; only names checked by hand belong here, so a missing entry
// falls back to the source name.
const MANDI_NAMES_HI = Object.freeze({
  chhattisgarh: Object.freeze({
    raipur: 'रायपुर', durg: 'दुर्ग', rajnandgaon: 'राजनांदगांव', raigarh: 'रायगढ़', bilaspur: 'बिलासपुर',
    dhamtari: 'धमतरी', bhatapara: 'भाटापारा', kurud: 'कुरूद', ambikapur: 'अंबिकापुर', jagdalpur: 'जगदलपुर',
    kanker: 'कांकेर', mahasamund: 'महासमुंद', bemetara: 'बेमेतरा', balod: 'बालोद', kawardha: 'कवर्धा',
    abhanpur: 'अभनपुर', arang: 'आरंग', navapara: 'नवापारा', rajim: 'राजिम', gariyaband: 'गरियाबंद',
    kondagaon: 'कोंडागांव', champa: 'चांपा', takhatpur: 'तखतपुर', mungeli: 'मुंगेली', balodabazar: 'बलौदाबाजार',
    kharsiya: 'खरसिया', surajpur: 'सूरजपुर', dongargarh: 'डोंगरगढ़', dongargaon: 'डोंगरगांव', sarangarh: 'सारंगढ़',
  }),
  'madhya-pradesh': Object.freeze({
    indore: 'इंदौर', mandsaur: 'मंदसौर', ujjain: 'उज्जैन', neemuch: 'नीमच', bhopal: 'भोपाल',
  }),
});

export function mandiNameHi(stateId, slug, name) {
  const names = MANDI_NAMES_HI[stateId];
  return (names && Object.hasOwn(names, slug) ? names[slug] : null) || name;
}
