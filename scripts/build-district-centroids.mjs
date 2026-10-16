#!/usr/bin/env node
/**
 * Build public/geo/district-centroids.json from the district boundary files in public/geo/districts.
 * A district's point is the average of the vertices of its largest ring: good enough for a
 * clearly labelled straight-line distance estimate, not for routing.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.join(import.meta.dirname, '..', 'public', 'geo', 'districts');
const out = path.join(import.meta.dirname, '..', 'public', 'geo', 'district-centroids.json');

function largestRing(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  let best = [];
  for (const polygon of polygons) if ((polygon[0] || []).length > best.length) best = polygon[0];
  return best;
}

const states = [];
for (const file of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const data = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
  const districts = [];
  let stateName = '';
  for (const feature of data.features || []) {
    const ring = largestRing(feature.geometry || {});
    const name = feature.properties?.districtName;
    stateName ||= feature.properties?.stateName || '';
    if (!name || ring.length < 3) continue;
    const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    districts.push({ name, lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) });
  }
  districts.sort((a, b) => a.name.localeCompare(b.name));
  if (districts.length) states.push({ id: file.replace(/\.json$/, ''), name: stateName, districts });
}
writeFileSync(out, JSON.stringify({ note: 'District centre points (average of boundary vertices) for distance estimates only.', states }));
console.log(`${states.length} states, ${states.reduce((n, s) => n + s.districts.length, 0)} districts → ${path.relative(process.cwd(), out)}`);
