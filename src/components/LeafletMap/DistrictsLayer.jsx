import { useState, useCallback, useRef } from 'react';
import { GeoJSON, Popup } from 'react-leaflet';
import { useGeoData } from './useGeoData';
import { districtStyle, HOVER_STYLE } from './mapStyles';
import MapPopup from './MapPopup';

export default function DistrictsLayer({ stateId, districts = [], mandis = [], selectedCrop }) {
  const { geoJson, loading } = useGeoData(`/geo/districts/${stateId}.json`);
  const [popupData, setPopupData] = useState(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const geoRef = useRef(null);

  // Build districtMap: { districtName: { totalRecords, topCrops, mandis, ... } }
  const districtMap = {};
  let maxDistRecords = 0;
  if (districts?.length) {
    for (const d of districts) {
      districtMap[d.name] = d;
      if (d.totalRecords > maxDistRecords) maxDistRecords = d.totalRecords;
    }
  }

  // Build mandi lookup by district
  const mandisByDistrict = {};
  if (mandis?.length) {
    for (const m of mandis) {
      const dName = m.district || 'Unknown';
      if (!mandisByDistrict[dName]) mandisByDistrict[dName] = [];
      mandisByDistrict[dName].push(m);
    }
  }

  const styleFunc = useCallback(
    (feature) =>
      districtStyle(feature, { districtMap, maxDistRecords, selectedCrop, hoveredDistrict }),
    [districtMap, maxDistRecords, selectedCrop, hoveredDistrict]
  );

  const onEachFeature = useCallback(
    (feature, layer) => {
      const distName = feature.properties.districtName;
      const info = districtMap?.[distName];

      // Tooltip
      layer.bindTooltip(
        `<div style="font-size:11px;font-weight:700">${distName}</div>
         <div style="font-size:9px;color:#a1a1aa">${info?.totalRecords || 0} रिकॉर्ड</div>`,
        { sticky: true, direction: 'top', className: 'leaflet-dark-tooltip' }
      );

      layer.on('mouseover', () => {
        setHoveredDistrict(distName);
        layer.setStyle(HOVER_STYLE);
        layer.bringToFront();
      });
      layer.on('mouseout', () => {
        setHoveredDistrict(null);
        if (geoRef.current) geoRef.current.resetStyle(layer);
      });

      // Click → show popup
      layer.on('click', (e) => {
        const dMandis = mandisByDistrict[distName] || [];
        setPopupData({
          districtName: distName,
          info,
          mandis: dMandis,
          latlng: e.latlng,
        });
      });
    },
    [districtMap, mandisByDistrict]
  );

  if (loading || !geoJson) return null;

  const key = `districts-${stateId}-${selectedCrop || 'all'}-${hoveredDistrict || ''}`;

  return (
    <>
      <GeoJSON
        ref={geoRef}
        key={key}
        data={geoJson}
        style={styleFunc}
        onEachFeature={onEachFeature}
      />
      {popupData && (
        <Popup
          position={popupData.latlng}
          onClose={() => setPopupData(null)}
          className="leaflet-dark-popup"
        >
          <MapPopup
            districtName={popupData.districtName}
            info={popupData.info}
            mandis={popupData.mandis}
          />
        </Popup>
      )}
    </>
  );
}
