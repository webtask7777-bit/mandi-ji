import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

export function readJSON(filename) {
  const file = path.join(DATA_DIR, filename);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, 'utf-8'));
}

export function writeJSON(filename, data) {
  const file = path.join(DATA_DIR, filename);
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export function findById(filename, id) {
  const data = readJSON(filename);
  return data.find(item => item.id === id) || null;
}

export function findByField(filename, field, value) {
  const data = readJSON(filename);
  return data.find(item => item[field] === value) || null;
}

export function appendItem(filename, item) {
  const data = readJSON(filename);
  data.push(item);
  writeJSON(filename, data);
  return item;
}

export function updateItem(filename, id, updates) {
  const data = readJSON(filename);
  const idx = data.findIndex(item => item.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...updates };
  writeJSON(filename, data);
  return data[idx];
}

export function deleteItem(filename, id) {
  const data = readJSON(filename);
  const filtered = data.filter(item => item.id !== id);
  if (filtered.length === data.length) return false;
  writeJSON(filename, filtered);
  return true;
}
