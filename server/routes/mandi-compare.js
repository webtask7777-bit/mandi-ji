import { Router } from 'express';
import { resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';

import { stateMandiIndex } from '../utils/mandiIndex.js';
import { isCropPriceCommodity, UNSUPPORTED_COMMODITY_ERROR } from '../../src/utils/cropEligibility.js';

const router = Router();

// GET /api/mandi-compare/:cropId?state=all
router.get('/:cropId', (req, res) => {
  const { cropId } = req.params;
  if (!isCropPriceCommodity(cropId)) return res.status(422).json(UNSUPPORTED_COMMODITY_ERROR);
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  const compare = loadScopeData(scope, 'mandi-compare') || {};
  const rows = Object.hasOwn(compare, cropId) ? compare[cropId] : [];
  // Each row links to its mandi page; the slug comes from that state's own index.
  res.json(rows.map(row => {
    const stateId = scope === 'all' ? row.stateId : scope;
    const mandiSlug = stateId && resolveScope(stateId) && resolveScope(stateId) !== 'all' ? stateMandiIndex(stateId).slugFor(row.name, row.district) : null;
    return mandiSlug ? { ...row, mandiState: stateId, mandiSlug } : row;
  }));
});

export default router;
