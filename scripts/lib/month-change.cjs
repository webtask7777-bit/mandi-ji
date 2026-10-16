/**
 * Month-over-month change for the ticker. Compares the latest month with the previous
 * one only when they are consecutive calendar months and each has at least `minDays`
 * reporting days. Across a gap (missing source months), or against a month with a day or
 * two of data, the reporting mandis differ too much, so no change and no change-based
 * signal is produced. Prices are the median of per-mandi averages (robust-price.cjs).
 *
 * @param {Array<[string, object]>} months sorted [ 'YYYY-MM', bucket ] entries
 */
const { bucketPrice } = require('./robust-price.cjs');

const MIN_DAYS = 3;

function monthChange(months, { minDays = MIN_DAYS } = {}) {
  const latest = months.at(-1);
  const prev = months.at(-2);
  const price = bucketPrice(latest?.[1]);
  const prevPrice = bucketPrice(prev?.[1]);
  const daysOf = bucket => (bucket?.days instanceof Set ? bucket.days.size : Infinity);
  const meta = {
    month: latest?.[0] || null,
    days: latest?.[1]?.days instanceof Set ? latest[1].days.size : null,
    mandis: latest?.[1]?.byMandi ? Object.keys(latest[1].byMandi).length : null,
  };
  if (!latest || !prev || !(price > 0) || !(prevPrice > 0) || !consecutive(prev[0], latest[0])
    || daysOf(latest[1]) < minDays || daysOf(prev[1]) < minDays) {
    return { price, prevPrice: null, change: null, changePct: null, ...meta };
  }
  const change = price - prevPrice;
  return { price, prevPrice, change, changePct: parseFloat(((change / prevPrice) * 100).toFixed(1)), ...meta };
}

function consecutive(earlier, later) {
  const index = (m) => { const [y, mo] = String(m).split('-').map(Number); return y * 12 + mo - 1; };
  const gap = index(later) - index(earlier);
  return Number.isFinite(gap) && gap === 1;
}

/** Change-based signal only when a change exists. */
function changeSignal(changePct) {
  if (changePct == null) return null;
  if (changePct > 5) return { signal: 'sell', signalHi: 'बेचें' };
  if (changePct < -5) return { signal: 'buy', signalHi: 'खरीदें' };
  return null;
}

module.exports = { monthChange, consecutive, changeSignal, MIN_DAYS };
