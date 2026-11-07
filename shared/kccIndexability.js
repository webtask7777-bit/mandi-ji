// One rule for search indexing of फसल सलाह pages, used by the prerender build (sitemap) and the
// page (robots meta), so a page is never in the sitemap and noindex at once.
//
// Google's crawl budget for this site is scarce, and the summaries are seasonal patterns, not
// new records. So the sitemap carries the national page and the states with something to say in
// every month. State pages that rank problems in only some months, and every district page, stay
// useful to readers but are not offered to search. Set to true to offer the published districts.
export const KCC_DISTRICTS_INDEXED = false;

const MONTHS_IN_YEAR = 12;

/** `summary` is the state's or district's KCC file (or its API response); `level` india | state | district. */
export function isKccPageIndexable(summary, level) {
  if (!summary || summary.meta?.sampled) return false;
  if (level === 'india') return true;
  if (level === 'district') return KCC_DISTRICTS_INDEXED;
  // A prerendered snapshot carries two months and the count of ranked ones.
  const ranked = summary.rankedMonths ?? (summary.months || []).filter(month => month?.top?.length).length;
  return ranked === MONTHS_IN_YEAR;
}
