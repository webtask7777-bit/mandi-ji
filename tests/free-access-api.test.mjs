import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('both deployments omit the payment gateway dependency', () => {
  for (const prefix of ['../', '../server/']) {
    const manifest = JSON.parse(read(`${prefix}package.json`));
    const lock = JSON.parse(read(`${prefix}package-lock.json`));
    assert.equal(manifest.dependencies.razorpay, undefined);
    assert.equal(lock.packages[''].dependencies.razorpay, undefined);
    assert.equal(lock.packages['node_modules/razorpay'], undefined);
    for (const [name, version] of Object.entries(manifest.dependencies)) {
      assert.equal(lock.packages[''].dependencies[name], version, `${prefix}${name}: manifest and lock agree`);
    }
  }
});

test('all retired billing URLs remain inert, including malformed and replayed webhooks', async t => {
  const files = ['../server/db/data/users.json', '../server/db/data/payments.json'];
  const snapshot = () => files.map(path => {
    const file = new URL(path, import.meta.url);
    return { content: readFileSync(file), mtimeNs: statSync(file, { bigint: true }).mtimeNs };
  });
  const before = snapshot();
  const nativeFetch = globalThis.fetch;
  const originalVercel = process.env.VERCEL;
  const networkMethods = [[http, 'request'], [http, 'get'], [https, 'request'], [https, 'get'], [globalThis, 'fetch']];
  const originals = networkMethods.map(([owner, key]) => owner[key]);
  let outgoingCalls = 0;
  for (const [owner, key] of networkMethods) {
    owner[key] = () => { outgoingCalls++; throw new Error('Billing must never contact a payment gateway'); };
  }
  t.after(() => {
    networkMethods.forEach(([owner, key], index) => { owner[key] = originals[index]; });
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });
  process.env.VERCEL = '1';
  const { default: app } = await import('../server/index.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const expected = {
    code: 'PAYMENT_DISABLED',
    free: true,
    message: 'सही भाव की सभी सुविधाएँ मुफ़्त हैं। भुगतान और सदस्यता बंद हैं।',
  };
  const check = async (path, method, body) => {
    const response = await nativeFetch(`${base}/api/payments${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer obsolete-session', 'x-razorpay-signature': 'obsolete-signature' },
      ...(body === undefined ? {} : { body }),
    });
    assert.equal(response.status, 410, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    if (method === 'HEAD') assert.equal(await response.text(), '');
    else assert.deepEqual(await response.json(), expected);
  };
  for (const path of ['', '/plans', '/status', '/create-order', '/create-subscription', '/verify', '/cancel', '/webhook', '/unknown/nested-route']) {
    await t.test(path || 'billing root', async () => {
      for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        await check(path, method, ['GET', 'HEAD'].includes(method) ? undefined : '{invalid-json');
      }
    });
  }
  await t.test('duplicate historical checkout and webhook payloads cannot change billing', async () => {
    for (let replay = 0; replay < 2; replay++) {
      await check('/verify', 'POST', JSON.stringify({ type: 'subscription', planId: 'pro_monthly', razorpay_payment_id: 'retired-payment' }));
      await check('/webhook', 'POST', JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'retired-subscription' } } } }));
    }
  });
  assert.equal(outgoingCalls, 0, 'no gateway or other outbound HTTP calls');
  assert.deepEqual(snapshot(), before, 'stored accounts and payment history have neither writes nor content changes');
  const health = await nativeFetch(`${base}/api/health`);
  assert.equal(health.status, 200, 'other API routes remain available');
});
