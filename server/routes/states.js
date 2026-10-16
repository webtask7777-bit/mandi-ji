import { Router } from 'express';
import { loadIndiaData, loadStateData, resolveScope } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const states = loadIndiaData('states');
  res.json(states || []);
});

router.get('/:stateId', (req, res) => {
  const scope = resolveScope(req.params.stateId);
  if (!scope || scope === 'all') return res.status(404).json({ error: 'State not found' });
  const stateId = scope;
  const stats = loadStateData(stateId, 'stats');
  if (!stats) return res.status(404).json({ error: 'State not found' });
  const districts = loadStateData(stateId, 'districts') || [];
  const mandis = loadStateData(stateId, 'mandis') || [];
  res.json({ ...stats, id: stateId, districts, mandis });
});

export default router;
