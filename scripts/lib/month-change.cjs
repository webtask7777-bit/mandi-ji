/**
 * Month-over-month change for the ticker. Compares the latest month with the previous
 * one only when they are consecutive calendar months. Across a gap (missing source months)
 * the reporting mandis change too, so no change, and no change-based signal, is produced.
 *
 * @param {Array<[string, { prices: number[] }]>} months sorted [ 'YYYY-MM', bucket ] entries
 * @returns {{ price: number, prevPrice: number|null, change: number|null, changePct: number|null }}
 */
function monthChange(months) {
  const avg = (bucket) => (bucket && bucket.prices.length ? Math.round(bucket.prices.reduce((a, b) => a + b, 0) / bucket.prices.length) : 0);
  const latest = months.at(-1);
  const prev = months.at(-2);
  const price = avg(latest?.[1]);
  const prevPrice = avg(prev?.[1]);
  if (!latest || !prev || !(price > 0) || !(prevPrice > 0) || !consecutive(prev[0], latest[0])) {
    return { price, prevPrice: null, change: null, changePct: null };
  }
  const change = price - prevPrice;
  return { price, prevPrice, change, changePct: parseFloat(((change / prevPrice) * 100).toFixed(1)) };
}

function consecutive(earlier, later) {
  const index = (m) => { const [y, mo] = String(m).split('-').map(Number); return y * 12 + mo - 1; };
  const gap = index(later) - index(earlier);
  return Number.isFinite(gap) && gap === 1;
}

/** Change-based signal only when a change exists; MSP-based rules are applied by the caller. */
function changeSignal(changePct) {
  if (changePct == null) return null;
  if (changePct > 5) return { signal: 'sell', signalHi: 'बेचें' };
  if (changePct < -5) return { signal: 'buy', signalHi: 'खरीदें' };
  return null;
}

module.exports = { monthChange, consecutive, changeSignal };
