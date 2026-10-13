const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Quote dates are calendar dates, not the time the browser fetched the data. */
export function quoteDateISO(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) return null;
  if (value.length === 10) return day;
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) return null;
  return new Date(timestamp.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function getLatestQuoteDate(dailyHistory = []) {
  return dailyHistory.map(row => quoteDateISO(row?.date)).filter(Boolean).sort().at(-1) || null;
}

export function getDataFreshness(dateValue, now = new Date()) {
  const date = quoteDateISO(dateValue);
  const clock = new Date(now);
  if (!date || !Number.isFinite(clock.getTime())) {
    return { status: 'unknown', ageDays: null, dateLabel: 'तारीख उपलब्ध नहीं', label: 'भाव की तारीख उपलब्ध नहीं', isCurrent: false, date: null };
  }
  const today = new Date(clock.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  const ageDays = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS);
  const dateLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const status = ageDays < 0 ? 'future' : ageDays === 0 ? 'current' : 'stale';
  const label = status === 'future' ? 'तारीख की जाँच आवश्यक' : status === 'current' ? 'आज का उपलब्ध रिकॉर्ड' : `${ageDays} दिन पुराना रिकॉर्ड`;
  return { status, ageDays, dateLabel, label, isCurrent: status === 'current', date };
}
