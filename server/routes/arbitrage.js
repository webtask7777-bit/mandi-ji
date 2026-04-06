import { Router } from 'express';
import { loadData, loadIndiaData, loadStateData } from '../db/connection.js';

const router = Router();

const STATE_COORDS = {
  AP: [15.91, 79.74], AR: [28.22, 94.73], AS: [26.20, 92.94], BR: [25.09, 85.31],
  CG: [21.27, 81.86], GA: [15.30, 74.00], GJ: [22.26, 71.19], HR: [29.06, 76.09],
  HP: [31.10, 77.17], JK: [33.73, 76.92], JH: [23.61, 85.27], KA: [15.32, 75.72],
  KL: [10.85, 76.27], MP: [22.97, 78.66], MH: [19.75, 75.71], MN: [24.66, 93.91],
  ML: [25.47, 91.37], MZ: [23.16, 92.94], NL: [26.16, 94.60], OD: [20.94, 84.80],
  PB: [31.15, 75.34], RJ: [27.02, 74.22], SK: [27.53, 88.51], TN: [11.13, 78.66],
  TS: [17.12, 79.02], TR: [23.75, 91.75], UP: [26.85, 80.91], UK: [30.07, 79.35],
  WB: [22.98, 87.85], DL: [28.70, 77.10], PY: [11.94, 79.81], CH: [30.74, 76.79],
  AN: [11.66, 92.73],
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35);
}

function geoDistance(codeA, codeB) {
  const cA = STATE_COORDS[codeA], cB = STATE_COORDS[codeB];
  if (cA && cB) return Math.max(50, haversineKm(cA[0], cA[1], cB[0], cB[1]));
  if (codeA && codeA === codeB) return 150;
  return 800;
}

function getPrice(m) { return m.recentPrice || m.avgPrice; }

function getOutlierBounds(prices) {
  if (prices.length < 4) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

function isOutlier(price, bounds) {
  if (!bounds) return false;
  return price < bounds.lower || price > bounds.upper;
}

// GET /api/arbitrage?state=all
router.get('/', (req, res) => {
  const { state } = req.query;

  let mandiData, cropsData;
  try {
    if (state === 'all' || !state) {
      mandiData = loadIndiaData('mandi-compare') || {};
      cropsData = loadIndiaData('crops') || [];
    } else if (state === 'chhattisgarh') {
      mandiData = loadData('mandi-compare') || {};
      cropsData = loadData('crops') || [];
    } else {
      mandiData = loadStateData(state, 'mandi-compare') || {};
      cropsData = loadStateData(state, 'crops') || [];
    }
  } catch (e) {
    return res.json([]);
  }

  const cropMeta = {};
  for (const c of cropsData) cropMeta[c.id] = c;

  const QTY = 10;
  const results = [];

  for (const [cropId, mandis] of Object.entries(mandiData)) {
    if (!mandis || mandis.length < 2) continue;

    // Same-variety filter: use the most common non-"Local" variety for accurate comparison
    const vCounts = {};
    mandis.forEach(m => { if (m.topVariety && m.topVariety !== 'Local') vCounts[m.topVariety] = (vCounts[m.topVariety] || 0) + 1; });
    const topV = Object.entries(vCounts).sort((a, b) => b[1] - a[1])[0];
    const sameKism = topV ? mandis.filter(m => m.topVariety === topV[0]) : null;
    const compareList = (sameKism && sameKism.length >= 2) ? sameKism : mandis;
    const topVariety = topV?.[0] || null;

    const sorted = [...compareList].sort((a, b) => getPrice(b) - getPrice(a));
    const prices = sorted.map(getPrice);
    const bounds = getOutlierBounds(prices);

    // Safe best = highest non-outlier
    const safeBest = sorted.find(m => !isOutlier(getPrice(m), bounds)) || sorted[0];
    // Safe worst = lowest non-outlier
    const safeWorst = [...sorted].reverse().find(m => !isOutlier(getPrice(m), bounds)) || sorted[sorted.length - 1];

    if (safeBest === safeWorst || safeBest.name === safeWorst.name) continue;

    const sellPrice = getPrice(safeBest);
    const buyPrice = getPrice(safeWorst);
    const spread = sellPrice - buyPrice;
    if (spread < 300) continue;

    const dist = geoDistance(safeWorst.stateCode, safeBest.stateCode);
    const trips = Math.ceil(QTY / 70);
    const transportTotal = (1000 * trips) + (dist * 20 * trips) + (QTY * 5) + (dist * 0.5);
    const costPerQ = Math.round(transportTotal / QTY);
    const netProfit = spread - costPerQ;

    if (netProfit <= 50) continue;

    const meta = cropMeta[cropId];
    const investment = buyPrice * QTY;
    const roi = investment > 0 ? Math.round((netProfit * QTY) / investment * 1000) / 10 : 0;

    results.push({
      cropId,
      cropName: meta?.nameHi || meta?.name || cropId,
      cropEmoji: meta?.emoji || '🌱',
      topVariety,
      buyMandi: safeWorst.name,
      buyState: safeWorst.stateCode,
      buyPrice,
      sellMandi: safeBest.name,
      sellState: safeBest.stateCode,
      sellPrice,
      spread,
      distance: dist,
      costPerQ,
      netProfit,
      totalProfit: netProfit * QTY,
      investment,
      roi,
      interState: safeBest.stateCode !== safeWorst.stateCode,
      mandiCount: compareList.length,
      totalMandis: mandis.length,
    });
  }

  // Default sort: profit ÷ √distance — rewards high profit + low distance
  results.sort((a, b) => (b.netProfit / Math.sqrt(b.distance)) - (a.netProfit / Math.sqrt(a.distance)));

  res.json(results.slice(0, 30));
});

export default router;
