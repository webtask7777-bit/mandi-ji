import { Router } from 'express';
import { loadData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const crops = loadData('crops');
  res.json(crops);
});

router.get('/:id', (req, res) => {
  const crops = loadData('crops');
  const crop = crops.find(c => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: 'Crop not found' });
  res.json(crop);
});

export default router;
