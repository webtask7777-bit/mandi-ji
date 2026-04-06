import { useCallback, useRef } from 'react';
import { GeoJSON } from 'react-leaflet';
import { stateStyle, HOVER_STYLE } from './mapStyles';

export default function IndiaStatesLayer({
  geoJson,
  stateDataMap,
  maxRecords,
  selectedState,
  selectedCrop,
  cropMatrix,
  onStateClick,
}) {
  const geoRef = useRef(null);

  const styleFunc = useCallback(
    (feature) =>
      stateStyle(feature, { stateDataMap, maxRecords, selectedState, selectedCrop, cropMatrix }),
    [stateDataMap, maxRecords, selectedState, selectedCrop, cropMatrix]
  );

  const onEachFeature = useCallback(
    (feature, layer) => {
      const props = feature.properties;
      const info = stateDataMap?.[props.stateId];
      const mandis = info?.totalMandis || 0;
      const crops = info?.totalCrops || 0;

      // Hindi tooltip
      layer.bindTooltip(
        `<div style="font-size:12px;font-weight:700;line-height:1.3">
          ${props.nameHi || props.name}
        </div>
        <div style="font-size:10px;color:#a1a1aa;margin-top:2px">
          🏪 ${mandis} मंडी &nbsp;·&nbsp; 🌾 ${crops} फसल
        </div>`,
        {
          sticky: true,
          direction: 'top',
          className: 'leaflet-dark-tooltip',
        }
      );

      // Hover highlight
      layer.on('mouseover', () => {
        layer.setStyle(HOVER_STYLE);
        layer.bringToFront();
      });
      layer.on('mouseout', () => {
        if (geoRef.current) geoRef.current.resetStyle(layer);
      });

      // Click → select state
      layer.on('click', () => {
        onStateClick(props.stateId);
      });
    },
    [stateDataMap, onStateClick]
  );

  // Key changes when selection/crop changes to force re-render
  const key = `states-${selectedState || 'all'}-${selectedCrop || 'all'}`;

  return (
    <GeoJSON
      ref={geoRef}
      key={key}
      data={geoJson}
      style={styleFunc}
      onEachFeature={onEachFeature}
    />
  );
}
