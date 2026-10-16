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

/**
 * Drop buckets whose mandi count is under `share` of the series' median mandi count: a
 * national month with 5 mandis among months of ~500 describes a different set of markets
 * (e.g. one state's history before national coverage), not a price for the whole country.
 * Mutates and returns the removed keys.
 */
function dropThinBuckets(buckets, share = 0.2, { keepLatest = false } = {}) {
  const counts = Object.values(buckets).map(b => Object.keys(b.byMandi || {}).length).filter(n => n > 0);
  if (counts.length < 3) return [];
  const typical = median(counts);
  const removed = [];
  // The newest day is always kept: it is the latest observation and is shown with its mandi count.
  const latest = keepLatest ? Object.keys(buckets).sort().at(-1) : null;
  for (const [key, bucket] of Object.entries(buckets)) {
    if (key === latest) continue;
    if (Object.keys(bucket.byMandi || {}).length < typical * share) { delete buckets[key]; removed.push(key); }
  }
  return removed;
}

/**
 * Record-level sanity against the commodity's typical price: a single modal price 20x below
 * or above it (₹4/q garlic, a max of ₹39 lakh/q) is a data-entry error, not a market.
 * Returns { keep(record) → boolean, clip(record) } built from all records.
 */
function priceSanity(records, commodityKey, factor = 20) {
  const byCommodity = new Map();
  for (const r of records) {
    if (!(r.modal_price > 0)) continue;
    const c = commodityKey(r);
    if (!byCommodity.has(c)) byCommodity.set(c, []);
    byCommodity.get(c).push(r.modal_price);
  }
  const typical = new Map([...byCommodity].filter(([, list]) => list.length >= 20).map(([c, list]) => [c, median(list)]));
  return {
    keep(r) {
      // A modal price far outside the record's own valid min–max range (modal 42500, range
      // 3800–4500) is itself the typing error; the record is not used.
      if (r.min_price > 0 && r.max_price >= r.min_price && (r.modal_price > r.max_price * 1.5 || r.modal_price < r.min_price / 1.5)) return false;
      const t = typical.get(commodityKey(r));
      return !t || (r.modal_price >= t / factor && r.modal_price <= t * factor);
    },
    clip(r) {
      if (r.max_price > r.modal_price * factor) r.max_price = 0;
      if (r.min_price > 0 && r.min_price < r.modal_price / factor) r.min_price = 0;
      // A range that does not contain the modal price (min 5000 > modal 4500, max 4500 <
      // modal 42500) is a typing error in one of the fields; that bound is not used.
      if (r.min_price > r.modal_price) r.min_price = 0;
      if (r.max_price > 0 && r.max_price < r.modal_price) r.max_price = 0;
      return r;
    },
  };
}

module.exports = { median, newBucket, addPrice, bucketPrice, unitMismatchedSeries, dropThinBuckets, priceSanity };
