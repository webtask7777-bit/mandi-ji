/**
 * District-level distance estimates for the delivery calculator. A straight line between
 * district centres times a road factor is only a starting point: the page says so and links
 * to a maps route for the real road distance. Nothing here leaves the browser.
 */

export const ROAD_FACTOR = 1.3;

/** Great-circle distance in km between two { lat, lng } points. */
export function straightLineKm(a, b) {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every(Number.isFinite)) return null;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough one-way road distance, rounded to 5 km; null if either point is missing. */
export function estimateRoadKm(a, b) {
  const straight = straightLineKm(a, b);
  if (straight === null) return null;
  return Math.max(5, Math.round((straight * ROAD_FACTOR) / 5) * 5);
}

/** The district whose centre is nearest to a point (for "use my location"). */
export function nearestDistrict(point, states = []) {
  let best = null;
  for (const state of states) {
    for (const district of state.districts || []) {
      const km = straightLineKm(point, district);
      if (km !== null && (!best || km < best.km)) best = { stateId: state.id, district: district.name, lat: district.lat, lng: district.lng, km };
    }
  }
  return best;
}

/** Public maps directions link for the user to read the real road distance. */
export function mapsDirectionsUrl(fromLabel, toLabel) {
  if (!fromLabel || !toLabel) return null;
  const params = new URLSearchParams({ api: '1', origin: fromLabel, destination: toLabel, travelmode: 'driving' });
  return `https://www.google.com/maps/dir/?${params}`;
}

/** "Durg, Chhattisgarh" style label for a place picked from the district list. */
export function placeLabel(place, stateName) {
  if (!place?.district) return '';
  return [place.district, stateName].filter(Boolean).join(', ');
}
