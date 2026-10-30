/**
 * Planning estimates only: capacities below are editable examples, not a
 * vehicle manufacturer's payload specification. No freight tariff is assumed.
 * All money inputs are rupees, all quantities kg, and distance is one way.
 */
export const VEHICLE_PRESETS = Object.freeze([
  { id: 'small', label: 'छोटा मालवाहक', capacityKg: 500, description: '500 किलो की योजना क्षमता' },
  { id: 'pickup', label: 'पिकअप', capacityKg: 1000, description: '1 टन की योजना क्षमता' },
  { id: 'mini-truck', label: 'मिनी ट्रक', capacityKg: 2000, description: '2 टन की योजना क्षमता' },
  { id: 'medium-truck', label: 'मध्यम ट्रक', capacityKg: 5000, description: '5 टन की योजना क्षमता' },
  { id: 'large-truck', label: 'बड़ा ट्रक', capacityKg: 10000, description: '10 टन की योजना क्षमता' },
].map(vehicle => Object.freeze(vehicle)));

const QUANTITY_FACTORS = { kg: 1, quintal: 100, tonne: 1000 };

/** Round only arithmetic noise at a full load; real excess still needs a trip. */
export function getDeliveryTrips(loadedWeightKg, capacityKg) {
  if (!Number.isFinite(loadedWeightKg) || !Number.isFinite(capacityKg) || loadedWeightKg <= 0 || capacityKg <= 0) return NaN;
  const ratio = loadedWeightKg / capacityKg;
  const nearest = Math.round(ratio);
  const tolerance = Math.min(Number.EPSILON * Math.max(1, Math.abs(ratio)) * 2, 1e-7);
  const trips = nearest > 0 && Math.abs(ratio - nearest) <= tolerance ? nearest : Math.ceil(ratio);
  return Number.isSafeInteger(trips) && trips > 0 ? trips : NaN;
}

/** Shared Hindi labels must not collapse distinct source crop identities. */
export function getDeliveryCropOptions(crops = []) {
  const seen = new Set();
  const options = crops.filter(crop => {
    if (!crop?.id || seen.has(crop.id)) return false;
    seen.add(crop.id);
    return true;
  }).map(crop => ({ ...crop, label: crop.nameHi || crop.name || crop.id }));
  const labelCounts = options.reduce((counts, crop) => counts.set(crop.label, (counts.get(crop.label) || 0) + 1), new Map());
  const named = options.map(crop => ({
    ...crop,
    label: labelCounts.get(crop.label) > 1 ? `${crop.label} · ${crop.name && crop.name !== crop.label ? crop.name : crop.id}` : crop.label,
  }));
  const fullCounts = named.reduce((counts, crop) => counts.set(crop.label, (counts.get(crop.label) || 0) + 1), new Map());
  return named.map(crop => ({ ...crop, label: fullCounts.get(crop.label) > 1 ? `${crop.label} · ${crop.id}` : crop.label }));
}

/** Unit changes preserve the physical amount and never turn a blank into zero. */
export function convertDeliveryQuantity(value, from, to) {
  if (value === '' || value == null) return '';
  if (!QUANTITY_FACTORS[from] || !QUANTITY_FACTORS[to]) return NaN;
  return Number((Number(value) * QUANTITY_FACTORS[from] / QUANTITY_FACTORS[to]).toPrecision(12));
}

export function convertDeliveryPrice(value, from, to) {
  if (value === '' || value == null) return '';
  if (!['kg', 'quintal'].includes(from) || !['kg', 'quintal'].includes(to)) return NaN;
  return Number((Number(value) * QUANTITY_FACTORS[to] / QUANTITY_FACTORS[from]).toPrecision(12));
}

export function deliveryFormToInput(form) {
  return {
    quantityKg: convertDeliveryQuantity(form.quantity, form.quantityUnit, 'kg'),
    packagingWeightKg: form.packagingWeightKg,
    capacityKg: form.capacityKg, distanceKm: form.distanceKm, journeyFactor: form.journeyFactor,
    freightMode: form.freightMode, ratePerKm: form.ratePerKm, minFare: form.minFare,
    quotePerTrip: form.quotePerTrip, tollPerTrip: form.tollPerTrip, loadingTotal: form.loadingTotal,
    packingTotal: form.packingTotal, otherTotal: form.otherTotal, marketFeePercent: form.marketFeePercent,
    buyPricePerKg: convertDeliveryPrice(form.buyPrice, form.priceUnit, 'kg'),
    benchmarkPricePerKg: convertDeliveryPrice(form.benchmarkPrice, form.priceUnit, 'kg'),
    lossPercent: form.lossPercent, comparisonMode: form.comparisonMode,
  };
}

