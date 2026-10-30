import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));

test('API packaging includes runtime data without pulling build-only raw snapshots back into the bundle', () => {
  const rule = config.functions['api/index.mjs'];
  for (const file of [
    'server/index.js', 'server/routes/prices.js', 'server/db/connection.js',
    'server/db/data/blog-posts.json', 'server/db/data/listings.json',
    'server/db/data/crop-prices/paddy.json',
    'server/db/data/india/stats.json', 'server/db/data/india/crop-prices/wheat.json',
    'server/db/data/india/states/chhattisgarh/crops.json',
    'server/db/data/india/states/chhattisgarh/crop-prices/paddycommon.json',
  ]) assert.ok(matchesGlob(file, rule.includeFiles), `${file}: required runtime file remains included`);
  for (const file of [
    'server/db/data/daily/2026-10-29.json',
    'server/db/data/daily/snapshots/2026-10-29.json',
    'server/generated/seo/runtime-index.json',
    'dist/index.html', 'public/visuals/farm-journal-v1.webp',
  ]) assert.equal(matchesGlob(file, rule.includeFiles), false, `${file}: not force-included in the API function`);
  assert.ok(matchesGlob('server/db/data/daily/2026-10-29.json', rule.excludeFiles));
});

test('page and middleware retain their small generated SEO artifacts', () => {
  const page = config.functions['api/page.mjs'];
  assert.ok(matchesGlob('server/generated/seo/404.html', page.includeFiles));
  assert.ok(matchesGlob('server/generated/seo/shell.html', page.includeFiles));
  assert.ok(matchesGlob('server/db/data/listings.json', page.includeFiles));
  assert.equal(matchesGlob('server/db/data/daily/2026-10-29.json', page.includeFiles), false);
  assert.equal(config.proxy.entrypoint, 'proxy.js');
  assert.match(readFileSync(new URL('../proxy.js', import.meta.url), 'utf8'), /import manifest from '\.\/server\/generated\/seo\/runtime-index\.json'/);
});
