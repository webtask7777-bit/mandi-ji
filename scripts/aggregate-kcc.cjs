#!/usr/bin/env node
/**
 * Build the फसल सलाह (crop advice) summaries from the raw KCC months fetched by
 * scripts/fetch-kcc.cjs (.cache/kcc/raw/YYYY-MM.ndjson.gz).
 *
 * Output (server/db/data/kcc/):
 *   meta.json                      source, coverage, sampling, mode (seasonal | live)
 *   index.json                     national month-wise top problems + state/district list
 *   states/<state>.json            state month-wise top problems, districts, Q&A per topic
 *   districts/<state>/<dist>.json  district month-wise top problems, 12-month curves, alerts
 *
 * Every figure is computed per (year, month) first and then averaged over the years that
 * cover that month, so a year with heavy call volume (January 2022) does not outweigh the
 * others, and months covered by different numbers of years stay comparable. Shares are of
 * crop-advice calls. A month or topic with too few calls per year is not ranked. A sampled
 * build (development only) publishes shares, never call counts.
 *
 * Live alerts are computed only when the newest call is at most LIVE_MAX_AGE_DAYS old:
 * the last 14 days of a district's topic against the same window (same end date) in earlier
 * years, counting covered years without such calls as zero.
 *
 * Usage: node scripts/aggregate-kcc.cjs [--today 2026-10-22] [--allow-shrink]
 *   Refuses to replace published summaries with ones covering fewer months unless --allow-shrink.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { classify, topicKey, FAMILY_HI, clean } = require('./lib/kcc-topics.cjs');

const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, '.cache', 'kcc', 'raw');
const OUT_DIR = path.join(ROOT, 'server', 'db', 'data', 'kcc');
const STATES_FILE = path.join(ROOT, 'server', 'db', 'data', 'india', 'states.json');
const RESOURCE_ID = 'cef25fe2-9231-4128-8aec-2c948fedd43f';
const LIVE_MAX_AGE_DAYS = 45;
const LIVE_WINDOW_DAYS = 14;
const TOP_PER_MONTH = 8;
const SERIES_TOPICS = 12;
const QA_PER_TOPIC = 8;          // stored; pages show the 4 most asked in the chosen month
const QA_GROUP_CAP = 400;
const FAMILIES = ['crop', 'weather', 'market', 'scheme', 'animal', 'other'];
// Per scope: minimum crop-advice calls per year in a month before it is ranked at all, and
// minimum calls per year for a topic to be listed.
const MIN_MONTH = { national: 500, state: 100, district: 40 };
const MIN_TOPIC = { national: 50, state: 8, district: 3 };
const MIN_DISTRICT_CROP_CALLS = 300;

const args = process.argv.slice(2);
const todayArg = args.includes('--today') ? args[args.indexOf('--today') + 1] : null;
const TODAY = todayArg && /^\d{4}-\d{2}-\d{2}$/.test(todayArg) ? todayArg : new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const ALLOW_SHRINK = args.includes('--allow-shrink');

// KCC spells states its own way (TAMILNADU, ORISSA, CHATTISGARH …).
const compact = value => clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
const STATE_ALIASES = {
  tamilnadu: 'tamil-nadu', orissa: 'odisha', chattisgarh: 'chhattisgarh', chhatisgarh: 'chhattisgarh',
  pondicherry: 'puducherry', delhi: 'delhi', nctofdelhi: 'delhi', jammuandkashmir: 'jammu-kashmir', jammukashmir: 'jammu-kashmir',
  andamanandnicobarislands: 'andaman-nicobar', andamanandnicobar: 'andaman-nicobar', andamannicobar: 'andaman-nicobar',
  dadraandnagarhaveli: 'dadra-daman', damananddiu: 'dadra-daman', dadraandnagarhavelianddamananddiu: 'dadra-daman',
  uttaranchal: 'uttarakhand', jharkand: 'jharkhand', aandnislands: 'andaman-nicobar', telengana: 'telangana', andrapradesh: 'andhra-pradesh',
};
const slug = value => clean(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s(/-])\p{L}/gu, match => match.toUpperCase());

function loadStates() {
  const states = JSON.parse(fs.readFileSync(STATES_FILE, 'utf8'));
  const byCompact = new Map();
  for (const state of states) { byCompact.set(compact(state.name), state); byCompact.set(compact(state.id), state); }
  const byId = new Map(states.map(state => [state.id, state]));
  return name => {
    const key = compact(name);
    return byCompact.get(key) || byId.get(STATE_ALIASES[key]) || null;
  };
}

function rawMonths() {
  if (!fs.existsSync(RAW_DIR)) return [];
  return fs.readdirSync(RAW_DIR).filter(file => /^\d{4}-\d{2}\.json$/.test(file)).sort().map(file => {
    const meta = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf8'));
    return { ...meta, file: path.join(RAW_DIR, `${meta.month}.ndjson.gz`) };
  }).filter(meta => fs.existsSync(meta.file));
}

async function* readRows(file) {
  const lines = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}

// Counters: arrays indexed by slot = yearIndex * 12 + month ------------------------------
const zeros = n => Array.from({ length: n }, () => 0);
const inc = (map, key, init) => { let value = map.get(key); if (!value) { value = init(); map.set(key, value); } return value; };
const mean = values => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round1 = value => Math.round(value * 10) / 10;

function newScope(slots) {
  return { calls: 0, slots, total: zeros(slots), families: new Map(), topics: new Map(), crops: new Map() };
}

function addToScope(scope, slot, cls) {
  scope.calls++;
  scope.total[slot]++;
  inc(scope.families, cls.family, () => zeros(scope.slots))[slot]++;
  if (cls.crop && cls.family === 'crop') scope.crops.set(cls.crop.id, (scope.crops.get(cls.crop.id) || 0) + 1);
  if (cls.crop && cls.problem) inc(scope.topics, topicKey(cls.crop.id, cls.problem.id), () => zeros(scope.slots))[slot]++;
}

// Q&A: per state and topic, the most asked question groups, their most common answer and the
// months they were asked in (so a page shows October's questions in October).
// Doses are part of the advice: digits are kept, so different doses are different answers.
const normalizeText = value => clean(value).toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
const USELESS_ANSWER = /^(?:please )?(?:contact|kvk|call back|information (?:given|provided)|answer given|told|explained)\b/i;
const USELESS_ANSWER_HI = /^(?:कृपया )?(?:सम्पर्क|संपर्क)/;
const PHONE_ONLY = /^[\d\s+()-]{6,}$/;
const isUseless = answer => PHONE_ONLY.test(answer) || ((USELESS_ANSWER.test(answer) || USELESS_ANSWER_HI.test(answer)) && answer.length < 80);

function addQa(store, key, row, month) {
  const question = clean(row.q);
  const answer = clean(row.a);
  if (question.length < 12 || answer.length < 30 || isUseless(answer)) return;
  const groups = inc(store, key, () => new Map());
  const qKey = normalizeText(question);
  if (!qKey) return;
  let group = groups.get(qKey);
  if (!group) {
    if (groups.size >= QA_GROUP_CAP) {
      // Keep memory bounded: drop the least asked group. The newcomer counts only its own calls.
      let minKey = null; let min = Infinity;
      for (const [k, g] of groups) if (g.n < min) { min = g.n; minKey = k; }
      groups.delete(minKey);
    }
    group = { n: 0, q: question, months: zeros(12), answers: new Map() };
    groups.set(qKey, group);
  }
  group.n++;
  group.months[month]++;
  const aKey = normalizeText(answer).slice(0, 200);
  const entry = group.answers.get(aKey) || { n: 0, a: answer, last: '' };
  entry.n++;
  if (row.t > entry.last) entry.last = row.t.slice(0, 10);
  group.answers.set(aKey, entry);
  if (group.answers.size > 25) {
    const weakest = [...group.answers.entries()].sort((a, b) => a[1].n - b[1].n)[0][0];
    group.answers.delete(weakest);
  }
}

const sameAdvice = (a, b) => normalizeText(a).slice(0, 160) === normalizeText(b).slice(0, 160);
const dedupeAdvice = list => list.filter((item, index) => list.findIndex(other => sameAdvice(other.a, item.a)) === index);

function bestQa(groups) {
  if (!groups) return [];
  return dedupeAdvice([...groups.values()].sort((a, b) => b.n - a.n).slice(0, QA_PER_TOPIC * 3).map(group => {
    const answer = [...group.answers.values()].sort((a, b) => b.n - a.n || b.a.length - a.a.length)[0];
    return answer ? { q: group.q, a: answer.a, asked: group.n, months: group.months, answeredOn: answer.last } : null;
  }).filter(Boolean)).slice(0, QA_PER_TOPIC);
}

// Output shaping ---------------------------------------------------------------------
/**
 * covered[slot] says which (year, month) the raw data holds. For a month, the years used are
 * those covered with crop calls in this scope; every share is a mean of per-year shares.
 */
