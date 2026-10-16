import { Router } from 'express';
import { loadStateData, resolveScope, UNKNOWN_STATE_ERROR } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  if (scope === 'all') return res.json([]);
  res.json(loadStateData(scope, 'districts') || []);
});

// GET /:id (legacy Chhattisgarh district detail, data to March 2026) was removed; no screen used it.

export default router;
