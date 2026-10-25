import { loadStateData } from '../db/connection.js';
import { buildMandiIndex } from '../../shared/mandiPages.js';

// Per-state mandi pages, built once per process from the comparison records.
const indexes = new Map();
export function stateMandiIndex(scope) {
  if (!indexes.has(scope)) indexes.set(scope, buildMandiIndex(loadStateData(scope, 'mandi-compare') || {}, loadStateData(scope, 'crops') || []));
  return indexes.get(scope);
}
