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

/**
 * Path of a फसल सलाह page. A chosen month other than the current one travels as ?mahina=,
 * so moving between India, state and district keeps the month the reader picked. Leaving
 * `month` out (or passing the current month) gives the plain path.
 */
export function salahPath(stateId, districtId, month = null, current = currentMonthIST()) {
  const base = ['/fasal-salah', stateId, districtId].filter(Boolean).join('/');
  const chosen = parseMonth(month, null);
  return chosen && chosen !== current ? `${base}?mahina=${chosen}` : base;
}

/**
 * Spelling-tolerant key for place names (Nashik/Nasik, Ahmednagar/Ahmadnagar, Bareilly/Barely):
 * the first letter and the consonant skeleton, without h, doubled letters or later vowels.
 */
export function placeKey(value) {
  const letters = String(value || '').toLowerCase().replace(/[^a-z]/g, '').replace(/h/g, '').replace(/w/g, 'v');
  return (letters.slice(0, 1) + letters.slice(1).replace(/[aeiouy]/g, '')).replace(/(.)\1+/g, '$1');
}

// Devanagari → rough Roman, only as far as placeKey needs it: consonants, the first vowel,
// nukta letters as their usual Roman spellings and the nasal sign as n (m before p/b/m).
const DEVANAGARI_VOWELS = { 'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au' };
const DEVANAGARI_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'ळ': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
};
const NUKTA = { 'क': 'q', 'ख': 'kh', 'ग': 'g', 'ज': 'z', 'ड': 'r', 'ढ': 'rh', 'फ': 'f' };
const LABIAL = new Set(['प', 'फ', 'ब', 'भ', 'म']);

export function devanagariToRoman(value) {
  const text = String(value || '').normalize('NFD').replace(/[ांँ]व(?=$|[\s-])/g, 'ां'); // -गांव is "-gaon"
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (DEVANAGARI_CONSONANTS[ch]) {
      const nukta = text[i + 1] === '़';
      out += nukta && NUKTA[ch] ? NUKTA[ch] : DEVANAGARI_CONSONANTS[ch];
      if (nukta) i++;
      out += 'a'; // the inherent vowel; placeKey drops it after the first letter
    } else if (DEVANAGARI_VOWELS[ch]) out += DEVANAGARI_VOWELS[ch];
    else if (ch === 'ं') out += LABIAL.has(text[i + 1]) ? 'm' : 'n';
    else if (/[a-z]/i.test(ch)) out += ch;
    else if (/\s|-/.test(ch)) out += ' ';
    // matras, virama and chandrabindu add nothing to the key
  }
  return out;
}

const DEVANAGARI = /[ऀ-ॿ]/;
// One key for Roman and Hindi spellings: z/j, f/ph, q/k and c/k are spelled either way.
export const soundKey = value => placeKey(DEVANAGARI.test(String(value || '')) ? devanagariToRoman(value) : value)
  .replace(/z/g, 'j').replace(/f/g, 'p').replace(/q|c/g, 'k').replace(/(.)\1+/g, '$1');
const plain = value => String(value || '').normalize('NFC').toLowerCase().replace(/[\s\-.,()/]+/g, ' ').trim();

/**
 * District search for the फसल सलाह pages, in Hindi or English.
 *
 * Tiers: 0 exact name, Hindi name or alias; 1 name prefix; 2 a later word of the name
 * ("Kanker" in "Uttar Bastar Kanker"); 3 same spelling key (Nasik/Nashik, रायपुर/Raipur);
 * 4 key prefix while typing; 5 every district of a matching state. Loose look-alikes
 * (Raipur → Chandrapur) appear only when nothing above matched, and are flagged `similar`.
 * `total` counts every match before `limit`.
 */
