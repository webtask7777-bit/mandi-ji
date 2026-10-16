import { useCallback, useEffect, useRef } from 'react';
import { GeoJSON } from 'react-leaflet';
import { stateStyle, HOVER_STYLE } from './mapStyles';

function tooltipContent(properties, info, hasCropEvidence, selectedCrop) {
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = properties.nameHi || properties.name;
  const detail = document.createElement('div');
  detail.style.cssText = 'font-size:11px;color:#536657;margin-top:4px;line-height:1.5';
  const mandiCount = Number.isFinite(info?.totalMandis) ? `${info.totalMandis.toLocaleString('hi-IN')} मंडियाँ` : 'मंडी संख्या उपलब्ध नहीं';
  const crops = Number.isFinite(info?.totalCrops) ? ` · ${info.totalCrops.toLocaleString('hi-IN')} फसलें` : '';
  detail.textContent = `${mandiCount}${crops}`;
  content.append(title, detail);
  if (selectedCrop) {
    const evidence = document.createElement('div');
    evidence.style.cssText = 'font-size:11px;margin-top:3px;color:#536657';
    evidence.textContent = hasCropEvidence ? 'चुनी फसल का रिकॉर्ड उपलब्ध' : 'चुनी फसल की जानकारी अधूरी';
    content.append(evidence);
  }
  return content;
}

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
    feature => stateStyle(feature, { stateDataMap, maxRecords, selectedState, selectedCrop, cropMatrix }),
    [stateDataMap, maxRecords, selectedState, selectedCrop, cropMatrix]
  );

  // Leaflet does not re-run onEachFeature when React props change. Rebind the
  // small event/tooltip surface instead of remounting every geographic path.
  useEffect(() => {
    const cleanups = [];
    geoRef.current?.eachLayer(layer => {
      const properties = layer.feature.properties;
      const info = stateDataMap?.[properties.stateId];
      const hasCropEvidence = cropMatrix?.[selectedCrop]?.states?.includes(properties.stateId);
      const content = tooltipContent(properties, info, hasCropEvidence, selectedCrop);
      if (layer.getTooltip()) layer.setTooltipContent(content);
      else layer.bindTooltip(content, { sticky: true, direction: 'top', className: 'leaflet-dark-tooltip' });

      const highlight = () => layer.setStyle(HOVER_STYLE);
      const restore = () => layer.setStyle(styleFunc(layer.feature));
      const choose = () => onStateClick?.(properties.stateId);
      const keydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          choose();
        }
      };
      layer.on({ mouseover: highlight, mouseout: restore, click: choose });
      const element = layer.getElement();
      if (element) {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', `${properties.nameHi || properties.name} की मंडियाँ देखें`);
        element.setAttribute('aria-pressed', String(selectedState === properties.stateId));
        element.addEventListener('keydown', keydown);
        element.addEventListener('focus', highlight);
        element.addEventListener('blur', restore);
      }
      cleanups.push(() => {
        layer.off({ mouseover: highlight, mouseout: restore, click: choose });
        element?.removeEventListener('keydown', keydown);
        element?.removeEventListener('focus', highlight);
        element?.removeEventListener('blur', restore);
      });
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [geoJson, stateDataMap, selectedState, selectedCrop, cropMatrix, onStateClick, styleFunc]);

  return <GeoJSON ref={geoRef} data={geoJson} style={styleFunc} />;
}
