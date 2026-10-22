import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSiteOrigin, PRODUCTION_SITE_ORIGIN } from '../shared/siteOrigin.js';

test('metadata resolves old production values to the verified custom domain', () => {
  for (const value of [undefined, '', 'https://sahibhav.in/', 'https://mandi-ji.vercel.app', 'https://www.sahibhav.in/']) {
    assert.equal(resolveSiteOrigin(value), PRODUCTION_SITE_ORIGIN);
  }
  assert.equal(resolveSiteOrigin('https://preview.example.test/'), 'https://preview.example.test');
});

test('metadata rejects origins with credentials, insecure protocols or URL suffixes', () => {
  for (const value of ['http://sahibhav.in', 'https://name:pass@sahibhav.in', 'https://sahibhav.in/path', 'https://sahibhav.in?q=1', 'https://sahibhav.in#fragment']) {
    assert.throws(() => resolveSiteOrigin(value));
  }
});

test('legacy host rules are permanent and preserve the requested path', () => {
  const { redirects } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  const hostRules = redirects.filter(rule => rule.has?.some(item => item.type === 'host'));
  assert.deepEqual(hostRules.map(rule => rule.has[0].value), ['mandi-ji.vercel.app', 'www.sahibhav.in']);
  for (const rule of hostRules) {
    assert.equal(rule.source, '/:path*');
    assert.equal(rule.destination, `${PRODUCTION_SITE_ORIGIN}/:path*`);
    assert.equal(rule.permanent, true);
  }
});
