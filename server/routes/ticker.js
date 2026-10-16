import { Router } from 'express';
import { resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';
import { isCropPriceCommodity } from '../../src/utils/cropEligibility.js';

const router = Router();

router.get('/', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  const data = loadScopeData(scope, 'ticker');
  res.json((Array.isArray(data) ? data : []).filter(crop => isCropPriceCommodity(crop.id)));
});

export default router;
