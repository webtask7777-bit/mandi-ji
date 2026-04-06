import { Router } from 'express';
import { readJSON, writeJSON, appendItem, updateItem, deleteItem, findById } from '../db/json-store.js';
import { seedMarketplace } from '../db/seed-marketplace.js';
import { adminOnly } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// All routes require admin
router.use(adminOnly);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const users = readJSON('users.json');
    const listings = readJSON('listings.json');
    const bills = readJSON('eway-bills.json');

    const activeListings = listings.filter(l => l.status === 'active');
    const recentUsers = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(u => {
        const { passwordHash: _, ...safe } = u;
        return safe;
      });

    // Top crops by listing count
    const cropCounts = {};
    listings.forEach(l => {
      const name = l.cropName || 'अन्य';
      cropCounts[name] = (cropCounts[name] || 0) + 1;
    });
    const topCrops = Object.entries(cropCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      totalUsers: users.length,
      totalListings: listings.length,
      totalEwayBills: bills.length,
      activeListings: activeListings.length,
      recentUsers,
      topCrops,
    });
  } catch (err) {
    res.status(500).json({ error: 'स्टैट्स लोड करने में विफल' });
  }
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const users = readJSON('users.json');
    const safeUsers = users.map(u => {
      const { passwordHash: _, ...safe } = u;
      return safe;
    });
    // Sort newest first
    safeUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: 'उपयोगकर्ता लोड करने में विफल' });
  }
});

// PUT /api/admin/users/:id/role — change role
router.put('/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'अमान्य भूमिका' });
    }
    const user = findById('users.json', req.params.id);
    if (!user) return res.status(404).json({ error: 'उपयोगकर्ता नहीं मिला' });

    const updated = updateItem('users.json', req.params.id, { role });
    const { passwordHash: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'भूमिका अपडेट करने में विफल' });
  }
});

// PUT /api/admin/users/:id/status — suspend/activate
router.put('/users/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'अमान्य स्टेटस' });
    }
    const user = findById('users.json', req.params.id);
    if (!user) return res.status(404).json({ error: 'उपयोगकर्ता नहीं मिला' });

    const updated = updateItem('users.json', req.params.id, { status });
    const { passwordHash: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'स्टेटस अपडेट करने में विफल' });
  }
});

// GET /api/admin/listings
router.get('/listings', (req, res) => {
  try {
    const listings = readJSON('listings.json');
    listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'लिस्टिंग लोड करने में विफल' });
  }
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', (req, res) => {
  try {
    const listing = findById('listings.json', req.params.id);
    if (!listing) return res.status(404).json({ error: 'लिस्टिंग नहीं मिली' });

    deleteItem('listings.json', req.params.id);
    res.json({ success: true, message: 'लिस्टिंग हटा दी गई' });
  } catch (err) {
    res.status(500).json({ error: 'लिस्टिंग हटाने में विफल' });
  }
});

// GET /api/admin/eway-bills
router.get('/eway-bills', (req, res) => {
  try {
    const bills = readJSON('eway-bills.json');
    bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: 'Bills लोड करने में विफल' });
  }
});

// POST /api/admin/seed — seed demo data
router.post('/seed', async (req, res) => {
  try {
    const result = await seedMarketplace();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'सीड डेटा बनाने में विफल: ' + err.message });
  }
});

// ─── CMS: Pages ─────────────────────────────────────────────

// GET /api/admin/pages
router.get('/pages', (req, res) => {
  try {
    const pages = readJSON('pages.json');
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: 'पेज लोड करने में विफल' });
  }
});

// PUT /api/admin/pages/:key
router.put('/pages/:key', (req, res) => {
  try {
    const pages = readJSON('pages.json');
    const key = req.params.key;
    if (!pages[key]) return res.status(404).json({ error: 'पेज नहीं मिला' });
    pages[key] = { ...pages[key], ...req.body, lastUpdated: new Date().toISOString() };
    writeJSON('pages.json', pages);
    res.json(pages[key]);
  } catch (err) {
    res.status(500).json({ error: 'पेज अपडेट करने में विफल' });
  }
});

// ─── CMS: Blog ──────────────────────────────────────────────

// GET /api/admin/blog
router.get('/blog', (req, res) => {
  try {
    const posts = readJSON('blog-posts.json');
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'ब्लॉग लोड करने में विफल' });
  }
});

// POST /api/admin/blog
router.post('/blog', (req, res) => {
  try {
    const { title, slug, content, excerpt, tags, status } = req.body;
    if (!title) return res.status(400).json({ error: 'टाइटल ज़रूरी है' });
    const post = {
      id: uuid(),
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, '-').replace(/(^-|-$)/g, ''),
      content: content || '',
      excerpt: excerpt || '',
      tags: tags || [],
      status: status || 'draft',
      author: req.user.name || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: status === 'published' ? new Date().toISOString() : null,
    };
    appendItem('blog-posts.json', post);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'ब्लॉग बनाने में विफल' });
  }
});

// PUT /api/admin/blog/:id
router.put('/blog/:id', (req, res) => {
  try {
    const existing = findById('blog-posts.json', req.params.id);
    if (!existing) return res.status(404).json({ error: 'पोस्ट नहीं मिली' });
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    if (req.body.status === 'published' && !existing.publishedAt) {
      updates.publishedAt = new Date().toISOString();
    }
    const updated = updateItem('blog-posts.json', req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'पोस्ट अपडेट करने में विफल' });
  }
});

