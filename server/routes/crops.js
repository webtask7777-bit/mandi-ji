import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';
import { isCropPriceCommodity, UNSUPPORTED_COMMODITY_ERROR } from '../../src/utils/cropEligibility.js';

const router = Router();

router.get('/', (req, res) => {
  const { state } = req.query;
  const crops = state === 'all' ? loadIndiaData('crops')
    : state && state !== 'chhattisgarh' ? loadStateData(state, 'crops') : loadData('crops');
  res.json((Array.isArray(crops) ? crops : []).filter(crop => isCropPriceCommodity(crop.id)));
});

router.get('/:id', (req, res) => {
  if (!isCropPriceCommodity(req.params.id)) return res.status(422).json(UNSUPPORTED_COMMODITY_ERROR);
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
