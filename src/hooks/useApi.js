import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { useApiSnapshot } from '../context/ApiSnapshotContext';

// Price data is read from files shipped in the same deployment as the prerendered
// HTML, so a complete snapshot already equals the API response. CMS stays revalidated.
const deploymentData = /^\/(?:crops|mandis|districts|states|ticker|prices|mandi-compare|arbitrage|stats)(?:[/?]|$)/;
// KCC summaries and price history change only with a deploy, so a recorded 404 ("no data for this
// crop") is final too: asking again on every page view would only add a request.
const deploymentOnly = /^\/(?:kcc|price-history)(?:[/?]|$)/;
const isFinalSnapshot = (path, entry) => !!entry && !entry.partial && !entry.omittedRows && (deploymentOnly.test(path) || (!entry.error && deploymentData.test(path)));

export function useApi(path) {
  const snapshot = useApiSnapshot();
  if (path) snapshot.collect?.(path);
  const request = useMemo(() => ({ path }), [path]);
  const initial = path ? snapshot.responses?.[path] : undefined;
  const snapshotIsFinal = isFinalSnapshot(path, initial);
  // Rows left out of the snapshot are fetched only once a reader asks for them.
  const [fullRequested, setFullRequested] = useState(null);
  const awaitingFull = Boolean(initial?.omittedRows) && fullRequested !== path;
  const loadFull = useCallback(() => setFullRequested(path), [path]);
  const omittedRows = initial?.omittedRows || 0;
  const [response, setResponse] = useState({ request: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!request.path || snapshotIsFinal || awaitingFull) return;
    apiFetch(request.path)
      .then(data => { if (!cancelled) setResponse({ request, data, error: null }); })
      .catch(error => { if (!cancelled) setResponse({ request, data: null, error }); });
    return () => { cancelled = true; };
  }, [request, snapshotIsFinal, awaitingFull]);

  // A new key must never render the previous crop/state while its effect is pending.
  if (!path) return { data: null, loading: false, error: null };
  if (response.request !== request) {
    if (initial) return { data: initial.data, loading: false, error: initial.error ? new Error(initial.error) : null, omittedRows, loadingFull: omittedRows > 0 && !awaitingFull, loadFull };
    return { data: null, loading: true, error: null };
  }
  // A failed refresh keeps the dated snapshot; `stale` reports the failure separately.
  if (response.error && initial?.data != null && !initial.error) return { data: initial.data, loading: false, error: null, stale: true, omittedRows, loadFull };
  return { data: response.data, loading: false, error: response.error };
}
