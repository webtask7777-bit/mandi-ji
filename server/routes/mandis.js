import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const { state, district_id } = req.query;
  if (state === 'all') return res.json([]);
  if (state && state !== 'chhattisgarh') return res.json(loadStateData(state, 'mandis') || []);

  const mandis = loadData('mandis');
  const districts = loadData('districts');
  let result = mandis.map(m => ({ ...m, district: districts.find(d => d.id === m.districtId) }));
  if (district_id) result = result.filter(m => m.districtId === Number(district_id));
  res.json(result);
});

router.get('/heatmap', (req, res) => {
  const { state } = req.query;
  if (state === 'all') return res.json(loadIndiaData('heatmap') || {});
  if (state && state !== 'chhattisgarh') return res.json(loadStateData(state, 'heatmap') || {});
  res.json(loadData('heatmap'));
});

export default router;
