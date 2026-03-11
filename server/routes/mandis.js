import { Router } from 'express';
import { loadData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const mandis = loadData('mandis');
  const districts = loadData('districts');
  const { district_id } = req.query;

  let result = mandis.map(m => ({
    ...m,
    district: districts.find(d => d.id === m.districtId),
  }));

  if (district_id) {
    result = result.filter(m => m.districtId === Number(district_id));
  }
  res.json(result);
});

router.get('/heatmap', (req, res) => {
  const heatmap = loadData('heatmap');
  res.json(heatmap);
});

export default router;
