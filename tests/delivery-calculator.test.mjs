import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeliveryScenario, compareDeliveryVehicles, getDeliverySummaryText, VEHICLE_PRESETS, convertDeliveryPrice, convertDeliveryQuantity, deliveryFormToInput, prefillDeliveryForm, getDeliveryTrips, getDeliveryCropOptions } from '../src/utils/deliveryCalculator.js';

const plan = {
  quantityKg: 1000, packagingWeightKg: 0, capacityKg: 1000, distanceKm: 100, journeyFactor: 1,
  freightMode: 'rate', ratePerKm: 10, minFare: 500, tollPerTrip: 100,
  loadingTotal: 200, packingTotal: 300, otherTotal: 100, marketFeePercent: 1,
  buyPricePerKg: 20, benchmarkPricePerKg: 25, lossPercent: 2, comparisonMode: 'local',
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('landed cost adds purchase, each cost once, and divides by usable weight', () => {
  const r = calculateDeliveryScenario(plan);
  assert.equal(r.valid, true);
  assert.equal(r.trips, 1);
  assert.equal(r.purchase, 20000);
  assert.equal(r.fees, 200);
  assert.equal(r.transportTotal, 1100);
  assert.equal(r.totalLandCost, 21900);
  assert.equal(r.usableKg, 980);
  close(r.landedPricePerKg, 21900 / 980);
  assert.equal(r.benchmarkValue, 24500);
  assert.equal(r.benefit, 2600);
  assert.equal(Object.values(r.breakdown).reduce((sum, cost) => sum + cost, 0), r.totalLandCost);
});

test('whole trips are charged just above capacity; round trip affects km, not load or purchase', () => {
  const exact = calculateDeliveryScenario({ ...plan, quantityKg: 2000 });
  const above = calculateDeliveryScenario({ ...plan, quantityKg: 2000.01, journeyFactor: 2 });
  assert.equal(exact.trips, 2);
  assert.equal(above.trips, 3);
  assert.equal(above.billedKm, 200);
  assert.equal(above.totalBilledKm, 600);
  assert.equal(above.transportTotal, 6300);
  close(above.purchase, 40000.2);
  assert.equal(above.breakdown.loading, 200);
  close(above.occupancyPercent, 2000.01 / 3000 * 100);
});

test('decimal full loads avoid a phantom trip while actual excess still gets another trip', () => {
  const exact = calculateDeliveryScenario({ ...plan, quantityKg: 498.91, packagingWeightKg: 1.1, capacityKg: 500.01 });
  assert.equal(exact.valid, true);
  assert.equal(exact.trips, 1);
  assert.equal(exact.transportTotal, 1100);
  assert.equal(exact.occupancyPercent, 100);
  assert.equal(exact.remainingCapacityKg, 0);
  assert.equal(getDeliveryTrips(498.91 + 1.1, 500.01), 1);
  assert.equal(getDeliveryTrips(500.010000001, 500.01), 2);
  assert.equal(getDeliveryTrips(500.02, 500.01), 2);
  assert.equal(getDeliveryTrips(1000.03, 500.01), 3);
  for (const [load, capacity] of [[0, 1000], [1000, 0], [NaN, 1000], [1000, Infinity], [Number.MAX_VALUE, Number.MIN_VALUE]]) {
    assert.ok(Number.isNaN(getDeliveryTrips(load, capacity)));
  }
});

test('commission percentage uses the stated 0 through 100 range in the actual calculation', () => {
  for (const percent of [-.01, 100.01, 101]) {
    const result = calculateDeliveryScenario({ ...plan, marketFeePercent: percent });
    assert.equal(result.valid, false);
    assert.ok(result.errors.marketFeePercent);
    assert.equal(result.benefit, undefined);
  }
  assert.equal(calculateDeliveryScenario({ ...plan, marketFeePercent: 0 }).fees, 0);
  assert.equal(calculateDeliveryScenario({ ...plan, marketFeePercent: 100 }).fees, 20000);
});

test('all unknown required costs block a result, while deliberate zero is accepted', () => {
  for (const key of ['packagingWeightKg', 'tollPerTrip', 'loadingTotal', 'packingTotal', 'otherTotal', 'marketFeePercent', 'lossPercent', 'ratePerKm', 'minFare']) {
    for (const blank of ['', '  ', null, undefined]) {
      const r = calculateDeliveryScenario({ ...plan, [key]: blank });
      assert.equal(r.valid, false, `${key} ${blank}`);
      assert.ok(r.missingFields.includes(key));
      assert.equal(r.benefit, undefined);
    }
    assert.equal(calculateDeliveryScenario({ ...plan, [key]: 0 }).valid, true, key);
  }
});

test('crate weight changes load and trips without being bought or sold as crop', () => {
  const r = calculateDeliveryScenario({ ...plan, quantityKg: 980, packagingWeightKg: 30 });
  assert.equal(r.trips, 2);
  assert.equal(r.loadedWeightKg, 1010);
  assert.equal(r.purchase, 19600);
  close(r.usableKg, 960.4);
  assert.equal(r.transportTotal, 2200);
  assert.equal(r.occupancyPercent, 50.5);
});

test('quote replaces rate and minimum fare; included toll is explicitly zero', () => {
  const r = calculateDeliveryScenario({ ...plan, quantityKg: 2000, freightMode: 'quote', quotePerTrip: 750, ratePerKm: '', minFare: '', tollPerTrip: 0, journeyFactor: 2 });
  assert.equal(r.valid, true);
  assert.equal(r.freightPerTrip, 750);
  assert.equal(r.transportTotal, 1500);
  assert.equal(r.breakEvenDistanceKm, null);
  assert.equal(r.breakEvenDistanceStatus, 'quote');
  assert.equal(calculateDeliveryScenario({ ...plan, freightMode: 'quote', quotePerTrip: '' }).valid, false);
});

test('zero distance still incurs minimum fare and per-trip toll', () => {
  const r = calculateDeliveryScenario({ ...plan, distanceKm: 0 });
  assert.equal(r.valid, true);
  assert.equal(r.billedKm, 0);
  assert.equal(r.transportTotal, 600);
});

test('local and resale compare the same usable quantity and change only interpretation', () => {
  const local = calculateDeliveryScenario(plan);
  const resale = calculateDeliveryScenario({ ...plan, comparisonMode: 'resale' });
  assert.equal(local.benefit, resale.benefit);
  assert.match(getDeliverySummaryText(plan, local), /स्थानीय खरीद/);
  assert.match(getDeliverySummaryText(plan, resale), /बिक्री मूल्य/);
  const higherLoss = calculateDeliveryScenario({ ...plan, lossPercent: 10 });
  assert.equal(higherLoss.purchase, local.purchase);
  assert.equal(higherLoss.totalLandCost, local.totalLandCost);
  assert.equal(higherLoss.usableKg, 900);
  assert.equal(higherLoss.benefit, 600);
});

test('break-even one-way distance includes trips, round-trip factor and toll', () => {
  const r = calculateDeliveryScenario(plan);
  assert.equal(r.maxAffordableTransport, 3700);
  assert.equal(r.breakEvenDistanceStatus, 'finite');
  assert.equal(r.breakEvenDistanceKm, 360);
  assert.equal(calculateDeliveryScenario({ ...plan, distanceKm: 360 }).benefit, 0);
  const doubled = calculateDeliveryScenario({ ...plan, journeyFactor: 2 });
  assert.equal(doubled.breakEvenDistanceKm, 180);
  const twoTrips = calculateDeliveryScenario({ ...plan, capacityKg: 500, journeyFactor: 2 });
  assert.equal(twoTrips.breakEvenDistanceKm, 87.5);
  assert.equal(calculateDeliveryScenario({ ...plan, capacityKg: 500, journeyFactor: 2, distanceKm: 87.5 }).benefit, 0);
});

test('infeasible minimum fare does not produce a positive or zero recommended radius', () => {
  const r = calculateDeliveryScenario({ ...plan, minFare: 5000 });
  assert.equal(r.breakEvenDistanceStatus, 'infeasible');
  assert.equal(r.breakEvenDistanceKm, null);
  const alreadyExpensive = calculateDeliveryScenario({ ...plan, benchmarkPricePerKg: 19 });
  assert.ok(alreadyExpensive.maxAffordableTransport < 0);
  assert.equal(alreadyExpensive.breakEvenDistanceStatus, 'infeasible');
});

test('zero rates and exact zero-distance break-even never divide by zero', () => {
  const freeRate = calculateDeliveryScenario({ ...plan, ratePerKm: 0 });
  assert.equal(freeRate.valid, true);
  assert.equal(freeRate.breakEvenDistanceStatus, 'unbounded');
  assert.equal(freeRate.breakEvenDistanceKm, null);
  const zeroRadius = calculateDeliveryScenario({ ...plan, lossPercent: 0, loadingTotal: 0, packingTotal: 0, otherTotal: 0, marketFeePercent: 0, benchmarkPricePerKg: 20.1, minFare: 0 });
  assert.equal(zeroRadius.maxAffordableTransport, 100);
  assert.equal(zeroRadius.breakEvenDistanceStatus, 'finite');
  assert.equal(zeroRadius.breakEvenDistanceKm, 0);
});

test('stress adds ten percent to freight, not toll, and two percentage points of loss', () => {
  const r = calculateDeliveryScenario(plan);
  assert.equal(r.stress.valid, true);
  assert.equal(r.stress.lossPercent, 4);
  assert.equal(r.stress.usableKg, 960);
  assert.equal(r.stress.transportTotal, 1200);
  assert.equal(r.stress.totalLandCost, 22000);
  assert.equal(r.stress.benefit, 2000);
  assert.equal(calculateDeliveryScenario({ ...plan, lossPercent: 99 }).stress.valid, false);
});

test('comparison never invents rates for another vehicle or mutates inputs', () => {
  const original = JSON.stringify(plan);
  assert.ok(compareDeliveryVehicles(plan).every(row => !row.scenario.valid && row.rank === null));
  const vehicles = [
    { id: 'unknown', capacityKg: 2000, ratePerKm: '', minFare: 0 },
    { id: 'small', capacityKg: 500, ratePerKm: 8, minFare: 0 },
    { id: 'large', capacityKg: 1000, ratePerKm: 12, minFare: 0 },
  ];
  const results = compareDeliveryVehicles(plan, vehicles);
  assert.equal(results[0].rank, null);
  assert.equal(results[1].rank, 2);
  assert.equal(results[2].rank, 1);
  assert.equal(results[1].scenario.transportTotal, 1800);
  assert.equal(results[2].scenario.transportTotal, 1300);
  assert.equal(JSON.stringify(plan), original);
  assert.ok(VEHICLE_PRESETS.every(vehicle => !Object.hasOwn(vehicle, 'ratePerKm')));
});

test('invalid inputs, unknown modes and numeric overflow never produce an estimate', () => {
  for (const changes of [
    { quantityKg: 0 }, { capacityKg: -1 }, { distanceKm: -1 }, { lossPercent: 100 },
    { buyPricePerKg: 0 }, { benchmarkPricePerKg: null }, { ratePerKm: Infinity },
    { tollPerTrip: true }, { loadingTotal: [] }, { journeyFactor: 3 },
    { comparisonMode: 'profit' }, { freightMode: 'guess' }, { ratePerKm: 'wrong' },
    { quantityKg: 1e15, buyPricePerKg: 100 }, { capacityKg: Number.MIN_VALUE },
    { quantityKg: 1e-300, buyPricePerKg: 1e-300, benchmarkPricePerKg: 1e-300 },
  ]) {
    const r = calculateDeliveryScenario({ ...plan, ...changes });
    assert.equal(r.valid, false, JSON.stringify(changes));
    assert.equal(r.benefit, undefined);
  }
  assert.equal(calculateDeliveryScenario({ ...plan, quantityKg: '1000', lossPercent: '0', tollPerTrip: '0' }).valid, true);
  assert.match(getDeliverySummaryText({}), /अधूरा/);
});

test('changing quantity and price display units preserves the physical plan', () => {
  assert.equal(convertDeliveryQuantity(1000, 'kg', 'quintal'), 10);
  assert.equal(convertDeliveryQuantity(10, 'quintal', 'tonne'), 1);
  assert.equal(convertDeliveryQuantity(.25, 'tonne', 'kg'), 250);
  assert.equal(convertDeliveryPrice(2450, 'quintal', 'kg'), 24.5);
  assert.equal(convertDeliveryPrice(24.5, 'kg', 'quintal'), 2450);
  assert.equal(convertDeliveryQuantity('', 'kg', 'tonne'), '');
  assert.equal(convertDeliveryPrice('', 'kg', 'quintal'), '');
  assert.equal(convertDeliveryQuantity(0, 'kg', 'tonne'), 0);
  assert.ok(Number.isNaN(convertDeliveryQuantity(1, 'bag', 'kg')));
});

test('form adapter includes crate weight and all edited units in the actual result', () => {
  const form = {
    ...plan, quantity: 10, quantityUnit: 'quintal', priceUnit: 'quintal',
    buyPrice: 2000, benchmarkPrice: 2500, packagingWeightKg: 30,
  };
  const input = deliveryFormToInput(form);
  const result = calculateDeliveryScenario(input);
  assert.equal(result.valid, true);
  assert.equal(result.trips, 2);
  assert.equal(result.purchase, 20000);
  assert.equal(result.transportTotal, 2200);
  assert.equal(result.loadedWeightKg, 1030);
  assert.deepEqual(calculateDeliveryScenario(deliveryFormToInput({ ...form, quantity: 1, quantityUnit: 'tonne', buyPrice: 20, benchmarkPrice: 25, priceUnit: 'kg' })), result);
  assert.equal(calculateDeliveryScenario(deliveryFormToInput({ ...form, packagingWeightKg: '' })).valid, false);
});

test('mandi prefill retains date, grade and variety but never carries the old route fare', () => {
  const previous = { quantity: 15, quantityUnit: 'quintal', distanceKm: 150, ratePerKm: 20, quotePerTrip: 5000, minFare: 1000, tollPerTrip: 200 };
  const source = { cropId: 'wheat', cropName: 'गेहूँ', buyMandi: 'मंडी A', sellMandi: 'मंडी B', buyPrice: 2400, sellPrice: 2900, quoteDate: '2026-04-04', priceBasis: 'modal', variety: 'Lokwan', grade: 'FAQ' };
  const next = prefillDeliveryForm(previous, source);
  assert.equal(next.quantity, 15);
  assert.equal(next.quantityUnit, 'quintal');
  assert.equal(next.comparisonMode, 'resale');
  assert.equal(next.priceUnit, 'quintal');
  assert.deepEqual(next.sourceQuote, { date: '2026-04-04', basis: 'modal', variety: 'Lokwan', grade: 'FAQ' });
  assert.equal(next.buyPrice, 2400);
  for (const key of ['distanceKm', 'ratePerKm', 'quotePerTrip']) assert.equal(next[key], '');
  assert.equal(previous.distanceKm, 150);
  assert.equal(prefillDeliveryForm(previous, {}).sourceQuote.date, null);
});

test('a map origin starts a local purchase comparison without importing prices or route economics', () => {
  const previous = {
    vehicleId: 'pickup', capacityKg: 1000, quantity: 1000, quantityUnit: 'kg', packagingWeightKg: 10,
    from: 'पुरानी खरीद मंडी', to: 'पुरानी मंज़िल', priceUnit: 'quintal', buyPrice: 2200, benchmarkPrice: 2900,
    distanceKm: 70, journeyFactor: 2, freightMode: 'rate', ratePerKm: 15, quotePerTrip: 2500,
    minFare: 500, tollPerTrip: 50, loadingTotal: 100, packingTotal: 200, otherTotal: 300,
    marketFeePercent: 2, lossPercent: 4, sourceQuote: { date: '2026-04-04', basis: 'modal' },
  };
  const next = prefillDeliveryForm(previous, {
    priceBasis: 'location-only', routeDirection: 'from', buyMandi: 'रायपुर · Raipur',
    sellMandi: 'अनचाही मंज़िल', cropId: 'beans', cropName: 'सेम',
    buyPrice: 2500, sellPrice: 3000, quoteDate: '2026-10-16',
  });
  assert.equal(next.from, 'रायपुर · Raipur');
  assert.equal(next.to, '');
  assert.equal(next.comparisonMode, 'local');
  assert.equal(next.cropId, 'beans');
  assert.equal(next.sourceQuote, null);
  assert.equal(next.locationOnly, true);
  assert.equal(next.capacityKg, 1000);
  assert.equal(next.quantityUnit, 'kg');
  for (const field of ['quantity', 'packagingWeightKg', 'buyPrice', 'benchmarkPrice', 'distanceKm', 'journeyFactor', 'ratePerKm', 'quotePerTrip', 'minFare', 'tollPerTrip', 'loadingTotal', 'packingTotal', 'otherTotal', 'marketFeePercent', 'lossPercent']) assert.equal(next[field], '');
  assert.equal(calculateDeliveryScenario(deliveryFormToInput(next)).valid, false);
  assert.equal(previous.from, 'पुरानी खरीद मंडी');
  const destination = prefillDeliveryForm(previous, { priceBasis: 'location-only', routeDirection: 'to', sellMandi: 'रायपुर' });
  assert.equal(destination.from, '');
  assert.equal(destination.to, 'रायपुर');
  assert.equal(destination.comparisonMode, 'resale');
});

test('crop choices keep distinct source identities despite shared Hindi or English names', () => {
  const crops = [
    { id: 'beans', nameHi: 'सेम', name: 'Beans' },
    { id: 'indian-beans', nameHi: 'सेम', name: 'Indian Beans(Seam)' },
    { id: 'local-beans', nameHi: 'सेम', name: 'Beans' },
    { id: 'wheat', nameHi: 'गेहूँ', name: 'Wheat' },
  ];
  const snapshot = JSON.stringify(crops);
  const options = getDeliveryCropOptions(crops);
  assert.equal(new Set(options.map(crop => crop.label)).size, 4);
  assert.equal(options.find(crop => crop.id === 'indian-beans').label, 'सेम · Indian Beans(Seam)');
  assert.equal(options.find(crop => crop.label === 'सेम · Beans · beans').id, 'beans');
  assert.equal(options.find(crop => crop.label === 'सेम · Beans · local-beans').id, 'local-beans');
  assert.equal(options.find(crop => crop.id === 'wheat').label, 'गेहूँ');
  assert.equal(JSON.stringify(crops), snapshot);
});

test('a seller listing offers a purchase input, never a verified mandi or resale benchmark', () => {
  const next = prefillDeliveryForm({ comparisonMode: 'resale', benchmarkPrice: 9000 }, {
    cropId: 'wheat', cropName: 'गेहूँ', buyMandi: 'विक्रेता का स्थान', buyPrice: 2400,
    sellPrice: 2900, quoteDate: '2026-10-15', priceBasis: 'listing-offer', variety: 'Lokwan',
  });
  assert.equal(next.comparisonMode, 'local');
  assert.equal(next.buyPrice, 2400);
  assert.equal(next.benchmarkPrice, '');
  assert.equal(next.sourceQuote.basis, 'listing-offer');
  assert.equal(next.sourceQuote.date, '2026-10-15');
  assert.equal(next.sourceQuote.variety, 'Lokwan');
  assert.equal(prefillDeliveryForm({}, { priceBasis: 'listing-offer' }).sourceQuote.date, null);
});

test('vehicle-specific tolls are charged per trip and unknown tolls block a comparison', () => {
  const rows = compareDeliveryVehicles(plan, [
    { id: 'unknown-toll', capacityKg: 1000, ratePerKm: 10, minFare: 0, tollPerTrip: '' },
    { id: 'small', capacityKg: 500, ratePerKm: 10, minFare: 0, tollPerTrip: 30 },
    { id: 'large', capacityKg: 1000, ratePerKm: 10, minFare: 0, tollPerTrip: 200 },
  ]);
  assert.equal(rows[0].scenario.valid, false);
  assert.equal(rows[0].rank, null);
  assert.equal(rows[1].scenario.tollsTotal, 60);
  assert.equal(rows[2].scenario.tollsTotal, 200);
});
