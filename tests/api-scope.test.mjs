import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import cropsRouter from '../server/routes/crops.js';
import tickerRouter from '../server/routes/ticker.js';
import pricesRouter from '../server/routes/prices.js';
import statsRouter from '../server/routes/stats.js';

async function serve(t) {
  const app = express();
  app.use('/api/crops', cropsRouter);
  app.use('/api/ticker', tickerRouter);
  app.use('/api/prices', pricesRouter);
  app.use('/api/stats', statsRouter);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return async path => { const r = await fetch(base + path); return { status: r.status, body: await r.json() }; };
}

test('a missing state means all-India on every price route', async t => {
  const get = await serve(t);
  for (const path of ['/api/crops', '/api/ticker', '/api/prices/onion']) {
    assert.deepEqual((await get(path)).body, (await get(`${path}${path.includes('?') ? '&' : '?'}state=all`)).body, path);
  }
});

test('Chhattisgarh uses its current state data, not the March 2026 legacy files', async t => {
  const get = await serve(t);
  const crops = (await get('/api/crops?state=chhattisgarh')).body;
  assert.ok(crops.some(crop => crop.id === 'paddycommon'));
  const detail = (await get('/api/prices/paddycommon?state=chhattisgarh')).body;
  assert.ok(String(detail.history.at(-1).date) > '2026-03');
});

test('unknown, malformed or repeated state values are rejected', async t => {
  const get = await serve(t);
  for (const state of ['..', 'atlantis', 'Tamil Nadu', 'all&state=tamil-nadu']) {
    const { status, body } = await get(`/api/ticker?state=${state.includes('&') ? state : encodeURIComponent(state)}`);
    assert.equal(status, 400, state);
    assert.equal(body.code, 'UNKNOWN_STATE');
  }
});

test('months counts calendar months and ignores invalid values', async t => {
  const get = await serve(t);
  const full = (await get('/api/prices/onion?state=all&months=36')).body.history;
  const three = (await get('/api/prices/onion?state=all&months=3')).body.history;
  const latest = full.at(-1).date;
  const [y, m] = latest.split('-').map(Number);
  const idx = y * 12 + m - 1 - 2;
  const cutoff = `${Math.floor(idx / 12)}-${String(idx % 12 + 1).padStart(2, '0')}`;
  assert.ok(three.every(point => point.date >= cutoff));
  for (const bad of ['-1', '0', 'abc']) assert.equal((await get(`/api/prices/onion?state=all&months=${bad}`)).body.history.length, (await get('/api/prices/onion?state=all')).body.history.length, bad);
});
