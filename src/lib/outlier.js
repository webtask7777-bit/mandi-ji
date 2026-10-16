/**
 * IQR-based outlier detection for mandi prices.
 * Flags prices that fall outside Q1 - 1.5×IQR … Q3 + 1.5×IQR
 * or differ >200% from the median.
 */

// When most mandis report the same price, Q1 = Q3 and every other price would look unusual.
// The spread is never taken as less than 10% of the median.
const MIN_SPREAD_SHARE = 0.1;

function percentile(sorted, p) {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function getOutlierBounds(prices) {
  const values = (prices || []).map(Number).filter(price => Number.isFinite(price) && price > 0);
  if (values.length < 4) return null; // need enough data
  const sorted = values.sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const median = percentile(sorted, 0.5);
  const iqr = Math.max(q3 - q1, median * MIN_SPREAD_SHARE);
  return {
    q1, q3, median, iqr,
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
  };
}

export function isOutlier(price, bounds) {
  if (!bounds || !price) return false;
  if (price < bounds.lower || price > bounds.upper) return true;
  // Also flag if >200% or <33% of median
  if (bounds.median > 0 && (price > bounds.median * 3 || price < bounds.median / 3)) return true;
  return false;
}

/**
 * Flag rows against their own variety and grade, since a premium variety is not unusual
 * among ordinary ones. Groups too small to judge use the bounds of all rows.
 * Returns the Set of flagged rows.
 */
export function flagOutliersByGroup(rows, getPrice, groupKey) {
  const overall = getOutlierBounds(rows.map(getPrice));
  const groups = new Map();
  for (const row of rows) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const flagged = new Set();
  for (const group of groups.values()) {
    const bounds = getOutlierBounds(group.map(getPrice)) || overall;
    for (const row of group) if (isOutlier(getPrice(row), bounds)) flagged.add(row);
  }
  return flagged;
}
