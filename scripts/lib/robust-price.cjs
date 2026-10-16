/**
 * Price summaries that one heavily reporting state cannot dominate.
 *
 * A day or month bucket collects modal prices per mandi. Its price is the median of the
 * mandis' own averages, so a state that files many varieties per market counts once per
 * market, and a single extreme mandi cannot move the figure much.
 */

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

function newBucket() {
  return { prices: [], byMandi: {}, days: new Set(), count: 0 };
}

/** Record one modal price for a mandi on a date (ISO). */
function addPrice(bucket, mandiKey, price, isoDate) {
  bucket.prices.push(price);
  (bucket.byMandi[mandiKey] ||= []).push(price);
  if (isoDate) bucket.days.add(isoDate);
}

/** Median of per-mandi means, rounded; 0 when there is nothing to summarise. */
function bucketPrice(bucket) {
  const mandis = Object.values(bucket?.byMandi || {}).filter(list => list.length);
  if (mandis.length) return Math.round(median(mandis.map(mean)));
  return bucket?.prices?.length ? Math.round(mean(bucket.prices)) : 0;
}

/**
 * Series whose typical price is far from the commodity's typical price are almost always
 * reported in another unit (per bunch, per nut, per 1000 nuts). Returns the set of series
 * keys to leave out of per-quintal figures. Only judged for commodities with enough data.
 */
function unitMismatchedSeries(records, { seriesKey, commodityKey, minRecords = 30, minSeries = 5, ratio = 10 } = {}) {
  const byCommodity = new Map();
  for (const r of records) {
    if (!(r.modal_price > 0)) continue;
    const c = commodityKey(r);
    if (!byCommodity.has(c)) byCommodity.set(c, new Map());
    const series = byCommodity.get(c);
    const s = seriesKey(r);
    if (!series.has(s)) series.set(s, []);
    series.get(s).push(r.modal_price);
  }
  const excluded = new Set();
  for (const series of byCommodity.values()) {
    const all = [...series.values()].flat();
    if (all.length < minRecords || series.size < minSeries) continue;
    const typical = median([...series.values()].map(median));
    if (!(typical > 0)) continue;
    for (const [key, prices] of series) {
      const m = median(prices);
      if (m < typical / ratio || m > typical * ratio) excluded.add(key);
    }
  }
  return excluded;
}

module.exports = { median, newBucket, addPrice, bucketPrice, unitMismatchedSeries };
