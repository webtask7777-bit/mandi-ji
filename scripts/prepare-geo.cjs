#!/usr/bin/env node
/**
 * Prepare GeoJSON/TopoJSON data for the LeafletMap component
 *
 * Reads: scripts/raw-geo/india_states_covid19.geojson (TopoJSON with states+districts)
 * Outputs:
 *   public/geo/india-states.json         (GeoJSON FeatureCollection of states)
 *   public/geo/districts/{state-id}.json (GeoJSON FeatureCollection per state)
 *   public/geo/crop-state-matrix.json    (crop → [stateIds] mapping)
 */

const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

const RAW_FILE = path.join(__dirname, 'raw-geo', 'india_states_covid19.geojson');
const PUBLIC_GEO = path.join(__dirname, '..', 'public', 'geo');
const DISTRICTS_DIR = path.join(PUBLIC_GEO, 'districts');
const INDIA_DATA = path.join(__dirname, '..', 'server', 'db', 'data', 'india');

// State name → project stateId mapping
const STATE_ID_MAP = {
  'Andhra Pradesh': 'andhra-pradesh',
  'Arunachal Pradesh': 'arunachal-pradesh',
  'Assam': 'assam',
  'Bihar': 'bihar',
  'Chhattisgarh': 'chhattisgarh',
  'Goa': 'goa',
  'Gujarat': 'gujarat',
  'Haryana': 'haryana',
  'Himachal Pradesh': 'himachal-pradesh',
  'Jharkhand': 'jharkhand',
  'Karnataka': 'karnataka',
  'Kerala': 'kerala',
  'Madhya Pradesh': 'madhya-pradesh',
  'Maharashtra': 'maharashtra',
  'Manipur': 'manipur',
  'Meghalaya': 'meghalaya',
  'Mizoram': 'mizoram',
  'Nagaland': 'nagaland',
  'Odisha': 'odisha',
  'Punjab': 'punjab',
  'Rajasthan': 'rajasthan',
  'Sikkim': 'sikkim',
  'Tamil Nadu': 'tamil-nadu',
  'Telangana': 'telangana',
  'Tripura': 'tripura',
  'Uttar Pradesh': 'uttar-pradesh',
  'Uttarakhand': 'uttarakhand',
  'West Bengal': 'west-bengal',
  // UTs
  'Chandigarh': 'chandigarh',
  'NCT of Delhi': 'delhi',
  'Delhi': 'delhi',
  'Jammu & Kashmir': 'jammu-kashmir',
  'Jammu and Kashmir': 'jammu-kashmir',
  'Ladakh': 'ladakh',
  'Puducherry': 'puducherry',
  'Andaman & Nicobar Islands': 'andaman-nicobar',
  'Andaman and Nicobar Islands': 'andaman-nicobar',
  'Andaman & Nicobar': 'andaman-nicobar',
  'Dadra and Nagar Haveli and Daman and Diu': 'dadra-daman',
  'Dadra & Nagar Haveli & Daman & Diu': 'dadra-daman',
  'Daman & Diu': 'dadra-daman',
  'Dadra and Nagar Haveli': 'dadra-daman',
  'Lakshadweep': 'lakshadweep',
};

// Hindi names for states
const STATE_NAMES_HI = {
  'andhra-pradesh': 'आन्ध्र प्रदेश', 'arunachal-pradesh': 'अरुणाचल प्रदेश',
  'assam': 'असम', 'bihar': 'बिहार', 'chhattisgarh': 'छत्तीसगढ़',
  'goa': 'गोवा', 'gujarat': 'गुजरात', 'haryana': 'हरियाणा',
  'himachal-pradesh': 'हिमाचल प्रदेश', 'jharkhand': 'झारखण्ड',
  'karnataka': 'कर्नाटक', 'kerala': 'केरल', 'madhya-pradesh': 'मध्य प्रदेश',
  'maharashtra': 'महाराष्ट्र', 'manipur': 'मणिपुर', 'meghalaya': 'मेघालय',
  'mizoram': 'मिज़ोरम', 'nagaland': 'नागालैंड', 'odisha': 'ओडिशा',
  'punjab': 'पंजाब', 'rajasthan': 'राजस्थान', 'sikkim': 'सिक्किम',
  'tamil-nadu': 'तमिल नाडु', 'telangana': 'तेलंगाना', 'tripura': 'त्रिपुरा',
  'uttar-pradesh': 'उत्तर प्रदेश', 'uttarakhand': 'उत्तराखण्ड',
  'west-bengal': 'पश्चिम बंगाल', 'chandigarh': 'चंडीगढ़', 'delhi': 'दिल्ली',
  'jammu-kashmir': 'जम्मू-कश्मीर', 'ladakh': 'लद्दाख', 'puducherry': 'पुदुचेरी',
  'andaman-nicobar': 'अंडमान निकोबार', 'dadra-daman': 'दादरा एवं दमन',
  'lakshadweep': 'लक्षद्वीप',
};

