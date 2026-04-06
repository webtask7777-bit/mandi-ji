import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const { state } = req.query;
  if (state === 'all') return res.json(loadIndiaData('stats') || {});
  if (state && state !== 'chhattisgarh') return res.json(loadStateData(state, 'stats') || {});
  res.json(loadData('dashboard-stats'));
});

router.get('/data-status', (req, res) => {
  const stats = loadIndiaData('stats');
  res.json({
    totalRecords: stats?.totalRecords || 0,
    totalStates: stats?.totalStates || 0,
    totalStatesExpected: stats?.totalStatesExpected || 36,
    lastUpdated: stats?.lastUpdated || null,
    dateRange: stats?.dateRange || [],
  });
});

export default router;
