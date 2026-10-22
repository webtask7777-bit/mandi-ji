// One rule for search indexing of crop price pages, shared by the prerender build and the page
// itself, so the HTML a crawler receives and the page after JavaScript say the same thing.

// A page whose newest record is more than STALE_DAYS older than the newest observation in the
// whole dataset stays reachable but is not offered to search engines until fresh records arrive.
export const STALE_DAYS = 90;

/** Newest dated price in a price detail (daily date, or a month taken as its 28th), or null. */
export function latestRecordDate(detail) {
  const daily = (detail?.dailyHistory || []).filter(row => Number(row.market) > 0).map(row => String(row.date)).sort().at(-1);
  const monthly = (detail?.history || []).filter(row => Number(row.market) > 0).map(row => `${row.date}-28`).sort().at(-1);
  return daily || monthly || null;
}

/** True when the detail has a price no older than STALE_DAYS before `newest` (unknown newest: any price). */
export function isFreshPriceDetail(detail, newest) {
  const latest = latestRecordDate(detail);
  if (!latest || !newest) return Boolean(latest);
  return (Date.parse(`${newest}T00:00:00Z`) - Date.parse(`${latest.slice(0, 10)}T00:00:00Z`)) / 86400000 <= STALE_DAYS;
}
