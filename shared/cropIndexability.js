import { quoteDateISO } from '../src/utils/dataFreshness.js';

export const CROP_INDEX_MAX_AGE_DAYS = 90;
// A page needs this many mandi-day price records in the last 30 days to be offered to
// search engines; fewer gives a near-empty page that Google crawls but does not index.
export const CROP_INDEX_MIN_RECENT_RECORDS = 5;
export const CROP_INDEX_RECENT_DAYS = 30;
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const positivePrice = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;

/** One policy for the sitemap, initial HTML and the browser's robots metadata. */
export function getCropIndexability(detail, { asOf = new Date(), loading = false, error = null } = {}) {
  const clock = new Date(asOf);
  if (!Number.isFinite(clock.getTime()) || ((!detail || typeof detail !== 'object') && (loading || error))) {
    return { status: 'pending', noIndex: null, latestDate: null, ageDays: null };
  }
  const today = new Date(clock.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  const dailyRows = (Array.isArray(detail?.dailyHistory) ? detail.dailyHistory : [])
    .filter(row => positivePrice(row?.market)).map(row => ({ date: quoteDateISO(row.date), mandis: Number(row.mandis) })).filter(row => row.date);
  const daily = dailyRows.map(row => row.date);
  const months = (Array.isArray(detail?.history) ? detail.history : [])
    .filter(row => positivePrice(row?.market) && /^\d{4}-(0[1-9]|1[0-2])$/.test(row?.date || ''))
    .map(row => row.date);
  const validDaily = daily.filter(date => date <= today).sort();
  const validMonths = months.filter(month => month <= today.slice(0, 7)).sort();
  // Prefer an exact observed day. Monthly-only records use the first day for a
  // conservative age check; retain YYYY-MM in lastmod instead of inventing a day.
  const latestDate = validDaily.at(-1) || validMonths.at(-1) || null;
  if (!latestDate) {
    const future = daily.some(date => date > today) || months.some(month => month > today.slice(0, 7));
    return { status: future ? 'future' : 'empty', noIndex: true, latestDate: null, ageDays: null };
  }
  const ageDate = latestDate.length === 7 ? `${latestDate}-01` : latestDate;
  const ageDays = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${ageDate}T00:00:00Z`)) / DAY_MS);
  if (ageDays > CROP_INDEX_MAX_AGE_DAYS) return { status: 'stale', noIndex: true, latestDate, ageDays };
  const recentFrom = new Date(Date.parse(`${today}T00:00:00Z`) - CROP_INDEX_RECENT_DAYS * DAY_MS).toISOString().slice(0, 10);
  const recentRecords = dailyRows.filter(row => row.date >= recentFrom && row.date <= today)
    .reduce((sum, row) => sum + (Number.isFinite(row.mandis) && row.mandis > 0 ? row.mandis : 1), 0);
  const thin = recentRecords < CROP_INDEX_MIN_RECENT_RECORDS;
  return { status: thin ? 'thin' : 'fresh', noIndex: thin, latestDate, ageDays };
}
