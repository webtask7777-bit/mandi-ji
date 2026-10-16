import { Router } from 'express';
import { loadIndiaData, resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  res.json(loadScopeData(scope, 'stats') || {});
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
