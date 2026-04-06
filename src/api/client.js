const BASE = '/api';

function getToken() {
  return localStorage.getItem('mj_token');
}

function handle401(res) {
  if (res.status === 401) {
    localStorage.removeItem('mj_token');
    window.location.href = '/login';
  }
}

export async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export async function apiPost(path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (res.status === 401) { handle401(res); throw new Error('सेशन समाप्त, फिर से लॉगिन करें'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data;
}

export async function apiPut(path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (res.status === 401) { handle401(res); throw new Error('सेशन समाप्त, फिर से लॉगिन करें'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data;
}

export async function apiDelete(path) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers });
  if (res.status === 401) { handle401(res); throw new Error('सेशन समाप्त, फिर से लॉगिन करें'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data;
}

export async function apiFetchAuth(path) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (res.status === 401) { handle401(res); throw new Error('सेशन समाप्त, फिर से लॉगिन करें'); }
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}
