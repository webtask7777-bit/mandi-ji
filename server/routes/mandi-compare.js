import { Router } from 'express';
import { resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';

import { isCropPriceCommodity, UNSUPPORTED_COMMODITY_ERROR } from '../../src/utils/cropEligibility.js';

const router = Router();

// GET /api/mandi-compare/:cropId?state=all
router.get('/:cropId', (req, res) => {
  const { cropId } = req.params;
  if (!isCropPriceCommodity(cropId)) return res.status(422).json(UNSUPPORTED_COMMODITY_ERROR);
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  res.json((loadScopeData(scope, 'mandi-compare') || {})[cropId] || []);
});

export default router;
