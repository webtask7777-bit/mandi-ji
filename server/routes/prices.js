import { Router } from 'express';
import { loadCropPrices, loadData } from '../db/connection.js';

const router = Router();

router.get('/:cropId', (req, res) => {
  const { cropId } = req.params;
  const months = Number(req.query.months) || 13;

  try {
    const cropData = loadCropPrices(cropId);
    const history = cropData.history.slice(-months);
    res.json({
      crop: cropData.crop,
      history,
      districtBreakdown: cropData.districtBreakdown || []
    });
  } catch (e) {
    // Fallback: try matching from crops list
    const crops = loadData('crops');
    const crop = crops.find(c => c.id === cropId);
    if (crop) {
      res.json({ crop: { id: crop.id, name: crop.name, nameHi: crop.nameHi, emoji: crop.emoji, msp: crop.msp, color: crop.color }, history: [], districtBreakdown: [] });
    } else {
      res.status(404).json({ error: 'Crop not found' });
    }
  }
});

export default router;