function summarize(scope, ctx, topicInfo, level) {
  const { years, covered, sampled } = ctx;
  const crop = scope.families.get('crop') || zeros(scope.slots);
  const yearsFor = month => years.map((_, y) => y * 12 + month).filter(slot => covered[slot] && crop[slot] > 0);
  const minMonth = sampled ? 2 : MIN_MONTH[level];
  const minTopic = sampled ? 1 : MIN_TOPIC[level];

  const monthInfo = Array.from({ length: 12 }, (_, m) => {
    const slots = yearsFor(m);
    const cropPerYear = mean(slots.map(slot => crop[slot]));
    return { slots, cropPerYear, enough: slots.length > 0 && cropPerYear >= minMonth };
  });
  const share = (series, m) => mean(monthInfo[m].slots.map(slot => series[slot] / crop[slot])) * 100;
  const perYear = (series, m) => mean(monthInfo[m].slots.map(slot => series[slot]));

  // Topic share per month (null where the month is not covered or too thin).
  const shares = new Map();
  for (const [key, series] of scope.topics) shares.set(key, monthInfo.map((info, m) => (info.enough ? share(series, m) : null)));
  const annual = new Map([...shares].map(([key, values]) => [key, mean(values.filter(v => v != null))]));
  const listed = (key, m) => monthInfo[m].enough && perYear(scope.topics.get(key), m) >= minTopic;

  const months = monthInfo.map((info, m) => {
    const totalSlots = years.map((_, y) => y * 12 + m).filter(slot => covered[slot] && scope.total[slot] > 0);
    const families = Object.fromEntries(FAMILIES.map(family => {
      const series = scope.families.get(family);
      return [family, series && totalSlots.length ? round1(mean(totalSlots.map(slot => series[slot] / scope.total[slot])) * 100) : 0];
    }));
    const top = info.enough ? [...scope.topics.keys()]
      .filter(key => listed(key, m))
      .map(key => ({ key, share: shares.get(key)[m] }))
      .sort((a, b) => b.share - a.share)
      .slice(0, TOP_PER_MONTH)
      .map(item => {
        const base = annual.get(item.key);
        return {
          key: item.key,
          share: round1(item.share),
          // How much more this problem is asked about this month than in an average month.
          lift: base ? round1(item.share / base) : null,
          ...(sampled ? {} : { callsPerYear: Math.round(perYear(scope.topics.get(item.key), m)) }),
        };
      }) : [];
    // Problems that grow next month: clearly larger share (≥1.3× and +1 point) and listed then.
    const next = (m + 1) % 12;
    const rising = info.enough && monthInfo[next].enough ? [...scope.topics.keys()]
      .filter(key => listed(key, next))
      .map(key => ({ key, share: shares.get(key)[next], shareNow: shares.get(key)[m] || 0 }))
      .filter(item => item.share >= 2 && item.share >= item.shareNow * 1.3 && item.share - item.shareNow >= 1)
      .sort((a, b) => (b.share - b.shareNow) - (a.share - a.shareNow))
      .slice(0, 3)
      .map(item => ({ key: item.key, share: round1(item.share), shareNow: round1(item.shareNow) })) : [];
    return {
      month: m + 1, covered: info.slots.length > 0, years: info.slots.length, enough: info.enough,
      ...(sampled ? {} : { callsPerYear: Math.round(mean(totalSlots.map(slot => scope.total[slot]))), cropCallsPerYear: Math.round(info.cropPerYear) }),
      families, top, rising,
    };
  });

  // Heatmap: each topic's monthly share against its own peak share (not call volume).
  const seriesKeys = [...annual.entries()].filter(([key]) => monthInfo.some((_, m) => listed(key, m)))
    .sort((a, b) => b[1] - a[1]).slice(0, SERIES_TOPICS).map(([key]) => key);
  const series = Object.fromEntries(seriesKeys.map(key => {
    const values = shares.get(key);
    const peak = Math.max(...values.filter(v => v != null)) || 1;
    return [key, values.map(value => (value == null ? null : Math.round(value * 100 / peak)))];
  }));
  const used = new Set([...months.flatMap(month => [...month.top, ...month.rising].map(item => item.key)), ...seriesKeys]);
  const topics = Object.fromEntries([...used].map(key => [key, topicInfo.get(key)]));
  const crops = [...scope.crops.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
  return { months, series, topics, crops, used };
}

/** Per crop and month: which problems make up that crop's calls (for the crop price pages). */
function cropProblems(scope, ctx, topicInfo, { minPerYear, limit = 40 }) {
  const { years, covered } = ctx;
  const byCrop = new Map();
  for (const [key, series] of scope.topics) {
    const info = topicInfo.get(key);
    if (!info?.mandiCrop) continue;
    const entry = inc(byCrop, info.mandiCrop, () => ({ total: zeros(scope.slots), problems: [], cropHi: info.cropHi }));
    series.forEach((n, slot) => { entry.total[slot] += n; });
    entry.problems.push({ key, series, problemHi: info.problemHi, kind: info.kind });
  }
  const out = {};
  const ranked = [...byCrop.entries()].sort((a, b) => b[1].total.reduce((x, y) => x + y) - a[1].total.reduce((x, y) => x + y)).slice(0, limit);
  for (const [mandiCrop, entry] of ranked) {
    const months = Array.from({ length: 12 }, (_, m) => {
      const slots = years.map((_, y) => y * 12 + m).filter(slot => covered[slot] && entry.total[slot] > 0);
      if (!slots.length || mean(slots.map(slot => entry.total[slot])) < minPerYear) return [];
      return entry.problems
        .map(problem => ({ key: problem.key, problemHi: problem.problemHi, kind: problem.kind, share: round1(mean(slots.map(slot => problem.series[slot] / entry.total[slot])) * 100) }))
        .filter(problem => problem.share >= 5).sort((a, b) => b.share - a.share).slice(0, 4);
    });
    if (months.some(list => list.length)) out[mandiCrop] = { cropHi: entry.cropHi, months };
  }
  return out;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(value));
  fs.renameSync(`${file}.tmp`, file);
}

