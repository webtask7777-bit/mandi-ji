import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { NON_CROP_COMMODITY_IDS, isCropPriceCommodity } from '../src/utils/cropEligibility.js';
import { buildPriceGapCandidates } from '../src/utils/marketComparison.js';
import cropsRouter from '../server/routes/crops.js';
import tickerRouter from '../server/routes/ticker.js';
import pricesRouter from '../server/routes/prices.js';
import mandiCompareRouter from '../server/routes/mandi-compare.js';
import arbitrageRouter from '../server/routes/arbitrage.js';

const rawCrops = JSON.parse(readFileSync(new URL('../server/db/data/india/crops.json', import.meta.url), 'utf8'));

test('exact known non-crop IDs are excluded without excluding cowpea or lookalikes', () => {
  assert.equal(NON_CROP_COMMODITY_IDS.length, 18);
  // sheep and she-goat are excluded before they ever appear in the source data.
  for (const id of NON_CROP_COMMODITY_IDS) assert.equal(isCropPriceCommodity(id), false, id);
  assert.equal(isCropPriceCommodity(' GHEE '), false, 'dairy exclusion is exact and case-insensitive');
  assert.ok(rawCrops.some(crop => crop.id === 'ghee'), 'source dairy record remains intact while crop interfaces exclude it');
  for (const id of ['cowpeaveg', 'cowpealobia-karamani', 'bullar', 'eggplant', 'wheat', 'cow-unverified-variety']) assert.equal(isCropPriceCommodity(id), true, id);
  // The catalogue grows as new data arrives; exactly the known non-crop IDs are withheld.
  assert.ok(rawCrops.length >= 285);
  assert.equal(rawCrops.filter(crop => isCropPriceCommodity(crop.id)).length, rawCrops.filter(crop => !NON_CROP_COMMODITY_IDS.includes(crop.id)).length);
});

test('price-gap candidates cannot offer livestock under quintal cost assumptions', () => {
  const rows = [{ name: 'A', topVariety: 'FAQ', recentPrice: 2000 }, { name: 'B', topVariety: 'FAQ', recentPrice: 4000 }];
  const ids = [...NON_CROP_COMMODITY_IDS, 'cowpeaveg', 'cowpealobia-karamani', 'wheat'];
  const input = Object.fromEntries(ids.map(id => [id, rows.map(row => ({ ...row, commodityId: id, comparisonIdentity: 'commodity-mandi-variety-grade-date-v1', marketId: row.name, grade: 'FAQ', unit: 'INR/quintal', quotePrice: row.recentPrice, quoteDate: '2026-10-29', priceBasis: 'daily-modal' }))]));
  const before = JSON.stringify(input);
  const output = buildPriceGapCandidates(input, ids.map(id => ({ id, name: id })), { now: new Date('2026-10-30T10:00:00Z') });
  assert.deepEqual(output.map(row => row.cropId).sort(), ['cowpeaveg', 'cowpealobia-karamani', 'wheat'].sort());
  assert.equal(JSON.stringify(input), before, 'raw market inputs remain unchanged');
});

test('served catalogs and direct price endpoints share the unit eligibility guard', async t => {
  const app = express();
  app.use('/api/crops', cropsRouter);
  app.use('/api/ticker', tickerRouter);
  app.use('/api/prices', pricesRouter);
  app.use('/api/mandi-compare', mandiCompareRouter);
  app.use('/api/arbitrage', arbitrageRouter);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async path => { const response = await fetch(`${base}${path}`); return { status: response.status, body: await response.json() }; };
  for (const state of ['all', 'chhattisgarh', 'uttar-pradesh']) {
    for (const kind of ['crops', 'ticker']) {
      const { status, body } = await get(`/api/${kind}?state=${state}`);
      assert.equal(status, 200);
      assert.ok(body.length > 0);
      assert.ok(body.every(crop => isCropPriceCommodity(crop.id)), `${kind}/${state}`);
      if (kind === 'crops' && state === 'all') {
        assert.equal(body.length, rawCrops.filter(crop => !NON_CROP_COMMODITY_IDS.includes(crop.id)).length);
        assert.ok(body.some(crop => crop.id === 'cowpeaveg'));
        assert.ok(body.some(crop => crop.id === 'cowpealobia-karamani'));
      }
    }
  }
  for (const id of NON_CROP_COMMODITY_IDS) {
    for (const kind of ['crops', 'prices', 'mandi-compare']) {
      const { status, body } = await get(`/api/${kind}/${id}?state=all`);
      assert.equal(status, 422, `${kind}/${id}`);
      assert.equal(body.code, 'UNSUPPORTED_COMMODITY_UNIT');
      assert.equal(body.history, undefined);
    }
  }
  for (const id of ['cowpeaveg', 'cowpealobia-karamani', 'wheat']) {
    const { status, body } = await get(`/api/prices/${id}?state=all`);
    assert.equal(status, 200);
    assert.equal(body.crop.id, id);
  }
  const arbitrage = await get('/api/arbitrage?state=all');
  assert.equal(arbitrage.status, 200);
  assert.ok(arbitrage.body.every(row => isCropPriceCommodity(row.cropId)));
});
