import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoadPlan } from '../src/utils/loadPlanner.js';

const input = { packageCount: 20, produceKgPerPackage: 49, emptyPackageKg: 1.5, payloadCapacityKg: 1000 };

test('package counts keep saleable produce and packaging weight separate', () => {
  const result = calculateLoadPlan({ packageCount: '20', produceKgPerPackage: '49', emptyPackageKg: '1.5', payloadCapacityKg: '1000' });
  assert.equal(result.valid, true);
  assert.equal(result.packageCount, 20);
  assert.equal(result.quantityKg, 980);
  assert.equal(result.packagingWeightKg, 30);
  assert.equal(result.loadedWeightKg, 1010);
  assert.equal(result.trips, 2);
});

test('every required measurement stays unknown when blank; explicit zero tare is accepted', () => {
  for (const field of ['packageCount', 'produceKgPerPackage', 'emptyPackageKg']) {
    for (const value of ['', '  ', null, undefined]) {
      const result = calculateLoadPlan({ ...input, [field]: value });
      assert.equal(result.valid, false, `${field}: ${value}`);
      assert.ok(result.errors[field]);
      assert.equal(result.loadedWeightKg, undefined);
    }
  }
  assert.equal(calculateLoadPlan({ ...input, emptyPackageKg: 0 }).valid, true);
});

test('counts must be positive whole numbers and measurements must be valid non-negative amounts', () => {
  for (const [field, values] of Object.entries({
    packageCount: [0, -1, 1.5, Infinity, NaN, true, [], 'abc', Number.MAX_SAFE_INTEGER + 1],
    produceKgPerPackage: [0, -1, Infinity, NaN, true, {}, 'abc'],
    emptyPackageKg: [-1, Infinity, NaN, true, [], 'abc'],
  })) for (const value of values) {
    const result = calculateLoadPlan({ ...input, [field]: value });
    assert.equal(result.valid, false, `${field}: ${value}`);
    assert.ok(result.errors[field]);
  }
});

test('packaging alone can trigger another weight-based trip without increasing crop quantity', () => {
  const loose = calculateLoadPlan({ ...input, produceKgPerPackage: 50, emptyPackageKg: 0 });
  const packed = calculateLoadPlan({ ...input, produceKgPerPackage: 50, emptyPackageKg: 0.01 });
  assert.equal(loose.trips, 1);
  assert.equal(packed.trips, 2);
  assert.equal(loose.quantityKg, packed.quantityKg);
});

test('decimal arithmetic noise at exact capacity does not invent an extra trip', () => {
  const result = calculateLoadPlan({ packageCount: 1, produceKgPerPackage: 0.1, emptyPackageKg: 0.2, payloadCapacityKg: 0.3 });
  assert.equal(result.valid, true);
  assert.equal(result.trips, 1);
  assert.equal(calculateLoadPlan({ packageCount: 1, produceKgPerPackage: 0.1, emptyPackageKg: 0.200001, payloadCapacityKg: 0.3 }).trips, 2);
});

test('unknown or invalid optional vehicle capacity permits load totals without claiming a trip count', () => {
  for (const payloadCapacityKg of ['', ' ', null, undefined, 0, -1, Infinity, true, 'unknown', 1e-300]) {
    const result = calculateLoadPlan({ ...input, payloadCapacityKg });
    assert.equal(result.valid, true);
    assert.equal(result.quantityKg, 980);
    assert.equal(result.trips, null);
  }
});

test('unsafe products and combined totals fail without exposing misleading results', () => {
  for (const unsafe of [
    { packageCount: Number.MAX_SAFE_INTEGER, produceKgPerPackage: 2, emptyPackageKg: 0 },
    { packageCount: 2, produceKgPerPackage: 1, emptyPackageKg: Number.MAX_SAFE_INTEGER },
    { packageCount: 1, produceKgPerPackage: Number.MAX_SAFE_INTEGER, emptyPackageKg: 1 },
  ]) {
    const result = calculateLoadPlan(unsafe);
    assert.equal(result.valid, false);
    assert.ok(result.errors.calculation);
    assert.equal(result.quantityKg, undefined);
    assert.equal(result.trips, undefined);
  }
});
