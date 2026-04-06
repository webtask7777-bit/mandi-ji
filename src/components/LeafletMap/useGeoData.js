import { useState, useEffect } from 'react';

// Module-level cache to avoid re-fetching
const cache = {};

/**
 * Hook to fetch and cache GeoJSON data
 * Files are already GeoJSON (simplified) in public/geo/
 */
export function useGeoData(path) {
  const [geoJson, setGeoJson] = useState(cache[path] || null);
  const [loading, setLoading] = useState(!cache[path]);

  useEffect(() => {
    if (!path) { setGeoJson(null); setLoading(false); return; }
    if (cache[path]) { setGeoJson(cache[path]); setLoading(false); return; }

    setLoading(true);
    fetch(path)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        cache[path] = data;
        setGeoJson(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn(`Failed to load geo data: ${path}`, err);
        setLoading(false);
      });
  }, [path]);

  return { geoJson, loading };
}

/**
 * Hook to fetch crop-state matrix
 */
export function useCropMatrix() {
  const [matrix, setMatrix] = useState(cache['crop-matrix'] || null);

  useEffect(() => {
    if (cache['crop-matrix']) { setMatrix(cache['crop-matrix']); return; }
    fetch('/geo/crop-state-matrix.json')
      .then(r => r.json())
      .then(data => {
        cache['crop-matrix'] = data;
        setMatrix(data);
      })
      .catch(() => {});
  }, []);

  return matrix;
}
