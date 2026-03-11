import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

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

export function reloadData(name) {
  delete cache[name];
  return loadData(name);
}
