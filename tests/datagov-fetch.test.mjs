import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createPageFetcher, safeFailure } = require('../scripts/lib/datagov-request.cjs');
const { parseArgs, fetchState, canReuseSlice, runIngestion } = require('../scripts/fetch-daily.cjs');
const opts = { delayMs: 0, minComplete: 0.98, probeOnly: false };
const row = (state = 'A', market = 'Market', price = 2500) => ({
  state, district: 'District', market, commodity: 'Wheat', variety: 'Mexican', grade: 'FAQ',
  arrival_date: '30/10/2026', min_price: price, max_price: price, modal_price: price,
});
const page = (records, total = records.length, revision = '2026-10-30T10:00:00') => ({ records, total, updated_date: revision });
const noWait = async () => {};
const quiet = () => {};

function memoryDeps({ request, cache = { states: {} }, knownStates = ['A'], merge = () => {} } = {}) {
  return { request, wait: noWait, log: quiet, knownStates, recentStates: () => [],
    readCache: () => cache, saveCache: () => {}, clearCache: () => {}, merge };
}

test('missing source key fails clearly before a request or timeout starts', async () => {
  for (const apiKey of [undefined, '', '   ']) {
    const fetchPage = createPageFetcher({ apiBase: 'https://example.test', apiKey,
      fetchImpl: () => assert.fail('missing credentials must not make a request'),
      setTimer: () => assert.fail('missing credentials must not start a timeout'),
    });
    await assert.rejects(fetchPage(0, null), /DATA_GOV_API_KEY is not configured/);
  }
});

test('network diagnostics expose useful cause codes without URLs, API keys or arbitrary messages', () => {
  const secret = 'private-key-do-not-log';
  const error = new Error(`fetch https://example.test?api-key=${secret}`, { cause: new AggregateError([
    Object.assign(new Error(secret), { code: 'ENETUNREACH' }),
    Object.assign(new Error(secret), { code: 'ETIMEDOUT' }),
  ]) });
  assert.equal(safeFailure(error), 'network request failed (ENETUNREACH, ETIMEDOUT)');
  assert.equal(safeFailure(new Error(secret)), 'network request failed');
});

test('every failed request clears its timer and the final attempt has no backoff sleep', async () => {
  let attempts = 0;
  const cleared = [], waits = [];
  const fetchPage = createPageFetcher({ apiBase: 'https://example.test', apiKey: 'private-key',
    fetchImpl: async () => { attempts++; throw Object.assign(new Error('private-key'), { cause: { code: 'ECONNRESET' } }); },
    setTimer: () => attempts + 1, clearTimer: timer => cleared.push(timer), sleep: async ms => waits.push(ms) });
  await assert.rejects(fetchPage(0, 'A', { retries: 3 }), /network request failed \(ECONNRESET\) after 3 attempts/);
  assert.equal(attempts, 3);
  assert.equal(cleared.length, 3);
  assert.deepEqual(waits, [3000, 6000]);
});

test('non-retryable HTTP failure is sanitized, bounded and cleans the timer', async () => {
  let attempts = 0, cleared = 0;
  const fetchPage = createPageFetcher({ apiBase: 'https://example.test', apiKey: 'private-key',
    fetchImpl: async () => { attempts++; return { ok: false, status: 401 }; },
    setTimer: () => 1, clearTimer: () => cleared++, sleep: () => assert.fail('401 must not retry') });
  await assert.rejects(fetchPage(0, null), /^Error: all offset 0: HTTP 401$/);
  assert.equal(attempts, 1);
  assert.equal(cleared, 1);
});

test('JSON response parsing remains covered by the timeout and always releases it', async () => {
  let cleared = 0;
  const fetchPage = createPageFetcher({ apiBase: 'https://example.test', apiKey: 'private-key',
    fetchImpl: async () => ({ ok: true, json: async () => { assert.equal(cleared, 0); return page([row()]); } }),
    setTimer: () => 1, clearTimer: () => cleared++ });
  const result = await fetchPage(0, null);
  assert.equal(result.total, 1);
  assert.equal(cleared, 1);
});

test('a timed-out source request is aborted, sanitized and cleaned up', async () => {
  let cleared = 0;
  const fetchPage = createPageFetcher({ apiBase: 'https://example.test', apiKey: 'private-key',
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('private-key'), { name: 'AbortError' })));
    }),
    setTimer: callback => { queueMicrotask(callback); return 1; }, clearTimer: () => cleared++,
  });
  await assert.rejects(fetchPage(0, null, { retries: 1 }), /request timed out after 1 attempts/);
  assert.equal(cleared, 1);
});