/** Farmer-facing name of a price basis code; unknown codes are not shown raw. */
export function priceBasisLabel(basis) {
  return ({
    'daily-modal': 'उस तारीख, किस्म और ग्रेड का दर्ज मोडल भाव',
    'daily-average': 'उस दिन के दर्ज भावों का औसत',
    'monthly-average': 'उस महीने के दर्ज भावों का औसत',
    recent: 'आख़िरी दर्ज तारीख तक के 7 दिनों के दर्ज भावों का औसत',
    historical: 'पुराने दर्ज भावों का औसत',
    'listing-offer': 'विक्रेता का माँगा हुआ भाव',
  })[basis] || '';
}

/** A new route does not inherit the previous route's distance, freight quote or route places. */
export function prefillDeliveryForm(previous, scenario) {
  if (scenario.priceBasis === 'location-only') {
    const isOrigin = scenario.routeDirection === 'from';
    return {
      ...previous,
      cropId: scenario.cropId || '', cropName: scenario.cropName || '',
      from: isOrigin ? scenario.buyMandi || '' : '', to: isOrigin ? '' : scenario.sellMandi || '',
      quantity: '', packagingWeightKg: '', lossPercent: '',
      buyPrice: '', benchmarkPrice: '', distanceKm: '', journeyFactor: '',
      ratePerKm: '', quotePerTrip: '', minFare: '', tollPerTrip: '',
      loadingTotal: '', packingTotal: '', otherTotal: '', marketFeePercent: '',
      comparisonMode: isOrigin ? 'local' : 'resale', example: false, sourceQuote: null, locationOnly: true,
      fromPlace: isOrigin ? null : previous.fromPlace ?? null, toPlace: isOrigin ? previous.toPlace ?? null : null,
    };
  }
  const isListingOffer = scenario.priceBasis === 'listing-offer';
  return {
    ...previous, cropId: scenario.cropId || '', cropName: scenario.cropName || '',
    from: scenario.buyMandi || '', to: scenario.sellMandi || '', priceUnit: 'quintal',
    buyPrice: Number(scenario.buyPrice) > 0 ? scenario.buyPrice : '',
    benchmarkPrice: !isListingOffer && Number(scenario.sellPrice) > 0 ? scenario.sellPrice : '',
    distanceKm: '', ratePerKm: '', quotePerTrip: '', minFare: '', tollPerTrip: '',
    comparisonMode: isListingOffer ? 'local' : 'resale', example: false, locationOnly: false,
    // A new buy mandi needs its own place; "your place" stays unless the sale end changed.
    fromPlace: null, toPlace: scenario.sellMandi ? null : previous.toPlace ?? null,
    sourceQuote: {
      date: scenario.quoteDate || null, basis: scenario.priceBasis || '',
      variety: scenario.variety || '', grade: scenario.grade || '',
    },
  };
}

const FIELD_LABELS = {
  quantityKg: 'माल की मात्रा', packagingWeightKg: 'बोरी या क्रेट का कुल वजन', capacityKg: 'गाड़ी की क्षमता', distanceKm: 'एक तरफ की दूरी',
  journeyFactor: 'भाड़े में गिनी गई यात्रा', ratePerKm: 'प्रति किलोमीटर भाड़ा', minFare: 'न्यूनतम भाड़ा',
  quotePerTrip: 'प्रति फेरे का भाड़ा', tollPerTrip: 'प्रति फेरे का टोल', loadingTotal: 'कुल लोडिंग खर्च',
  packingTotal: 'कुल पैकिंग खर्च', otherTotal: 'अन्य कुल खर्च', marketFeePercent: 'मंडी शुल्क प्रतिशत',
  buyPricePerKg: 'खरीद भाव', benchmarkPricePerKg: 'तुलना का भाव', lossPercent: 'वजन की कमी प्रतिशत',
};

