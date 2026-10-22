export const MONTH_NAMES = Object.freeze([
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
]);

export const CALENDAR_PHASES = Object.freeze([
  { key: 'sowing', name: 'बुवाई', shortName: 'बुवाई', field: 'sowingMonths', legacyField: 'sowing' },
  { key: 'growing', name: 'बढ़वार', shortName: 'बढ़वार', field: 'growingMonths', legacyField: 'growing' },
  { key: 'harvest', name: 'कटाई', shortName: 'कटाई', field: 'harvestMonths', legacyField: 'harvest' },
  { key: 'arrival', name: 'मुख्य आवक', shortName: 'आवक', field: 'peakMonths', legacyField: 'peak' },
].map(phase => Object.freeze(phase)));

const validMonth = month => Number.isInteger(month) && month >= 0 && month < 12;

function calendarEligible(crop) {
  // Rice is a milled product. Its inherited paddy template must not become
  // cultivation advice, and the underlying price identity remains unchanged.
  return crop !== null && typeof crop === 'object' && typeof crop.id === 'string'
    && crop.id.trim().length > 0 && crop.id.trim().toLowerCase() !== 'rice';
}

function phaseMonths(crop, phase) {
  // An explicit empty canonical array means no supplied dates. A legacy field
  // must not silently fill it with older information.
  if (Array.isArray(crop[phase.field])) return crop[phase.field];
  return Array.isArray(crop[phase.legacyField]) ? crop[phase.legacyField] : [];
}

export function getCalendarPhases(crop, month) {
  if (!calendarEligible(crop) || !validMonth(month)) return [];
  // Activities can overlap across production cycles. Preserve all of them;
  // market arrival must never hide sowing or harvest in the same month.
  return CALENDAR_PHASES.filter(phase => phaseMonths(crop, phase).includes(month));
}

export function getCalendarCrops(crops) {
  if (!Array.isArray(crops)) return [];
  return crops.filter(crop => calendarEligible(crop)
    && CALENDAR_PHASES.some(phase => phaseMonths(crop, phase).some(validMonth)));
}

export function getIndiaMonth(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  // Fixed UTC+05:30, independent of the browser/server timezone.
  const indiaDate = new Date(date.getTime() + 330 * 60 * 1000);
  return Number.isFinite(indiaDate.getTime()) ? indiaDate.getUTCMonth() : null;
}

export function getNextCalendarActivity(crop, month) {
  if (!validMonth(month)) return null;
  for (let offset = 1; offset <= 12; offset += 1) {
    const nextMonth = (month + offset) % 12;
    const phases = getCalendarPhases(crop, nextMonth);
    if (phases.length) return { month: nextMonth, phases, offset };
  }
  return null;
}
