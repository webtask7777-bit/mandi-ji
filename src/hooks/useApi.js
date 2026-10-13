import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../api/client';

export function useApi(path) {
  const request = useMemo(() => ({ path }), [path]);
  const [response, setResponse] = useState({ request: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!request.path) return;
    apiFetch(request.path)
      .then(data => { if (!cancelled) setResponse({ request, data, error: null }); })
      .catch(error => { if (!cancelled) setResponse({ request, data: null, error }); });
    return () => { cancelled = true; };
  }, [request]);

  // A new key must never render the previous crop/state while its effect is pending.
  if (!path) return { data: null, loading: false, error: null };
  if (response.request !== request) return { data: null, loading: true, error: null };
  return { data: response.data, loading: false, error: response.error };
}
