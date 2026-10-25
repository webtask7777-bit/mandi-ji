import { Router } from 'express';
import { loadIndiaData, loadStateData, resolveScope, UNKNOWN_STATE_ERROR } from '../db/connection.js';
import { mandiSummaries } from '../../shared/mandiPages.js';
import { stateMandiIndex } from '../utils/mandiIndex.js';

const router = Router();

router.get('/', (req, res) => {
  // Every state, Chhattisgarh included, uses the current aggregated files. The legacy
  // Chhattisgarh files (March 2026, old crop ids) are no longer served.
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  if (scope === 'all') return res.json([]);
  const districtId = typeof req.query.district_id === 'string' ? req.query.district_id : '';
  const mandis = loadStateData(scope, 'mandis') || [];
  res.json(districtId ? mandis.filter(m => m.district === districtId) : mandis);
});

router.get('/heatmap', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  res.json((scope === 'all' ? loadIndiaData('heatmap') : loadStateData(scope, 'heatmap')) || {});
});

// One mandi's crops, from the same comparison records as the crop pages.

router.get('/directory', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope || scope === 'all') return res.status(400).json(UNKNOWN_STATE_ERROR);
  res.json(mandiSummaries(stateMandiIndex(scope)));
});

router.get('/detail/:slug', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope || scope === 'all') return res.status(400).json(UNKNOWN_STATE_ERROR);
  const index = stateMandiIndex(scope);
  const mandi = index.get(String(req.params.slug || ''));
  if (!mandi || !mandi.crops.length) return res.status(404).json({ error: 'Unknown mandi', code: 'UNKNOWN_MANDI' });
  const nearby = mandiSummaries(index).filter(row => row.slug !== mandi.slug && mandi.district && row.district === mandi.district).slice(0, 8);
  res.json({ ...mandi, state: scope, nearby });
});

export default router;
