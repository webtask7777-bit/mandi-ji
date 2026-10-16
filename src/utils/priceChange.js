/**
 * Change between the latest and the previous available record, only when the two are
 * close enough in time to mean something. Across a long gap (missing source days) the
 * set of reporting mandis changes too, so a percentage would describe the mix of
 * markets rather than a price movement.
 */
export const MAX_DAILY_GAP_DAYS = 7;

const DAY_MS = 86400000;
const isoDay = value => (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? Date.parse(`${value}T00:00:00Z`) : NaN);
const monthIndex = value => {
  const m = String(value).match(/^(\d{4})-(\d{2})$/);
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : NaN;
};

/**
 * @returns {{ status: 'ok', change: number, pct: number, gapDays: number|null }
 *          | { status: 'gap', gapDays: number|null, previousDate: string }
 *          | { status: 'none' }}
 */
export function comparableChange(latest, previous, { daily = true } = {}) {
  const now = Number(latest?.market);
  const before = Number(previous?.market);
  if (!(now > 0) || !(before > 0)) return { status: 'none' };
  let gapDays = null;
  let tooFar;
  if (daily) {
    gapDays = Math.round((isoDay(latest.date) - isoDay(previous.date)) / DAY_MS);
    tooFar = !Number.isFinite(gapDays) || gapDays <= 0 || gapDays > MAX_DAILY_GAP_DAYS;
  } else {
    const months = monthIndex(latest.date ?? latest.month) - monthIndex(previous.date ?? previous.month);
    tooFar = !Number.isFinite(months) || months !== 1;
  }
  if (tooFar) return { status: 'gap', gapDays: Number.isFinite(gapDays) ? gapDays : null, previousDate: String(previous.date ?? previous.month ?? '') };
  const change = now - before;
  return { status: 'ok', change, pct: change / before * 100, gapDays };
}

/** Short Hindi note for a gap, e.g. "पिछला रिकॉर्ड 90 दिन पहले का है". */
export function gapNote(result) {
  if (result?.status !== 'gap') return '';
  return result.gapDays ? `पिछला रिकॉर्ड ${result.gapDays} दिन पहले का है, इसलिए बदलाव नहीं दिखाया` : 'पिछला रिकॉर्ड पास की तारीख का नहीं है, इसलिए बदलाव नहीं दिखाया';
}
