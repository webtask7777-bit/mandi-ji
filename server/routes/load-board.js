import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readJSON, appendItem, findById, writeJSON } from '../db/json-store.js';

const router = Router();

const FILE = 'load-board.json';
const MAX_AGE_DAYS = 7;

function isExpired(createdAt) {
  return (Date.now() - new Date(createdAt).getTime()) > MAX_AGE_DAYS * 86400000;
}

function cleanExpired() {
  const data = readJSON(FILE);
  const fresh = data.filter(l => !isExpired(l.createdAt));
  if (fresh.length !== data.length) writeJSON(FILE, fresh);
  return fresh;
}

// GET /api/load-board?from=&to=
router.get('/', (req, res) => {
  try {
    const { from = '', to = '' } = req.query;
    let loads = cleanExpired();

    if (from.trim()) {
      const q = from.trim().toLowerCase();
      loads = loads.filter(l =>
        l.fromCity?.toLowerCase().includes(q) ||
        l.fromState?.toLowerCase().includes(q)
      );
    }
    if (to.trim()) {
      const q = to.trim().toLowerCase();
      loads = loads.filter(l =>
        l.toCity?.toLowerCase().includes(q) ||
        l.toState?.toLowerCase().includes(q)
      );
    }

    loads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(loads);
  } catch (err) {
    res.status(500).json({ error: 'डेटा लोड नहीं हो सका' });
  }
});

// POST /api/load-board — open, no auth
router.post('/', (req, res) => {
  try {
    const { name, phone, fromState, fromCity, toState, toCity,
            commodity, quantityQ, loadDate, rateOffered, notes } = req.body;

    if (!name?.trim())      return res.status(400).json({ error: 'नाम आवश्यक है' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'फोन नंबर 10 अंकों का होना चाहिए' });
    if (!fromCity?.trim())  return res.status(400).json({ error: 'From City आवश्यक है' });
    if (!toCity?.trim())    return res.status(400).json({ error: 'To City आवश्यक है' });
    if (!loadDate)          return res.status(400).json({ error: 'तारीख आवश्यक है' });

    const listing = {
      id:           uuid(),
      name:         name.trim(),
      phone:        phone.trim(),
      fromState:    (fromState || '').trim().toUpperCase(),
      fromCity:     fromCity.trim(),
      toState:      (toState || '').trim().toUpperCase(),
      toCity:       toCity.trim(),
      commodity:    (commodity || '').trim(),
      quantityQ:    Number(quantityQ) || 0,
      loadDate,
      rateOffered:  Number(rateOffered) || 0,
      notes:        (notes || '').trim(),
      status:       'active',
      createdAt:    new Date().toISOString(),
    };

    appendItem(FILE, listing);
    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ error: 'पोस्ट नहीं हो सका' });
  }
});

// DELETE /api/load-board/:id — verify by phone
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    const listing = findById(FILE, id);
    if (!listing) return res.status(404).json({ error: 'लिस्टिंग नहीं मिली' });
    if (listing.phone !== phone?.trim()) {
      return res.status(403).json({ error: 'फोन नंबर मेल नहीं खाता' });
    }

    const data = readJSON(FILE);
    writeJSON(FILE, data.filter(l => l.id !== id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'हटाने में विफल' });
  }
});

export default router;
