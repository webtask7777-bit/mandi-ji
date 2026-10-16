import { Router } from 'express';
import { resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';
import { buildPriceGapCandidates } from '../../src/utils/marketComparison.js';

const router = Router();

// Existing endpoint retained for clients; market gaps are reference comparisons,
// not executable trades. State centroids cannot establish road distance or ROI.
router.get('/', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  try {
    res.json(buildPriceGapCandidates(loadScopeData(scope, 'mandi-compare') || {}, loadScopeData(scope, 'crops') || []));
  } catch {
    res.status(500).json({ error: 'मंडी तुलना अभी उपलब्ध नहीं है' });
  }
});

export default router;
