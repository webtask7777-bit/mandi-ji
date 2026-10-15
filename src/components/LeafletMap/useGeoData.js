import { useState, useEffect } from 'react';

// Cache only successfully validated responses. Failed requests remain retryable
// when the user changes the selected geography or revisits the map.
const cache = new Map();

export function useGeoData(path) {
  const [response, setResponse] = useState(null);

  useEffect(() => {
    if (!path || cache.has(path)) return;
    const controller = new AbortController();
    let active = true;

    fetch(path, { signal: controller.signal })
      .then(result => {
        if (!result.ok) throw new Error(`HTTP ${result.status}`);
        return result.json();
      })
      .then(data => {
        if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.length) {
          throw new Error('Geographic boundaries unavailable');
        }
        if (!active) return;
        cache.set(path, data);
        setResponse({ path, data, error: null });
      })
      .catch(error => {
        if (active && error.name !== 'AbortError') setResponse({ path, data: null, error });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [path]);

  // Never expose the previous state's geometry while a new request is pending.
  const current = response?.path === path ? response : null;
  const geoJson = path ? (cache.get(path) || current?.data || null) : null;
  return {
    geoJson,
    loading: Boolean(path && !geoJson && !current?.error),
    error: current?.error || null,
  };
}

export function useCropMatrix() {
  const [matrix, setMatrix] = useState(() => cache.get('crop-matrix') || null);

  useEffect(() => {
    if (cache.has('crop-matrix')) return;
    const controller = new AbortController();
    let active = true;
    fetch('/geo/crop-state-matrix.json', { signal: controller.signal })
      .then(result => {
        if (!result.ok) throw new Error(`HTTP ${result.status}`);
        return result.json();
      })
      .then(data => {
        if (!active || !data || typeof data !== 'object' || Array.isArray(data)) return;
        cache.set('crop-matrix', data);
        setMatrix(data);
      })
      .catch(() => { /* Missing evidence is handled as unknown by mapStyles. */ });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return matrix;
}
