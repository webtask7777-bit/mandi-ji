import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const { state } = req.query;
  if (state === 'all') return res.json(loadIndiaData('crops') || []);
  if (state && state !== 'chhattisgarh') return res.json(loadStateData(state, 'crops') || []);
  res.json(loadData('crops'));
});

router.get('/:id', (req, res) => {
  const { state } = req.query;
  let crops;
  if (state === 'all') crops = loadIndiaData('crops') || [];
  else if (state && state !== 'chhattisgarh') crops = loadStateData(state, 'crops') || [];
  else crops = loadData('crops');

  const crop = crops.find(c => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: 'Crop not found' });
  res.json(crop);
});

export default router;
