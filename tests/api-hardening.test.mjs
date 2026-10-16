import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import pricesRouter from '../server/routes/prices.js';
import districtsRouter from '../server/routes/districts.js';
import mandisRouter from '../server/routes/mandis.js';
import statesRouter from '../server/routes/states.js';
import transportRouter from '../server/routes/transport.js';
import mandiCompareRouter from '../server/routes/mandi-compare.js';
import { createCmsRouter } from '../server/routes/cms.js';
import { getValidity } from '../server/routes/eway-bill.js';
import { isSafeId, loadStateData, loadIndiaCropPrices } from '../server/db/connection.js';

async function serve(t) {
  const app = express();
  app.use(express.json());
  app.use('/api/prices', pricesRouter);
  app.use('/api/districts', districtsRouter);
  app.use('/api/mandis', mandisRouter);
  app.use('/api/states', statesRouter);
  app.use('/api/transport', transportRouter);
  app.use('/api/mandi-compare', mandiCompareRouter);
  app.use('/api/cms', createCmsRouter(name => (name === 'pages.json' ? { about: { title: 'About' } } : [])));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (path, body) => {
    const r = await fetch(base + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: r.status, body: json };
  };
}

test('ids used in file paths must be plain slugs', () => {
  for (const id of ['wheat', 'bengal-gramgramwhole', 'chhattisgarh']) assert.equal(isSafeId(id), true, id);
  for (const id of ['../users', '..', '.', 'a/b', 'A', '', null, '%2e%2e']) assert.equal(isSafeId(id), false, String(id));
  assert.equal(loadIndiaCropPrices('../../users'), null);
  assert.equal(loadStateData('..', 'stats'), null);
});

test('crop and state ids cannot reach other data files', async t => {
  const get = await serve(t);
  for (const path of ['/api/prices/..%2F..%2Fusers', '/api/prices/..%2Fstats']) assert.notEqual((await get(path)).status, 200, path);
  for (const path of ['/api/districts?state=../..', '/api/mandis?state=../..', '/api/districts?state=zz', '/api/mandis?state=a&state=b']) {
    assert.equal((await get(path)).status, 400, path);
  }
  assert.equal((await get('/api/states/%2E%2E')).status, 404);
  assert.equal((await get('/api/states/chhattisgarh')).status, 200);
});

test('prototype keys are not treated as stored entries', async t => {
  const get = await serve(t);
  assert.equal((await get('/api/cms/pages/constructor')).status, 404);
  assert.equal((await get('/api/cms/pages/about')).status, 200);
  assert.deepEqual((await get('/api/mandi-compare/constructor')).body, []);
});

test('transport estimate refuses unknown cities and bad input instead of guessing', async t => {
  const get = await serve(t);
  const ok = await get('/api/transport/calculate', { origin: 'Raipur mandi', destination: 'Delhi', weightQuintals: 100, vehicleType: 'truck-small' });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.distance > 1000);
  assert.equal(ok.body.tollEstimate, Math.round(ok.body.distance * 0.5) * ok.body.trips);
  assert.equal((await get('/api/transport/calculate', { origin: 'रायपुर', destination: 'दिल्ली', weightQuintals: 10, vehicleType: 'pickup' })).status, 422);
  assert.equal((await get('/api/transport/calculate', { origin: 'Xyzabc', destination: 'Qwerty', weightQuintals: 10, vehicleType: 'pickup' })).status, 422);
  for (const body of [
    { origin: 'Raipur', destination: 'Durg', weightQuintals: 'abc', vehicleType: 'pickup' },
    { origin: 'Raipur', destination: 'Durg', weightQuintals: 1e12, vehicleType: 'pickup' },
    { origin: 'Raipur', destination: 'Durg', weightQuintals: 10, vehicleType: 'constructor' },
    { origin: 123, destination: 'Durg', weightQuintals: 10, vehicleType: 'pickup' },
  ]) assert.equal((await get('/api/transport/calculate', body)).status, 400, JSON.stringify(body));
});

test('e-way validity follows one day per 200 km or part of it', () => {
  assert.equal(getValidity(1), 1);
  assert.equal(getValidity(200), 1);
  assert.equal(getValidity(201), 2);
  assert.equal(getValidity(300), 2);
  assert.equal(getValidity(1000), 5);
});
