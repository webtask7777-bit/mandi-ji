import { Router } from 'express';
import { loadIndiaData, loadStateData, resolveScope, UNKNOWN_STATE_ERROR } from '../db/connection.js';

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

export default router;
