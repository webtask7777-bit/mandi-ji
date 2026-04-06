import jwt from 'jsonwebtoken';
import { findById } from '../db/json-store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mandiji-dev-secret-2026';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'लॉग इन करें' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    const user = findById('users.json', decoded.id);
    if (!user) return res.status(401).json({ error: 'उपयोगकर्ता नहीं मिला' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'सत्र समाप्त हो गया' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = findById('users.json', decoded.id);
  } catch { /* ignore */ }
  next();
}

export function adminOnly(req, res, next) {
  authRequired(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'अनुमति नहीं है' });
    }
    next();
  });
}
