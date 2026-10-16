import { Router } from 'express';
import { loadIndiaData, loadStateData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const { state, district_id } = req.query;
  // Every state, Chhattisgarh included, uses the current aggregated files. The legacy
  // Chhattisgarh files (March 2026, old crop ids) are no longer served.
  if (!state || state === 'all') return res.json([]);
  const mandis = loadStateData(state, 'mandis') || [];
  res.json(district_id ? mandis.filter(m => m.district === district_id) : mandis);
});

router.get('/heatmap', (req, res) => {
  const { state } = req.query;
  if (!state || state === 'all') return res.json(loadIndiaData('heatmap') || {});
  res.json(loadStateData(state, 'heatmap') || {});
});

export default router;
