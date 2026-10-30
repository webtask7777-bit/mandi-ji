import { VEHICLE_PRESETS } from './deliveryCalculator.js';

export const DEFAULT_DELIVERY_VEHICLE = VEHICLE_PRESETS.find(vehicle => vehicle.capacityKg === 1000) || VEHICLE_PRESETS[0];

/** A fresh real-world plan leaves route, prices and freight for the user to enter. */
export function createInitialDeliveryForm() {
  return {
    vehicleId: DEFAULT_DELIVERY_VEHICLE.id, capacityKg: DEFAULT_DELIVERY_VEHICLE.capacityKg,
    distanceKm: '', journeyFactor: 1, fromPlace: null, toPlace: null,
    from: '', to: '', cropId: '', cropName: '', quantity: 1000, quantityUnit: 'kg', packagingWeightKg: 0,
    buyPrice: '', benchmarkPrice: '', priceUnit: 'quintal', comparisonMode: 'local',
    lossPercent: 2, freightMode: 'rate', ratePerKm: '', minFare: 0, quotePerTrip: '',
    tollPerTrip: 0, loadingTotal: 0, packingTotal: 0, otherTotal: 0, marketFeePercent: 0,
    example: false, sourceQuote: null, locationOnly: false,
  };
}

/** Complete fictional worked example; never a live price, route or freight quote. */
export function createDeliveryExample() {
  return {
    ...createInitialDeliveryForm(),
    from: 'खरीद मंडी (उदाहरण)', to: 'आपकी जगह (उदाहरण)', distanceKm: 80,
    cropId: 'wheat', cropName: 'गेहूँ', buyPrice: 2400, benchmarkPrice: 2900,
    ratePerKm: 18, minFare: 1200, tollPerTrip: 100, loadingTotal: 300, packingTotal: 150,
    example: true,
  };
}
