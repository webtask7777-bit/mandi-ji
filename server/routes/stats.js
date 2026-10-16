import { Router } from 'express';
import { loadIndiaData, resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';
import { isCropPriceCommodity } from '../../src/utils/cropEligibility.js';

const router = Router();

router.get('/', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  const stats = loadScopeData(scope, 'stats') || {};
  // Counts match what the screens list: crops served on price pages (livestock excluded).
  const crops = (loadScopeData(scope, 'crops') || []).filter(crop => isCropPriceCommodity(crop.id));
  const state = scope === 'all' ? null : (loadIndiaData('states') || []).find(s => s.id === scope);
  const newestObservation = scope === 'all' ? stats.newestObservation || null : state?.latestObservation || null;
  res.json({
    ...stats,
    totalCrops: crops.length,
    newestObservation,
    // A state's stats have no file-level dateRange; give the newest observation so the
    // Mandis tab can show its date instead of "तारीख उपलब्ध नहीं".
    dateRange: stats.dateRange || (newestObservation ? [newestObservation] : []),
    recentMandis: scope === 'all' ? null : state?.recentMandis ?? null,
  });
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
