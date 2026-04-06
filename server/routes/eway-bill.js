import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readJSON, appendItem, findById, updateItem } from '../db/json-store.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// Generate bill number: MJ-2026-XXXXX
function generateBillNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `MJ-${year}-${rand}`;
}

// Calculate validity based on distance (Indian e-way bill rules simplified)
function getValidity(distanceKm) {
  if (distanceKm <= 100) return 1;    // 1 day
  if (distanceKm <= 300) return 3;    // 3 days
  if (distanceKm <= 500) return 5;    // 5 days
  if (distanceKm <= 1000) return 10;  // 10 days
  return 15;                           // 15 days
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
    } = req.body;

    if (!fromName || !toName || !cropName || !quantity || !value) {
      return res.status(400).json({ error: 'सभी आवश्यक फ़ील्ड भरें' });
    }

    const distanceKm = Number(distance) || 100;
    const validityDays = getValidity(distanceKm);
    const now = new Date();
    const validFrom = now.toISOString();
    const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    const bill = {
      id: uuid(),
      billNumber: generateBillNumber(),
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: 'Bill रद्द करने में विफल' });
  }
});

export default router;
