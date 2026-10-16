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
    newestObservation: stats?.newestObservation || null,
    recentCutoff: stats?.recentCutoff || null,
    dateRange: stats?.dateRange || [],
    // Per state: newest observation date and how much it reported in the recent window.
    states: (loadIndiaData('states') || []).filter(s => s.hasData).map(s => ({
      id: s.id, name: s.name, nameHi: s.nameHi, latestObservation: s.latestObservation || null,
      recentRecords: s.recentRecords ?? null, recentMandis: s.recentMandis ?? null, totalRecords: s.totalRecords,
    })),
  });
});

export default router;
