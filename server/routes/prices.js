import { Router } from 'express';
import { loadCropPrices, loadData, loadIndiaData, loadIndiaCropPrices, loadStateCropPrices, loadStateData } from '../db/connection.js';

const router = Router();

router.get('/:cropId', (req, res) => {
  const { cropId } = req.params;
  const { state } = req.query;
  const months = Number(req.query.months) || 13;

  try {
    let cropData;
    if (state === 'all') {
      cropData = loadIndiaCropPrices(cropId);
      if (!cropData) throw new Error('not found');
    } else if (state && state !== 'chhattisgarh') {
      cropData = loadStateCropPrices(state, cropId);
      if (!cropData) throw new Error('not found');
    } else {
      cropData = loadCropPrices(cropId);
    }

    const history = (cropData.history || []).slice(-months);
    res.json({
      crop: cropData.crop,
      history,
      dailyHistory: cropData.dailyHistory || [],
      lastUpdated: cropData.lastUpdated || null,
      districtBreakdown: cropData.districtBreakdown || []
    });
  } catch (e) {
    // Fallback: try matching from crops list
    let crops;
    if (state === 'all') crops = loadIndiaData('crops') || [];
    else if (state && state !== 'chhattisgarh') crops = loadStateData(state, 'crops') || [];
    else crops = loadData('crops');

    const crop = (crops || []).find(c => c.id === cropId);
    if (crop) {
      res.json({ crop: { id: crop.id, name: crop.name, nameHi: crop.nameHi, emoji: crop.emoji, msp: crop.msp, color: crop.color }, history: [], districtBreakdown: [] });
    } else {
      res.status(404).json({ error: 'Crop not found' });
    }
  }
});

export default router;
