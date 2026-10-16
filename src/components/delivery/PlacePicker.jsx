import { useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import { STATE_NAMES } from '../../context/StateContext';
import { nearestDistrict } from '../../utils/geoDistance';

/**
 * State + district picker for one end of a delivery route. A place is
 * { stateId, district, lat, lng } from public/geo/district-centroids.json.
 * "Use my location" asks the browser for the position once and only keeps the nearest
 * district; the coordinates are not stored or sent anywhere.
 */
export default function PlacePicker({ id, title, value, onChange, geo, allowLocate = false, hint }) {
  const [status, setStatus] = useState('');
  const states = geo?.states || [];
  const state = states.find(item => item.id === value?.stateId);
  const pickState = stateId => onChange(stateId ? { stateId, district: '', lat: null, lng: null } : null);
  const pickDistrict = name => {
    const district = state?.districts.find(item => item.name === name);
    onChange(district ? { stateId: state.id, district: district.name, lat: district.lat, lng: district.lng } : { stateId: state?.id || '', district: '', lat: null, lng: null });
  };
  const locate = () => {
    if (!navigator.geolocation) { setStatus('इस ब्राउज़र में लोकेशन उपलब्ध नहीं। ज़िला खुद चुनें।'); return; }
    setStatus('लोकेशन ढूँढ रहे हैं…');
    navigator.geolocation.getCurrentPosition(
      position => {
        const near = nearestDistrict({ lat: position.coords.latitude, lng: position.coords.longitude }, states);
        if (!near) { setStatus('पास का ज़िला नहीं मिला। ज़िला खुद चुनें।'); return; }
        onChange({ stateId: near.stateId, district: near.district, lat: near.lat, lng: near.lng });
        setStatus(`पास का ज़िला चुना: ${near.district}। सही न हो तो बदल दें।`);
      },
      () => setStatus('लोकेशन की अनुमति नहीं मिली। ज़िला खुद चुनें।'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };
  return <fieldset className="sb-delivery-place">
    <legend><MapPin size={15} aria-hidden="true" /> {title}</legend>
    <div className="sb-delivery-place-selects">
      <label className="sr-only" htmlFor={`${id}-state`}>{title}: राज्य</label>
      <select id={`${id}-state`} value={value?.stateId || ''} onChange={event => pickState(event.target.value)} disabled={!states.length}>
        <option value="">{states.length ? 'राज्य चुनें' : 'लोड हो रहा है…'}</option>
        {states.map(item => <option key={item.id} value={item.id}>{STATE_NAMES[item.id] || item.name}</option>)}
      </select>
      <label className="sr-only" htmlFor={`${id}-district`}>{title}: ज़िला</label>
      <select id={`${id}-district`} value={value?.district || ''} onChange={event => pickDistrict(event.target.value)} disabled={!state}>
        <option value="">ज़िला चुनें</option>
        {(state?.districts || []).map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
      </select>
    </div>
    {allowLocate && <button type="button" className="sb-delivery-locate" onClick={locate} disabled={!states.length}><LocateFixed size={15} aria-hidden="true" /> मेरी लोकेशन से चुनें</button>}
    {(status || hint) && <small role={status ? 'status' : undefined}>{status || hint}</small>}
  </fieldset>;
}