function getStateId(name) {
  if (!name) return null;
  // Direct mapping
  if (STATE_ID_MAP[name]) return STATE_ID_MAP[name];
  // Try case-insensitive
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(STATE_ID_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }
  // Fallback slugify
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function simplifyCoords(coords, precision = 4) {
  if (typeof coords[0] === 'number') {
    return coords.map(c => parseFloat(c.toFixed(precision)));
  }
  return coords.map(c => simplifyCoords(c, precision));
}

function main() {
  console.log('Reading TopoJSON...');
  const raw = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

  // List object names in the topology
  const objectNames = Object.keys(raw.objects);
  console.log(`  Objects: ${objectNames.join(', ')}`);

  // Find states and districts objects
  let statesObj = null;
  let districtsObj = null;
  for (const name of objectNames) {
    const geo = topojson.feature(raw, raw.objects[name]);
    const sample = geo.features[0]?.properties;
    console.log(`  ${name}: ${geo.features.length} features, props: ${Object.keys(sample || {}).join(', ')}`);

    if (sample?.district || sample?.dt_code) {
      districtsObj = { name, geo };
    } else if (sample?.st_nm || sample?.NAME_1) {
      statesObj = { name, geo };
    }
  }

  // ── Process States ──────────────────────────────────────────
  if (statesObj) {
    console.log(`\nProcessing ${statesObj.geo.features.length} states...`);
    const stateFeatures = [];

    for (const f of statesObj.geo.features) {
      const name = f.properties.st_nm || f.properties.NAME_1;
      const stateId = getStateId(name);
      if (!stateId) {
        console.log(`  WARNING: Unknown state: ${name}`);
        continue;
      }

      stateFeatures.push({
        type: 'Feature',
        properties: {
          stateId,
          name,
          nameHi: STATE_NAMES_HI[stateId] || name,
        },
        geometry: {
          type: f.geometry.type,
          coordinates: simplifyCoords(f.geometry.coordinates, 4),
        },
      });
    }

    const statesGeoJson = { type: 'FeatureCollection', features: stateFeatures };
    const outPath = path.join(PUBLIC_GEO, 'india-states.json');
    fs.mkdirSync(PUBLIC_GEO, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(statesGeoJson));
    const size = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`  Saved: ${outPath} (${size}KB, ${stateFeatures.length} states)`);
  }

  // ── Process Districts ───────────────────────────────────────
  if (districtsObj) {
    console.log(`\nProcessing ${districtsObj.geo.features.length} districts...`);
    const byState = {};

    for (const f of districtsObj.geo.features) {
      const stateName = f.properties.st_nm || f.properties.NAME_1;
      const stateId = getStateId(stateName);
      if (!stateId) continue;

      const distName = f.properties.district || f.properties.NAME_2 || 'Unknown';

      if (!byState[stateId]) byState[stateId] = [];
      byState[stateId].push({
        type: 'Feature',
        properties: {
          districtName: distName,
          stateId,
          stateName,
        },
        geometry: {
          type: f.geometry.type,
          coordinates: simplifyCoords(f.geometry.coordinates, 4),
        },
      });
    }

    fs.mkdirSync(DISTRICTS_DIR, { recursive: true });
    let totalFiles = 0;
    let totalSize = 0;

    for (const [stateId, features] of Object.entries(byState)) {
      const geoJson = { type: 'FeatureCollection', features };
      const outPath = path.join(DISTRICTS_DIR, `${stateId}.json`);
      fs.writeFileSync(outPath, JSON.stringify(geoJson));
      const size = fs.statSync(outPath).size;
      totalSize += size;
      totalFiles++;
      console.log(`  ${stateId}: ${features.length} districts (${(size / 1024).toFixed(0)}KB)`);
    }
    console.log(`  Total: ${totalFiles} files, ${(totalSize / 1024).toFixed(0)}KB`);
  }

  // ── Generate Crop-State Matrix ──────────────────────────────
  console.log('\nGenerating crop-state matrix...');
  const matrix = {};
  const statesDir = path.join(INDIA_DATA, 'states');

  if (fs.existsSync(statesDir)) {
    const stateDirs = fs.readdirSync(statesDir).filter(f =>
      fs.statSync(path.join(statesDir, f)).isDirectory()
    );

    for (const stateId of stateDirs) {
      const cropsFile = path.join(statesDir, stateId, 'crops.json');
      if (!fs.existsSync(cropsFile)) continue;

      const crops = JSON.parse(fs.readFileSync(cropsFile, 'utf-8'));
      for (const crop of crops) {
        if (!matrix[crop.id]) matrix[crop.id] = { name: crop.name, nameHi: crop.nameHi, emoji: crop.emoji, states: [] };
        matrix[crop.id].states.push(stateId);
      }
    }
  }

  const matrixPath = path.join(PUBLIC_GEO, 'crop-state-matrix.json');
  fs.writeFileSync(matrixPath, JSON.stringify(matrix));
  const matrixSize = (fs.statSync(matrixPath).size / 1024).toFixed(0);
  console.log(`  Saved: ${matrixPath} (${matrixSize}KB, ${Object.keys(matrix).length} crops)`);

  console.log('\nDone!');
}

main();
