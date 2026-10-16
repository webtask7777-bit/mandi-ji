import { getLanguage } from '../../shared/languages.js';
const copyModules = import.meta.glob('./locales/*.json', { eager: true, import: 'default' });
const copies = Object.fromEntries(Object.entries(copyModules).filter(([file]) => !file.endsWith('.crops.json')).map(([file, value]) => [file.split('/').at(-1).replace('.json', ''), value]));
const cropNames = Object.fromEntries(Object.entries(copyModules).filter(([file]) => file.endsWith('.crops.json')).map(([file, value]) => [file.split('/').at(-1).replace('.crops.json', ''), value]));
export function getLanguageCopy(code) { return getLanguage(code)?.status === 'available' ? copies[code] || null : null; }
export function localizedCropName(crop, code) {
  if (!crop) return '';
  // Exact commodity IDs only: an editorial family is not a commodity identity.
  return cropNames[code]?.[crop.id] || (code === 'hi' ? crop.nameHi : crop.nameEn || crop.name) || crop.name || crop.nameHi || crop.id;
}
export function formatLanguageNumber(value, code, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  try { return new Intl.NumberFormat(getLanguage(code)?.locale || 'en-IN', { numberingSystem: 'latn', maximumFractionDigits: 2, ...options }).format(number); }
  catch { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, ...options }).format(number); }
}
export function formatLanguageDate(value, code, options = {}) {
  const input = String(value || '');
  const monthly = /^\d{4}-\d{2}$/.test(input);
  const date = new Date(`${monthly ? `${input}-01` : input.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return input;
  const locale = getLanguage(code)?.locale || 'en-IN';
  if (!Intl.DateTimeFormat.supportedLocalesOf([locale]).length) return monthly ? input : input.slice(0, 10);
  return new Intl.DateTimeFormat(locale, { ...(monthly ? {} : {day: 'numeric'}), month: 'long', year: 'numeric', numberingSystem: 'latn', timeZone: 'Asia/Kolkata', ...options }).format(date);
}
