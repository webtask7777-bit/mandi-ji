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
  if (!Number.isFinite(quantityKg) || !(quantityKg > 0)) return { status: 'incomplete', kind, missing: ['मात्रा'], errors };
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
  if (![saleableKg, gross, deductions, net, net / (quantityKg / QUINTAL_KG)].every(Number.isFinite)) {
    return { status: 'invalid', kind, missing, errors: { calculation: 'मात्रा, भाव या खर्च की संख्या बहुत बड़ी है; जाँचकर भरें' } };
  }
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
 * Minimum nonnegative quote needed to reach the reference net receipts. Fees are
 * both deducted from gross receipts, just as in calculateSaleOption; loss reduces
 * saleable weight once. Keep the exact result here and round upward only in the UI.
 */
function farmgateBreakEven(option, row, reference) {
  const retainedShare = 1 - (Number(option.commissionPercent || 0) + Number(option.marketFeePercent || 0)) / 100;
  const effectiveQuintals = row.saleableKg / QUINTAL_KG * retainedShare;
  const fixedCosts = row.transport + row.other;
  if (!(effectiveQuintals > 0)) {
    return { status: 'unavailable', reason: row.saleableKg <= 0 ? 'no-saleable-weight' : 'no-retained-receipts' };
  }
  const threshold = (reference.net + fixedCosts) / effectiveQuintals;
  if (!Number.isFinite(threshold)) return { status: 'unavailable', reason: 'out-of-range' };
  return { status: 'ok', requiredPricePerQuintal: Math.max(0, threshold) };
}

const QUOTE_FIELDS = [
  { key: 'quoteDate', label: 'भाव की तारीख' },
  { key: 'variety', label: 'किस्म' },
  { key: 'grade', label: 'ग्रेड' },
];
const UNKNOWN_QUOTE_VALUES = new Set(['-', '—', '–', 'n/a', 'na', 'unknown', 'not available', 'अज्ञात', 'उपलब्ध नहीं']);
function knownQuoteValue(value, key) {
  if (typeof value !== 'string') return '';
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (key === 'quoteDate') {
    const day = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)?.[1];
    const parsed = day ? new Date(`${day}T00:00:00Z`) : null;
    return parsed && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : '';
  }
  return UNKNOWN_QUOTE_VALUES.has(normalized.toLowerCase()) ? '' : normalized;
}

/** Only compare supplied metadata on completed options; missing is never a match. */
function quoteCautions(options, rows) {
  const completed = rows.filter(row => row.status === 'ok');
  if (completed.length < 2) return { differingFields: [], missingFields: [] };
  const differingFields = [];
  const missingFields = [];
  for (const field of QUOTE_FIELDS) {
    const entries = completed.map(row => ({ index: row.index, label: row.label, value: knownQuoteValue(options[row.index][field.key], field.key) }));
    const known = entries.filter(entry => entry.value);
    if (known.length < completed.length) missingFields.push(field.label);
    if (new Set(known.map(entry => entry.value.toLowerCase())).size > 1) differingFields.push({ ...field, entries: known });
  }
  return { differingFields, missingFields };
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
  // Options less than ₹1 apart share a rank: a rounding difference is not a winner.
  for (const r of rows) {
    if (r.status !== 'ok') continue;
    r.behindBest = best.net - r.net;
    r.rank = 1 + ranked.filter(other => other.net - r.net >= 1).length;
  }
  const runnerUp = ranked[1] || null;
  const margin = best && runnerUp ? best.net - runnerUp.net : null;
  const tie = margin != null && margin < 1;
  const closeCall = tie || (margin != null && Math.abs(best.net) > 0 && margin / Math.abs(best.net) * 100 < closeCallPercent);
  const farmgateReference = rows.find(row => row.status === 'ok' && row.kind === 'farmgate') || null;
  if (farmgateReference) {
    for (const row of rows) {
      if (row.status === 'ok' && row.kind === 'mandi') row.farmgateBreakEven = farmgateBreakEven(options[row.index], row, farmgateReference);
    }
  }
  return { quantityKg: Number.isFinite(quantityKg) ? quantityKg : null, rows, best, runnerUp, margin, tie, closeCall, comparable: ranked.length >= 2, farmgateReference, quoteCautions: quoteCautions(options, rows) };
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
  if (result.tie) lines.push('दोनों विकल्पों में लगभग बराबर रकम बचती है।');
  else if (result.closeCall) lines.push('फ़र्क बहुत कम है: ग्रेड या छूटा खर्च नतीजा बदल सकता है।');
  lines.push('यह अनुमान है, पक्का भाव नहीं। खेती की लागत शामिल नहीं।');
  return lines.join('\n');
}
