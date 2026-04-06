import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';

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
    res.json(data || []);
  } catch (e) {
    res.json([]);
  }
});

export default router;
