import { languagePath } from '../../shared/languages.js';
import { getDeliveryTrips } from './deliveryCalculator.js';

// Accept native decimal digits without letting an empty input become a zero quote.
export function parseLanguageNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const zeroes = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x1c50];
  const normalized = [...value.trim()].map(character => {
    const point = character.codePointAt(0);
    const zero = zeroes.find(start => point >= start && point <= start + 9);
    return zero === undefined ? character : String(point - zero);
  }).join('').replace(/\u066b/g, '.').replace(/\u066c/g, ',').replace(/\u2212/g, '-');
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

export function calculateDeliveryEstimate(input = {}) {
  if (!input || typeof input !== 'object') return { valid: false };
  const values = Object.fromEntries(['distance', 'capacity', 'weight', 'rate', 'extra'].map(key => [key, parseLanguageNumber(input[key])]));
  if (Object.values(values).some(value => value === null || Math.abs(value) > Number.MAX_SAFE_INTEGER) || values.distance <= 0 || values.capacity <= 0 || values.weight <= 0 || values.rate < 0 || values.extra < 0) return { valid: false };
  const trips = getDeliveryTrips(values.weight, values.capacity);
  const totalDistance = trips * values.distance * (input.roundTrip === true ? 2 : 1);
  const totalCost = totalDistance * values.rate + values.extra;
  const perKg = totalCost / values.weight;
  if (![trips, totalDistance, totalCost, perKg].every(value => Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER) || !Number.isSafeInteger(trips)) return { valid: false };
  return { valid: true, trips, totalDistance, totalCost, perKg };
}

function validObservationDate(value, monthly) {
  const expression = monthly ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
  if (typeof value !== 'string' || !expression.test(value)) return false;
  const expected = monthly ? `${value}-01` : value;
  const parsed = new Date(`${expected}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === expected;
}

// Keep the two observation periods separate. This is a new immutable view of the
// response: selecting/sorting history must never reorder the shared API cache.
export function normalizePriceHistory(data) {
  const observations = (key, basis) => {
    const records = (Array.isArray(data?.[key]) ? data[key] : []).map((record, index) => ({ record, index })).filter(({ record }) => {
      const value = parseLanguageNumber(record?.market);
      return value !== null && value > 0 && value <= Number.MAX_SAFE_INTEGER && validObservationDate(record?.date, basis === 'monthly');
    }).sort((a, b) => b.record.date.localeCompare(a.record.date) || b.index - a.index)
      .map(({ record }) => Object.freeze({ ...record, market: parseLanguageNumber(record.market), basis }));
    return Object.freeze(records);
  };
  return Object.freeze({ daily: observations('dailyHistory', 'daily'), monthly: observations('history', 'monthly') });
}

export function latestPriceRecord(data) {
  const history = normalizePriceHistory(data);
  const daily = history.daily[0];
  const monthly = history.monthly[0];
  // Prefer the precise daily observation within a month, but never hide a newer month.
  if (daily && (!monthly || daily.date.slice(0, 7) >= monthly.date)) return daily;
  return monthly || null;
}

export function buildLanguageToolsUrl(code, { state, crop } = {}) {
  const query = new URLSearchParams();
  if (state && state !== 'all') query.set('state', state);
  if (crop) query.set('crop', crop);
  return `${languagePath(code)}${query.size ? `?${query}` : ''}`;
}
