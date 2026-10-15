import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';
import { isCropPriceCommodity } from '../../src/utils/cropEligibility.js';

const router = Router();

router.get('/', (req, res) => {
  const { state } = req.query;
  try {
    let data;
    if (state === 'all' || !state) {
      data = loadIndiaData('ticker');
    } else if (state === 'chhattisgarh') {
      data = loadData('ticker');
    } else {
      data = loadStateData(state, 'ticker');
    }
    res.json((Array.isArray(data) ? data : []).filter(crop => isCropPriceCommodity(crop.id)));
  } catch (e) {
    res.json([]);
  }
});

export default router;
