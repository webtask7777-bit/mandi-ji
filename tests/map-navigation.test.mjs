import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardStateUrl, getDashboardTab } from '../src/utils/dashboardNavigation.js';
import { prefillDeliveryForm, deliveryFormToInput, calculateDeliveryScenario } from '../src/utils/deliveryCalculator.js';

test('region changes keep the active dashboard workspace in either direction', () => {
  for (const tab of ['delivery', 'mandis', 'calendar', 'naksha', 'bazaar']) {
    assert.equal(getDashboardStateUrl('chhattisgarh', `?tab=${tab}`), `/mandi-bhav/chhattisgarh?tab=${tab}`);
    assert.equal(getDashboardStateUrl('madhya-pradesh', `?state=chhattisgarh&tab=${tab}`), `/mandi-bhav/madhya-pradesh?tab=${tab}`);
    assert.equal(getDashboardStateUrl(null, `?tab=${tab}`), `/?tab=${tab}`);
  }
  assert.equal(getDashboardStateUrl('chhattisgarh', '?tab=logistics'), '/mandi-bhav/chhattisgarh?tab=delivery');
  assert.equal(getDashboardStateUrl(null, '?tab=logistics'), '/?tab=delivery');
});

test('price pages retain clean canonical routes and unknown tabs fall back to prices', () => {
  for (const search of ['', '?tab=prices', '?tab=unknown', '?state=goa', '?tab=admin', '?tab=']) {
    assert.equal(getDashboardStateUrl('chhattisgarh', search), '/mandi-bhav/chhattisgarh');
    assert.equal(getDashboardStateUrl(null, search), '/');
    assert.equal(getDashboardTab(search), 'prices');
  }
  assert.equal(getDashboardTab('?tab=logistics'), 'delivery');
});

test('a map destination discards stale quote economics and blocks any inferred saving', () => {
  const previous = {
    vehicleId: 'pickup', capacityKg: 1000, quantity: 1000, quantityUnit: 'kg', packagingWeightKg: 0,
    from: 'पुरानी खरीद मंडी', to: 'पुरानी बिक्री मंडी', cropId: 'wheat', cropName: 'गेहूँ',
    buyPrice: 2000, benchmarkPrice: 3000, priceUnit: 'quintal', comparisonMode: 'local',
    distanceKm: 100, journeyFactor: 2, freightMode: 'rate', ratePerKm: 10, quotePerTrip: 2500,
    minFare: 1000, tollPerTrip: 100, loadingTotal: 300, packingTotal: 200, otherTotal: 100,
    marketFeePercent: 1, lossPercent: 2, example: true,
    sourceQuote: { date: '2026-04-04', basis: 'modal', variety: 'Lokwan', grade: 'FAQ' },
  };
  assert.equal(calculateDeliveryScenario(deliveryFormToInput(previous)).valid, true);
  const next = prefillDeliveryForm(previous, {
    priceBasis: 'location-only', sellMandi: 'रायपुर मंडी · रायपुर', cropId: 'rice', cropName: 'धान',
    // Location context must never acquire quote status, even if a caller accidentally includes these.
    buyPrice: 2200, sellPrice: 2700, quoteDate: '2026-10-16', buyMandi: 'अनुमानित खरीद मंडी',
  });
  assert.equal(next.to, 'रायपुर मंडी · रायपुर');
  assert.equal(next.from, '');
  assert.equal(next.cropId, 'rice');
  assert.equal(next.cropName, 'धान');
  assert.equal(next.sourceQuote, null);
  assert.equal(next.example, false);
  assert.equal(next.locationOnly, true);
  for (const field of ['quantity', 'packagingWeightKg', 'lossPercent', 'buyPrice', 'benchmarkPrice', 'distanceKm', 'journeyFactor', 'ratePerKm', 'quotePerTrip', 'minFare', 'tollPerTrip', 'loadingTotal', 'packingTotal', 'otherTotal', 'marketFeePercent']) {
    assert.equal(next[field], '', `${field} is unknown, not zero or an old quote`);
  }
  assert.equal(next.vehicleId, 'pickup');
  assert.equal(next.quantityUnit, 'kg');
  assert.equal(previous.buyPrice, 2000);
  const result = calculateDeliveryScenario(deliveryFormToInput(next));
  assert.equal(result.valid, false);
  assert.equal(result.benefit, undefined);
  for (const field of ['quantityKg', 'distanceKm', 'journeyFactor', 'buyPricePerKg', 'benchmarkPricePerKg', 'ratePerKm', 'tollPerTrip', 'loadingTotal']) {
    assert.ok(result.missingFields.includes(field), `${field} must be supplied before a result is possible`);
  }
  const noCrop = prefillDeliveryForm(previous, { priceBasis: 'location-only', sellMandi: 'नयी मंडी' });
  assert.equal(noCrop.cropId, '');
  assert.equal(noCrop.cropName, '');
  const quoted = prefillDeliveryForm(next, { priceBasis: 'listing-offer', buyPrice: 2200 });
  assert.equal(quoted.locationOnly, false);
  assert.equal(quoted.sourceQuote.basis, 'listing-offer');
});
