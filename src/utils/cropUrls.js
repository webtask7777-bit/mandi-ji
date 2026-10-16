// Crop IDs belong to their source's catalog. Preserve that scope in shared and
// crawlable links instead of depending on the dashboard's in-memory selection.
export function cropDetailPath(cropId, stateParam = 'all') {
  const crop = encodeURIComponent(cropId);
  return !stateParam || stateParam === 'all'
    ? `/crop/${crop}`
    : `/mandi-bhav/${encodeURIComponent(stateParam)}/${crop}`;
}
