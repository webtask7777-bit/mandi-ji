import { useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import {
  INDIA_CENTER, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM,
  INDIA_BOUNDS, DARK_TILE_URL, DARK_TILE_ATTR,
  STATE_ZOOM,
} from './mapConstants';
import IndiaStatesLayer from './IndiaStatesLayer';
import DistrictsLayer from './DistrictsLayer';
import { useGeoData, useCropMatrix } from './useGeoData';
import { useStateContext } from '../../context/StateContext';

/**
 * Fly map to state bounds or reset to India view
 */
function MapController({ selectedState, stateGeoJson }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedState) {
      // Reset to India view
      map.flyTo(INDIA_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
      return;
    }
    if (!stateGeoJson) return;

    // Find the selected state feature and fly to its bounds
    const feature = stateGeoJson.features.find(
      f => f.properties.stateId === selectedState
    );
    if (feature) {
      // Use leaflet's geoJSON to get bounds
      const layer = L.geoJSON(feature);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [20, 20], maxZoom: STATE_ZOOM, duration: 0.8 });
      }
    }
  }, [selectedState, stateGeoJson, map]);

  return null;
}

export default function LeafletMap({
  stateData = [],
  districts = [],
  mandis = [],
  selectedCrop = null,
}) {
  const mapRef = useRef(null);
  const { selectedState, setSelectedState } = useStateContext();
  const { geoJson: stateGeoJson, loading: statesLoading } = useGeoData('/geo/india-states.json');
  const cropMatrix = useCropMatrix();

  // Build stateDataMap: { stateId: { totalRecords, totalMandis, ... } }
  const stateDataMap = {};
  let maxRecords = 0;
  if (stateData?.length) {
    for (const s of stateData) {
      stateDataMap[s.id] = s;
      if (s.totalRecords > maxRecords) maxRecords = s.totalRecords;
    }
  }

  const handleStateClick = useCallback((stateId) => {
    setSelectedState(stateId);
  }, [setSelectedState]);

  return (
    <div className="relative w-full" style={{ height: '58vh', minHeight: 320 }}>
      {statesLoading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-zinc-950/80">
          <div className="text-xs text-muted-foreground animate-pulse">नक्शा लोड हो रहा है...</div>
        </div>
      )}

      <MapContainer
        ref={mapRef}
        center={INDIA_CENTER}
        zoom={DEFAULT_ZOOM}
        maxZoom={MAX_ZOOM}
        minZoom={MIN_ZOOM}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        zoomControl={false}
        scrollWheelZoom={false}
        className="w-full h-full rounded-xl"
        style={{ background: '#09090b' }}
      >
        <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTR} />
        <ZoomControl position="bottomright" />

        <MapController selectedState={selectedState} stateGeoJson={stateGeoJson} />

        {/* State boundaries (always shown) */}
        {stateGeoJson && (
          <IndiaStatesLayer
            geoJson={stateGeoJson}
            stateDataMap={stateDataMap}
            maxRecords={maxRecords}
            selectedState={selectedState}
            selectedCrop={selectedCrop}
            cropMatrix={cropMatrix}
            onStateClick={handleStateClick}
          />
        )}

        {/* District boundaries (shown when state selected) */}
        {selectedState && (
          <DistrictsLayer
            stateId={selectedState}
            districts={districts}
            mandis={mandis}
            selectedCrop={selectedCrop}
          />
        )}
      </MapContainer>
    </div>
  );
}
