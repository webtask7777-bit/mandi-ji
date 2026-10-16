import { getLanguage } from '../../shared/languages.js';
const copyModules = import.meta.glob('./locales/*.json', { eager: true, import: 'default' });
const copies = Object.fromEntries(Object.entries(copyModules).filter(([file]) => !file.endsWith('.crops.json')).map(([file, value]) => [file.split('/').at(-1).replace('.json', ''), value]));
const cropNames = Object.fromEntries(Object.entries(copyModules).filter(([file]) => file.endsWith('.crops.json')).map(([file, value]) => [file.split('/').at(-1).replace('.crops.json', ''), value]));
export function getLanguageCopy(code) { return getLanguage(code)?.status === 'available' ? copies[code] || null : null; }
export function localizedCropName(crop, code) {
  if (!crop) return '';
  // Exact commodity IDs only: an editorial family is not a commodity identity. Devanagari
  // languages without their own list (Maithili, Sanskrit) read the Hindi name, not English.
  const devanagari = getLanguage(code)?.script === 'Devanagari';
  return cropNames[code]?.[crop.id] || (code === 'hi' || devanagari ? crop.nameHi : crop.nameEn || crop.name) || crop.name || crop.nameHi || crop.id;
}
export function formatLanguageNumber(value, code, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  try { return new Intl.NumberFormat(getLanguage(code)?.locale || 'en-IN', { numberingSystem: 'latn', maximumFractionDigits: 2, ...options }).format(number); }
  catch { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, ...options }).format(number); }
}
const SCRIPT_LETTERS = {
  Devanagari: /[\u0900-\u097F]/, Arabic: /[\u0600-\u06FF]/, Bengali: /[\u0980-\u09FF]/, Gujarati: /[\u0A80-\u0AFF]/,
  Gurmukhi: /[\u0A00-\u0A7F]/, Oriya: /[\u0B00-\u0B7F]/, Tamil: /[\u0B80-\u0BFF]/, Telugu: /[\u0C00-\u0C7F]/,
  Kannada: /[\u0C80-\u0CFF]/, Malayalam: /[\u0D00-\u0D7F]/, Latin: /[A-Za-z]/,
};
export function formatLanguageDate(value, code, options = {}) {
  const input = String(value || '');
  const monthly = /^\d{4}-\d{2}$/.test(input);
  const date = new Date(`${monthly ? `${input}-01` : input.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return input;
  const language = getLanguage(code);
  const locale = language?.locale || 'en-IN';
  // Without real locale data (Kashmiri, Maithili) or when the runtime answers in another script
  // (Sindhi month names in Devanagari), a numeric day-month-year is correct in every script.
  const numeric = () => { const [y, m, d] = (monthly ? `${input}-01` : input.slice(0, 10)).split('-'); return monthly ? `${m}-${y}` : `${d}-${m}-${y}`; };
  if (!Intl.DateTimeFormat.supportedLocalesOf([locale]).length) return numeric();
  const text = new Intl.DateTimeFormat(locale, { ...(monthly ? {} : {day: 'numeric'}), month: 'long', year: 'numeric', numberingSystem: 'latn', timeZone: 'Asia/Kolkata', ...options }).format(date);
  const pattern = SCRIPT_LETTERS[language?.script];
  return pattern && !pattern.test(text) ? numeric() : text;
}
