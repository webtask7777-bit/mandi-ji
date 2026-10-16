import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run in a child process so environment variables are read fresh by the module.
const root = fileURLToPath(new URL('..', import.meta.url));
const probe = `
  import jwt from 'jsonwebtoken';
  import { authRequired, authAvailable } from './server/middleware/auth.js';
  const forged = jwt.sign({ id: 'e9e9c1ce-0000', role: 'admin' }, 'mandiji-dev-secret-2026');
  let status = 200;
  const res = { status(code) { status = code; return { json() {} }; } };
  authRequired({ headers: { authorization: 'Bearer ' + forged } }, res, () => {});
  console.log(JSON.stringify({ available: authAvailable(), status }));
`;
const run = env => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: root, env: { PATH: process.env.PATH, ...env } }).toString());

test('production without JWT_SECRET issues and accepts no tokens', () => {
  assert.deepEqual(run({ VERCEL: '1' }), { available: false, status: 503 });
});

test('a token signed with the old public fallback secret is rejected everywhere', () => {
  assert.equal(run({}).status, 401, 'local development uses a random secret');
  assert.equal(run({ VERCEL: '1', JWT_SECRET: 'x'.repeat(48) }).status, 401);
});
