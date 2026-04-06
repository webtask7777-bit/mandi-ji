import { Router } from 'express';
import { readJSON, findByField } from '../db/json-store.js';

const router = Router();

// GET /api/cms/pages/:key
router.get('/pages/:key', (req, res) => {
  try {
    const pages = readJSON('pages.json');
    const page = pages[req.params.key];
    if (!page) return res.status(404).json({ error: 'पेज नहीं मिला' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: 'पेज लोड करने में विफल' });
  }
});

// GET /api/cms/blog — published posts with pagination
router.get('/blog', (req, res) => {
  try {
    const posts = readJSON('blog-posts.json');
    const published = posts
      .filter(p => p.status === 'published')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    res.json({
      posts: published.slice(start, start + limit),
      total: published.length,
      page,
      totalPages: Math.ceil(published.length / limit),
    });
  } catch (err) {
    res.status(500).json({ error: 'ब्लॉग लोड करने में विफल' });
  }
});

// GET /api/cms/blog/:slug — single published article
router.get('/blog/:slug', (req, res) => {
  try {
    const posts = readJSON('blog-posts.json');
    const post = posts.find(p => p.slug === req.params.slug && p.status === 'published');
    if (!post) return res.status(404).json({ error: 'पोस्ट नहीं मिली' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'पोस्ट लोड करने में विफल' });
  }
});

// GET /api/cms/banners — active banners
router.get('/banners', (req, res) => {
  try {
    const banners = readJSON('banners.json');
    const active = banners.filter(b => b.active).sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: 'बैनर लोड करने में विफल' });
  }
});

// GET /api/cms/crop-info/:cropId
router.get('/crop-info/:cropId', (req, res) => {
  try {
    const all = readJSON('crop-info.json');
    const info = all.find(c => c.cropId === req.params.cropId);
    if (!info) return res.status(404).json({ error: 'फसल जानकारी नहीं मिली' });
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'फसल जानकारी लोड करने में विफल' });
  }
});

// GET /api/cms/notifications — active non-expired
router.get('/notifications', (req, res) => {
  try {
    const notifs = readJSON('notifications.json');
    const now = new Date();
    const active = notifs.filter(n => {
      if (!n.active) return false;
      if (n.expiresAt && new Date(n.expiresAt) < now) return false;
      if (req.query.state && n.target === 'state' && n.targetState !== req.query.state) return false;
      if (n.target === 'all') return true;
      if (n.target === 'state' && req.query.state && n.targetState === req.query.state) return true;
      if (n.target === 'all') return true;
      return n.target === 'all';
    });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: 'सूचनाएं लोड करने में विफल' });
  }
});

export default router;
