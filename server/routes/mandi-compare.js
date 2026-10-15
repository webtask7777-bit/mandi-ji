import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';

import { isCropPriceCommodity, UNSUPPORTED_COMMODITY_ERROR } from '../../src/utils/cropEligibility.js';

const router = Router();

// GET /api/mandi-compare/:cropId?state=all
router.get('/:cropId', (req, res) => {
  const { cropId } = req.params;
  if (!isCropPriceCommodity(cropId)) return res.status(422).json(UNSUPPORTED_COMMODITY_ERROR);
  const { state } = req.query;
  try {
    let data;
    if (state === 'all' || !state) {
      data = loadIndiaData('mandi-compare');
    } else if (state === 'chhattisgarh') {
      data = loadData('mandi-compare');
    } else {
      data = loadStateData(state, 'mandi-compare');
    }
    const cropMandis = (data || {})[cropId] || [];
    res.json(cropMandis);
  } catch (e) {
    res.json([]);
  }
});

export default router;
