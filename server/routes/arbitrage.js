import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';
import { buildPriceGapCandidates } from '../../src/utils/marketComparison.js';

const router = Router();

// Existing endpoint retained for clients; market gaps are reference comparisons,
// not executable trades. State centroids cannot establish road distance or ROI.
router.get('/', (req, res) => {
  const { state } = req.query;
  try {
    const read = !state || state === 'all'
      ? loadIndiaData
      : state === 'chhattisgarh' ? loadData : name => loadStateData(state, name);
    res.json(buildPriceGapCandidates(read('mandi-compare') || {}, read('crops') || []));
  } catch {
    res.status(500).json({ error: 'मंडी तुलना अभी उपलब्ध नहीं है' });
  }
});

export default router;
