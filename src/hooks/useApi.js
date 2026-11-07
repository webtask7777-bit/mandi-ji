import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../api/client';
import { useApiSnapshot } from '../context/ApiSnapshotContext';

// Price data is read from files shipped in the same deployment as the prerendered
// HTML, so a complete snapshot already equals the API response. CMS stays revalidated.
const deploymentData = /^\/(?:crops|mandis|districts|states|ticker|prices|mandi-compare|arbitrage|stats)(?:[/?]|$)/;
const isFinalSnapshot = (path, entry) => !!entry && !entry.error && !entry.partial && deploymentData.test(path);

export function useApi(path) {
  const snapshot = useApiSnapshot();
  if (path) snapshot.collect?.(path);
  const request = useMemo(() => ({ path }), [path]);
  const snapshotIsFinal = isFinalSnapshot(path, snapshot.responses?.[path]);
  const [response, setResponse] = useState({ request: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!request.path || snapshotIsFinal) return;
    apiFetch(request.path)
      .then(data => { if (!cancelled) setResponse({ request, data, error: null }); })
      .catch(error => { if (!cancelled) setResponse({ request, data: null, error }); });
    return () => { cancelled = true; };
  }, [request, snapshotIsFinal]);

  // A new key must never render the previous crop/state while its effect is pending.
  if (!path) return { data: null, loading: false, error: null };
  if (response.request !== request) {
    const initial = snapshot.responses?.[path];
    if (initial) return { data: initial.data, loading: false, error: initial.error ? new Error(initial.error) : null };
    return { data: null, loading: true, error: null };
  }
  return { data: response.data, loading: false, error: response.error };
}