async function main() {
  const months = rawMonths();
  if (!months.length) { console.error('No raw KCC months in .cache/kcc/raw. Run scripts/fetch-kcc.cjs first.'); process.exit(1); }
  // A partial raw set (failed fetch, evicted cache) must not replace fuller published summaries.
  try {
    const published = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'meta.json'), 'utf8'));
    if (!ALLOW_SHRINK && !published.sampled && published.coverage?.months > months.length) {
      console.error(`Refusing to publish ${months.length} months over ${published.coverage.months} already published. Use --allow-shrink to override.`);
      process.exit(1);
    }
  } catch { /* nothing published yet */ }
  const sampled = months.some(meta => meta.sample);
  const stateOf = loadStates();
  const years = [...new Set(months.map(meta => Number(meta.month.slice(0, 4))))].sort();
  const slots = years.length * 12;
  const slotOf = (year, month) => years.indexOf(year) * 12 + month;
  const covered = zeros(slots).map(() => false);
  for (const meta of months) covered[slotOf(Number(meta.month.slice(0, 4)), Number(meta.month.slice(5)) - 1)] = true;
  const ctx = { years, covered, sampled };

  const national = newScope(slots);
  const states = new Map();      // stateId → { state, scope, districts: Map(id → {name, scope}) }
  const qa = new Map();          // stateId → Map(topicKey → groups)
  const topicInfo = new Map();
  const recent = new Map();      // `${state}/${district}` → Map(topicKey → { now, base: Map(windowYear → n) })
  const unknownStates = new Map();
  let newestCall = '';
  let oldestCall = '';
  for (const meta of months) if (meta.newestCall > newestCall) newestCall = meta.newestCall;
  let total = 0;
  let storedNewest = '';

  const newestDate = newestCall.slice(0, 10);
  const liveAge = newestDate ? (Date.parse(`${TODAY}T00:00:00Z`) - Date.parse(`${newestDate}T00:00:00Z`)) / 86400e3 : Infinity;
  // Live only when the source is recent and its newest month is stored completely.
  const newestStored = months.at(-1);
  const live = liveAge <= LIVE_MAX_AGE_DAYS && !sampled && newestStored?.month === newestDate.slice(0, 7) && newestStored.complete;
  const end = newestDate ? new Date(`${newestDate}T00:00:00Z`) : null;
  // The window ending on the same calendar day in another year (Feb 29 falls back to Feb 28).
  const windowEndIn = year => Date.UTC(year, end.getUTCMonth(), Math.min(end.getUTCDate(), new Date(Date.UTC(year, end.getUTCMonth() + 1, 0)).getUTCDate()));
  const windowYearOf = time => {
    const year = new Date(time).getUTCFullYear();
    for (const candidate of [year, year + 1]) {
      const windowEnd = windowEndIn(candidate);
      if (time <= windowEnd && windowEnd - time < LIVE_WINDOW_DAYS * 86400e3) return candidate;
    }
    return null;
  };
  const endYear = end ? end.getUTCFullYear() : null;

  for (const meta of months) {
    for await (const row of readRows(meta.file)) {
      const state = stateOf(row.s);
      if (!state) { unknownStates.set(row.s, (unknownStates.get(row.s) || 0) + 1); continue; }
      const year = Number(row.t.slice(0, 4));
      const month = Number(row.t.slice(5, 7)) - 1;
      if (!(month >= 0 && month < 12) || !years.includes(year)) continue;
      const slot = slotOf(year, month);
      total++;
      if (!oldestCall || row.t < oldestCall) oldestCall = row.t;
      if (row.t > storedNewest) storedNewest = row.t;
      const cls = classify(row);
      if (cls.crop && cls.problem) {
        const key = topicKey(cls.crop.id, cls.problem.id);
        if (!topicInfo.has(key)) topicInfo.set(key, { crop: cls.crop.id, cropHi: cls.crop.hi, mandiCrop: cls.crop.mandi || null, problem: cls.problem.id, problemHi: cls.problem.hi, kind: cls.problem.kind });
        addQa(inc(qa, state.id, () => new Map()), key, row, month);
      }
      addToScope(national, slot, cls);
      const stateEntry = inc(states, state.id, () => ({ state, scope: newScope(slots), districts: new Map() }));
      addToScope(stateEntry.scope, slot, cls);
      const districtId = slug(row.d);
      if (!districtId) continue;
      const district = inc(stateEntry.districts, districtId, () => ({ name: titleCase(row.d), scope: newScope(slots) }));
      addToScope(district.scope, slot, cls);

      if (live && cls.crop && cls.problem) {
        const windowYear = windowYearOf(Date.parse(`${row.t.slice(0, 10)}T00:00:00Z`));
        if (windowYear == null) continue;
        const bucket = inc(inc(recent, `${state.id}/${districtId}`, () => new Map()), topicKey(cls.crop.id, cls.problem.id), () => ({ now: 0, base: new Map() }));
        if (windowYear === endYear) bucket.now++;
        else bucket.base.set(windowYear, (bucket.base.get(windowYear) || 0) + 1);
      }
    }
    console.log(`  ${meta.month}: read${meta.sample ? ' (sample)' : ''}`);
  }
  // Baseline years: earlier windows the raw data covers, with zero calls counted as zero.
  const baselineYears = years.filter(year => year !== endYear && end && covered[slotOf(year, end.getUTCMonth())]);

  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  const stateList = [];
  for (const [stateId, entry] of [...states.entries()].sort((a, b) => b[1].scope.calls - a[1].scope.calls)) {
    const summary = summarize(entry.scope, ctx, topicInfo, 'state');
    const districts = [];
    const stateQa = qa.get(stateId) || new Map();
    const qaKeys = new Set(summary.used);
    for (const [districtId, district] of [...entry.districts.entries()].sort((a, b) => b[1].scope.calls - a[1].scope.calls)) {
      // A district with too few crop questions to say anything per month is listed, not published.
      const cropCalls = (district.scope.families.get('crop') || []).reduce((a, b) => a + b, 0);
      const enough = cropCalls >= (sampled ? 20 : MIN_DISTRICT_CROP_CALLS);
      districts.push({ id: districtId, name: district.name, ...(sampled ? {} : { calls: district.scope.calls }), published: enough });
      if (!enough) continue;
      const dist = summarize(district.scope, ctx, topicInfo, 'district');
      for (const key of dist.used) qaKeys.add(key);
      const alerts = [];
      for (const [key, bucket] of recent.get(`${stateId}/${districtId}`) || []) {
        const baseline = baselineYears.length ? mean(baselineYears.map(year => bucket.base.get(year) || 0)) : 0;
        if (bucket.now >= 8 && bucket.now >= Math.max(1, baseline) * 2.5) alerts.push({ key, recent: bucket.now, usual: round1(baseline) });
      }
      alerts.sort((a, b) => b.recent / Math.max(1, b.usual) - a.recent / Math.max(1, a.usual));
      for (const alert of alerts.slice(0, 5)) if (!dist.topics[alert.key] && topicInfo.has(alert.key)) dist.topics[alert.key] = topicInfo.get(alert.key);
      writeJson(path.join(OUT_DIR, 'districts', stateId, `${districtId}.json`), {
        id: districtId, name: district.name, state: { id: stateId, name: entry.state.name, nameHi: entry.state.nameHi },
        ...(sampled ? {} : { calls: district.scope.calls }),
        months: dist.months, series: dist.series, topics: dist.topics, crops: dist.crops, alerts: alerts.slice(0, 5),
      });
    }
    const qaOut = Object.fromEntries([...qaKeys].map(key => [key, bestQa(stateQa.get(key))]).filter(([, list]) => list.length));
    writeJson(path.join(OUT_DIR, 'states', `${stateId}.json`), {
      id: stateId, name: entry.state.name, nameHi: entry.state.nameHi, ...(sampled ? {} : { calls: entry.scope.calls }),
      months: summary.months, series: summary.series, topics: summary.topics, crops: summary.crops, districts, qa: qaOut,
      cropProblems: cropProblems(entry.scope, ctx, topicInfo, { minPerYear: sampled ? 3 : 30 }),
    });
    stateList.push({ id: stateId, name: entry.state.name, nameHi: entry.state.nameHi, ...(sampled ? {} : { calls: entry.scope.calls }), districts: districts.filter(d => d.published).map(({ id, name }) => ({ id, name })) });
  }

  const nationalSummary = summarize(national, ctx, topicInfo, 'national');
  // National Q&A: the most asked answers across states, Hindi/English first (the page is Hindi).
  const readable = text => /[ऀ-ॿ]/.test(text) || !/[^\u0000-ɏ]/.test(text);
  const nationalQa = Object.fromEntries([...nationalSummary.used].map(key => {
    const candidates = [...qa.entries()].flatMap(([stateId, store]) => bestQa(store.get(key)).map(item => ({ ...item, stateHi: states.get(stateId)?.state.nameHi })));
    candidates.sort((a, b) => Number(readable(b.a)) - Number(readable(a.a)) || b.asked - a.asked);
    return [key, dedupeAdvice(candidates).slice(0, QA_PER_TOPIC)];
  }).filter(([, list]) => list.length));
  writeJson(path.join(OUT_DIR, 'index.json'), {
    months: nationalSummary.months, series: nationalSummary.series, topics: nationalSummary.topics, crops: nationalSummary.crops,
    families: FAMILY_HI, states: stateList, qa: nationalQa,
    cropProblems: cropProblems(national, ctx, topicInfo, { minPerYear: sampled ? 4 : 100 }),
  });
  const coveredMonths = months.map(meta => meta.month);
  writeJson(path.join(OUT_DIR, 'meta.json'), {
    source: 'Kisan Call Centre (KCC) — Transcripts of farmers queries & answers, data.gov.in',
    sourceUrl: 'https://www.data.gov.in/resource/kisan-call-centre-kcc-transcripts-farmers-queries-answers',
    resourceId: RESOURCE_ID,
    coverage: { from: coveredMonths[0], to: coveredMonths.at(-1), oldestCall: oldestCall.slice(0, 10), newestCall: storedNewest.slice(0, 10), sourceNewestCall: newestDate, months: coveredMonths.length },
    ...(sampled ? {} : { calls: total }),
    sampled,
    mode: live ? 'live' : 'seasonal',
    liveWindowDays: LIVE_WINDOW_DAYS,
    builtOn: TODAY,
  });
  if (unknownStates.size) console.log('Unmatched state names:', Object.fromEntries(unknownStates));
  console.log(`KCC summaries: ${total} calls, ${stateList.length} states, ${stateList.reduce((n, s) => n + s.districts.length, 0)} districts, mode ${live ? 'live' : 'seasonal'}${sampled ? ' (SAMPLE)' : ''}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
