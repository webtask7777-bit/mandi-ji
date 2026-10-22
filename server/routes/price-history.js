import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { isSafeId } from '../db/connection.js';

// Monthly price history since 2009, built by scripts/aggregate-price-history.cjs.
const router = Router();
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'data', 'price-history');
const cache = new Map();

function load(name) {
  if (!isSafeId(name)) return null;
  if (!cache.has(name)) {
    const file = path.join(DIR, `${name}.json`);
    cache.set(name, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
  }
  return cache.get(name);
}

router.get('/:cropId', (req, res) => {
  const index = load('index');
  const crop = req.params.cropId === 'index' ? null : load(req.params.cropId);
  // 404 (not 503) when nothing is built, so a build without history still prerenders.
  if (!index || !crop) return res.status(404).json({ error: 'इस फसल का पुराना भाव इतिहास उपलब्ध नहीं है' });
  const stateId = req.query.state && req.query.state !== 'all' ? String(req.query.state) : null;
  if (stateId && !isSafeId(stateId)) return res.status(404).json({ error: 'राज्य नहीं मिला' });
  res.json({
    crop: crop.id,
    commodity: crop.commodity,
    unit: crop.unit,
    coverage: crop.coverage,
    source: { name: index.source, url: index.sourceUrl },
    all: crop.all,
    state: stateId ? crop.states[stateId] || null : null,
    seasonal: { all: crop.seasonal.all, state: stateId ? crop.seasonal.states[stateId] || null : null },
  });
});

export default router;
