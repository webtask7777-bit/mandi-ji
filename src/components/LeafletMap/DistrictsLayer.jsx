import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { GeoJSON, Popup, useMap } from 'react-leaflet';
import { useGeoData } from './useGeoData';
import { districtStyle, districtCropMatch, HOVER_STYLE } from './mapStyles';
import { getDistrictName, findDistrictRecord, normalizeDistrictName } from '../../utils/mapData.js';
import MapPopup from './MapPopup';

function tooltipContent(name, info, selectedCrop) {
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = info?.nameHi || name;
  const detail = document.createElement('div');
  detail.style.cssText = 'font-size:11px;color:#536657;margin-top:4px;line-height:1.5';
  detail.textContent = Number.isFinite(info?.totalRecords)
    ? `${info.totalRecords.toLocaleString('hi-IN')} उपलब्ध रिकॉर्ड`
    : 'इस जिले के रिकॉर्ड उपलब्ध नहीं';
  content.append(title, detail);
  if (selectedCrop) {
    const evidence = document.createElement('div');
    evidence.style.cssText = 'font-size:11px;color:#536657;margin-top:3px';
    evidence.textContent = districtCropMatch(info, selectedCrop) === 'matched'
      ? 'चुनी फसल का रिकॉर्ड मिला'
      : 'चुनी फसल की जानकारी अधूरी';
    content.append(evidence);
  }
  return content;
}

export default function DistrictsLayer({
  stateId,
  districts = [],
  mandis = [],
  selectedCrop,
  selectedDistrict = null,
  onDistrictSelect,
}) {
  const map = useMap();
  const { geoJson, loading, error } = useGeoData(`/geo/districts/${stateId}.json`);
  const [popupData, setPopupData] = useState(null);
  const geoRef = useRef(null);

  const districtMap = useMemo(() => {
    const records = {};
    for (const feature of geoJson?.features || []) {
      const name = feature.properties.districtName;
      records[name] = findDistrictRecord(name, districts);
    }
    return records;
  }, [geoJson, districts]);
  const maxDistRecords = useMemo(() => Math.max(0, ...districts.map(district => Number(district.totalRecords) || 0)), [districts]);
  const mandisByDistrict = useMemo(() => {
    const result = {};
    for (const mandi of mandis) {
      // The Chhattisgarh endpoint embeds a district object; other states use a
      // string. Never turn that object into the key "[object Object]".
      const name = getDistrictName(mandi.district) || getDistrictName(districts.find(district => district.id === mandi.districtId));
      const key = normalizeDistrictName(name);
      if (!key) continue;
      (result[key] ||= []).push(mandi);
    }
    return result;
  }, [mandis, districts]);
  const selectedGeometry = useMemo(() => {
    if (!selectedDistrict) return null;
    const selectedKey = normalizeDistrictName(selectedDistrict);
    return geoJson?.features.find(feature => {
      const name = feature.properties.districtName;
      return normalizeDistrictName(name) === selectedKey || normalizeDistrictName(districtMap[name]?.name) === selectedKey;
    }) || null;
  }, [selectedDistrict, geoJson, districtMap]);
  const selectedGeometryName = selectedGeometry?.properties.districtName || null;
  const [previousSelectedGeometryName, setPreviousSelectedGeometryName] = useState(selectedGeometryName);
  const styleFunc = useCallback(
    feature => districtStyle(feature, { districtMap, maxDistRecords, selectedCrop, selectedDistrict: selectedGeometryName }),
    [districtMap, maxDistRecords, selectedCrop, selectedGeometryName]
  );

  useEffect(() => {
    if (!selectedDistrict || !geoJson) return;
    // A district without its own boundary stays in the list. Show the state's
    // available extent rather than inventing a point or reusing another district.
    const bounds = L.geoJSON(selectedGeometry || geoJson).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [35, 35], maxZoom: selectedGeometry ? 9 : 7 });
  }, [selectedDistrict, selectedGeometry, geoJson, map]);

  useEffect(() => {
    const cleanups = [];
    geoRef.current?.eachLayer(layer => {
      const name = layer.feature.properties.districtName;
      const info = districtMap[name];
      const actualName = info?.name || name;
      const content = tooltipContent(name, info, selectedCrop);
      if (layer.getTooltip()) layer.setTooltipContent(content);
      else layer.bindTooltip(content, { sticky: true, direction: 'top', className: 'leaflet-dark-tooltip' });
      const highlight = () => { layer.setStyle(HOVER_STYLE); layer.bringToFront(); };
      const restore = () => layer.setStyle(styleFunc(layer.feature));
      const choose = event => {
        onDistrictSelect?.(actualName);
        setPopupData({ districtName: name, latlng: event?.latlng || layer.getBounds().getCenter() });
      };
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
        element.setAttribute('aria-label', `${info?.nameHi || name} जिले की मंडियाँ देखें`);
        element.setAttribute('aria-pressed', String(selectedGeometryName === name));
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
  }, [geoJson, districtMap, selectedCrop, selectedGeometryName, onDistrictSelect, styleFunc]);

  // Hide a mismatched popup immediately, but only discard it after the selected
  // geometry changes. A polygon click can set its popup before URL navigation
  // commits the matching selection; keep that pending popup until then.
  const activePopup = popupData && (!onDistrictSelect || popupData.districtName === selectedGeometryName) ? popupData : null;
  if (previousSelectedGeometryName !== selectedGeometryName) {
    setPreviousSelectedGeometryName(selectedGeometryName);
    if (popupData && !activePopup) setPopupData(null);
  }
  const popupInfo = activePopup ? districtMap[activePopup.districtName] : null;
  const popupMandis = activePopup ? mandisByDistrict[normalizeDistrictName(popupInfo?.name || activePopup.districtName)] || [] : [];
  const message = loading ? 'जिले की सीमाएँ लोड हो रही हैं…'
    : error ? 'इस राज्य की जिला सीमाएँ उपलब्ध नहीं। मंडी सूची से खोज जारी रखें।'
      : selectedDistrict && geoJson && !selectedGeometry ? 'चुने जिले की सीमा उपलब्ध नहीं; उसकी मंडी सूची देख सकते हैं।' : null;

  return (
    <>
      {message && <div role="status" className="sb-atlas-map-status pointer-events-none absolute left-3 right-14 top-3 z-[450] max-w-sm rounded-xl border border-[#dbe3d1] bg-[#fffef4]/95 px-3 py-2 text-xs leading-relaxed text-[#425841] shadow-sm">{message}</div>}
      {geoJson && <GeoJSON ref={geoRef} data={geoJson} style={styleFunc} />}
      {activePopup && geoJson && (
        <Popup key={activePopup.districtName} position={activePopup.latlng} eventHandlers={{ remove: () => setPopupData(current => current === activePopup ? null : current) }} className="sb-atlas-popup" maxWidth={305}>
          <MapPopup
            districtName={activePopup.districtName}
            info={popupInfo}
            mandis={popupMandis}
            selectedCrop={selectedCrop}
            onSelect={onDistrictSelect ? () => { onDistrictSelect(popupInfo?.name || activePopup.districtName); setPopupData(null); } : undefined}
          />
        </Popup>
      )}
    </>
  );
}
