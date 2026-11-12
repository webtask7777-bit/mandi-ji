// KCC summaries and price history are read by people further down a page, but the prerendered
// snapshot would otherwise carry all of them on every page. These keep what the static HTML shows
// and leave the rest to the API: `omittedRows` is useApi's existing "fetch only when asked" signal.

const monthOf = date => Number(new Date(date.getTime() + 5.5 * 3600e3).toISOString().slice(5, 7));
const nextOf = month => (month % 12) + 1;
const keepMonths = (months, month) => months.map((row, index) => (index + 1 === month || index + 1 === nextOf(month) ? row : null));

/** /kcc/crop/*: this month's and next month's problems. */
export function leanKccCrop(data, asOf = new Date()) {
  if (!Array.isArray(data?.months)) return null;
  const { meta: _meta, ...rest } = data;
  return { data: { ...rest, months: keepMonths(data.months, monthOf(asOf)) }, omittedRows: 10 };
}

/** /kcc, /kcc/states/*, /kcc/districts/*: the month on screen and the next one; the 12-month grid stays. */
export function leanKccPage(data, asOf = new Date()) {
  if (!Array.isArray(data?.months)) return null;
  const rankedMonths = data.months.filter(month => month?.top?.length).length;
  return { data: { ...data, rankedMonths, months: keepMonths(data.months, monthOf(asOf)) }, omittedRows: 10 };
}

/** /price-history/*: the rows behind the headline and the "same month earlier" facts; no chart rows. */
export function leanPriceHistory(data, asOf = new Date()) {
  const rows = data?.state?.length ? data.state : data?.all;
  if (!rows?.length) return null;
  const mm = String(monthOf(asOf)).padStart(2, '0');
  const kept = rows.filter((row, index) => index === 0 || index === rows.length - 1 || row[0].endsWith(`-${mm}`));
  const scoped = Boolean(data.state?.length);
  return {
    data: {
      ...data,
      all: scoped ? [] : kept,
      state: scoped ? kept : null,
      seasonal: scoped && data.seasonal?.state ? { all: null, state: data.seasonal.state } : data.seasonal,
    },
    omittedRows: rows.length - kept.length,
  };
}

const EXACT_QUOTE = 'commodity-mandi-variety-grade-date-v1';
/**
 * /mandi-compare/* rows in the snapshot: fields the browser never reads are dropped. `rangeBasis`
 * is unused in src/. An exact quote with a recent price is priced by quotePrice (getMandiPrice) and
 * PricesTab reads `recentPrice || avgPrice`, so its legacy avgPrice is never reached. Every price, date, variety, grade and unit the page shows is kept.
 */
export function leanCompareRow(row) {
  if (!row || typeof row !== 'object') return row;
  const { rangeBasis: _rangeBasis, ...rest } = row;
  if (row.comparisonIdentity === EXACT_QUOTE && Number(row.quotePrice) > 0 && Number(row.recentPrice) > 0) delete rest.avgPrice;
  return rest;
}
