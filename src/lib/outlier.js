/**
 * IQR-based outlier detection for mandi prices.
 * Flags prices that fall outside Q1 - 1.5×IQR … Q3 + 1.5×IQR
 * or differ >200% from the median.
 */

function percentile(sorted, p) {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function getOutlierBounds(prices) {
  if (!prices || prices.length < 4) return null; // need enough data
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const median = percentile(sorted, 0.5);
  const iqr = q3 - q1;
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
