import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { isFreshPriceDetail, latestRecordDate, STALE_DAYS } from '../src/utils/indexability.js';

const detail = date => ({ dailyHistory: [{ date, market: 1200 }], history: [] });

test('fresh and stale crop records', () => {
  assert.equal(latestRecordDate({ dailyHistory: [{ date: '2026-03-11', market: 900 }, { date: '2026-01-02', market: 0 }], history: [{ date: '2026-05', market: 1 }] }), '2026-03-11');
  assert.equal(isFreshPriceDetail(detail('2026-10-20'), '2026-10-22'), true);
  // /crop/delha in the audit: newest record 11 March 2026, 225 days before the dataset's newest.
  assert.equal(isFreshPriceDetail(detail('2026-03-11'), '2026-10-22'), false);
  const edge = new Date(Date.parse('2026-10-22T00:00:00Z') - STALE_DAYS * 86400000).toISOString().slice(0, 10);
  assert.equal(isFreshPriceDetail(detail(edge), '2026-10-22'), true, `exactly ${STALE_DAYS} days is still fresh`);
  assert.equal(isFreshPriceDetail({ dailyHistory: [], history: [] }, '2026-10-22'), false, 'no price is never indexable');
});

// Built pages: what a crawler receives must match the sitemap. The page sets the directive
// itself, so the same value holds after JavaScript runs.
const routesFile = new URL('../server/generated/seo/routes.json', import.meta.url);
test('every crop page outside the sitemap is noindex, every one inside is indexable', { skip: existsSync(routesFile) ? false : 'Run the production build first.' }, () => {
  const { routes, knownCrops } = JSON.parse(readFileSync(routesFile, 'utf8'));
  const indexed = new Set(routes);
  let stale = 0;
  for (const route of knownCrops) {
    const html = readFileSync(new URL(`../dist${route}.html`, import.meta.url), 'utf8');
    const robots = html.match(/name="robots" content="([^"]+)"/)?.[1];
    if (indexed.has(route)) assert.match(robots, /^index/, route);
    else { stale++; assert.match(robots, /^noindex/, route); }
  }
  assert.ok(stale > 0, 'the current data has stale crop pages to check');
});