export function findPlaces(states, query, limit = 12) {
  const q = plain(query);
  if (q.length < 2) return { matches: [], total: 0, similar: false, state: null };
  const qKey = soundKey(q);
  const strong = [];
  const loose = [];
  let stateMatch = null;
  for (const state of states || []) {
    const stateNames = [state.name, state.nameHi].filter(Boolean).map(plain);
    const stateHit = stateNames.some(name => name.startsWith(q)) || (qKey.length >= 3 && soundKey(state.name) === qKey);
    if (stateHit && !stateMatch) stateMatch = state;
    for (const district of state.districts || []) {
      const names = [district.name, district.nameHi, ...(district.aliases || [])].filter(Boolean).map(plain);
      const keys = names.map(soundKey);
      const tier = names.includes(q) ? 0
        : names.some(name => name.startsWith(q)) ? 1
          : names.some(name => name.split(' ').slice(1).some(word => word.startsWith(q))) ? 2
            : qKey.length >= 2 && keys.includes(qKey) ? 3
              : qKey.length >= 3 && keys.some(key => key.startsWith(qKey)) ? 4
                : stateHit ? 5 : null;
      if (tier !== null) strong.push({ tier, state, district });
      else if (qKey.length >= 4 && keys.some(key => key.includes(qKey))) loose.push({ tier: 6, state, district });
    }
  }
  const list = strong.length ? strong : loose;
  const sorted = list.sort((a, b) => a.tier - b.tier || a.district.name.localeCompare(b.district.name));
  return { matches: sorted.slice(0, limit), total: sorted.length, similar: !strong.length && loose.length > 0, state: stateMatch };
}

/** Districts matching a search, best first, at most `limit` (see findPlaces). */
export const searchPlaces = (states, query, limit = 12) => findPlaces(states, query, limit).matches;

// Archived answers ---------------------------------------------------------------------

/** The fetcher clips long answers and ends them with "…": the rest is not in our records. */
export const isClippedAnswer = item => Boolean(item?.clipped) || (/…$/.test(String(item?.a || '')) && String(item?.a || '').length >= 699);

const DOSE = /\d\s*(?:ग्राम|ग्रा\.?|मि\.?\s?ली|मिली|एम\s?एल|किलो|कि\.?\s?ग्रा|लीटर|ली\.|gm|g\b|grams?|ml|kg|litres?|liters?|lit\b|l\b)/i;
const PER_CONTAINER = /(?:प्रति|\/)\s*(?:पंप|पम्प|टंकी|स्प्रेयर)|(?:per|\/)\s*(?:pump|tank|sprayer)/i;
const WATER_VOLUME = /\d+\s*(?:लीटर|ली\.|litres?|liters?|lit\b|l\b)\s*(?:पानी|water)?/i;

/**
 * What an archived answer leaves out that a farmer needs before using a dose. The text is
 * never changed; these flags only decide which cautions sit beside it.
 */
export function answerCautions(item) {
  const text = String(item?.a || '');
  const dose = DOSE.test(text);
  return {
    clipped: isClippedAnswer(item),
    dose,
    // "15 ग्राम/पंप" without the tank size: the dose per litre cannot be read from it.
    perContainerOnly: dose && PER_CONTAINER.test(text) && !WATER_VOLUME.test(text),
  };
}

// Sample strength ----------------------------------------------------------------------

// A problem asked about fewer times than this per year in the month, or seen in fewer covered
// years, is listed with a "few questions" note and without a "N गुना" lift: a handful of calls
// can swing the share and the lift either way. The aggregator's own floor (MIN_TOPIC) only
// decides whether a problem is listed at all.
export const STRONG_TOPIC_CALLS_PER_YEAR = 10;
export const STRONG_TOPIC_YEARS = 2;

/** 'strong' | 'limited' | 'unknown' (sampled builds publish no counts). */
export function topicStrength(item, monthData) {
  if (!Number.isFinite(item?.callsPerYear)) return 'unknown';
  if (item.callsPerYear < STRONG_TOPIC_CALLS_PER_YEAR) return 'limited';
  if (Number.isFinite(monthData?.years) && monthData.years < STRONG_TOPIC_YEARS) return 'limited';
  return 'strong';
}
