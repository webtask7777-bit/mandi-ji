import { Router } from 'express';
import { loadStateData } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const { state } = req.query;
  if (!state || state === 'all') return res.json([]);
  res.json(loadStateData(state, 'districts') || []);
});

// GET /:id (legacy Chhattisgarh district detail, data to March 2026) was removed; no screen used it.

export default router;