// DELETE /api/admin/blog/:id
router.delete('/blog/:id', (req, res) => {
  try {
    const exists = findById('blog-posts.json', req.params.id);
    if (!exists) return res.status(404).json({ error: 'पोस्ट नहीं मिली' });
    deleteItem('blog-posts.json', req.params.id);
    res.json({ success: true, message: 'पोस्ट हटा दी गई' });
  } catch (err) {
    res.status(500).json({ error: 'पोस्ट हटाने में विफल' });
  }
});

// ─── CMS: Banners ───────────────────────────────────────────

// GET /api/admin/banners
router.get('/banners', (req, res) => {
  try {
    const banners = readJSON('banners.json');
    banners.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: 'बैनर लोड करने में विफल' });
  }
});

// POST /api/admin/banners
router.post('/banners', (req, res) => {
  try {
    const { title, message, link, type, order } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'टाइटल और संदेश ज़रूरी है' });
    const banner = {
      id: uuid(), title, message, link: link || '', type: type || 'info',
      active: true, order: order || 0, createdAt: new Date().toISOString(),
    };
    appendItem('banners.json', banner);
    res.json(banner);
  } catch (err) {
    res.status(500).json({ error: 'बैनर बनाने में विफल' });
  }
});

// PUT /api/admin/banners/:id
router.put('/banners/:id', (req, res) => {
  try {
    const exists = findById('banners.json', req.params.id);
    if (!exists) return res.status(404).json({ error: 'बैनर नहीं मिला' });
    const updated = updateItem('banners.json', req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'बैनर अपडेट करने में विफल' });
  }
});

// DELETE /api/admin/banners/:id
router.delete('/banners/:id', (req, res) => {
  try {
    const exists = findById('banners.json', req.params.id);
    if (!exists) return res.status(404).json({ error: 'बैनर नहीं मिला' });
    deleteItem('banners.json', req.params.id);
    res.json({ success: true, message: 'बैनर हटा दिया गया' });
  } catch (err) {
    res.status(500).json({ error: 'बैनर हटाने में विफल' });
  }
});

// ─── CMS: Crop Info ─────────────────────────────────────────

// GET /api/admin/crop-info
router.get('/crop-info', (req, res) => {
  try {
    res.json(readJSON('crop-info.json'));
  } catch (err) {
    res.status(500).json({ error: 'फसल जानकारी लोड करने में विफल' });
  }
});

// POST /api/admin/crop-info
router.post('/crop-info', (req, res) => {
  try {
    const { cropId, growingTips, marketTrends, storageAdvice, seasonalInfo } = req.body;
    if (!cropId) return res.status(400).json({ error: 'फसल ID ज़रूरी है' });
    const info = {
      id: uuid(), cropId, growingTips: growingTips || '', marketTrends: marketTrends || '',
      storageAdvice: storageAdvice || '', seasonalInfo: seasonalInfo || '', updatedAt: new Date().toISOString(),
    };
    appendItem('crop-info.json', info);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'फसल जानकारी बनाने में विफल' });
  }
});

// PUT /api/admin/crop-info/:id
router.put('/crop-info/:id', (req, res) => {
  try {
    const exists = findById('crop-info.json', req.params.id);
    if (!exists) return res.status(404).json({ error: 'फसल जानकारी नहीं मिली' });
    const updated = updateItem('crop-info.json', req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'फसल जानकारी अपडेट करने में विफल' });
  }
});

// DELETE /api/admin/crop-info/:id
router.delete('/crop-info/:id', (req, res) => {
  try {
    const exists = findById('crop-info.json', req.params.id);
    if (!exists) return res.status(404).json({ error: 'फसल जानकारी नहीं मिली' });
    deleteItem('crop-info.json', req.params.id);
    res.json({ success: true, message: 'फसल जानकारी हटा दी गई' });
  } catch (err) {
    res.status(500).json({ error: 'फसल जानकारी हटाने में विफल' });
  }
});

// ─── CMS: Notifications ────────────────────────────────────

// GET /api/admin/notifications
router.get('/notifications', (req, res) => {
  try {
    const notifs = readJSON('notifications.json');
    notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: 'सूचनाएं लोड करने में विफल' });
  }
});

// POST /api/admin/notifications
router.post('/notifications', (req, res) => {
  try {
    const { title, message, type, target, targetState, expiresAt } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'टाइटल और संदेश ज़रूरी है' });
    const notif = {
      id: uuid(), title, message, type: type || 'info', target: target || 'all',
      targetState: targetState || null, active: true, expiresAt: expiresAt || null,
      createdAt: new Date().toISOString(),
    };
    appendItem('notifications.json', notif);
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: 'सूचना बनाने में विफल' });
  }
});

// PUT /api/admin/notifications/:id
router.put('/notifications/:id', (req, res) => {
  try {
    const exists = findById('notifications.json', req.params.id);
    if (!exists) return res.status(404).json({ error: 'सूचना नहीं मिली' });
    const updated = updateItem('notifications.json', req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'सूचना अपडेट करने में विफल' });
  }
});

// DELETE /api/admin/notifications/:id
router.delete('/notifications/:id', (req, res) => {
  try {
    const exists = findById('notifications.json', req.params.id);
    if (!exists) return res.status(404).json({ error: 'सूचना नहीं मिली' });
    deleteItem('notifications.json', req.params.id);
    res.json({ success: true, message: 'सूचना हटा दी गई' });
  } catch (err) {
    res.status(500).json({ error: 'सूचना हटाने में विफल' });
  }
});

export default router;
