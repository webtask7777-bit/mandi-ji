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
 * Counts are averaged per covered year, so a month that appears in four years is not
 * four times as important as one that appears in three. A sampled build (development
 * only) publishes shares, never call counts.
 *
 * Live alerts are computed only when the newest call is at most LIVE_MAX_AGE_DAYS old:
 * the last 14 days of a district's topic against the same calendar window in earlier years.
 *
 * Usage: node scripts/aggregate-kcc.cjs [--today 2026-10-22]
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
const QA_PER_TOPIC = 4;
const QA_GROUP_CAP = 400;
const FAMILIES = ['crop', 'weather', 'market', 'scheme', 'animal', 'other'];

const args = process.argv.slice(2);
const todayArg = args.includes('--today') ? args[args.indexOf('--today') + 1] : null;
const TODAY = todayArg && /^\d{4}-\d{2}-\d{2}$/.test(todayArg) ? todayArg : new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

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

// Counters ---------------------------------------------------------------------------
const zeros = n => Array.from({ length: n }, () => 0);
const inc = (map, key, init) => { let value = map.get(key); if (!value) { value = init(); map.set(key, value); } return value; };

function newScope() {
  return {
    calls: 0,
    monthCalls: zeros(12),
    families: new Map(),          // family → [12]
    topics: new Map(),            // topicKey → [12]
    crops: new Map(),             // cropId → count
  };
}

function addToScope(scope, month, cls) {
  scope.calls++;
  scope.monthCalls[month]++;
  inc(scope.families, cls.family, () => zeros(12))[month]++;
  if (cls.crop) scope.crops.set(cls.crop.id, (scope.crops.get(cls.crop.id) || 0) + 1);
  if (cls.crop && cls.problem) inc(scope.topics, topicKey(cls.crop.id, cls.problem.id), () => zeros(12))[month]++;
}

