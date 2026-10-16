// These exact source IDs are livestock, poultry, fish or eggs. Their reporting
// units are not established for the crop UI's ₹/quintal and kg calculations.
// Keep the source records intact; exclude only these known IDs from that UI.
export const NON_CROP_COMMODITY_IDS = Object.freeze([
  'cow', 'bull', 'calf', 'goat', 'cock', 'duck',
  'he-buffalo', 'she-buffalo', 'pigs', 'fish', 'egg', 'ox', 'hen',
]);
const excludedIds = new Set(NON_CROP_COMMODITY_IDS);

export function isCropPriceCommodity(id) {
  return typeof id === 'string' && id.trim().length > 0 && !excludedIds.has(id.trim().toLowerCase());
}

export const UNSUPPORTED_COMMODITY_ERROR = {
  code: 'UNSUPPORTED_COMMODITY_UNIT',
  error: 'इस गैर-फसल उत्पाद की इकाई की पुष्टि नहीं है। इसे ₹/क्विंटल के फसल भाव या किलो आधारित डिलीवरी हिसाब में नहीं दिखाया जाता।',
};
