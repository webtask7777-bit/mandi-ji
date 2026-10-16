/** National language coverage: 22 scheduled languages plus English. No location-based redirects. */
export const LANGUAGES = [
  { code: 'hi', name: 'हिन्दी', english: 'Hindi', script: 'Devanagari' },
  { code: 'en', name: 'English', english: 'English', script: 'Latin' },
  { code: 'as', name: 'অসমীয়া', english: 'Assamese', script: 'Bengali' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali', script: 'Bengali' },
  { code: 'brx', name: 'बड़ो', english: 'Bodo', script: 'Devanagari' },
  { code: 'doi', name: 'डोगरी', english: 'Dogri', script: 'Devanagari' },
  { code: 'gu', name: 'ગુજરાતી', english: 'Gujarati', script: 'Gujarati' },
  { code: 'kn', name: 'ಕನ್ನಡ', english: 'Kannada', script: 'Kannada' },
  { code: 'ks', name: 'کٲشُر', english: 'Kashmiri', script: 'Arabic', dir: 'rtl' },
  { code: 'kok', name: 'कोंकणी', english: 'Konkani', script: 'Devanagari' },
  { code: 'mai', name: 'मैथिली', english: 'Maithili', script: 'Devanagari' },
  { code: 'ml', name: 'മലയാളം', english: 'Malayalam', script: 'Malayalam' },
  { code: 'mni', name: 'ꯃꯤꯇꯩ ꯂꯣꯟ', english: 'Manipuri', script: 'MeeteiMayek' },
  { code: 'mr', name: 'मराठी', english: 'Marathi', script: 'Devanagari' },
  { code: 'ne', name: 'नेपाली', english: 'Nepali', script: 'Devanagari' },
  { code: 'or', name: 'ଓଡ଼ିଆ', english: 'Odia', script: 'Oriya' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', english: 'Punjabi', script: 'Gurmukhi' },
  { code: 'sa', name: 'संस्कृतम्', english: 'Sanskrit', script: 'Devanagari' },
  { code: 'sat', name: 'ᱥᱟᱱᱛᱟᱲᱤ', english: 'Santali', script: 'OlChiki' },
  { code: 'sd', name: 'سنڌي', english: 'Sindhi', script: 'Arabic', dir: 'rtl' },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil', script: 'Tamil' },
  { code: 'te', name: 'తెలుగు', english: 'Telugu', script: 'Telugu' },
  { code: 'ur', name: 'اردو', english: 'Urdu', script: 'Arabic', dir: 'rtl' },
].map(item => Object.freeze({
  dir: 'ltr', locale: `${item.code}-IN`, ...item,
  status: ['brx', 'doi', 'kok', 'mni', 'sat'].includes(item.code) ? 'pending' : 'available',
  // Provisional terminology stays reachable for feedback but out of search until reviewed.
  searchReady: !['brx', 'doi', 'kok', 'mni', 'sat', 'mai', 'sa', 'ks', 'sd'].includes(item.code),
}));
export const AVAILABLE_LANGUAGES = LANGUAGES.filter(item => item.status === 'available');
export const SEARCH_LANGUAGES = AVAILABLE_LANGUAGES.filter(item => item.searchReady);
export const LANGUAGE_STORAGE_KEY = 'sahibhav_language';
export const LANGUAGE_CODES = LANGUAGES.map(item => item.code);
export function getLanguage(code) { return LANGUAGES.find(item => item.code === code) || null; }
export function languagePath(code) { return getLanguage(code) ? `/${code}/mandi-bhav` : '/languages'; }
export function languageFromPath(path) { return getLanguage(String(path || '').match(/^\/([^/]+)\/mandi-bhav\/?$/)?.[1]); }
export function normalizeLanguage(value) {
  if (typeof value !== 'string') return null;
  return getLanguage(value.toLowerCase().split(/[-_]/)[0])?.code || null;
}
