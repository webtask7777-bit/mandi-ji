import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readJSON, appendItem, findById, updateItem, deleteItem } from '../db/json-store.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// GET /api/listings — query params: type, crop, state, page, limit, sort
router.get('/', (req, res) => {
  try {
    let listings = readJSON('listings.json');
    const { type, crop, state, page = 1, limit = 20, sort = 'newest' } = req.query;

    // Filter by type (buy/sell)
    if (type) {
      listings = listings.filter(l => l.type === type);
    }
    // Filter by crop
    if (crop) {
      listings = listings.filter(l => l.cropId === crop || l.cropName?.toLowerCase().includes(crop.toLowerCase()));
    }
    // Filter by state
    if (state) {
      listings = listings.filter(l => l.state?.toLowerCase() === state.toLowerCase());
    }
    // Only active listings for public view
    listings = listings.filter(l => l.status === 'active');

    // Sort
    if (sort === 'newest') {
      listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'price-low') {
      listings.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    } else if (sort === 'price-high') {
      listings.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    }

    // Pagination
    const total = listings.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;
    const paginated = listings.slice(start, start + limitNum);

    res.json({
      listings: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: 'लिस्टिंग लोड करने में विफल' });
  }
});

// POST /api/listings — authRequired, create listing
router.post('/', authRequired, (req, res) => {
  try {
    const { type, cropId, cropName, cropEmoji, quantity, pricePerUnit, mandiName, state, district, description } = req.body;

    if (!type || !cropName || !quantity || !pricePerUnit || !mandiName) {
      return res.status(400).json({ error: 'सभी आवश्यक फ़ील्ड भरें' });
    }

    // Mask phone: show first 4 and last 2
    const phone = req.user.phone || '';
    const maskedPhone = phone.length >= 6
      ? phone.slice(0, 4) + '****' + phone.slice(-2)
      : '****';

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const listing = {
      id: uuid(),
      userId: req.user.id,
      userName: req.user.name,
      userPhone: maskedPhone,
      type,
      cropId: cropId || cropName.toLowerCase().replace(/\s+/g, '-'),
      cropName,
      cropEmoji: cropEmoji || '',
      quantity: Number(quantity),
      unit: 'quintal',
      pricePerUnit: Number(pricePerUnit),
      mandiName,
      state: state || '',
      district: district || '',
      description: description || '',
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt,
    };

    appendItem('listings.json', listing);
    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ error: 'लिस्टिंग बनाने में विफल' });
  }
});

// GET /api/listings/:id — single listing
router.get('/:id', (req, res) => {
  try {
    const listing = findById('listings.json', req.params.id);
    if (!listing) return res.status(404).json({ error: 'लिस्टिंग नहीं मिली' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: 'लिस्टिंग लोड करने में विफल' });
  }
});

// PUT /api/listings/:id — authRequired, owner only
router.put('/:id', authRequired, (req, res) => {
  try {
    const listing = findById('listings.json', req.params.id);
    if (!listing) return res.status(404).json({ error: 'लिस्टिंग नहीं मिली' });
    if (listing.userId !== req.user.id) {
      return res.status(403).json({ error: 'आप इस लिस्टिंग को संपादित नहीं कर सकते' });
    }

    const allowedFields = ['quantity', 'pricePerUnit', 'description', 'status'];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updatedAt = new Date().toISOString();

    const updated = updateItem('listings.json', req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'लिस्टिंग अपडेट करने में विफल' });
  }
});

// DELETE /api/listings/:id — authRequired, owner or admin
router.delete('/:id', authRequired, (req, res) => {
  try {
    const listing = findById('listings.json', req.params.id);
    if (!listing) return res.status(404).json({ error: 'लिस्टिंग नहीं मिली' });
    if (listing.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'आप इस लिस्टिंग को हटा नहीं सकते' });
    }

    deleteItem('listings.json', req.params.id);
    res.json({ success: true, message: 'लिस्टिंग हटा दी गई' });
  } catch (err) {
    res.status(500).json({ error: 'लिस्टिंग हटाने में विफल' });
  }
});

export default router;