test('source probe performs one bounded request and never reads or writes stored state', async () => {
  assert.equal(parseArgs(['--probe']).probeOnly, true);
  let calls = 0;
  const fail = () => assert.fail('probe must not touch stored state');
  const result = await runIngestion({ ...opts, probeOnly: true }, {
    request: async (offset, state, limits) => {
      calls++;
      assert.deepEqual([offset, state], [0, null]);
      assert.deepEqual(limits, { retries: 1, timeoutMs: 15000 });
      return page([row()], 500);
    }, log: quiet, recentStates: fail, readCache: fail, saveCache: fail, clearCache: fail, merge: fail,
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { probeOnly: true, datasetTotal: 500 });
});

test('zero-row pages with a positive source total stop pagination instead of spinning', async () => {
  await assert.rejects(fetchState('A', opts, { request: async () => page([], 2), wait: noWait, log: quiet }), /empty first page/);
  let calls = 0;
  await assert.rejects(fetchState('A', opts, { request: async () => ++calls === 1 ? page([row()], 2) : page([], 2), wait: noWait, log: quiet }), /empty page/);
  assert.equal(calls, 2);
});

test('a stable retry uses only its own rows when caching a source revision', async () => {
  const responses = [page([row('A', 'Old')], 2, 'old'), page([row('A', 'Old')], 2, 'new'),
    page([row('A', 'Current')], 1, 'new')];
  const result = await fetchState('A', opts, { request: async () => responses.shift(), wait: noWait, log: quiet });
  assert.equal(result.snapshot, 'new');
  assert.deepEqual(result.rows.map(record => record.market), ['Current']);
});

test('same-size source revisions cannot reuse old prices or unknown revision metadata', () => {
  const saved = { total: 1, stored: 1, snapshot: 'old-revision' };
  assert.equal(canReuseSlice(saved, page([row()], 1, 'new-revision')), false);
  assert.equal(canReuseSlice(saved, page([row()], 1, 'old-revision')), true);
  assert.equal(canReuseSlice({ total: 1, snapshot: 'unknown' }, { records: [row()], total: 1 }), false);
  assert.equal(canReuseSlice({ total: 1 }, page([row()], 1)), false);
});

test('a matching first source page cannot skip unseen state records', async () => {
  const stored = new Map([['A', row('A')]]);
  const inspected = [];
  await runIngestion(opts, memoryDeps({ knownStates: ['A', 'B'],
    request: async (_offset, state) => { inspected.push(state); return state ? page([row(state)]) : page([row('A')], 2); },
    merge: rows => { for (const record of rows) stored.set(record.state, record); },
  }));
  assert.deepEqual(inspected, [null, 'A', 'B']);
  assert.equal(stored.get('B').state, 'B');
});

test('failed cached-state verification leaves the run failed even when old totals cover the dataset', async () => {
  let cleared = false;
  const cache = { states: { A: { total: 1, stored: 1, snapshot: '2026-10-30T10:00:00' } } };
  const deps = memoryDeps({ cache, request: async (_offset, state) => {
    if (state) throw new Error('Source unavailable');
    return page([row()]);
  } });
  deps.clearCache = () => { cleared = true; };
  await assert.rejects(runIngestion(opts, deps), /Incomplete refresh/);
  assert.equal(cleared, false);
});

test('changed prices in a same-sized source revision are fetched and merged again', async () => {
  const savedRows = [];
  const cache = { states: { A: { total: 1, stored: 1, snapshot: 'old' } } };
  await runIngestion(opts, memoryDeps({ cache,
    request: async () => page([row('A', 'Market', 3000)], 1, 'new'),
    merge: rows => savedRows.push(...rows),
  }));
  assert.equal(savedRows[0].modal_price, 3000);
  assert.equal(cache.states.A.snapshot, 'new');
});

test('repeated invalid rows cannot satisfy completeness or be marked stored', async () => {
  const invalid = { ...row(), modal_price: 0 };
  const cache = { states: {} };
  await assert.rejects(runIngestion(opts, memoryDeps({ cache,
    request: async (_offset, state) => state ? page([row(), invalid, invalid], 3) : page([row()], 3),
    merge: () => assert.fail('incomplete state must not merge'),
  })), /Incomplete refresh/);
  assert.equal(cache.states.A, undefined);
});