const isBlank = value => value == null || (typeof value === 'string' && !value.trim());
const isSafeAmount = value => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
const overflowResult = () => ({
  valid: false, errors: { calculation: 'दर्ज मात्रा या खर्च बहुत बड़ा है। छोटे और वास्तविक मान दर्ज करें।' }, missingFields: [],
});

function normalizeInput(input) {
  const errors = {};
  const missingFields = [];
  const normalized = {};
  // With a per-trip quote the distance does not change the cost, so it is optional there.
  const distanceOptional = input.freightMode === 'quote' && isBlank(input.distanceKm);
  const fields = [
    'quantityKg', 'packagingWeightKg', 'capacityKg', ...(distanceOptional ? [] : ['distanceKm']), 'journeyFactor', 'tollPerTrip',
    'loadingTotal', 'packingTotal', 'otherTotal', 'marketFeePercent',
    'buyPricePerKg', 'benchmarkPricePerKg', 'lossPercent',
    ...(input.freightMode === 'rate' ? ['ratePerKm', 'minFare'] : input.freightMode === 'quote' ? ['quotePerTrip'] : []),
  ];
  for (const field of fields) {
    const raw = input[field];
    if (isBlank(raw)) {
      missingFields.push(field);
      errors[field] = `${FIELD_LABELS[field]} दर्ज करें; खर्च नहीं है तो 0 लिखें।`;
      continue;
    }
    const value = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
    if (!isSafeAmount(value)) errors[field] = `${FIELD_LABELS[field]} में सही संख्या दर्ज करें।`;
    else if (['quantityKg', 'capacityKg', 'buyPricePerKg', 'benchmarkPricePerKg'].includes(field) && value <= 0) errors[field] = `${FIELD_LABELS[field]} 0 से अधिक होना चाहिए।`;
    else if (value < 0) errors[field] = `${FIELD_LABELS[field]} ऋणात्मक नहीं हो सकता।`;
    else if (field === 'lossPercent' && value >= 100) errors[field] = 'वजन की कमी 0 से कम और 100% या अधिक नहीं हो सकती।';
    else if (field === 'marketFeePercent' && value > 100) errors[field] = 'मंडी / कमीशन शुल्क 0 से 100% के बीच होना चाहिए।';
    else if (field === 'journeyFactor' && value !== 1 && value !== 2) errors[field] = 'एक तरफ या आने-जाने का भाड़ा चुनें।';
    else normalized[field] = value;
  }
  for (const [field, allowed, message] of [
    ['freightMode', ['rate', 'quote'], 'प्रति किलोमीटर दर या प्रति फेरे का भाड़ा चुनें।'],
    ['comparisonMode', ['local', 'resale'], 'स्थानीय खरीद या आगे बिक्री से तुलना चुनें।'],
  ]) {
    if (!allowed.includes(input[field])) errors[field] = message;
    else normalized[field] = input[field];
  }
  if (distanceOptional) normalized.distanceKm = null;
  return { errors, missingFields, normalized };
}

/**
 * Explicit zero is accepted; empty or unknown required costs block the result.
 * A quote is freight per trip. Enter toll as zero if the quote already includes
 * it; loading/packing/other are totals for the whole consignment, not per trip.
 * Local comparison values the SAME usable quantity at the local quoted price.
 */
