// Helpers for फसल सलाह pages (Kisan Call Centre question summaries).

export const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
export const MONTHS_SHORT_HI = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];

export const KIND_LABEL = { keet: 'कीट', rog: 'रोग', poshan: 'पोषण', kharpatwar: 'खरपतवार', kheti: 'खेती का तरीका' };

export const FAMILY_LABEL = { crop: 'फसल की समस्या', weather: 'मौसम', scheme: 'योजना और कागज़', market: 'मंडी भाव', animal: 'पशुपालन', other: 'अन्य' };

/** Month number (1–12) in India time. */
export function currentMonthIST(now = Date.now()) {
  return new Date(now + 5.5 * 3600e3).getUTCMonth() + 1;
}

/** ?mahina=11 → 11; anything else → fallback. */
export function parseMonth(value, fallback) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback;
}

export const nextMonth = month => (month % 12) + 1;

/** "2025-07-29" → "29 जुलाई 2025". */
export function dateHi(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!match) return '';
  return `${Number(match[3])} ${MONTHS_HI[Number(match[2]) - 1]} ${match[1]}`;
}

/** "2022-01" → "जनवरी 2022". */
export function monthYearHi(value) {
  const match = /^(\d{4})-(\d{2})/.exec(value || '');
  return match ? `${MONTHS_HI[Number(match[2]) - 1]} ${match[1]}` : '';
}

/**
 * Problems that grow next month: in next month's list and either new to it or with a clearly
 * larger share than now. These are what a farmer can prepare for.
 */
export function risingNext(months, month, limit = 3) {
  const now = months?.[month - 1]?.top || [];
  const next = months?.[nextMonth(month) - 1]?.top || [];
  const shareNow = new Map(now.map(item => [item.key, item.share]));
  return next
    .filter(item => !shareNow.has(item.key) || item.share >= shareNow.get(item.key) * 1.3)
    .map(item => ({ ...item, shareNow: shareNow.get(item.key) ?? 0 }))
    .slice(0, limit);
}

/** A lift label only when the month really stands out. */
export function liftLabel(lift) {
  if (!Number.isFinite(lift) || lift < 1.5) return null;
  return lift >= 3 ? `आम महीनों से ${Math.round(lift)} गुना ज़्यादा` : `आम महीनों से ${lift.toFixed(1).replace(/\.0$/, '')} गुना`;
}

/** Share of crop questions as "100 में से N". */
export function perHundred(share) {
  const n = Math.round(Number(share) || 0);
  return n < 1 ? '100 में 1 से कम' : `100 में ${n}`;
}

/** Answers come in many scripts; the script decides the lang attribute for screen readers. */
export function scriptLang(text) {
  const value = String(text || '');
  const ranges = [
    ['hi', /[ऀ-ॿ]/], ['bn', /[ঀ-৿]/], ['pa', /[਀-੿]/], ['gu', /[઀-૿]/],
    ['or', /[଀-୿]/], ['ta', /[஀-௿]/], ['te', /[ఀ-౿]/], ['kn', /[ಀ-೿]/], ['ml', /[ഀ-ൿ]/],
  ];
  return ranges.find(([, re]) => re.test(value))?.[0] || 'en';
}

export const salahPath = (stateId, districtId) => ['/fasal-salah', stateId, districtId].filter(Boolean).join('/');