// Q&A: per state and topic, the most asked question groups and their most common answer.
const normalizeText = value => clean(value).toLowerCase().replace(/[0-9]+/g, '#').replace(/[^\p{L}\p{M}#]+/gu, ' ').trim();
const USELESS_ANSWER = /^(contact|please contact|सम्पर्क करें|संपर्क करें|kvk|call back|information given|answer given|told|explained|suggested)\b|^[\d\s+-]{6,}$/i;

function addQa(store, key, row) {
  const question = clean(row.q);
  const answer = clean(row.a);
  if (question.length < 12 || answer.length < 30 || USELESS_ANSWER.test(answer)) return;
  const groups = inc(store, key, () => new Map());
  const qKey = normalizeText(question);
  if (!qKey) return;
  let group = groups.get(qKey);
  if (!group) {
    if (groups.size >= QA_GROUP_CAP) {
      // Space-saving: replace the least asked group so a long tail cannot exhaust memory.
      let minKey = null; let min = Infinity;
      for (const [k, g] of groups) if (g.n < min) { min = g.n; minKey = k; }
      groups.delete(minKey);
      group = { n: min, q: question, answers: new Map() };
    } else group = { n: 0, q: question, answers: new Map() };
    groups.set(qKey, group);
  }
  group.n++;
  const aKey = normalizeText(answer).slice(0, 160);
  const entry = group.answers.get(aKey) || { n: 0, a: answer, last: '' };
  entry.n++;
  if (row.t > entry.last) entry.last = row.t.slice(0, 10);
  group.answers.set(aKey, entry);
  if (group.answers.size > 25) {
    const weakest = [...group.answers.entries()].sort((a, b) => a[1].n - b[1].n)[0][0];
    group.answers.delete(weakest);
  }
}

function bestQa(groups) {
  if (!groups) return [];
  return [...groups.values()].sort((a, b) => b.n - a.n).slice(0, QA_PER_TOPIC * 3).map(group => {
    const answer = [...group.answers.values()].sort((a, b) => b.n - a.n || b.a.length - a.a.length)[0];
    return answer ? { q: group.q, a: answer.a, asked: group.n, answeredOn: answer.last } : null;
  }).filter(Boolean)
    // The same advice under two wordings of a question is shown once.
    .filter((item, index, list) => list.findIndex(other => normalizeText(other.a).slice(0, 120) === normalizeText(item.a).slice(0, 120)) === index)
    .slice(0, QA_PER_TOPIC);
}

// Output shaping ---------------------------------------------------------------------
const round1 = value => Math.round(value * 10) / 10;

function summarize(scope, yearsPerMonth, topicInfo, { sampled, minCalls }) {
  const perYear = (count, month) => count / Math.max(1, yearsPerMonth[month]);
  const annualTopic = new Map();
  for (const [key, months] of scope.topics) annualTopic.set(key, months.reduce((sum, n, m) => sum + perYear(n, m), 0));
  const cropCalls = scope.families.get('crop') || zeros(12);
  const annualCrop = cropCalls.reduce((sum, n, m) => sum + perYear(n, m), 0) || 1;

  const months = scope.monthCalls.map((calls, month) => {
    const total = calls || 0;
    const families = Object.fromEntries(FAMILIES.map(family => [family, total ? round1((scope.families.get(family)?.[month] || 0) * 100 / total) : 0]));
    const top = [...scope.topics.entries()]
      .map(([key, series]) => ({ key, n: series[month] }))
      .filter(item => item.n >= minCalls)
      .sort((a, b) => b.n - a.n)
      .slice(0, TOP_PER_MONTH)
      .map(item => {
        // Shares are of crop-advice calls, not of all calls (weather and scheme calls swing by season).
        const share = item.n * 100 / Math.max(1, cropCalls[month]);
        const annualShare = (annualTopic.get(item.key) || 0) * 100 / annualCrop;
        return {
          key: item.key,
          share: round1(share),
          // How much more this problem is asked about this month than in an average month.
          lift: annualShare ? round1(share / annualShare) : null,
          ...(sampled ? {} : { callsPerYear: Math.round(perYear(item.n, month)) }),
        };
      });
    return { month: month + 1, ...(sampled ? {} : { callsPerYear: Math.round(perYear(total, month)), cropCallsPerYear: Math.round(perYear(cropCalls[month], month)) }), observed: yearsPerMonth[month] ? total : 0, families, top };
  });

  const seriesKeys = [...annualTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, SERIES_TOPICS).map(([key]) => key);
  const series = Object.fromEntries(seriesKeys.map(key => {
    const values = scope.topics.get(key).map((n, m) => perYear(n, m));
    const peak = Math.max(...values) || 1;
    return [key, values.map(value => Math.round(value * 100 / peak))];
  }));
  const used = new Set([...months.flatMap(month => month.top.map(item => item.key)), ...seriesKeys]);
  const topics = Object.fromEntries([...used].map(key => [key, topicInfo.get(key)]));
  const crops = [...scope.crops.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
  return { months, series, topics, crops, used };
}

/** Per crop and month: which problems make up that crop's calls (for the crop price pages). */
function cropProblems(scope, topicInfo, { minCalls, limit = 30 }) {
  const byCrop = new Map();
  for (const [key, series] of scope.topics) {
    const info = topicInfo.get(key);
    if (!info?.mandiCrop) continue;
    const entry = inc(byCrop, info.mandiCrop, () => ({ total: zeros(12), problems: new Map(), cropHi: info.cropHi }));
    series.forEach((n, m) => { entry.total[m] += n; });
    entry.problems.set(info.problem, { series, problemHi: info.problemHi, kind: info.kind, key });
  }
  const out = {};
  for (const [mandiCrop, entry] of [...byCrop.entries()].sort((a, b) => b[1].total.reduce((x, y) => x + y) - a[1].total.reduce((x, y) => x + y)).slice(0, limit)) {
    const months = entry.total.map((total, m) => total < minCalls ? [] : [...entry.problems.values()]
      .map(problem => ({ key: problem.key, problemHi: problem.problemHi, kind: problem.kind, share: round1(problem.series[m] * 100 / total) }))
      .filter(problem => problem.share >= 5).sort((a, b) => b.share - a.share).slice(0, 4));
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
  const sampled = months.some(meta => meta.sample);
  const stateOf = loadStates();
  const yearsPerMonth = zeros(12);
  for (const meta of months) yearsPerMonth[Number(meta.month.slice(5)) - 1]++;

  const national = newScope();
  const states = new Map();      // stateId → { state, scope, districts: Map(id → {name, scope}) }
  const qa = new Map();          // stateId → Map(topicKey → groups)
  const topicInfo = new Map();
  const recent = new Map();      // `${state}/${district}` → Map(topicKey → { now, base: Map(year→n) })
  const unknownStates = new Map();
  let newestCall = '';
  let oldestCall = '';
  for (const meta of months) if (meta.newestCall > newestCall) newestCall = meta.newestCall;
  // Rows are read month by month; the newest stored call decides the live window.
  let total = 0;
  let storedNewest = '';

  const newestDate = newestCall.slice(0, 10);
  const liveAge = newestDate ? (Date.parse(`${TODAY}T00:00:00Z`) - Date.parse(`${newestDate}T00:00:00Z`)) / 86400e3 : Infinity;
  // Live only when the source is recent and its newest month is stored completely.
  const newestStored = months.at(-1);
  const live = liveAge <= LIVE_MAX_AGE_DAYS && !sampled && newestStored?.month === newestDate.slice(0, 7) && newestStored.complete;
  const windowEnd = newestDate ? Date.parse(`${newestDate}T00:00:00Z`) : 0;
  const dayOfYear = time => { const d = new Date(time); return Math.floor((time - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400e3); };
  const windowStartDoy = dayOfYear(windowEnd - (LIVE_WINDOW_DAYS - 1) * 86400e3);
  const windowEndDoy = dayOfYear(windowEnd);
  const inWindowDoy = doy => windowStartDoy <= windowEndDoy ? doy >= windowStartDoy && doy <= windowEndDoy : doy >= windowStartDoy || doy <= windowEndDoy;

  for (const meta of months) {
    for await (const row of readRows(meta.file)) {
      const state = stateOf(row.s);
      if (!state) { unknownStates.set(row.s, (unknownStates.get(row.s) || 0) + 1); continue; }
      const month = Number(row.t.slice(5, 7)) - 1;
      if (!(month >= 0 && month < 12)) continue;
      total++;
      if (!oldestCall || row.t < oldestCall) oldestCall = row.t;
      if (row.t > storedNewest) storedNewest = row.t;
      const cls = classify(row);
      if (cls.crop && cls.problem) {
        const key = topicKey(cls.crop.id, cls.problem.id);
        if (!topicInfo.has(key)) topicInfo.set(key, { crop: cls.crop.id, cropHi: cls.crop.hi, mandiCrop: cls.crop.mandi || null, problem: cls.problem.id, problemHi: cls.problem.hi, kind: cls.problem.kind });
        addQa(inc(qa, state.id, () => new Map()), key, row);
      }
      addToScope(national, month, cls);
      const stateEntry = inc(states, state.id, () => ({ state, scope: newScope(), districts: new Map() }));
      addToScope(stateEntry.scope, month, cls);
      const districtId = slug(row.d);
      if (!districtId) continue;
      const district = inc(stateEntry.districts, districtId, () => ({ name: titleCase(row.d), scope: newScope() }));
      addToScope(district.scope, month, cls);

      if (live && cls.crop && cls.problem) {
        const time = Date.parse(`${row.t.slice(0, 10)}T00:00:00Z`);
        const doy = dayOfYear(time);
        if (!inWindowDoy(doy)) continue;
        const bucket = inc(inc(recent, `${state.id}/${districtId}`, () => new Map()), topicKey(cls.crop.id, cls.problem.id), () => ({ now: 0, base: new Map() }));
        if (windowEnd - time < LIVE_WINDOW_DAYS * 86400e3 && time <= windowEnd) bucket.now++;
        else {
          const year = new Date(time).getUTCFullYear();
          bucket.base.set(year, (bucket.base.get(year) || 0) + 1);
        }
      }
    }
    console.log(`  ${meta.month}: read${meta.sample ? ' (sample)' : ''}`);
  }

  const minDistrict = sampled ? 2 : 6;
  const minState = sampled ? 3 : 20;
  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  const stateList = [];
  for (const [stateId, entry] of [...states.entries()].sort((a, b) => b[1].scope.calls - a[1].scope.calls)) {
    const summary = summarize(entry.scope, yearsPerMonth, topicInfo, { sampled, minCalls: minState });
    const districts = [];
    const stateQa = qa.get(stateId) || new Map();
    const qaKeys = new Set(summary.used);
    for (const [districtId, district] of [...entry.districts.entries()].sort((a, b) => b[1].scope.calls - a[1].scope.calls)) {
      // A district with too few calls to say anything per month is listed, not published.
      const enough = district.scope.calls >= (sampled ? 20 : 300);
      districts.push({ id: districtId, name: district.name, ...(sampled ? {} : { calls: district.scope.calls }), published: enough });
      if (!enough) continue;
      const dist = summarize(district.scope, yearsPerMonth, topicInfo, { sampled, minCalls: minDistrict });
      for (const key of dist.used) qaKeys.add(key);
      const alerts = [];
      for (const [key, bucket] of recent.get(`${stateId}/${districtId}`) || []) {
        const years = [...bucket.base.values()];
        const baseline = years.length ? years.reduce((a, b) => a + b, 0) / years.length : 0;
        if (bucket.now >= 8 && bucket.now >= Math.max(1, baseline) * 2.5) alerts.push({ key, recent: bucket.now, usual: round1(baseline) });
        if (!dist.topics[key] && topicInfo.has(key)) dist.topics[key] = topicInfo.get(key);
      }
      alerts.sort((a, b) => b.recent / Math.max(1, b.usual) - a.recent / Math.max(1, a.usual));
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
      cropProblems: cropProblems(entry.scope, topicInfo, { minCalls: sampled ? 3 : 30 }),
    });
    stateList.push({ id: stateId, name: entry.state.name, nameHi: entry.state.nameHi, ...(sampled ? {} : { calls: entry.scope.calls }), districts: districts.filter(d => d.published).map(({ id, name }) => ({ id, name })) });
  }

  const nationalSummary = summarize(national, yearsPerMonth, topicInfo, { sampled, minCalls: sampled ? 5 : 100 });
  // National Q&A: the most asked answers across states, Hindi/English first (the page is Hindi).
  const readable = text => /[ऀ-ॿ]/.test(text) || !/[^\u0000-ɏ]/.test(text);
  const nationalQa = Object.fromEntries([...nationalSummary.used].map(key => {
    const candidates = [...qa.entries()].flatMap(([stateId, store]) => bestQa(store.get(key)).map(item => ({ ...item, stateHi: states.get(stateId)?.state.nameHi })));
    candidates.sort((a, b) => Number(readable(b.a)) - Number(readable(a.a)) || b.asked - a.asked);
    return [key, candidates.slice(0, QA_PER_TOPIC)];
  }).filter(([, list]) => list.length));
  writeJson(path.join(OUT_DIR, 'index.json'), {
    months: nationalSummary.months, series: nationalSummary.series, topics: nationalSummary.topics, crops: nationalSummary.crops,
    families: FAMILY_HI, states: stateList, qa: nationalQa,
    cropProblems: cropProblems(national, topicInfo, { minCalls: sampled ? 4 : 100 }),
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