export function calculateDeliveryScenario(input = {}) {
  const { errors, missingFields, normalized: n } = normalizeInput(input || {});
  if (Object.keys(errors).length) return { valid: false, errors, missingFields };

  const loadedWeightKg = n.quantityKg + n.packagingWeightKg;
  const trips = getDeliveryTrips(loadedWeightKg, n.capacityKg);
  const billedKm = n.distanceKm === null ? null : n.distanceKm * n.journeyFactor;
  const freightPerTrip = n.freightMode === 'rate'
    ? Math.max(n.minFare, billedKm * n.ratePerKm) : n.quotePerTrip;
  const freightTotal = trips * freightPerTrip;
  const tollsTotal = trips * n.tollPerTrip;
  const transportTotal = freightTotal + tollsTotal;
  const purchase = n.quantityKg * n.buyPricePerKg;
  const fees = purchase * (n.marketFeePercent / 100);
  const nonTransportCost = purchase + fees + n.loadingTotal + n.packingTotal + n.otherTotal;
  const totalLandCost = nonTransportCost + transportTotal;
  const usableKg = n.quantityKg * (1 - n.lossPercent / 100);
  const landedPricePerKg = totalLandCost / usableKg;
  const landedPricePerQuintal = landedPricePerKg * 100;
  const benchmarkValue = usableKg * n.benchmarkPricePerKg;
  const benefit = benchmarkValue - totalLandCost;
  const maxAffordableTransport = benchmarkValue - nonTransportCost;
  const occupancyPercent = Math.min(100, (loadedWeightKg / (trips * n.capacityKg)) * 100);
  const remainingCapacityKg = Math.max(0, trips * n.capacityKg - loadedWeightKg);
  const marginPercent = (benefit / totalLandCost) * 100;
  const totalBilledKm = billedKm === null ? null : billedKm * trips;

  const values = {
    loadedWeightKg, trips, freightPerTrip, freightTotal, tollsTotal, transportTotal,
    purchase, fees, nonTransportCost, totalLandCost, usableKg, landedPricePerKg, landedPricePerQuintal,
    benchmarkValue, benefit, maxAffordableTransport, occupancyPercent, remainingCapacityKg, marginPercent,
  };
  if (!Object.values(values).every(isSafeAmount) || usableKg <= 0 || !Number.isSafeInteger(trips)) return overflowResult();
  Object.assign(values, { billedKm, totalBilledKm });

  let breakEvenDistanceKm = null;
  let breakEvenDistanceStatus = 'quote';
  if (n.freightMode === 'rate') {
    const allowedFreightPerTrip = maxAffordableTransport / trips - n.tollPerTrip;
    if (allowedFreightPerTrip < n.minFare) breakEvenDistanceStatus = 'infeasible';
    else if (n.ratePerKm === 0) breakEvenDistanceStatus = 'unbounded';
    else {
      breakEvenDistanceKm = allowedFreightPerTrip / n.ratePerKm / n.journeyFactor;
      if (!isSafeAmount(breakEvenDistanceKm)) return overflowResult();
      breakEvenDistanceStatus = 'finite';
    }
  }

  const stressLoss = n.lossPercent + 2;
  let stress = { valid: false, reason: 'loss_limit' };
  if (stressLoss < 100) {
    const stressedUsableKg = n.quantityKg * (1 - stressLoss / 100);
    const stressedTransport = freightTotal * 1.1 + tollsTotal;
    const stressedCost = nonTransportCost + stressedTransport;
    const stressedValue = stressedUsableKg * n.benchmarkPricePerKg;
    const stressValues = {
      lossPercent: stressLoss, usableKg: stressedUsableKg, transportTotal: stressedTransport,
      totalLandCost: stressedCost, landedPricePerKg: stressedCost / stressedUsableKg,
      benchmarkValue: stressedValue, benefit: stressedValue - stressedCost,
    };
    stress = Object.values(stressValues).every(isSafeAmount)
      ? { valid: true, freightIncreasePercent: 10, lossIncreasePoints: 2, ...stressValues }
      : { valid: false, reason: 'overflow' };
  }

  return {
    valid: true, errors: {}, missingFields: [], input: n, ...values,
    breakEvenDistanceKm, breakEvenDistanceStatus,
    outcome: benefit > 0 ? 'saving' : benefit < 0 ? 'shortfall' : 'break-even',
    breakdown: {
      purchase, freight: freightTotal, tolls: tollsTotal, loading: n.loadingTotal,
      packing: n.packingTotal, marketFees: fees, other: n.otherTotal,
    },
    stress,
  };
}

