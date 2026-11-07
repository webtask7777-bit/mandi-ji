import { Router } from 'express';
import { resolveScope, loadScopeData, UNKNOWN_STATE_ERROR } from '../db/connection.js';

import { stateMandiIndex } from '../utils/mandiIndex.js';
import { getMandiIndexability } from '../../shared/mandiPages.js';
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
  // A row links to its mandi page only when that page is indexable, so crawlers are not
  // sent to thousands of thin noindex pages. The slug comes from that state's own index.
  const asOf = new Date();
  res.json(rows.map(row => {
    const stateId = scope === 'all' ? row.stateId : scope;
    const index = stateId && resolveScope(stateId) && resolveScope(stateId) !== 'all' ? stateMandiIndex(stateId) : null;
    const slug = index?.slugFor(row.name, row.district);
    const mandiSlug = slug && !getMandiIndexability(index.get(slug), { asOf }).noIndex ? slug : null;
    return mandiSlug ? { ...row, mandiState: stateId, mandiSlug } : row;
  }));
});

export default router;
