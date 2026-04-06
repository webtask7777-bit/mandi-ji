import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const BASE = '/api/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('mj_token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('mj_token'));

  // Verify token on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => { localStorage.removeItem('mj_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (phone, password) => {
    const res = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'लॉग इन विफल');
    localStorage.setItem('mj_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async ({ name, phone, email, password }) => {
    const res = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'रजिस्ट्रेशन विफल');
    localStorage.setItem('mj_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const updateKYC = useCallback(async (kycData) => {
    const res = await fetch(`${BASE}/kyc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(kycData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'KYC अपडेट विफल');
    setUser(data.user);
    return data.user;
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('mj_token');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, login, register, updateKYC, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
