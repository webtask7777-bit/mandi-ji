import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { normalizeCropDataset, normalizeCropPriceDetail } from './crop-display-names.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const INDIA_DIR = path.join(DATA_DIR, 'india');

const cache = {};

// Every id that becomes part of a file path must be a plain slug: no dots, slashes or
// encoded traversal can reach another data file.
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;
export const isSafeId = id => typeof id === 'string' && id.length <= 80 && SAFE_ID.test(id);

export function loadData(name) {
  if (!cache[name]) {
    const file = path.join(DATA_DIR, `${name}.json`);
    cache[name] = normalizeCropDataset(name, JSON.parse(readFileSync(file, 'utf-8')));
  }
  return cache[name];
}

export function loadCropPrices(cropId) {
  if (!isSafeId(cropId)) return null;
  const key = `crop-prices/${cropId}`;
  if (!cache[key]) {
    const file = path.join(DATA_DIR, 'crop-prices', `${cropId}.json`);
    cache[key] = normalizeCropPriceDetail(JSON.parse(readFileSync(file, 'utf-8')));
  }
  return cache[key];
}

export function loadIndiaData(name) {
  if (!isSafeId(name)) return null;
  const key = `india/${name}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, `${name}.json`);
    if (!existsSync(file)) return null;
    cache[key] = normalizeCropDataset(name, JSON.parse(readFileSync(file, 'utf-8')));
  }
  return cache[key];
}

export function loadStateData(stateId, name) {
  if (!isSafeId(stateId) || !isSafeId(name)) return null;
  const key = `india/states/${stateId}/${name}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, 'states', stateId, `${name}.json`);
    if (!existsSync(file)) return null;
    cache[key] = normalizeCropDataset(name, JSON.parse(readFileSync(file, 'utf-8')));
  }
  return cache[key];
}

export function loadIndiaCropPrices(cropId) {
  if (!isSafeId(cropId)) return null;
  const key = `india/crop-prices/${cropId}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, 'crop-prices', `${cropId}.json`);
    if (!existsSync(file)) return null;
    cache[key] = normalizeCropPriceDetail(JSON.parse(readFileSync(file, 'utf-8')));
  }
  return cache[key];
}

export function loadStateCropPrices(stateId, cropId) {
  if (!isSafeId(stateId) || !isSafeId(cropId)) return null;
  const key = `india/states/${stateId}/crop-prices/${cropId}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, 'states', stateId, 'crop-prices', `${cropId}.json`);
    if (!existsSync(file)) return null;
    cache[key] = normalizeCropPriceDetail(JSON.parse(readFileSync(file, 'utf-8')));
  }
  return cache[key];
}

export function reloadData(name) {
  delete cache[name];
  return loadData(name);
}

// ─── Price scopes ───────────────────────────────────────────────────────
// Every price route resolves `state` the same way: missing → all-India; a known state id →
// that state's current data (Chhattisgarh included; its legacy files stop in March 2026);
// anything else → null, which routes answer with 400 instead of an empty 200.
let stateIds = null;
export function resolveScope(state) {
  if (state === undefined || state === '' || state === 'all') return 'all';
  if (typeof state !== 'string' || !/^[a-z][a-z-]*$/.test(state)) return null;
  if (!stateIds) {
    const dir = path.join(INDIA_DIR, 'states');
    stateIds = new Set(existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : []);
  }
  return stateIds.has(state) ? state : null;
}

export function loadScopeData(scope, name) {
  return scope === 'all' ? loadIndiaData(name) : loadStateData(scope, name);
}

export function loadScopeCropPrices(scope, cropId) {
  return scope === 'all' ? loadIndiaCropPrices(cropId) : loadStateCropPrices(scope, cropId);
}

export const UNKNOWN_STATE_ERROR = Object.freeze({ error: 'Unknown state', code: 'UNKNOWN_STATE' });
