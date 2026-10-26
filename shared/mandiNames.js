// Display/search aliases only. Source names, market slugs and price identities stay intact.
const CG_NAMES = Object.freeze({
  raipur: 'रायपुर', dhamtari: 'धमतरी', abhanpur: 'अभनपुर', durg: 'दुर्ग',
  rajnandgaon: 'राजनांदगांव', bilaspur: 'बिलासपुर', tiphra: 'तिफरा',
  bhatapara: 'भाटापारा', balodabazar: 'बलौदाबाजार', navapara: 'नवापारा',
  rajim: 'राजिम', kawardha: 'कवर्धा', mungeli: 'मुंगेली',
  jagdalpur: 'जगदलपुर', ambikapur: 'अंबिकापुर', balod: 'बालोद',
});

export function mandiDisplayName(name, state) {
  const key = typeof name === 'string' ? name.trim().toLowerCase() : '';
  return state === 'chhattisgarh' && Object.hasOwn(CG_NAMES, key) ? CG_NAMES[key] : String(name || '');
}

export function mandiSearchText(row, state) {
  return [row?.name, row?.district, mandiDisplayName(row?.name, state), mandiDisplayName(row?.district, state)].filter(Boolean).join(' ').toLowerCase();
}
