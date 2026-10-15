import { useEffect, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, ZoomControl, useMap } from 'react-leaflet';
import {
  INDIA_CENTER, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM,
  INDIA_BOUNDS, STATE_ZOOM,
} from './mapConstants';
import IndiaStatesLayer from './IndiaStatesLayer';
import DistrictsLayer from './DistrictsLayer';
import { useGeoData, useCropMatrix } from './useGeoData';
import { useStateContext } from '../../context/StateContext';

function MapController({ selectedState, selectedDistrict, stateGeoJson, mapResetKey }) {
  const map = useMap();
  const fitOverview = useCallback(() => {
    const feature = stateGeoJson?.features.find(item => item.properties.stateId === selectedState);
    const bounds = feature ? L.geoJSON(feature).getBounds() : L.latLngBounds(INDIA_BOUNDS);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [25, 25], maxZoom: feature ? STATE_ZOOM : DEFAULT_ZOOM });
  }, [selectedState, stateGeoJson, map]);

  useEffect(() => { fitOverview(); }, [fitOverview, mapResetKey]);
  useEffect(() => {
    if (!selectedDistrict) fitOverview();
  }, [selectedDistrict, fitOverview]);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function LeafletMap({
  stateData = [],
  districts = [],
  mandis = [],
  crops = [],
  selectedCrop = null,
  selectedDistrict = null,
  onDistrictSelect,
  onStateSelect,
  mapResetKey = 0,
}) {
  const { selectedState, selectStateDirect } = useStateContext();
  const { geoJson: stateGeoJson, loading: statesLoading, error: statesError } = useGeoData('/geo/india-states.json');
  const cropMatrix = useCropMatrix();
  const { stateDataMap, maxRecords } = useMemo(() => {
    const records = {};
    let maximum = 0;
    for (const state of stateData) {
      records[state.id] = state;
      maximum = Math.max(maximum, Number(state.totalRecords) || 0);
    }
    return { stateDataMap: records, maxRecords: maximum };
  }, [stateData]);

  const evidenceMatrix = useMemo(() => {
    // A state-specific catalog can add positive evidence for that state only.
    // Missing catalog or matrix entries are never interpreted as crop absence.
    if (!selectedState || !selectedCrop || !crops.some(crop => crop.id === selectedCrop && Number(crop.totalRecords) > 0)) return cropMatrix;
    const entry = cropMatrix?.[selectedCrop];
    return {
      ...cropMatrix,
      [selectedCrop]: { ...entry, states: [...new Set([...(entry?.states || []), selectedState])] },
    };
  }, [cropMatrix, selectedState, selectedCrop, crops]);
  const handleStateClick = useCallback(stateId => {
    if (onStateSelect) onStateSelect(stateId);
    else selectStateDirect(stateId);
  }, [onStateSelect, selectStateDirect]);
  const missingStateBoundary = Boolean(selectedState && stateGeoJson && !stateGeoJson.features.some(feature => feature.properties.stateId === selectedState));

  return (
    <div role="region" aria-label="राज्य और जिले के अनुसार मंडी रिकॉर्ड का नक्शा" className="sb-atlas-canvas relative w-full overflow-hidden" style={{ minHeight: 320 }}>
      {(statesLoading || statesError) && (
        <div role="status" className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-[#f4f5e9]/95 p-7 text-center">
          <div className="max-w-xs rounded-2xl border border-[#dce3d1] bg-[#fffef5] px-6 py-5 text-sm leading-relaxed text-[#425b42] shadow-sm">
            {statesLoading ? 'भारत का मंडी नक्शा लोड हो रहा है…' : 'नक्शा नहीं खुल सका। राज्य और मंडी की सूची से खोज जारी रख सकते हैं।'}
          </div>
        </div>
      )}
      {missingStateBoundary && <div role="status" className="pointer-events-none absolute bottom-3 left-3 right-14 z-[450] max-w-sm rounded-xl border border-[#dbe3d1] bg-[#fffef4]/95 px-3 py-2 text-xs text-[#425841]">इस राज्य की सीमा उपलब्ध नहीं; सूची में इसके रिकॉर्ड देख सकते हैं।</div>}
      <MapContainer
        center={INDIA_CENTER}
        zoom={DEFAULT_ZOOM}
        maxZoom={MAX_ZOOM}
        minZoom={MIN_ZOOM}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        zoomControl={false}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: '#eef0e6' }}
      >
        <ZoomControl position="bottomright" />
        <MapController selectedState={selectedState} selectedDistrict={selectedDistrict} stateGeoJson={stateGeoJson} mapResetKey={mapResetKey} />
        {stateGeoJson && (
          <IndiaStatesLayer
            geoJson={stateGeoJson}
            stateDataMap={stateDataMap}
            maxRecords={maxRecords}
            selectedState={selectedState}
            selectedCrop={selectedCrop}
            cropMatrix={evidenceMatrix}
            onStateClick={handleStateClick}
          />
        )}
        {selectedState && (
          <DistrictsLayer
            key={selectedState}
            stateId={selectedState}
            districts={districts}
            mandis={mandis}
            selectedCrop={selectedCrop}
            selectedDistrict={selectedDistrict}
            onDistrictSelect={onDistrictSelect}
          />
        )}
      </MapContainer>
    </div>
  );
}
