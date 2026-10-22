import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { isSafeId } from '../db/connection.js';

// फसल सलाह: summaries of Kisan Call Centre questions built by scripts/aggregate-kcc.cjs.
const router = Router();
const KCC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'data', 'kcc');
const cache = new Map();

function load(...parts) {
  // Ids are checked before they become path segments; nothing else reaches the filesystem.
  if (!parts.every(isSafeId)) return null;
  const key = parts.join('/');
  if (!cache.has(key)) {
    const file = path.join(KCC_DIR, ...parts.slice(0, -1), `${parts.at(-1)}.json`);
    cache.set(key, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
  }
  return cache.get(key);
}

const meta = () => load('meta');
// 404, not 503: a build without summaries must still prerender (it treats 404 as "no data").
const unavailable = res => res.status(404).json({ error: 'फसल सलाह का डेटा अभी तैयार नहीं है' });

router.get('/', (req, res) => {
  const index = load('index');
  if (!index || !meta()) return unavailable(res);
  res.json({ meta: meta(), ...index });
});

router.get('/states/:stateId', (req, res) => {
  if (!meta()) return unavailable(res);
  const state = load('states', req.params.stateId);
  if (!state) return res.status(404).json({ error: 'इस राज्य के सवाल उपलब्ध नहीं हैं' });
  res.json({ meta: meta(), ...state });
});

router.get('/districts/:stateId/:districtId', (req, res) => {
  if (!meta()) return unavailable(res);
  const { stateId, districtId } = req.params;
  if (!isSafeId(stateId) || !isSafeId(districtId)) return res.status(404).json({ error: 'ज़िला नहीं मिला' });
  const district = load('districts', stateId, districtId);
  if (!district) return res.status(404).json({ error: 'इस ज़िले के सवाल उपलब्ध नहीं हैं' });
  const state = load('states', stateId);
  // Answers are kept per state; the district gets the ones for its own topics.
  const qa = Object.fromEntries(Object.keys(district.topics).filter(key => state?.qa?.[key]).map(key => [key, state.qa[key]]));
  const neighbours = (state?.districts || []).filter(d => d.published && d.id !== districtId).slice(0, 12).map(({ id, name }) => ({ id, name }));
  res.json({ meta: meta(), ...district, qa, neighbours });
});

// Problems KCC callers report for one price-page crop, national or for a state.
router.get('/crop/:cropId', (req, res) => {
  if (!meta()) return unavailable(res);
  const { cropId } = req.params;
  const stateId = req.query.state && req.query.state !== 'all' ? String(req.query.state) : null;
  if (!isSafeId(cropId) || (stateId && !isSafeId(stateId))) return res.status(404).json({ error: 'फसल नहीं मिली' });
  const scope = stateId ? load('states', stateId) : load('index');
  const crop = scope?.cropProblems?.[cropId] || (stateId ? load('index')?.cropProblems?.[cropId] : null);
  if (!crop) return res.status(404).json({ error: 'इस फसल के सवाल उपलब्ध नहीं हैं' });
  const fromState = Boolean(stateId && scope?.cropProblems?.[cropId]);
  res.json({ meta: meta(), crop: cropId, scope: fromState ? { id: stateId, nameHi: scope.nameHi } : { id: 'all', nameHi: 'भारत' }, ...crop });
});

export default router;
