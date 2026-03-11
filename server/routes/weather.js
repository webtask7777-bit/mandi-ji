import { Router } from 'express';
import { loadData } from '../db/connection.js';

const router = Router();

router.get('/:districtId', (req, res) => {
  const weather = loadData('weather');
  const districtId = Number(req.params.districtId);
  const { date } = req.query;

  let results = weather.filter(w => w.districtId === districtId);
  if (results.length === 0) return res.status(404).json({ error: 'No weather data' });

  if (date) {
    const match = results.find(w => w.date === date);
    return res.json(match || results[results.length - 1]);
  }

  // Return latest
  res.json(results[results.length - 1]);
});

export default router;