/** Compare ONLY entered vehicle-specific fares; never reuse another vehicle's fare. */
export function compareDeliveryVehicles(input = {}, vehicles = VEHICLE_PRESETS) {
  const rows = vehicles.map(vehicle => ({
    id: vehicle.id, label: vehicle.label, capacityKg: vehicle.capacityKg,
    scenario: calculateDeliveryScenario({
      ...input, capacityKg: vehicle.capacityKg,
      ratePerKm: vehicle.ratePerKm, minFare: vehicle.minFare, quotePerTrip: vehicle.quotePerTrip,
      tollPerTrip: vehicle.tollPerTrip ?? input.tollPerTrip,
    }),
    rank: null,
  }));
  const ranked = rows.filter(row => row.scenario.valid).slice().sort((a, b) => a.scenario.totalLandCost - b.scenario.totalLandCost);
  let previousCost = null;
  let rank = 0;
  ranked.forEach((row, index) => {
    if (row.scenario.totalLandCost !== previousCost) rank = index + 1;
    row.rank = rank;
    previousCost = row.scenario.totalLandCost;
  });
  return rows;
}

/** Plain text suitable for the user's own saved plan; not a transporter quote. */
export function getDeliverySummaryText(input, result = calculateDeliveryScenario(input)) {
  if (!result?.valid) return 'डिलीवरी का अनुमान अधूरा है। सभी जरूरी भाव, मात्रा और खर्च दर्ज करें।';
  const n = result.input;
  const number = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
  const rupees = value => `₹${number(value)}`;
  const comparison = n.comparisonMode === 'local' ? 'स्थानीय खरीद के मुकाबले अंतर' : 'बिक्री मूल्य के मुकाबले अनुमानित अंतर';
  const lines = [
    'सही भाव — डिलीवरी का अनुमान',
    `मात्रा: ${number(n.quantityKg)} किलो · उपयोग योग्य: ${number(result.usableKg)} किलो`,
    `पैकिंग का वजन: ${number(n.packagingWeightKg)} किलो · कुल ढुलाई वजन: ${number(result.loadedWeightKg)} किलो`,
    `गाड़ी की योजना क्षमता: ${number(n.capacityKg)} किलो · फेरे: ${result.trips}`,
    n.distanceKm === null ? 'दूरी: दर्ज नहीं (प्रति फेरे के कोट में ज़रूरी नहीं)' : `एक तरफ दूरी: ${number(n.distanceKm)} किमी · भाड़े की दूरी/फेरा: ${number(result.billedKm)} किमी`,
    n.freightMode === 'rate'
      ? `भाड़े की दर: ${rupees(n.ratePerKm)}/किमी · न्यूनतम: ${rupees(n.minFare)}/फेरा`
      : `दर्ज भाड़ा: ${rupees(n.quotePerTrip)}/फेरा (टोल और अन्य खर्च अलग दर्ज हैं)`,
    `खरीद भाव: ${rupees(n.buyPricePerKg)}/किलो · तुलना भाव: ${rupees(n.benchmarkPricePerKg)}/किलो`,
    `खरीद: ${rupees(result.purchase)}`,
    `भाड़ा: ${rupees(result.freightTotal)} · टोल: ${rupees(result.tollsTotal)}`,
    `लोडिंग: ${rupees(n.loadingTotal)} · पैकिंग: ${rupees(n.packingTotal)} · अन्य: ${rupees(n.otherTotal)}`,
    `मंडी शुल्क: ${rupees(result.fees)} · वजन की कमी: ${number(n.lossPercent)}%`,
    `कुल लागत: ${rupees(result.totalLandCost)}`,
    `पहुंचने पर लागत: ${rupees(result.landedPricePerKg)}/किलो (${rupees(result.landedPricePerQuintal)}/क्विंटल)`,
    `${comparison}: ${rupees(result.benefit)}`,
  ];
  if (result.breakEvenDistanceStatus === 'finite') lines.push(`इन्हीं दरों, खर्च और फेरों पर लागत बराबर होने की अधिकतम एक तरफ दूरी: ${number(result.breakEvenDistanceKm)} किमी`);
  else if (result.breakEvenDistanceStatus === 'infeasible') lines.push('दर्ज न्यूनतम भाड़े और खर्च पर 0 किमी में भी लागत तुलना मूल्य से अधिक है।');
  if (result.stress?.valid) lines.push(`भाड़ा 10% और वजन की कमी 2 प्रतिशत अंक बढ़ने पर अंतर: ${rupees(result.stress.benefit)}`);
  lines.push('यह दर्ज मानों पर योजना का अनुमान है। गाड़ी की वास्तविक क्षमता, भाव, गुणवत्ता, मार्ग और सभी खर्च की पुष्टि करें।');
  return lines.join('\n');
}
