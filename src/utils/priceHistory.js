// Helpers for the long monthly price history (rows: [YYYY-MM, median, p25, p75, mandis]).

/** Highest and lowest usual month (0-based) from a seasonal profile; null without a clear pattern. */
export function seasonalExtremes(pct) {
  const months = (pct || []).map((value, month) => ({ month, pct: value })).filter(item => Number.isFinite(item.pct));
  if (months.length < 10) return null;
  const high = months.reduce((a, b) => (b.pct > a.pct ? b : a));
  const low = months.reduce((a, b) => (b.pct < a.pct ? b : a));
  // Under ±3% the "best month" would be noise.
  return high.pct - low.pct >= 6 ? { high, low } : null;
}

/** The same calendar month (1–12) N years before the newest year that has it. */
export function sameMonthEarlier(rows, month, yearsAgo = [1, 5]) {
  const byMonth = new Map(rows.map(row => [row[0], row]));
  const mm = String(month).padStart(2, '0');
  const newestYear = Number(rows.at(-1)?.[0]?.slice(0, 4));
  // The current month may not be in the data yet; count back from the newest year that has it.
  const base = [newestYear, newestYear - 1].find(year => byMonth.has(`${year}-${mm}`)) ?? newestYear;
  return yearsAgo
    .map(n => ({ yearsAgo: n, row: byMonth.get(`${base - n}-${mm}`) }))
    .filter(item => item.row);
}

/** One label per year, thinned so labels never crowd (at most ~9). */
export function yearTicks(rows) {
  if (!rows?.length) return [];
  const first = Number(rows[0][0].slice(0, 4));
  const last = Number(rows.at(-1)[0].slice(0, 4));
  const step = Math.max(1, Math.ceil((last - first + 1) / 9));
  const ticks = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step) {
    const ym = `${year}-01`;
    if (ym >= rows[0][0]) ticks.push(ym);
  }
  return ticks;
}
