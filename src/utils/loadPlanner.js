import { getDeliveryTrips } from './deliveryCalculator.js';

const FIELD_LABELS = {
  packageCount: 'बोरी / क्रेट / पेटी की संख्या',
  produceKgPerPackage: 'एक पैक में माल का शुद्ध वजन',
  emptyPackageKg: 'एक खाली पैक का वजन',
};
const isBlank = value => value == null || (typeof value === 'string' && !value.trim());
const safeAmount = value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;

/**
 * Counts and measured weights only: package type implies no standard capacity.
 * Tare is required explicitly. It affects the load, never the crop quantity.
 * Vehicle capacity is optional and supplies only a weight-based trip estimate.
 */
export function calculateLoadPlan(input = {}) {
  const errors = {};
  const values = {};
  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    const raw = input?.[field];
    if (isBlank(raw)) {
      errors[field] = `${label} दर्ज करें।${field === 'emptyPackageKg' ? ' पैकिंग का वजन नहीं है तो 0 लिखें।' : ''}`;
      continue;
    }
    const value = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
    if (!safeAmount(value)) errors[field] = `${label} में सही, गैर-ऋणात्मक संख्या दर्ज करें।`;
    else if (field === 'packageCount' && (!Number.isSafeInteger(value) || value <= 0)) errors[field] = 'पैक की संख्या 1 या उससे अधिक की पूरी संख्या होनी चाहिए।';
    else if (field === 'produceKgPerPackage' && value <= 0) errors[field] = 'एक पैक में माल का वजन 0 से अधिक होना चाहिए।';
    else values[field] = value;
  }
  if (Object.keys(errors).length) return { valid: false, errors };

  const quantityKg = values.packageCount * values.produceKgPerPackage;
  const packagingWeightKg = values.packageCount * values.emptyPackageKg;
  const loadedWeightKg = quantityKg + packagingWeightKg;
  if (![quantityKg, packagingWeightKg, loadedWeightKg].every(safeAmount) || quantityKg <= 0) {
    return { valid: false, errors: { calculation: 'कुल वजन बहुत बड़ा है। संख्या और प्रति पैक वजन जाँचें।' } };
  }

  const rawCapacity = input?.payloadCapacityKg;
  const capacity = !isBlank(rawCapacity) && (typeof rawCapacity === 'number' || typeof rawCapacity === 'string')
    ? Number(rawCapacity) : NaN;
  const payloadCapacityKg = safeAmount(capacity) && capacity > 0 ? capacity : null;
  const estimatedTrips = payloadCapacityKg == null ? NaN : getDeliveryTrips(loadedWeightKg, payloadCapacityKg);
  return {
    valid: true, errors: {}, ...values,
    quantityKg, packagingWeightKg, loadedWeightKg, payloadCapacityKg,
    trips: Number.isSafeInteger(estimatedTrips) && estimatedTrips > 0 ? estimatedTrips : null,
  };
}
