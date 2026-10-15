import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { arrivalToISO, normalizeRecord, recordKey, mergeDay, mergeRecords, istDate } = require('../scripts/lib/daily-store.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'daily-store-'));
const raw = (extra = {}) => ({ State: 'Maharashtra', District: 'Nagpur', Market: 'APMC Kamthi ', Commodity: 'Onion', Variety: 'Local', Grade: 'FAQ', Arrival_Date: '15/10/2026', Min_Price: '5000', Max_Price: '6000', Modal_Price: '5,550', ...extra });
const rec = (extra = {}) => normalizeRecord(raw(extra)).record;

test('arrival dates convert only when they are real calendar dates', () => {
  assert.equal(arrivalToISO('15/10/2026'), '2026-10-15');
  assert.equal(arrivalToISO('15-10-2026'), '2026-10-15');
  for (const bad of ['31/02/2026', '2026-10-15', '', null, '1/1/2026']) assert.equal(arrivalToISO(bad), null);
});

test('normalisation trims names, parses Indian number formats and rejects unusable rows', () => {
  const r = rec();
  assert.equal(r.market, 'APMC Kamthi');
  assert.equal(r.modal_price, 5550);
  assert.equal(normalizeRecord(raw({ Modal_Price: '0' })).error, 'missing modal price');
  assert.equal(normalizeRecord(raw({ Arrival_Date: '31/02/2026' })).error, 'invalid arrival date');
  assert.equal(normalizeRecord(raw({ Market: ' ' })).error, 'missing state/market/commodity');
});

test('identity key ignores spacing and case but keeps variety, grade and date apart', () => {
  assert.equal(recordKey(rec()), recordKey(rec({ Market: 'apmc  kamthi' })));
  assert.notEqual(recordKey(rec()), recordKey(rec({ Variety: 'Red' })));
  assert.notEqual(recordKey(rec()), recordKey(rec({ Grade: 'Large' })));
  assert.notEqual(recordKey(rec()), recordKey(rec({ Arrival_Date: '14/10/2026' })));
});

test('a partial second run adds and replaces but never removes stored records', () => {
  const dir = tmp();
  mergeDay('2026-10-15', [rec(), rec({ Commodity: 'Potato' })], { source: 'a', dir });
  const result = mergeDay('2026-10-15', [rec({ Modal_Price: '5600' }), rec({ Commodity: 'Tomato' })], { source: 'b', dir });
  assert.deepEqual({ before: result.before, after: result.after, replaced: result.replaced }, { before: 2, after: 3, replaced: 1 });
  const stored = JSON.parse(fs.readFileSync(path.join(dir, '2026-10-15.json'), 'utf-8'));
  assert.equal(stored.records.find(r => r.commodity === 'Onion').modal_price, 5600);
  assert.deepEqual(stored.sources, ['a', 'b']);
  assert.deepEqual(fs.readdirSync(dir), ['2026-10-15.json']);
});

test('records are filed under their own arrival date, never the fetch date', () => {
  const dir = tmp();
  const results = mergeRecords([rec(), rec({ Arrival_Date: '14/10/2026' })], { dir });
  assert.deepEqual(results.map(r => r.date), ['2026-10-14', '2026-10-15']);
  assert.throws(() => mergeDay('2026-10-16', [rec()], { dir }), /cannot be filed/);
});

test('a corrupt existing day file stops the write instead of being replaced', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, '2026-10-15.json'), '{"records": [');
  assert.throws(() => mergeDay('2026-10-15', [rec()], { dir }));
  assert.equal(fs.readFileSync(path.join(dir, '2026-10-15.json'), 'utf-8'), '{"records": [');
});

test('the India calendar day changes at 18:30 UTC', () => {
  assert.equal(istDate(new Date('2026-10-15T18:29:00Z')), '2026-10-15');
  assert.equal(istDate(new Date('2026-10-15T18:30:00Z')), '2026-10-16');
});
