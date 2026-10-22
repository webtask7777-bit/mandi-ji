import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { isSafeId } from '../db/connection.js';

// फसल सलाह: summaries of Kisan Call Centre questions built by scripts/aggregate-kcc.cjs.
const router = Router();
// The summaries change only with a deploy (Vercel purges the CDN cache on deploy).
router.use((req, res, next) => { res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'); next(); });
const KCC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'data', 'kcc');
const cache = new Map();

function load(...parts) {
  // Ids are checked before they become path segments; nothing else reaches the filesystem.
  if (!parts.every(isSafeId)) return null;
  const key = parts.join('/');
  if (cache.has(key)) return cache.get(key);
  const file = path.join(KCC_DIR, ...parts.slice(0, -1), `${parts.at(-1)}.json`);
  if (!existsSync(file)) return null; // misses are not cached: random ids cannot grow memory
  const value = JSON.parse(readFileSync(file, 'utf8'));
  cache.set(key, value);
  return value;
}

const meta = () => load('meta');
const own = (object, key) => (object && Object.hasOwn(object, key) ? object[key] : undefined);
// Answers are fetched per month (…/qa?mahina=10): the 4 most asked in that month for each of
// that month's ranked problems. Page payloads carry no answers.
const ANSWERS_SHOWN = 4;
function answersFor(summary, qa, month) {
  const top = summary.months?.[month - 1]?.top || [];
  const inMonth = item => item.months?.[month - 1] || 0;
  return Object.fromEntries(top.filter(item => own(qa, item.key)).map(item => [
    item.key,
    qa[item.key].slice().sort((a, b) => inMonth(b) - inMonth(a) || b.asked - a.asked).slice(0, ANSWERS_SHOWN),
  ]));
}
const monthParam = value => {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
};
// cropProblems serves /crop/:id and qa the …/qa routes; neither belongs in a page payload.
const pageOf = summary => {
  const page = { ...summary };
  delete page.cropProblems;
  delete page.qa;
  return page;
};
// 404, not 503: a build without summaries must still prerender (it treats 404 as "no data").
const unavailable = res => res.status(404).json({ error: 'फसल सलाह का डेटा अभी तैयार नहीं है' });
const badMonth = res => res.status(400).json({ error: 'mahina 1 से 12 के बीच होना चाहिए' });

router.get('/', (req, res) => {
  const index = load('index');
  if (!index || !meta()) return unavailable(res);
  res.json({ meta: meta(), ...pageOf(index) });
});

router.get('/qa', (req, res) => {
  const index = load('index');
  if (!index || !meta()) return unavailable(res);
  const month = monthParam(req.query.mahina);
  if (!month) return badMonth(res);
  res.json({ month, qa: answersFor(index, index.qa, month) });
});

router.get('/states/:stateId', (req, res) => {
  if (!meta()) return unavailable(res);
  const state = load('states', req.params.stateId);
  if (!state) return res.status(404).json({ error: 'इस राज्य के सवाल उपलब्ध नहीं हैं' });
  res.json({ meta: meta(), ...pageOf(state) });
});

router.get('/states/:stateId/qa', (req, res) => {
  if (!meta()) return unavailable(res);
  const state = load('states', req.params.stateId);
  if (!state) return res.status(404).json({ error: 'इस राज्य के सवाल उपलब्ध नहीं हैं' });
  const month = monthParam(req.query.mahina);
  if (!month) return badMonth(res);
  res.json({ month, qa: answersFor(state, state.qa, month) });
});

function districtOf(req) {
  const { stateId, districtId } = req.params;
  if (!isSafeId(stateId) || !isSafeId(districtId)) return null;
  const district = load('districts', stateId, districtId);
  return district ? { district, state: load('states', stateId) } : null;
}

router.get('/districts/:stateId/:districtId', (req, res) => {
  if (!meta()) return unavailable(res);
  const found = districtOf(req);
  if (!found) return res.status(404).json({ error: 'इस ज़िले के सवाल उपलब्ध नहीं हैं' });
  const { district, state } = found;
  const neighbours = (state?.districts || []).filter(d => d.published && d.id !== district.id).slice(0, 12).map(({ id, name }) => ({ id, name }));
  res.json({ meta: meta(), ...district, neighbours });
});

router.get('/districts/:stateId/:districtId/qa', (req, res) => {
  if (!meta()) return unavailable(res);
  const found = districtOf(req);
  if (!found) return res.status(404).json({ error: 'इस ज़िले के सवाल उपलब्ध नहीं हैं' });
  const month = monthParam(req.query.mahina);
  if (!month) return badMonth(res);
  // Answers are kept per state; the district gets the ones for its own ranked problems.
  res.json({ month, qa: answersFor(found.district, found.state?.qa, month) });
});

// Problems KCC callers report for one price-page crop, national or for a state.
router.get('/crop/:cropId', (req, res) => {
  if (!meta()) return unavailable(res);
  const { cropId } = req.params;
  const stateId = req.query.state && req.query.state !== 'all' ? String(req.query.state) : null;
  if (!isSafeId(cropId) || (stateId && !isSafeId(stateId))) return res.status(404).json({ error: 'फसल नहीं मिली' });
  const scope = stateId ? load('states', stateId) : load('index');
  const crop = own(scope?.cropProblems, cropId) || (stateId ? own(load('index')?.cropProblems, cropId) : null);
  if (!crop) return res.status(404).json({ error: 'इस फसल के सवाल उपलब्ध नहीं हैं' });
  const fromState = Boolean(stateId && own(scope?.cropProblems, cropId));
  res.json({ meta: meta(), crop: cropId, scope: fromState ? { id: stateId, nameHi: scope.nameHi } : { id: 'all', nameHi: 'भारत' }, ...crop });
});

export default router;
