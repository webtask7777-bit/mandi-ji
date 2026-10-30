import test from 'node:test';
import assert from 'node:assert/strict';
import { findDataGaps, ageInDays, sortStatesByFreshness } from '../src/utils/dataStatus.js';

test('the July–October stored-data gap is found and described by its missing days', () => {
  const gaps = findDataGaps(['2026-07-17', '2026-07-18', '2026-07-19', '2026-10-16']);
  assert.deepEqual(gaps, [{ from: '2026-07-20', to: '2026-10-15', days: 88 }]);
  assert.deepEqual(findDataGaps(['2026-10-10', '2026-10-12', '2026-10-16']), []);
});

test('recent one-day and two-day stored gaps can be surfaced without blaming the source', () => {
  assert.deepEqual(findDataGaps(['2026-10-22', '2026-10-24', '2026-10-27', '2026-10-29'], 0), [
    { from: '2026-10-28', to: '2026-10-28', days: 1 },
    { from: '2026-10-25', to: '2026-10-26', days: 2 },
    { from: '2026-10-23', to: '2026-10-23', days: 1 },
  ]);
});

test('age counts whole days in India time', () => {
  assert.equal(ageInDays('2026-10-16', new Date('2026-10-16T18:29:00Z')), 0);
  assert.equal(ageInDays('2026-10-16', new Date('2026-10-16T18:30:00Z')), 1);
  assert.equal(ageInDays('bad'), null);
});

test('states are listed freshest first', () => {
  const s = sortStatesByFreshness([{ id: 'a', latestObservation: '2026-07-19' }, { id: 'b', latestObservation: '2026-10-16', recentMandis: 2 }, { id: 'c', latestObservation: '2026-10-16', recentMandis: 9 }]);
  assert.deepEqual(s.map(x => x.id), ['c', 'b', 'a']);
});
