import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { readJSON, findByField, appendItem, updateItem } from '../db/json-store.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'नाम, फ़ोन और पासवर्ड आवश्यक हैं' });
    }
    // Check duplicate phone
    const existing = findByField('users.json', 'phone', phone);
    if (existing) {
      return res.status(409).json({ error: 'यह फ़ोन नंबर पहले से रजिस्टर है' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: uuid(),
      name,
      phone,
      email: email || '',
      passwordHash,
      role: 'user',
      kycStatus: 'pending',
      kycDetails: {},
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    appendItem('users.json', user);
    const token = signToken(user);
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'रजिस्ट्रेशन विफल' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'फ़ोन और पासवर्ड आवश्यक हैं' });
    }
    const user = findByField('users.json', 'phone', phone);
    if (!user) {
      return res.status(401).json({ error: 'गलत फ़ोन नंबर या पासवर्ड' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'खाता निलंबित है' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'गलत फ़ोन नंबर या पासवर्ड' });
    }
    const token = signToken(user);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'लॉग इन विफल' });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// PUT /api/auth/kyc
router.put('/kyc', authRequired, (req, res) => {
  try {
    const { aadhaar, pan, kisanCard, digilockerVerified } = req.body;
    const kycDetails = { aadhaar, pan, kisanCard, digilockerVerified };
    const kycStatus = digilockerVerified ? 'verified' : 'pending';
    const updated = updateItem('users.json', req.user.id, { kycDetails, kycStatus });
    if (!updated) return res.status(404).json({ error: 'उपयोगकर्ता नहीं मिला' });
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'KYC अपडेट विफल' });
  }
});

export default router;
