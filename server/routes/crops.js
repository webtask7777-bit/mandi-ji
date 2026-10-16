import { Router } from 'express';
import { resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';
import { isCropPriceCommodity, UNSUPPORTED_COMMODITY_ERROR } from '../../src/utils/cropEligibility.js';

const router = Router();

router.get('/', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  const crops = loadScopeData(scope, 'crops');
  res.json((Array.isArray(crops) ? crops : []).filter(crop => isCropPriceCommodity(crop.id)));
});

router.get('/:id', (req, res) => {
  if (!isCropPriceCommodity(req.params.id)) return res.status(422).json(UNSUPPORTED_COMMODITY_ERROR);
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  const crop = (loadScopeData(scope, 'crops') || []).find(c => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: 'Crop not found' });
  res.json(crop);
});

export default router;
