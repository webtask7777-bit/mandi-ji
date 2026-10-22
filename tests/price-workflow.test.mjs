import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/mandi-prices.yml', import.meta.url), 'utf8');
const blocks = workflow.split(/^      - /m).slice(1);
const step = name => {
  const index = blocks.findIndex(block => block.startsWith(`name: ${name}\n`));
  assert.ok(index >= 0, `Missing workflow step: ${name}`);
  return { index, body: blocks[index] };
};

test('partial fetch recovery cannot cache progress before validated data is committed', () => {
  const fetch = step('Fetch current prices');
  const aggregate = step('Rebuild aggregates');
  const validate = step('Storage tests');
  const commit = step('Commit if anything changed');
  const cache = step('Keep fetch progress for the next run');
  assert.match(fetch.body, /^        id: fetch$/m);
  assert.match(fetch.body, /^        continue-on-error: true$/m);
  assert.ok(fetch.index < aggregate.index && aggregate.index < validate.index && validate.index < commit.index && commit.index < cache.index);
  assert.match(validate.body, /node --test tests\/daily-store\.test\.mjs/);
  assert.match(commit.body, /^        id: commit_data$/m);
  assert.match(commit.body, /^            git push$/m);
  assert.match(cache.body, /^        if: success\(\) && steps\.commit_data\.outcome == 'success'$/m);
  for (const gated of [aggregate, validate, commit]) {
    assert.doesNotMatch(gated.body, /^        continue-on-error: true$/m);
    assert.doesNotMatch(gated.body, /^        if:.*always\(/m);
  }
});

test('an incomplete fetch still fails the job after any recoverable data has been saved', () => {
  const report = step('Report incomplete fetch');
  assert.ok(report.index > step('Keep fetch progress for the next run').index);
  assert.ok(report.index > step('Freshness').index);
  assert.match(report.body, /^        if: always\(\) && steps\.fetch\.outcome == 'failure'$/m);
  assert.match(report.body, /^          exit 1$/m);
  assert.doesNotMatch(report.body, /continue-on-error:/);
});
