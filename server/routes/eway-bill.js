import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import { readJSON, appendItem, findById, updateItem } from '../db/json-store.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// Draft reference: MJ-2026-XXXXXXXX, unique among stored drafts. It is not a GST e-way
// bill number; only the GST portal issues those.
function generateBillNumber(existing) {
  const year = new Date().getFullYear();
  const taken = new Set(existing.map(bill => bill.billNumber));
  for (;;) {
    const number = `MJ-${year}-${randomBytes(4).toString('hex').toUpperCase()}`;
    if (!taken.has(number)) return number;
  }
}

// CGST Rule 138(10), ordinary cargo by road: one day per 200 km or part of it.
export function getValidity(distanceKm) {
  return Math.max(1, Math.ceil(distanceKm / 200));
}

// POST /api/eway-bill/generate — authRequired
router.post('/generate', authRequired, (req, res) => {
  try {
    const {
      supplyType,
      docNumber,
      docDate,
      fromName,
      fromGstin,
      fromAddress,
      fromState,
      fromPincode,
      toName,
      toGstin,
      toAddress,
      toState,
      toPincode,
      cropName,
      hsnCode,
      quantity,
      unit,
      value,
      transportMode,
      vehicleNumber,
      distance,
    } = req.body || {};

    if (!fromName || !toName || !cropName || !quantity || !value) {
      return res.status(400).json({ error: 'सभी आवश्यक फ़ील्ड भरें' });
    }

    const distanceKm = distance === undefined || distance === '' ? 100 : Number(distance);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 4000) {
      return res.status(400).json({ error: 'दूरी 1 से 4000 किमी के बीच होनी चाहिए' });
    }
    if (!(Number(quantity) > 0) || !(Number(value) > 0)) {
      return res.status(400).json({ error: 'मात्रा और मूल्य 0 से अधिक होने चाहिए' });
    }
    const validityDays = getValidity(distanceKm);
    const now = new Date();
    const validFrom = now.toISOString();
    const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    const bill = {
      id: uuid(),
      billNumber: generateBillNumber(readJSON('eway-bills.json')),
      userId: req.user.id,
      userName: req.user.name,
      supplyType: supplyType || 'outward',
      docNumber: docNumber || '',
      docDate: docDate || now.toISOString().slice(0, 10),
      from: {
        name: fromName,
        gstin: fromGstin || '',
        address: fromAddress || '',
        state: fromState || '',
        pincode: fromPincode || '',
      },
      to: {
        name: toName,
        gstin: toGstin || '',
        address: toAddress || '',
        state: toState || '',
        pincode: toPincode || '',
      },
      items: [
        {
          cropName,
          hsnCode: hsnCode || '',
          quantity: Number(quantity),
          unit: unit || 'QTL',
          value: Number(value),
        },
      ],
      transport: {
        mode: transportMode || 'road',
        vehicleNumber: vehicleNumber || '',
        distance: distanceKm,
      },
      totalValue: Number(value),
      status: 'generated',
      validFrom,
      validUntil,
      validityDays,
      createdAt: now.toISOString(),
    };

    appendItem('eway-bills.json', bill);
    res.status(201).json(bill);
  } catch {
    res.status(500).json({ error: 'E-way Bill जनरेट करने में विफल' });
  }
});

// GET /api/eway-bill/my — authRequired, user's bills
router.get('/my', authRequired, (req, res) => {
  try {
    const bills = readJSON('eway-bills.json');
    const userBills = bills
      .filter(b => b.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(userBills);
  } catch {
    res.status(500).json({ error: 'Bills लोड करने में विफल' });
  }
});

// GET /api/eway-bill/:id — authRequired
router.get('/:id', authRequired, (req, res) => {
  try {
    const bill = findById('eway-bills.json', req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill नहीं मिला' });
    // Only owner or admin can view
    if (bill.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'अनुमति नहीं है' });
    }
    res.json(bill);
  } catch {
    res.status(500).json({ error: 'Bill लोड करने में विफल' });
  }
});

// PUT /api/eway-bill/:id/cancel — authRequired, owner only
router.put('/:id/cancel', authRequired, (req, res) => {
  try {
    const bill = findById('eway-bills.json', req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill नहीं मिला' });
    if (bill.userId !== req.user.id) {
      return res.status(403).json({ error: 'आप इस Bill को रद्द नहीं कर सकते' });
    }
    if (bill.status === 'cancelled') {
      return res.status(400).json({ error: 'Bill पहले से रद्द है' });
    }

    const updated = updateItem('eway-bills.json', req.params.id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Bill रद्द करने में विफल' });
  }
});

export default router;
