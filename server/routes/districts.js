import { Router } from 'express';
import { loadData, loadStateData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const { state } = req.query;
  if (state && state !== 'chhattisgarh') return res.json(loadStateData(state, 'districts') || []);
  res.json(loadData('districts'));
});

router.get('/:id', (req, res) => {
  const districts = loadData('districts');
  const mandis = loadData('mandis');
  const districtStats = loadData('district-stats');
  const id = Number(req.params.id);

  const district = districts.find(d => d.id === id);
  if (!district) return res.status(404).json({ error: 'District not found' });

  const districtMandis = mandis.filter(m => m.districtId === id);
  const stats = districtStats[String(id)] || {};
  res.json({ ...district, mandis: districtMandis, ...stats });
});

export default router;
