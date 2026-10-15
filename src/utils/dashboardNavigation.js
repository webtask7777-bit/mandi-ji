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
  return tab === 'prices' ? path : `${path}?tab=${tab}`;
}
