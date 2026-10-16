/**
 * Helpers for the public data-status page. All dates are ISO (YYYY-MM-DD) observation dates.
 */
const DAY_MS = 86400000;
const toDay = iso => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? Date.parse(`${iso}T00:00:00Z`) : NaN);

/** Stretches of more than `minDays` days with no stored observation, newest first. */
export function findDataGaps(dates = [], minDays = 7) {
  const sorted = [...new Set(dates.filter(d => Number.isFinite(toDay(d))))].sort();
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const missing = Math.round((toDay(sorted[i]) - toDay(sorted[i - 1])) / DAY_MS) - 1;
    if (missing > minDays) {
      gaps.push({
        from: new Date(toDay(sorted[i - 1]) + DAY_MS).toISOString().slice(0, 10),
        to: new Date(toDay(sorted[i]) - DAY_MS).toISOString().slice(0, 10),
        days: missing,
      });
    }
  }
  return gaps.reverse();
}

/** Whole days between an observation date and today's date in India. */
export function ageInDays(iso, now = new Date()) {
  const today = new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
  const d = toDay(iso);
  return Number.isFinite(d) ? Math.round((toDay(today) - d) / DAY_MS) : null;
}

/** States sorted freshest first, then by recent mandis. */
export function sortStatesByFreshness(states = []) {
  return [...states].sort((a, b) => String(b.latestObservation || '').localeCompare(String(a.latestObservation || ''))
    || (b.recentMandis || 0) - (a.recentMandis || 0));
}
