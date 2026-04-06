import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const INDIA_DIR = path.join(DATA_DIR, 'india');

const cache = {};

export function loadData(name) {
  if (!cache[name]) {
    const file = path.join(DATA_DIR, `${name}.json`);
    cache[name] = JSON.parse(readFileSync(file, 'utf-8'));
  }
  return cache[name];
}

export function loadCropPrices(cropId) {
  const key = `crop-prices/${cropId}`;
  if (!cache[key]) {
    const file = path.join(DATA_DIR, 'crop-prices', `${cropId}.json`);
    cache[key] = JSON.parse(readFileSync(file, 'utf-8'));
  }
  return cache[key];
}

export function loadIndiaData(name) {
  const key = `india/${name}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, `${name}.json`);
    if (!existsSync(file)) return null;
    cache[key] = JSON.parse(readFileSync(file, 'utf-8'));
  }
  return cache[key];
}

export function loadStateData(stateId, name) {
  const key = `india/states/${stateId}/${name}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, 'states', stateId, `${name}.json`);
    if (!existsSync(file)) return null;
    cache[key] = JSON.parse(readFileSync(file, 'utf-8'));
  }
  return cache[key];
}

export function loadIndiaCropPrices(cropId) {
  const key = `india/crop-prices/${cropId}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, 'crop-prices', `${cropId}.json`);
    if (!existsSync(file)) return null;
    cache[key] = JSON.parse(readFileSync(file, 'utf-8'));
  }
  return cache[key];
}

export function loadStateCropPrices(stateId, cropId) {
  const key = `india/states/${stateId}/crop-prices/${cropId}`;
  if (!cache[key]) {
    const file = path.join(INDIA_DIR, 'states', stateId, 'crop-prices', `${cropId}.json`);
    if (!existsSync(file)) return null;
    cache[key] = JSON.parse(readFileSync(file, 'utf-8'));
  }
  return cache[key];
}

export function reloadData(name) {
  delete cache[name];
  return loadData(name);
}
