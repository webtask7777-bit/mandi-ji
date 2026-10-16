import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { findById } from '../db/json-store.js';

// Never fall back to a secret written in the (public) repository: anyone could forge an
// admin token with it. Production without JWT_SECRET refuses to issue or accept tokens;
// local development gets a random secret per process (sessions end on restart).
const IS_PRODUCTION = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
const configured = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32 ? process.env.JWT_SECRET : null;
const JWT_SECRET = configured || (IS_PRODUCTION ? null : randomBytes(32).toString('hex'));

export const authAvailable = () => Boolean(JWT_SECRET);
export const AUTH_UNAVAILABLE = Object.freeze({ error: 'लॉगिन अभी उपलब्ध नहीं है', code: 'AUTH_NOT_CONFIGURED' });

export function signToken(user) {
  if (!JWT_SECRET) throw Object.assign(new Error('JWT_SECRET is not configured'), { code: 'AUTH_NOT_CONFIGURED' });
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authRequired(req, res, next) {
  if (!JWT_SECRET) return res.status(503).json(AUTH_UNAVAILABLE);
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'लॉग इन करें' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
    const user = findById('users.json', decoded.id);
    if (!user) return res.status(401).json({ error: 'उपयोगकर्ता नहीं मिला' });
    // A token issued before suspension must stop working at once, not after 30 days.
    if (user.status === 'suspended') return res.status(403).json({ error: 'खाता निलंबित है' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'सत्र समाप्त हो गया' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!JWT_SECRET || !header || !header.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
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
