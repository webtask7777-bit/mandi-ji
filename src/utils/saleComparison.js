/**
 * Farmer sale comparison: "Meri fasal kahan bechun?"
 * Compares what reaches the seller's hand for one load across a farmgate offer and
 * one or more mandis. Net receipt is not profit: cultivation costs are not included.
 *
 * Money is rupees, quantity kg, prices per quintal. A blank cost is "not entered",
 * never zero: an option with a blank required field is incomplete and not ranked.
 */

const QUINTAL_KG = 100;
const KG_FACTORS = { kg: 1, quintal: 100, tonne: 1000 };

export const SALE_OPTION_KINDS = Object.freeze(['farmgate', 'mandi']);

/** Fields every option needs (0 is a valid entry; blank is not). */
const REQUIRED = {
  farmgate: ['pricePerQuintal'],
  mandi: ['pricePerQuintal', 'freightTotal', 'lossPercent'],
};
const OPTIONAL_COSTS = ['handlingTotal', 'otherTotal', 'commissionPercent', 'marketFeePercent'];

const FIELD_LABELS = {
  pricePerQuintal: 'भाव', freightTotal: 'भाड़ा', lossPercent: 'वजन/माल की कमी',
  handlingTotal: 'लदाई-उतराई', otherTotal: 'अन्य खर्च', commissionPercent: 'आढ़त/कमीशन', marketFeePercent: 'मंडी शुल्क',
};

const blank = v => v === '' || v == null || (typeof v === 'string' && !v.trim());

export function toKg(quantity, unit) {
  if (blank(quantity) || !KG_FACTORS[unit]) return NaN;
  return Number(quantity) * KG_FACTORS[unit];
}

function readNumber(option, key, errors, { max } = {}) {
  const value = option[key];
  if (blank(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (max != null && n > max)) { errors[key] = `${FIELD_LABELS[key]} सही नहीं है`; return null; }
  return n;
}

/** Calculate one option. Returns { status: 'ok' | 'incomplete' | 'invalid', ... }. */
export function calculateSaleOption(option, quantityKg) {
  const kind = SALE_OPTION_KINDS.includes(option.kind) ? option.kind : 'mandi';
  const errors = {};
  const missing = [];
  const values = {};
  for (const key of [...REQUIRED[kind], ...OPTIONAL_COSTS, ...(kind === 'farmgate' ? ['freightTotal', 'lossPercent'] : [])]) {
    const max = key.endsWith('Percent') ? 100 : undefined;
    values[key] = readNumber(option, key, errors, { max });
    if (values[key] === null && REQUIRED[kind].includes(key) && !errors[key]) missing.push(FIELD_LABELS[key]);
  }
  if (values.pricePerQuintal === 0) errors.pricePerQuintal = 'भाव शून्य नहीं हो सकता';
  if (!(quantityKg > 0)) return { status: 'incomplete', kind, missing: ['मात्रा'], errors };
  if (Object.keys(errors).length) return { status: 'invalid', kind, missing, errors };
  if (missing.length) return { status: 'incomplete', kind, missing, errors };

  const v = Object.fromEntries(Object.entries(values).map(([k, n]) => [k, n ?? 0]));
  const saleableKg = quantityKg * (1 - v.lossPercent / 100);
  const gross = saleableKg / QUINTAL_KG * v.pricePerQuintal;
  const commission = gross * v.commissionPercent / 100;
  const marketFee = gross * v.marketFeePercent / 100;
  const transport = v.freightTotal + v.handlingTotal;
  const deductions = commission + marketFee + transport + v.otherTotal;
  const net = gross - deductions;
  const assumedZero = OPTIONAL_COSTS.filter(k => values[k] === null).map(k => FIELD_LABELS[k]);
  if (kind === 'farmgate') {
    if (values.freightTotal === null) assumedZero.push(FIELD_LABELS.freightTotal);
    if (values.lossPercent === null) assumedZero.push(FIELD_LABELS.lossPercent);
  }
  return {
    status: 'ok', kind, saleableKg, gross, commission, marketFee, transport, other: v.otherTotal,
    deductions, net, netPerQuintal: net / (quantityKg / QUINTAL_KG), assumedZero,
  };
}

/**
 * Compare options for one load. `closeCallPercent` marks results whose gap to the best is
 * small enough that a grade difference or an unmodelled cost could reverse the order.
 */
export function compareSaleOptions({ quantity, quantityUnit = 'quintal', options = [], closeCallPercent = 2 }) {
  const quantityKg = toKg(quantity, quantityUnit);
  const rows = options.map((option, index) => ({ index, label: option.label || `विकल्प ${index + 1}`, ...calculateSaleOption(option, quantityKg) }));
  const ranked = rows.filter(r => r.status === 'ok').sort((a, b) => b.net - a.net);
  const best = ranked[0] || null;
  for (const r of rows) {
    if (r.status !== 'ok') continue;
    r.rank = ranked.indexOf(r) + 1;
    r.behindBest = best.net - r.net;
  }
  const runnerUp = ranked[1] || null;
  const margin = best && runnerUp ? best.net - runnerUp.net : null;
  const closeCall = margin != null && Math.abs(best.net) > 0 && margin / Math.abs(best.net) * 100 < closeCallPercent;
  return { quantityKg: Number.isFinite(quantityKg) ? quantityKg : null, rows, best, runnerUp, margin, closeCall, comparable: ranked.length >= 2 };
}

/** Build a plain-text summary for copy/share; includes source dates so a shared result stays dated. */
export function saleComparisonSummary({ cropName, quantity, quantityUnit, options, result }) {
  const unit = { kg: 'किलो', quintal: 'क्विंटल', tonne: 'टन' }[quantityUnit] || quantityUnit;
  const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const lines = [`सही भाव · बेचने का हिसाब${cropName ? ` · ${cropName}` : ''}`, `मात्रा: ${quantity} ${unit}`];
  for (const row of result.rows) {
    const option = options[row.index];
    const date = option.quoteDate ? ` (भाव की तारीख ${option.quoteDate})` : '';
    lines.push(row.status === 'ok'
      ? `${row.rank}. ${row.label}: हाथ में ${money(row.net)} · भाव ${money(Number(option.pricePerQuintal))}/क्विंटल${date}`
      : `– ${row.label}: अधूरा (${row.missing.join(', ') || 'जाँचें'})`);
  }
  if (result.closeCall) lines.push('फ़र्क बहुत कम है: ग्रेड या छूटा खर्च नतीजा बदल सकता है।');
  lines.push('यह अनुमान है, पक्का भाव नहीं। खेती की लागत शामिल नहीं।');
  return lines.join('\n');
}
