// Two-market worksheet for the tomato guide, in the article's units (₹ per kg, unsold kg),
// on top of the shared calculateSaleOption used by /bechne-ka-hisab (₹ per quintal, loss %).
import { calculateSaleOption } from './saleComparison.js';

const blank = v => v == null || String(v).trim() === '';
const sum = (...values) => (values.every(blank) ? '' : values.reduce((total, v) => total + (blank(v) ? 0 : Number(v)), 0));

/** One market in the shared calculator's terms; `unsoldKg` above the quantity is an input error. */
export function marketResult(market, quantityKg) {
  const qty = Number(quantityKg);
  const unsold = blank(market.unsoldKg) ? '' : Number(market.unsoldKg);
  if (unsold !== '' && Number.isFinite(qty) && qty > 0 && unsold > qty) return { status: 'invalid', errors: { unsoldKg: 'बिक न पाने वाला माल कुल मात्रा से ज़्यादा है' }, missing: [] };
  return calculateSaleOption({
    kind: 'mandi',
    pricePerQuintal: blank(market.pricePerKg) ? '' : Number(market.pricePerKg) * 100,
    lossPercent: unsold === '' || !(qty > 0) ? '' : (unsold / qty) * 100,
    freightTotal: market.freight,
    handlingTotal: market.handling,
    otherTotal: sum(market.crates, market.other),
  }, qty);
}

/** Price per kg the far market needs for the same money as the near one, other inputs unchanged. */
export function breakEvenPerKg(near, far) {
  if (near?.status !== 'ok' || far?.status !== 'ok' || !(far.saleableKg > 0)) return null;
  return (near.net + far.transport + far.other) / far.saleableKg;
}

