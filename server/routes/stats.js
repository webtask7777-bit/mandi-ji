import { Router } from 'express';
import { loadData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const stats = loadData('dashboard-stats');
  res.json(stats);
});

export default router;
