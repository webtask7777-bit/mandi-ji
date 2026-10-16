import { Router } from 'express';
import { readJSON } from '../db/json-store.js';
import { getEditorialPost, listEditorialPosts } from '../utils/editorial.js';

export function createCmsRouter(read = readJSON) {
const router = Router();

// GET /api/cms/pages/:key
router.get('/pages/:key', (req, res) => {
  try {
    const pages = read('pages.json');
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
    res.json(listEditorialPosts(read('blog-posts.json'), req.query));
  } catch (err) {
    res.status(500).json({ error: 'ब्लॉग लोड करने में विफल' });
  }
});

// GET /api/cms/blog/:slug — single published article
router.get('/blog/:slug', (req, res) => {
  try {
    const post = getEditorialPost(read('blog-posts.json'), req.params.slug);
    if (!post) return res.status(404).json({ error: 'पोस्ट नहीं मिली' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'पोस्ट लोड करने में विफल' });
  }
});

// GET /api/cms/banners — active banners
router.get('/banners', (req, res) => {
  try {
    const banners = read('banners.json');
    const active = banners.filter(b => b.active).sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: 'बैनर लोड करने में विफल' });
  }
});

// GET /api/cms/crop-info/:cropId
router.get('/crop-info/:cropId', (req, res) => {
  try {
    const all = read('crop-info.json');
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
    const notifs = read('notifications.json');
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

return router;
}

export default createCmsRouter();
