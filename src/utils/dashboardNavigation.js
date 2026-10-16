const DASHBOARD_TABS = new Set(['prices', 'delivery', 'mandis', 'calendar', 'naksha', 'bazaar']);

/** Share the active dashboard workspace when the user switches region. */
export function getDashboardTab(search = '') {
  const requested = new URLSearchParams(search).get('tab');
  if (requested === 'logistics') return 'delivery';
  return DASHBOARD_TABS.has(requested) ? requested : 'prices';
}

/** State IDs are validated by StateContext before building their route. */
export function getDashboardStateUrl(stateId, search = '') {
  const path = stateId ? `/mandi-bhav/${encodeURIComponent(stateId)}` : '/';
  const tab = getDashboardTab(search);
  if (tab === 'prices') return path;
  const params = new URLSearchParams({ tab });
  // Place IDs belong to their source state. Only carry the crop candidate;
  // Naksha validates it against the new state's loaded catalog before use.
  const crop = new URLSearchParams(search).get('mapCrop');
  if (tab === 'naksha' && crop) params.set('mapCrop', crop);
  return `${path}?${params}`;
}
