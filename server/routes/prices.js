import { Router } from 'express';
import { resolveScope, loadScopeData, loadScopeCropPrices, loadIndiaData, UNKNOWN_STATE_ERROR } from '../db/connection.js';

import { isCropPriceCommodity, UNSUPPORTED_COMMODITY_ERROR } from '../../src/utils/cropEligibility.js';

const router = Router();
const DEFAULT_MONTHS = 13;
const MAX_MONTHS = 36;

/** Whole calendar months back from the latest month, so a data gap is not counted as months. */
function lastCalendarMonths(history, months) {
  const latest = history.at(-1)?.date;
  const m = /^(\d{4})-(\d{2})$/.exec(String(latest || ''));
  if (!m) return history.slice(-months);
  const index = Number(m[1]) * 12 + Number(m[2]) - 1 - (months - 1);
  const cutoff = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  return history.filter(point => String(point.date) >= cutoff);
}

router.get('/:cropId', (req, res) => {
  const { cropId } = req.params;
  if (!isCropPriceCommodity(cropId)) return res.status(422).json(UNSUPPORTED_COMMODITY_ERROR);
  const scope = resolveScope(req.query.state);
  if (!scope) return res.status(400).json(UNKNOWN_STATE_ERROR);
  const requested = Number.parseInt(req.query.months, 10);
  const months = Number.isInteger(requested) && requested >= 1 ? Math.min(requested, MAX_MONTHS) : DEFAULT_MONTHS;

  const cropData = loadScopeCropPrices(scope, cropId);
  if (cropData) {
    return res.json({
      crop: cropData.crop,
      history: lastCalendarMonths(cropData.history || [], months),
      dailyHistory: cropData.dailyHistory || [],
      lastUpdated: cropData.lastUpdated || null,
      districtBreakdown: cropData.districtBreakdown || [],
      // The dataset's newest observation: the page decides staleness (noindex) with it.
      newestObservation: loadIndiaData('stats')?.newestObservation || null,
    });
  }
  // A catalogue entry without stored prices: return the crop with empty history.
  const crop = (loadScopeData(scope, 'crops') || []).find(c => c.id === cropId);
  if (crop) return res.json({ crop: { id: crop.id, name: crop.name, nameHi: crop.nameHi, emoji: crop.emoji, msp: crop.msp, color: crop.color }, history: [], dailyHistory: [], districtBreakdown: [] });
  res.status(404).json({ error: 'Crop not found' });
});

export default router;
