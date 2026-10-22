import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Calculator, Check, ChevronDown, Copy, Download, Info, MapPin, Package, RotateCcw, Route, Save, Scale, ShieldCheck, Trash2, Truck } from 'lucide-react';
import VehicleIllustration from '../components/VehicleIllustration';
import FarmVisual from '../components/FarmVisual';
import DeliveryResources from '../components/delivery/DeliveryResources';
import PlacePicker from '../components/delivery/PlacePicker';
import { STATE_NAMES } from '../context/StateContext';
import { estimateRoadKm, mapsDirectionsUrl, placeLabel, straightLineKm } from '../utils/geoDistance';
import { DELIVERY_VEHICLE_VISUALS } from '../data/deliveryVehicleVisuals';
import CropImage from '../components/CropImage';
import { calculateDeliveryScenario, compareDeliveryVehicles, getDeliverySummaryText, VEHICLE_PRESETS, deliveryFormToInput, convertDeliveryPrice, convertDeliveryQuantity, prefillDeliveryForm, getDeliveryTrips, getDeliveryCropOptions, priceBasisLabel } from '../utils/deliveryCalculator';
import { getDataFreshness } from '../utils/dataFreshness';
import '../styles/delivery.css';
import '../styles/section-scenes.css';

const STORAGE_KEY = 'sahibhav.delivery.draft.v1';
const SAVED_KEY = 'sahibhav.delivery.saved.v1';
const MY_PLACE_KEY = 'sahibhav.myPlace.v1';
const GUIDE_KEY = 'sahibhav.delivery.guideClosed.v1';
const BASE_FORM = {
  vehicleId: 'pickup', capacityKg: 1000, distanceKm: '', journeyFactor: 1, fromPlace: null, toPlace: null,
  from: '', to: '', cropId: '', cropName: '', quantity: 1000, quantityUnit: 'kg', packagingWeightKg: 0,
  buyPrice: '', benchmarkPrice: '', priceUnit: 'quintal', comparisonMode: 'local',
  lossPercent: 2, freightMode: 'rate', ratePerKm: '', minFare: 0, quotePerTrip: '',
  tollPerTrip: 0, loadingTotal: 0, packingTotal: 0, otherTotal: 0, marketFeePercent: 0,
  example: false, sourceQuote: null, locationOnly: false,
};
const money = (value, decimals = 0) => Number.isFinite(value) ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value)}` : '—';
const number = (value, decimals = 0) => Number.isFinite(value) ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals }).format(value) : '—';
const DEFAULT_VEHICLE = VEHICLE_PRESETS.find(vehicle => vehicle.capacityKg === 1000) || VEHICLE_PRESETS[0];
const initialForm = () => ({ ...BASE_FORM, vehicleId: DEFAULT_VEHICLE.id, capacityKg: DEFAULT_VEHICLE.capacityKg });

function readStorage(key, fallback) {
  try { const stored = JSON.parse(localStorage.getItem(key)); return stored && typeof stored === 'object' ? stored : fallback; }
  catch { return fallback; }
}

function restoreForm(draft) {
  const defaults = initialForm();
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return defaults;
  const restored = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const value = draft[key];
    if (key === 'fromPlace' || key === 'toPlace') return [key, validPlace(value)];
    if (key === 'sourceQuote') return [key, value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(['date', 'basis', 'variety', 'grade'].map(field => [field, typeof value[field] === 'string' ? value[field] : ''])) : null];
    if (typeof fallback === 'boolean') return [key, typeof value === 'boolean' ? value : fallback];
    return [key, typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) ? value : fallback];
  }));
  for (const [key, values] of Object.entries({ vehicleId: VEHICLE_PRESETS.map(item => item.id), quantityUnit: ['kg', 'quintal', 'tonne'], priceUnit: ['kg', 'quintal'], freightMode: ['rate', 'quote'], comparisonMode: ['local', 'resale'] })) {
    if (!values.includes(restored[key])) restored[key] = defaults[key];
  }
  return restored;
}

function readDraft() { return restoreForm(readStorage(STORAGE_KEY, null)); }

/** A stored place must have a state, a district and real coordinates; anything else is dropped. */
function validPlace(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { stateId, district, lat, lng } = value;
  if (typeof stateId !== 'string' || !stateId) return null;
  return { stateId, district: typeof district === 'string' ? district : '', lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null };
}
const placeText = place => placeLabel(place, STATE_NAMES[place?.stateId] || '');


function Field({ id, label, value, onChange, suffix, hint, error, required = false, min = 0, max, step = 'any', placeholder = '0', type = 'number', className = '' }) {
  return <div className={`sb-delivery-field ${className}`}>
    <label htmlFor={id}>{label}{required && <span className="sb-delivery-required">ज़रूरी</span>}</label>
    <div className={`sb-delivery-input${error ? ' has-error' : ''}`}>
      <input id={id} type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={value ?? ''} onChange={event => onChange(event.target.value)} min={type === 'number' ? min : undefined} max={max} step={type === 'number' ? step : undefined} placeholder={placeholder} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-hint` : undefined} autoComplete="off" />
      {suffix && <span>{suffix}</span>}
    </div>
    {(error || hint) && <small id={`${id}-hint`} className={error ? 'sb-delivery-error' : ''}>{error || hint}</small>}
  </div>;
}

function StepHeading({ number: stepNumber, icon: Icon, title, subtitle }) {
  return <div className="sb-delivery-step-heading"><span className="sb-delivery-step-number">{stepNumber}</span><div><h3>{title}</h3><p>{subtitle}</p></div><Icon size={21} strokeWidth={1.5} aria-hidden="true" /></div>;
}

function CostRow({ label, value, total = false }) {
  return <div className={`sb-delivery-cost-row${total ? ' is-total' : ''}`}><dt>{label}</dt><dd>{money(value)}</dd></div>;
}

export default function DeliveryCalculatorTab({ initialScenario, onScenarioConsumed, crops = [] }) {
  const uid = useId();
  const [form, setForm] = useState(readDraft);
  const [saved, setSaved] = useState(() => { const values = readStorage(SAVED_KEY, []); return Array.isArray(values) ? values.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && item.form && typeof item.form === 'object' && !Array.isArray(item.form)).slice(0, 5) : []; });
  const [notice, setNotice] = useState('');
  const [compareRates, setCompareRates] = useState({});
  const [showStress, setShowStress] = useState(false);
  const [geo, setGeo] = useState(null);
  const [myPlace, setMyPlace] = useState(() => validPlace(readStorage(MY_PLACE_KEY, null)));
  const [guideOpen, setGuideOpen] = useState(() => { try { return localStorage.getItem(GUIDE_KEY) !== '1'; } catch { return true; } });
  const lastPrefill = useRef(null);
  const consumedRef = useRef(onScenarioConsumed);
  consumedRef.current = onScenarioConsumed;
  const scenarioKey = initialScenario?.id || (initialScenario ? JSON.stringify(initialScenario) : '');
  const scenarioRef = useRef(initialScenario);
  scenarioRef.current = initialScenario;

  useEffect(() => {
    if (!scenarioKey || lastPrefill.current === scenarioKey) return;
    lastPrefill.current = scenarioKey;
    setForm(previous => prefillDeliveryForm(previous, scenarioRef.current));
    setCompareRates({});
    setShowStress(false);
    setNotice(scenarioRef.current?.priceBasis === 'location-only'
      ? 'मंडी का नाम भर दिया है। दूरी, भाव और वास्तविक भाड़ा भरें।'
      : scenarioRef.current?.priceBasis === 'listing-offer' ? 'विक्रेता का माँगा हुआ भाव भर दिया है। स्थानीय खरीद भाव, दूरी और वास्तविक भाड़ा भरें।' : 'मंडी के दर्ज भाव भर दिए हैं। दूरी और गाड़ी का वास्तविक भाड़ा भरें।');
    consumedRef.current?.();
  }, [scenarioKey]);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* calculator works without browser storage */ } }, [form]);

  // District centres for the place pickers (about 37 KB, loaded once).
  useEffect(() => {
    let cancelled = false;
    fetch('/geo/district-centroids.json').then(response => (response.ok ? response.json() : null)).then(data => { if (!cancelled && data?.states) setGeo(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(timer); }, [notice]);

  const input = useMemo(() => deliveryFormToInput(form), [form]);
  const result = useMemo(() => calculateDeliveryScenario(input), [input]);
  const cropOptions = useMemo(() => getDeliveryCropOptions(crops), [crops]);
  const displayCropName = cropOptions.find(crop => crop.id === form.cropId)?.label || form.cropName;
  const selectedVehicle = VEHICLE_PRESETS.find(vehicle => vehicle.id === form.vehicleId) || DEFAULT_VEHICLE;
  const capacity = Number(form.capacityKg);
  const quantityKg = Number(input.quantityKg);
  const packagingWeightKg = Number(form.packagingWeightKg);
  const loadedKg = quantityKg + packagingWeightKg;
  const canPlan = form.packagingWeightKg !== '' && Number.isFinite(capacity) && capacity > 0 && Number.isFinite(loadedKg) && quantityKg > 0 && packagingWeightKg >= 0;
  const plannedTrips = canPlan ? getDeliveryTrips(loadedKg, capacity) : 0;
  const planningTrips = Number.isSafeInteger(plannedTrips) ? plannedTrips : 0;
  const planningLoad = planningTrips ? Math.min(100, loadedKg / (planningTrips * capacity) * 100) : 0;
  const freshness = form.sourceQuote ? getDataFreshness(form.sourceQuote.date) : null;
  const isListingOffer = form.sourceQuote?.basis === 'listing-offer';
  const sourceDateLabel = isListingOffer
    ? !freshness?.date ? 'लिस्टिंग की तारीख उपलब्ध नहीं' : freshness.status === 'future' ? 'लिस्टिंग की तारीख जाँचें' : freshness.isCurrent ? 'आज दर्ज की गई लिस्टिंग' : `${freshness.ageDays} दिन पुरानी लिस्टिंग`
    : freshness?.label;
  const sourceSummary = freshness ? isListingOffer
    ? `\nभाव का स्रोत: उपयोगकर्ता की बिक्री लिस्टिंग (विक्रेता का माँगा भाव; सरकारी मंडी रिकॉर्ड नहीं)\nलिस्टिंग की तारीख: ${freshness.dateLabel} (${sourceDateLabel})`
    : `\nभाव का स्रोत: दर्ज मंडी रिकॉर्ड${priceBasisLabel(form.sourceQuote.basis) ? ` · आधार: ${priceBasisLabel(form.sourceQuote.basis)}` : ''}\nदर्ज भाव की तारीख: ${freshness.dateLabel} (${sourceDateLabel})`
    : '';
  const comparisonRows = useMemo(() => compareDeliveryVehicles(input, VEHICLE_PRESETS.map(vehicle => ({ ...vehicle, minFare: 0, tollPerTrip: '', ...(compareRates[vehicle.id] || {}) }))), [input, compareRates]);
  const missingLabels = {
    quantityKg: 'माल की मात्रा', packagingWeightKg: 'बोरी / क्रेट का कुल वजन', capacityKg: 'गाड़ी की क्षमता',
    distanceKm: 'एक तरफ की सड़क दूरी', journeyFactor: 'भाड़े में जाने / वापसी की यात्रा',
    buyPricePerKg: 'खरीद भाव', benchmarkPricePerKg: form.comparisonMode === 'local' ? 'स्थानीय भाव' : 'बिक्री भाव',
    ratePerKm: 'गाड़ी का प्रति किलोमीटर भाड़ा', quotePerTrip: 'पूरी ट्रिप का भाड़ा', minFare: 'न्यूनतम भाड़ा (नहीं हो तो 0)',
    tollPerTrip: 'इस गाड़ी का टोल (शामिल हो तो 0)', loadingTotal: 'चढ़ाना + उतरवाना खर्च', packingTotal: 'पैकिंग खर्च',
    otherTotal: 'अन्य खर्च (नहीं हो तो 0)', marketFeePercent: 'मंडी / कमीशन शुल्क', lossPercent: 'वज़न / खराबे का अनुमान',
  };
  const missingCostNames = (result.missingFields || []).map(key => missingLabels[key] || key);
  const hasUnknownExtraCosts = ['tollPerTrip', 'loadingTotal', 'packingTotal', 'otherTotal', 'marketFeePercent'].some(key => form[key] === '');
  const enteredError = (key, value) => value !== '' && value != null ? result.errors?.[key] : undefined;
  const change = (key, value) => {
    if ((key === 'from' || key === 'to') && value !== form[key]) {
      setCompareRates({});
      setShowStress(false);
    }
    setForm(previous => ({ ...previous, [key]: value, ...(['buyPrice', 'cropId', 'from'].includes(key) || (['benchmarkPrice', 'to'].includes(key) && previous.sourceQuote?.basis !== 'listing-offer') ? { sourceQuote: null } : {}) }));
  };
  const fieldId = name => `${uid}-${name}`;

  // ── Route places and distance estimate ──
  const setPlace = (end, place) => {
    const textKey = end === 'fromPlace' ? 'from' : 'to';
    setForm(previous => ({ ...previous, [end]: place, ...(place?.district && !String(previous[textKey] || '').trim() ? { [textKey]: placeText(place) } : {}) }));
    if (end === 'toPlace' && place?.district) {
      setMyPlace(place);
      try { localStorage.setItem(MY_PLACE_KEY, JSON.stringify(place)); } catch { /* optional */ }
    }
  };
  // Maps search text: the typed name plus "District, State" in English so the route resolves.
  const routeLabel = (text, place) => {
    const englishState = geo?.states?.find(item => item.id === place?.stateId)?.name || '';
    const where = place?.district ? [place.district, englishState].filter(Boolean).join(', ') : '';
    const name = String(text || '').trim().replace(/,\s*[^,]*[\u0900-\u097F][^,]*$/, '');
    return name && where && !name.includes(place.district) ? `${name}, ${where}` : where || name;
  };
  const straightKm = straightLineKm(form.fromPlace, form.toPlace);
  const estimatedKm = estimateRoadKm(form.fromPlace, form.toPlace);
  const mapsUrl = mapsDirectionsUrl(routeLabel(form.from, form.fromPlace), routeLabel(form.to, form.toPlace));
  const closeGuide = () => { setGuideOpen(false); try { localStorage.setItem(GUIDE_KEY, '1'); } catch { /* optional */ } };

  const selectVehicle = vehicle => setForm(previous => previous.vehicleId === vehicle.id ? previous : ({ ...previous, vehicleId: vehicle.id, capacityKg: vehicle.capacityKg, ratePerKm: '', minFare: '', quotePerTrip: '', tollPerTrip: '' }));
  const changePriceUnit = value => setForm(previous => {
    if (previous.priceUnit === value) return previous;
    return { ...previous, priceUnit: value, buyPrice: convertDeliveryPrice(previous.buyPrice, previous.priceUnit, value), benchmarkPrice: convertDeliveryPrice(previous.benchmarkPrice, previous.priceUnit, value) };
  });
  const changeQuantityUnit = value => setForm(previous => ({ ...previous, quantityUnit: value, quantity: convertDeliveryQuantity(previous.quantity, previous.quantityUnit, value) }));
  const reset = () => { setForm(initialForm()); setCompareRates({}); setShowStress(false); setNotice('नया हिसाब शुरू करें। सहेजे गए हिसाब अलग रखे हैं।'); };
  const loadExample = () => {
    setForm({ ...initialForm(), from: 'खरीद मंडी (उदाहरण)', to: 'आपकी जगह (उदाहरण)', cropId: 'wheat', cropName: 'गेहूँ', buyPrice: 2400, benchmarkPrice: 2900, ratePerKm: 18, minFare: 1200, tollPerTrip: 100, loadingTotal: 300, packingTotal: 150, example: true });
    setCompareRates({});
    setShowStress(false);
    setNotice('यह समझने के लिए काल्पनिक उदाहरण है। कोई लाइव भाव या गाड़ी का ऑफर नहीं।');
  };
  const summary = () => `${form.example ? 'काल्पनिक उदाहरण से शुरू किया गया हिसाब — सभी मान दोबारा जाँचें\n' : ''}सही भाव · डिलीवरी का हिसाब\n${displayCropName ? `फसल: ${displayCropName}\n` : ''}${form.from || form.to ? `रास्ता: ${form.from || 'खरीद मंडी'} → ${form.to || 'आपकी जगह'}\n` : ''}गाड़ी: ${selectedVehicle.label}${form.sourceQuote?.variety ? `\nकिस्म: ${form.sourceQuote.variety}${form.sourceQuote.grade ? ` · ग्रेड: ${form.sourceQuote.grade}` : ''}` : ''}\n${getDeliverySummaryText(input, result)}${sourceSummary}\nदूरी, क्षमता, भाड़ा और अन्य खर्च उपयोगकर्ता के अनुमान हैं। वास्तविक सौदे से पहले भाव, माल की गुणवत्ता और शामिल खर्च की पुष्टि करें।`;
  const copySummary = async () => {
    try { await navigator.clipboard.writeText(summary()); setNotice('हिसाब कॉपी हो गया। जहाँ चाहें पेस्ट करें।'); }
    catch { setNotice('ब्राउज़र ने कॉपी की अनुमति नहीं दी। “डाउनलोड” से हिसाब ले सकते हैं।'); }
  };
  const downloadSummary = () => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([summary()], { type: 'text/plain;charset=utf-8' }));
    link.href = url; link.download = 'sahibhav-delivery-hisab.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('हिसाब की टेक्स्ट फ़ाइल डाउनलोड हो रही है।');
  };
  const saveScenario = () => {
    const item = { id: Date.now().toString(), form, created: new Date().toISOString(), title: [displayCropName || 'माल', form.from || 'खरीद मंडी', form.to || 'आपकी जगह'].join(' · ') };
    const updated = [item, ...saved].slice(0, 5);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(updated)); setSaved(updated); setNotice('हिसाब इसी ब्राउज़र में सहेजा गया। आखिरी 5 हिसाब रखे जाते हैं।'); }
    catch { setNotice('ब्राउज़र में जगह या अनुमति उपलब्ध नहीं है। कॉपी या डाउनलोड कर लें।'); }
  };
  const removeSaved = id => {
    const updated = saved.filter(item => item.id !== id);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(updated)); setSaved(updated); } catch { setNotice('सहेजा हुआ हिसाब हट नहीं पाया।'); }
  };
  const loadSavedScenario = item => {
    setForm(restoreForm(item.form));
    setCompareRates({});
    setShowStress(false);
    setNotice('सहेजा हिसाब खुल गया। भाव और भाड़ा अभी भी सही हैं या नहीं, जाँच लें।');
  };

  const applyLoadPlan = ({ quantityKg, packagingWeightKg: packingKg }) => {
    if (!Number.isFinite(quantityKg) || quantityKg <= 0 || !Number.isFinite(packingKg) || packingKg < 0) return;
    setForm(previous => ({ ...previous, quantity: quantityKg, quantityUnit: 'kg', packagingWeightKg: packingKg }));
    setShowStress(false);
    setNotice('पैकिंग योजना से माल और खाली पैकिंग का वजन मुख्य हिसाब में भर दिया है।');
    document.getElementById(fieldId('quantity'))?.focus();
  };

  return <section className="sb-delivery" aria-labelledby={fieldId('title')}>
    <header className="sb-delivery-heading sb-section-scene">
      <div className="sb-section-scene-copy">
      <div><span className="sb-delivery-eyebrow"><Route size={15} aria-hidden="true" /> भाव से आगे, पूरी तैयारी</span><h2 id={fieldId('title')}>माल वहाँ से लाना<br className="sb-delivery-mobile-break" /> कितना सही पड़ेगा?</h2><p>पूरी लागत निकालें, पैकिंग और गाड़ी समझें, फिर मंडी की यात्रा की तैयारी करें।</p></div>
      <div className="sb-delivery-heading-actions"><button type="button" className="sb-delivery-button" onClick={loadExample}><Calculator size={16} aria-hidden="true" /> उदाहरण देखें</button><button type="button" className="sb-delivery-button is-quiet" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> नया हिसाब</button></div>
      </div>
      <figure className="sb-section-scene-art"><FarmVisual name="farm-delivery-v1" sizes="(max-width: 620px) calc(100vw - 40px), 470px" priority /><figcaption>सांकेतिक AI चित्र · वाहन की जानकारी नीचे देखें</figcaption></figure>
    </header>
    <nav className="sb-delivery-jumpnav" aria-label="डिलीवरी के औज़ार और जानकारी">
      <a href="#delivery-calculation"><Calculator size={16} aria-hidden="true" /> खर्च निकालें</a>
      <a href="#delivery-guide"><Truck size={16} aria-hidden="true" /> गाड़ी और पैकिंग</a>
      <a href="#delivery-quote"><Copy size={16} aria-hidden="true" /> भाड़ा पूछें</a>
      <a href="#delivery-checklist"><Check size={16} aria-hidden="true" /> यात्रा की तैयारी</a>
    </nav>
    <details className="sb-delivery-guide" open={guideOpen} onToggle={event => setGuideOpen(event.currentTarget.open)}>
      <summary><Info size={16} aria-hidden="true" /> हिसाब कैसे करें? 4 आसान कदम <ChevronDown size={16} aria-hidden="true" /></summary>
      <ol>
        <li><strong>गाड़ी चुनें</strong> छोटा मालवाहक, पिकअप या ट्रक। क्षमता अपनी गाड़ी के अनुसार बदल सकते हैं।</li>
        <li><strong>जगह चुनें</strong> खरीद मंडी और आपकी जगह का राज्य व ज़िला चुनें। अनुमानित दूरी एक क्लिक में भरें, या Google Maps पर सड़क की असली दूरी देखकर भरें।</li>
        <li><strong>माल और भाव भरें</strong> कितना माल, मंडी का खरीद भाव, और तुलना का भाव: पास में खरीदने का या आगे बेचने का।</li>
        <li><strong>भाड़ा और खर्च भरें</strong> ड्राइवर से ₹/km या पूरी ट्रिप का भाड़ा पूछें। टोल, चढ़ाना-उतरवाना, पैकिंग, मंडी शुल्क भरें; जो न हो उसमें 0।</li>
      </ol>
      <p>फिर दाईं ओर (मोबाइल पर नीचे) <strong>आपका हिसाब</strong> में दिखेगा: आपके यहाँ पहुँचने की लागत ₹/kg, कुल खर्च और बचत या घाटा। कोई खाना छूटा हो तो वहीं लिखा मिलेगा।</p>
      <button type="button" className="sb-delivery-button is-quiet" onClick={closeGuide}>समझ गया, छिपाएँ</button>
    </details>
    {form.example && <div className="sb-delivery-example"><Info size={17} aria-hidden="true" /><span><strong>उदाहरण से शुरू किया गया</strong> · शुरुआती भाव और भाड़े काल्पनिक थे। अपने सौदे के लिए सभी मान जाँचकर बदलें।</span></div>}
    {form.locationOnly && <div className="sb-delivery-source"><MapPin size={17} aria-hidden="true" /><div><strong>नक्शे से चुनी गई मंडी</strong><p>मंडी का नाम भर दिया है। दूरी, भाव और वास्तविक भाड़ा भरें। पुराने हिसाब के खर्च हटा दिए हैं; जो खर्च लागू न हो, उसमें 0 लिखें।</p></div></div>}
    {freshness && <div className="sb-delivery-source"><Info size={17} aria-hidden="true" /><div><strong>{isListingOffer ? 'विक्रेता की लिस्टिंग से लिया गया भाव' : freshness.isCurrent ? 'दर्ज मंडी भाव से शुरू किया गया' : 'दर्ज भाव को पहले जाँचें'}</strong><p>{isListingOffer ? 'लिस्टिंग की तारीख: ' : 'मंडी भाव की तारीख: '}{freshness.dateLabel} · {sourceDateLabel}। {isListingOffer ? 'यह उपयोगकर्ता का बिक्री ऑफर है, सरकारी मंडी रिकॉर्ड नहीं। ' : priceBasisLabel(form.sourceQuote.basis) ? `भाव का आधार: ${priceBasisLabel(form.sourceQuote.basis)}। ` : ''}{form.sourceQuote.variety ? `किस्म: ${form.sourceQuote.variety}${form.sourceQuote.grade ? ` · ग्रेड: ${form.sourceQuote.grade}` : ''}। ` : ''}भाव, उपलब्धता, किस्म और गुणवत्ता की विक्रेता से पुष्टि करें।</p></div></div>}
    <div className="sb-delivery-layout" id="delivery-calculation">
      <div className="sb-delivery-form">
        <section className="sb-delivery-card">
          <StepHeading number="01" icon={Truck} title="गाड़ी और रास्ता" subtitle="अपनी गाड़ी पहचानें, फिर क्षमता और दूरी भरें।" />
          <fieldset className="sb-delivery-vehicles" aria-describedby={fieldId('vehicle-note')}>
            <legend className="sr-only">गाड़ी का प्रकार</legend>
            {VEHICLE_PRESETS.map(vehicle => {
              const isSelected = form.vehicleId === vehicle.id;
              return <button type="button" key={vehicle.id} className={`sb-delivery-vehicle${isSelected ? ' is-active' : ''}`} aria-pressed={isSelected} onClick={() => selectVehicle(vehicle)}>
                <span className="sb-delivery-vehicle-check" aria-hidden="true">{isSelected && <Check size={13} strokeWidth={2.5} />}</span>
                <span className="sb-delivery-vehicle-scene"><VehicleIllustration vehicleId={vehicle.id} priority={isSelected} /></span>
                <span className="sb-delivery-vehicle-copy">
                  <strong>{vehicle.label}</strong>
                  <span className="sb-delivery-vehicle-reference">{DELIVERY_VEHICLE_VISUALS[vehicle.id].referenceLabel}</span>
                  <span className="sb-delivery-vehicle-capacity"><b>{number(vehicle.capacityKg)} kg</b><span>योजना क्षमता</span></span>
                </span>
              </button>;
            })}
          </fieldset>
          <p className="sb-delivery-vehicle-note" id={fieldId('vehicle-note')}><Info size={14} aria-hidden="true" /><span>वाहन के चित्र पहचान के लिए हैं। क्षमता अनुमानित है; अपनी गाड़ी की RC / ड्राइवर से पुष्टि करें।</span></p>
          <div className="sb-delivery-payload-row"><Field id={fieldId('capacity')} label="आपकी गाड़ी की लोड क्षमता" value={form.capacityKg} onChange={value => change('capacityKg', value)} suffix="kg / ट्रिप" min={1} error={enteredError('capacityKg', form.capacityKg)} /><p><Info size={14} aria-hidden="true" /> ये योजना के लिए क्षमता हैं। अपनी गाड़ी की स्वीकृत payload और माल के आकार के अनुसार बदलें।</p></div>
          <div className="sb-delivery-route-fields"><Field id={fieldId('from')} label="माल कहाँ से आएगा?" type="text" value={form.from} onChange={value => change('from', value)} placeholder="खरीद मंडी / शहर" /><ArrowRight size={18} aria-hidden="true" /><Field id={fieldId('to')} label="कहाँ तक पहुँचाना है?" type="text" value={form.to} onChange={value => change('to', value)} placeholder="आपकी जगह / बिक्री मंडी" /></div>
          <div className="sb-delivery-places">
            <PlacePicker id={fieldId('from-place')} title="माल कहाँ से: मंडी का ज़िला" value={form.fromPlace} onChange={place => setPlace('fromPlace', place)} geo={geo} />
            <PlacePicker id={fieldId('to-place')} title={form.comparisonMode === 'resale' ? 'कहाँ तक: बिक्री मंडी / आपकी जगह' : 'आपकी जगह'} value={form.toPlace} onChange={place => setPlace('toPlace', place)} geo={geo} allowLocate hint={!form.toPlace && myPlace ? undefined : 'आपकी जगह इसी ब्राउज़र में याद रहेगी।'} />
          </div>
          {!form.toPlace?.district && myPlace?.district && <button type="button" className="sb-delivery-locate" onClick={() => setPlace('toPlace', myPlace)}><MapPin size={15} aria-hidden="true" /> मेरी सहेजी जगह भरें: {placeText(myPlace)}</button>}
          {estimatedKm !== null && <div className="sb-delivery-estimate" role="status">
            <p><Route size={15} aria-hidden="true" /><span>ज़िला केंद्रों के बीच सीधी दूरी लगभग <strong>{number(straightKm)} km</strong>; सड़क से लगभग <strong>{number(estimatedKm)} km</strong> (अनुमान)।</span></p>
            <div><button type="button" className="sb-delivery-button" onClick={() => change('distanceKm', estimatedKm)}>{number(estimatedKm)} km भरें</button>{mapsUrl && <a className="sb-delivery-button is-quiet" href={mapsUrl} target="_blank" rel="noopener noreferrer">Google Maps पर सड़क दूरी देखें</a>}</div>
            <small>मंडी या गाँव ज़िला केंद्र से दूर हो तो असली दूरी अलग होगी। ड्राइवर या Maps से पक्की करें।</small>
          </div>}
          <div className="sb-delivery-distance-box"><div className="sb-delivery-distance-heading"><MapPin size={18} aria-hidden="true" /><label htmlFor={fieldId('distance')}>एक तरफ की सड़क दूरी</label><div className="sb-delivery-distance-number"><input id={fieldId('distance')} type="number" min="0" step="any" value={form.distanceKm} onChange={event => change('distanceKm', event.target.value)} aria-invalid={enteredError('distanceKm', form.distanceKm) ? true : undefined} /><span>km</span></div></div><input className="sb-delivery-range" type="range" min="0" max={Math.max(500, Math.ceil((Number(form.distanceKm) || 0) / 500) * 500)} step="5" value={Math.max(0, Number(form.distanceKm) || 0)} aria-label="एक तरफ की सड़क दूरी बदलें" onChange={event => change('distanceKm', event.target.value)} /><div className="sb-delivery-range-labels"><span>0 km</span><span>{number(Math.max(500, Math.ceil((Number(form.distanceKm) || 0) / 500) * 500))} km</span></div><small>{enteredError('distanceKm', form.distanceKm) || (form.freightMode === 'quote' ? 'पूरी ट्रिप के कोट में दूरी ज़रूरी नहीं; भरें तो कुल किलोमीटर दिखेंगे।' : estimatedKm !== null ? 'ऊपर का अनुमान भरें या Maps / ड्राइवर से सड़क दूरी लेकर बदलें।' : 'ऊपर दोनों जगह चुनें, या Maps / ड्राइवर से सड़क दूरी भरें।')}</small></div>
          <fieldset className="sb-delivery-segment-field"><legend>{form.freightMode === 'quote' ? 'कोट में कितनी यात्रा शामिल है?' : 'भाड़ा किस दूरी का लगेगा?'}</legend><div className="sb-delivery-segments"><button type="button" aria-pressed={Number(form.journeyFactor) === 1} onClick={() => change('journeyFactor', 1)}>जाने की यात्रा <span>1 तरफ</span></button><button type="button" aria-pressed={Number(form.journeyFactor) === 2} onClick={() => change('journeyFactor', 2)}>वापसी शामिल <span>आना + जाना</span></button></div></fieldset>
        </section>

        <section className="sb-delivery-card">
          <StepHeading number="02" icon={Package} title="माल और भाव" subtitle="एक जैसी किस्म और गुणवत्ता के भाव की तुलना करें।" />
          <div className="sb-delivery-crop-field"><CropImage id={form.cropId} name={form.cropName} size="md" /><div className="sb-delivery-field"><label htmlFor={fieldId('crop')}>फसल / माल <span className="sb-delivery-optional">वैकल्पिक</span></label><input id={fieldId('crop')} className="sb-delivery-plain-input" list={fieldId('crop-list')} value={displayCropName} placeholder="जैसे गेहूँ, टमाटर, चना" onChange={event => { const value = event.target.value; const crop = cropOptions.find(item => item.label === value); setForm(previous => ({ ...previous, cropName: value, cropId: crop?.id || '', sourceQuote: null })); }} /><datalist id={fieldId('crop-list')}>{cropOptions.map(crop => <option key={crop.id} value={crop.label} />)}</datalist></div></div>
          <div className="sb-delivery-quantity-row"><Field id={fieldId('quantity')} label="कितना माल मँगाना है?" value={form.quantity} onChange={value => change('quantity', value)} min={.001} required error={enteredError('quantityKg', form.quantity)} /><div className="sb-delivery-field"><label htmlFor={fieldId('quantity-unit')}>वज़न की इकाई</label><select id={fieldId('quantity-unit')} value={form.quantityUnit} onChange={event => changeQuantityUnit(event.target.value)}><option value="kg">किलो (kg)</option><option value="quintal">क्विंटल (100 kg)</option><option value="tonne">टन (1,000 kg)</option></select></div></div>
          <div className="sb-delivery-payload-row"><Field id={fieldId('packaging-weight')} label="बोरी / क्रेट का अलग कुल वजन" value={form.packagingWeightKg} onChange={value => change('packagingWeightKg', value)} suffix="kg" error={enteredError('packagingWeightKg', form.packagingWeightKg)} /><p>ऊपर केवल माल का शुद्ध वजन भरें। खाली बोरी / क्रेट का वजन लोड और ट्रिप में जुड़ेगा, खरीद या बिक्री के वजन में नहीं।</p></div>
          <div className="sb-delivery-load"><div><span><Truck size={15} aria-hidden="true" /> {planningTrips ? `${number(planningTrips)} ट्रिप ${planningTrips === 1 ? 'लगेगी' : 'लगेंगी'}` : 'मात्रा और क्षमता भरें'}</span><strong>{number(planningLoad)}% औसत लोड</strong></div><div className="sb-delivery-load-track" role="meter" aria-label="सभी ट्रिप में औसत क्षमता उपयोग" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(planningLoad)}><span style={{ width: `${planningLoad}%` }} /></div><small>{planningTrips > 1 ? `माल + पैकिंग ${number(loadedKg)} kg ÷ ${number(capacity)} kg क्षमता। आखिरी ट्रिप आंशिक हो सकती है।` : `माल + पैकिंग ${number(loadedKg)} kg। कम लोड पर भी न्यूनतम भाड़ा लग सकता है।`}</small></div>
          <fieldset className="sb-delivery-segment-field"><legend>किससे तुलना करनी है?</legend><div className="sb-delivery-segments"><button type="button" aria-pressed={form.comparisonMode === 'local'} onClick={() => change('comparisonMode', 'local')}>पास में खरीदने से <span>कितनी बचत?</span></button><button type="button" aria-pressed={form.comparisonMode === 'resale'} onClick={() => change('comparisonMode', 'resale')}>आगे बेचने से <span>कितना अंतर?</span></button></div></fieldset>
          <div className="sb-delivery-price-unit"><span>दोनों भाव की इकाई</span><div><button type="button" aria-pressed={form.priceUnit === 'quintal'} onClick={() => changePriceUnit('quintal')}>₹ / क्विंटल</button><button type="button" aria-pressed={form.priceUnit === 'kg'} onClick={() => changePriceUnit('kg')}>₹ / kg</button></div></div>
          <div className="sb-delivery-two-fields"><Field id={fieldId('buy')} label={isListingOffer ? 'विक्रेता का माँगा हुआ भाव' : 'खरीद मंडी का भाव'} value={form.buyPrice} onChange={value => change('buyPrice', value)} suffix={form.priceUnit === 'kg' ? '₹ / kg' : '₹ / क्विंटल'} required placeholder="खरीद का भाव" error={enteredError('buyPricePerKg', form.buyPrice)} /><Field id={fieldId('benchmark')} label={form.comparisonMode === 'local' ? 'यहाँ खरीदने का भाव' : 'आगे बिक्री का भाव'} value={form.benchmarkPrice} onChange={value => change('benchmarkPrice', value)} suffix={form.priceUnit === 'kg' ? '₹ / kg' : '₹ / क्विंटल'} required placeholder="तुलना का भाव" error={enteredError('benchmarkPricePerKg', form.benchmarkPrice)} /></div>
          <div className="sb-delivery-payload-row sb-delivery-loss-row"><Field id={fieldId('loss')} label="रास्ते में वज़न / खराबे का नुकसान" value={form.lossPercent} onChange={value => change('lossPercent', value)} suffix="%" max={99.99} error={enteredError('lossPercent', form.lossPercent)} /><p>{form.locationOnly ? 'अनाज, फल या सब्ज़ी और यात्रा के अनुसार संभावित नुकसान भरें।' : '2% शुरुआती मान है। अनाज, फल या सब्ज़ी के हिसाब से बदलें।'} नुकसान के बाद बचे माल पर प्रति किलो लागत निकलेगी।</p></div>
        </section>

        <section className="sb-delivery-card">
          <StepHeading number="03" icon={Scale} title="भाड़ा और बाकी खर्च" subtitle="ड्राइवर के बताए रेट से अपना अनुमान बनाएँ।" />
          <fieldset className="sb-delivery-segment-field"><legend className="sr-only">भाड़ा कैसे भरेंगे?</legend><div className="sb-delivery-segments"><button type="button" aria-pressed={form.freightMode === 'rate'} onClick={() => change('freightMode', 'rate')}>प्रति किलोमीटर <span>दूरी के हिसाब से</span></button><button type="button" aria-pressed={form.freightMode === 'quote'} onClick={() => change('freightMode', 'quote')}>पूरी ट्रिप का भाड़ा <span>ड्राइवर का कोट</span></button></div></fieldset>
          {form.freightMode === 'rate' ? <div className="sb-delivery-two-fields"><Field id={fieldId('rate')} label="गाड़ी का रेट" value={form.ratePerKm} onChange={value => change('ratePerKm', value)} suffix="₹ / km" required placeholder="ड्राइवर से पूछें" error={enteredError('ratePerKm', form.ratePerKm)} /><Field id={fieldId('minimum')} label="न्यूनतम भाड़ा / ट्रिप" value={form.minFare} onChange={value => change('minFare', value)} suffix="₹" hint="दूरी का खर्च कम हो तो यह लगेगा।" error={enteredError('minFare', form.minFare)} /></div> : <Field id={fieldId('quote')} label="एक पूरी ट्रिप का तय भाड़ा" value={form.quotePerTrip} onChange={value => change('quotePerTrip', value)} suffix="₹ / ट्रिप" required placeholder="ड्राइवर का कोट भरें" hint="ड्राइवर का पूरा प्रति ट्रिप कोट भरें। दूरी या वापसी से इसे दोबारा गुणा नहीं किया जाएगा। टोल शामिल हो तो नीचे 0 रखें।" error={enteredError('quotePerTrip', form.quotePerTrip)} />}
          <details className="sb-delivery-extra-costs" open={form.locationOnly && hasUnknownExtraCosts ? true : undefined}><summary><span><span className="sb-delivery-detail-icon"><Package size={16} aria-hidden="true" /></span><strong>टोल, मजदूरी और दूसरे खर्च</strong></span><span className="sb-delivery-extra-total">{hasUnknownExtraCosts ? 'खर्च भरें' : money((Number(form.tollPerTrip) || 0) * planningTrips + (Number(form.loadingTotal) || 0) + (Number(form.packingTotal) || 0) + (Number(form.otherTotal) || 0))}{Number(form.marketFeePercent) > 0 ? ' + शुल्क' : ''}<ChevronDown size={16} aria-hidden="true" /></span></summary><div><p>{hasUnknownExtraCosts ? 'इन खर्चों की जानकारी अभी नहीं है। जो खर्च लागू न हो, उसमें 0 लिखें।' : 'जो खर्च लागू हों उन्हें भरें।'} भाड़े में शामिल खर्च दोबारा न जोड़ें।</p><div className="sb-delivery-two-fields"><Field id={fieldId('toll')} label="टोल / पार्किंग, हर ट्रिप" value={form.tollPerTrip} onChange={value => change('tollPerTrip', value)} suffix="₹" hint="वापसी का टोल लगे तो इसी रकम में जोड़ें।" error={enteredError('tollPerTrip', form.tollPerTrip)} /><Field id={fieldId('loading')} label="चढ़ाना + उतरवाना, कुल" value={form.loadingTotal} onChange={value => change('loadingTotal', value)} suffix="₹" error={enteredError('loadingTotal', form.loadingTotal)} /><Field id={fieldId('packing')} label="पैकिंग / बोरी, कुल" value={form.packingTotal} onChange={value => change('packingTotal', value)} suffix="₹" error={enteredError('packingTotal', form.packingTotal)} /><Field id={fieldId('other')} label="अन्य खर्च, कुल" value={form.otherTotal} onChange={value => change('otherTotal', value)} suffix="₹" hint="कर, बीमा, इंतज़ार, ब्याज आदि, यदि लागू हों।" error={enteredError('otherTotal', form.otherTotal)} /><Field id={fieldId('market-fee')} label="मंडी / कमीशन शुल्क" value={form.marketFeePercent} onChange={value => change('marketFeePercent', value)} suffix="%" hint="खरीद मूल्य पर; वास्तविक लागू शुल्क भरें।" max={100} error={enteredError('marketFeePercent', form.marketFeePercent)} /></div></div></details>
          <p className="sb-delivery-assumption"><Info size={14} aria-hidden="true" /> डिफ़ॉल्ट भाड़ा या लाइव ट्रांसपोर्ट कोट नहीं दिया गया है। हर वाहन का रेट अलग से पूछें।</p>
        </section>
      </div>

      <aside className="sb-delivery-results" aria-label="डिलीवरी के हिसाब का परिणाम">
        <div className="sb-delivery-result-card">
          <div className="sb-delivery-result-top"><span><Calculator size={17} aria-hidden="true" /> आपका हिसाब</span><span className="sb-delivery-estimate-tag">अनुमान</span></div>
          {result.valid ? <>
            <div className="sb-delivery-selected-vehicle"><VehicleIllustration vehicleId={selectedVehicle.id} priority /><div><span>आपकी चुनी गाड़ी</span><strong>{selectedVehicle.label}</strong><small>{DELIVERY_VEHICLE_VISUALS[selectedVehicle.id].referenceLabel}</small></div></div>
            <div className="sb-delivery-landed"><span>आपके यहाँ पहुँचने की लागत</span><strong>{money(result.landedPricePerKg, 2)}<small>/ kg</small></strong><p>{money(result.landedPricePerQuintal)} / क्विंटल · नुकसान जोड़कर</p></div>
            <div className={`sb-delivery-verdict${result.benefit < 0 ? ' is-negative' : result.benefit === 0 ? ' is-even' : ''}`}><span>{form.comparisonMode === 'local' ? (result.benefit >= 0 ? 'स्थानीय खरीद के मुकाबले अनुमानित बचत' : 'स्थानीय खरीद से अनुमानित अतिरिक्त खर्च') : (result.benefit >= 0 ? 'खर्च के बाद अनुमानित अंतर' : 'खर्च के बाद अनुमानित घाटा')}</span><strong>{money(Math.abs(result.benefit))}<ArrowRight size={22} aria-hidden="true" /></strong><p>{result.benefit > 0 ? 'भरे हुए भाव और खर्च पर यह हिसाब अनुकूल है।' : result.benefit < 0 ? 'इन भाव और खर्च पर यहाँ से माल लाना महँगा पड़ेगा।' : 'इन मानों पर दोनों की लागत बराबर है।'}</p></div>
            <div className="sb-delivery-result-metrics"><div><span>डिलीवरी + टोल</span><strong>{money(result.transportTotal)}</strong><small>{number(result.trips)} ट्रिप{result.billedKm === null ? ' · दूरी दर्ज नहीं' : ` · ${number(result.billedKm)} km / ट्रिप · ${number(result.totalBilledKm)} km कुल`}</small></div><div><span>बचा हुआ उपयोगी माल</span><strong>{number(result.usableKg, 2)} <small>kg</small></strong><small>{number(Number(form.lossPercent), 2)}% वज़न / खराबा घटाकर</small></div></div>
            <div className="sb-delivery-break-even"><div><Scale size={17} aria-hidden="true" /><span>{form.comparisonMode === 'local' ? 'स्थानीय भाव इतना हो तो लागत बराबर' : 'लागत निकलने का न्यूनतम बिक्री भाव'}</span></div><strong>{money(result.landedPricePerKg, 2)} <small>/ kg</small></strong></div>
            <div className="sb-delivery-distance-result"><Route size={19} aria-hidden="true" /><div><span>लागत बराबर होने की अधिकतम दूरी</span>{result.breakEvenDistanceStatus === 'finite' ? <><strong>लगभग {number(result.breakEvenDistanceKm)} km <small>एक तरफ</small></strong><p>यही रेट, ट्रिप और बाकी खर्च बने रहने पर।</p></> : result.breakEvenDistanceStatus === 'infeasible' ? <><strong>इन मानों पर कोई दूरी अनुकूल नहीं</strong><p>न्यूनतम भाड़ा या दूसरे खर्च उपलब्ध अंतर से ज़्यादा हैं।</p></> : result.breakEvenDistanceStatus === 'unbounded' ? <><strong>दूरी की सीमा नहीं निकाली जा सकती</strong><p>₹0/km पर दूरी बढ़ने से भाड़ा नहीं बढ़ रहा। रेट जाँचें।</p></> : <><strong>प्रति ट्रिप कोट में उपलब्ध नहीं</strong><p>दूरी की सीमा के लिए ₹/km रेट भरें।</p></>}</div></div>
            <details className="sb-delivery-breakdown" open><summary>पूरा खर्च देखें <ChevronDown size={16} aria-hidden="true" /></summary><dl><CostRow label="माल की खरीद" value={result.breakdown.purchase} /><CostRow label={`गाड़ी का भाड़ा · ${number(result.trips)} ट्रिप`} value={result.breakdown.freight} /><CostRow label="टोल / पार्किंग" value={result.breakdown.tolls} /><CostRow label="चढ़ाना + उतरवाना" value={result.breakdown.loading} /><CostRow label="पैकिंग / बोरी" value={result.breakdown.packing} /><CostRow label="मंडी / कमीशन" value={result.breakdown.marketFees} /><CostRow label="अन्य खर्च" value={result.breakdown.other} /><CostRow label="कुल लगने वाली रकम" value={result.totalLandCost} total /></dl></details>
            <label className="sb-delivery-stress-toggle"><input type="checkbox" checked={showStress} onChange={event => setShowStress(event.target.checked)} /><span>खर्च बढ़ जाए तो भी हिसाब देखें<small>भाड़ा +10% और नुकसान +2 प्रतिशत अंक</small></span></label>
            {showStress && <div className="sb-delivery-stress">{result.stress?.valid ? <><span>थोड़ी कठिन स्थिति में</span><strong>{money(result.stress.landedPricePerKg, 2)} / kg</strong><p>{form.comparisonMode === 'local' ? 'बचत / अतिरिक्त खर्च' : 'अनुमानित अंतर'}: <b className={result.stress.benefit < 0 ? 'is-loss' : ''}>{result.stress.benefit < 0 ? '−' : '+'}{money(Math.abs(result.stress.benefit))}</b></p><small>यह संवेदनशीलता का उदाहरण है, भविष्यवाणी नहीं।</small></> : <p>नुकसान 100% के पास है, इसलिए इस अतिरिक्त नुकसान का हिसाब उपलब्ध नहीं।</p>}</div>}
            <div className="sb-delivery-result-actions"><button type="button" onClick={saveScenario}><Save size={16} aria-hidden="true" /> सहेजें</button><button type="button" onClick={copySummary}><Copy size={16} aria-hidden="true" /> कॉपी</button><button type="button" onClick={downloadSummary}><Download size={16} aria-hidden="true" /> डाउनलोड</button></div>
          </> : <div className="sb-delivery-empty-result"><div className="sb-delivery-empty-art"><VehicleIllustration vehicleId={selectedVehicle.id} priority /><span><Package size={20} strokeWidth={1.5} aria-hidden="true" /></span></div><h3>सिर्फ सस्ता भाव<br />काफ़ी नहीं होता।</h3><p>माल, भाड़ा और नुकसान जोड़कर ही पता चलेगा कि सौदा आपके लिए सही है या नहीं।</p><div className="sb-delivery-needed"><span>{missingCostNames.length ? 'हिसाब के लिए अभी भरें' : 'इन मानों को जाँचें'}</span>{missingCostNames.length ? missingCostNames.map(label => <div key={label}><span /><strong>{label}</strong><ArrowDown size={14} aria-hidden="true" /></div>) : Object.entries(result.errors || {}).map(([field, error]) => <p className="sb-delivery-error" key={field}>{error}</p>)}</div><div className="sb-delivery-empty-summary"><span>{selectedVehicle.label}</span><strong>{planningTrips ? `${number(planningTrips)} ट्रिप` : 'मात्रा भरें'}</strong><span>{form.distanceKm === '' ? (form.freightMode === 'quote' ? 'दूरी वैकल्पिक' : 'दूरी भरें') : `${number(Number(form.distanceKm))} km एक तरफ`}</span></div></div>}
          <div className="sb-delivery-disclaimer"><ShieldCheck size={16} aria-hidden="true" /><p>यह आपके भरे हुए मानों का हिसाब है। गाड़ी की बुकिंग, मुनाफ़े की गारंटी या लाइव माल-भाड़ा ऑफर नहीं।</p></div>
        </div>
        <div className="sb-delivery-small-note"><Info size={15} aria-hidden="true" /><p><strong>भाव से पहले ये तीन बातें जाँचें</strong>किस्म व ग्रेड एक जैसे हैं? वज़न सही है? ड्राइवर के कोट में टोल, वापसी और मजदूरी शामिल हैं?</p></div>
      </aside>
    </div>

    <details className="sb-delivery-compare"><summary><div><span className="sb-delivery-compare-icon"><Truck size={22} aria-hidden="true" /></span><div><h3>दूसरी गाड़ी से कितना फ़र्क पड़ेगा?</h3><p>हर गाड़ी का अपना भाड़ा भरकर तुलना करें।</p></div></div><ChevronDown size={19} aria-hidden="true" /></summary><div className="sb-delivery-compare-body"><p>माल, दूरी और अन्य कुल खर्च ऊपर वाले रहेंगे। हर गाड़ी का भाड़ा और टोल अलग भरें; टोल शामिल हो तो 0 लिखें। नीचे क्षमता केवल योजना के लिए है; ज़रूरत हो तो मुख्य हिसाब में बदलें।</p><div className="sb-delivery-table-scroll"><table><thead><tr><th scope="col">गाड़ी / क्षमता</th><th scope="col">{form.freightMode === 'rate' ? 'रेट ₹/km' : '₹ / पूरी ट्रिप'}</th>{form.freightMode === 'rate' && <th scope="col">न्यूनतम / ट्रिप</th>}<th scope="col">टोल / ट्रिप</th><th scope="col">ट्रिप</th><th scope="col">पड़ने वाली लागत</th><th scope="col">चुनें</th></tr></thead><tbody>{comparisonRows.map(row => <tr key={row.id}><th scope="row"><strong>{row.label}</strong><span>{number(row.capacityKg)} kg</span></th><td><input aria-label={`${row.label} ${form.freightMode === 'rate' ? 'प्रति किलोमीटर रेट' : 'एक पूरी ट्रिप का भाड़ा'}`} type="number" min="0" placeholder="भाड़ा भरें" value={compareRates[row.id]?.[form.freightMode === 'rate' ? 'ratePerKm' : 'quotePerTrip'] ?? ''} onChange={event => setCompareRates(previous => ({ ...previous, [row.id]: { ...previous[row.id], [form.freightMode === 'rate' ? 'ratePerKm' : 'quotePerTrip']: event.target.value } }))} /></td>{form.freightMode === 'rate' && <td><input aria-label={`${row.label} का न्यूनतम भाड़ा`} type="number" min="0" value={compareRates[row.id]?.minFare ?? 0} onChange={event => setCompareRates(previous => ({ ...previous, [row.id]: { ...previous[row.id], minFare: event.target.value } }))} /></td>}<td><input aria-label={`${row.label} का टोल प्रति ट्रिप`} type="number" min="0" step="any" placeholder="टोल / 0" value={compareRates[row.id]?.tollPerTrip ?? ''} onChange={event => setCompareRates(previous => ({ ...previous, [row.id]: { ...previous[row.id], tollPerTrip: event.target.value } }))} /></td><td>{canPlan ? number(getDeliveryTrips(loadedKg, row.capacityKg)) : '—'}</td><td><strong>{row.scenario.valid ? `${money(row.scenario.landedPricePerKg, 2)} / kg` : '—'}</strong>{!row.scenario.valid && <small>{Object.values(row.scenario.errors || {})[0]}</small>}{row.rank === 1 && comparisonRows.filter(item => item.scenario.valid).length > 1 && <small>भरे हुए कोट में सबसे कम</small>}</td><td><button type="button" aria-label={`${row.label} को मुख्य हिसाब में चुनें`} disabled={!row.scenario.valid} onClick={() => { setForm(previous => ({ ...previous, vehicleId: row.id, capacityKg: row.capacityKg, ...compareRates[row.id], minFare: compareRates[row.id]?.minFare ?? 0 })); setNotice(`${row.label} का भाड़ा मुख्य हिसाब में लगा दिया है।`); }}>चुनें <ArrowRight size={14} aria-hidden="true" /></button></td></tr>)}</tbody></table></div><small>सबसे कम दिखाई गई लागत केवल भरे हुए मानों में तुलना है। उपलब्धता, वाहन की स्थिति और लोड की उपयुक्तता अलग से जाँचें।</small></div></details>

    {saved.length > 0 && <section className="sb-delivery-saved"><div className="sb-delivery-saved-heading"><h3><Save size={18} aria-hidden="true" /> आपके सहेजे हिसाब</h3><span>इसी ब्राउज़र में · अधिकतम 5</span></div><div>{saved.map(item => <article key={item.id}><button type="button" onClick={() => loadSavedScenario(item)}><strong>{item.title}</strong><span>{new Date(item.created).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })} · {number(Number(item.form?.distanceKm))} km <ArrowRight size={14} aria-hidden="true" /></span></button><button type="button" className="sb-delivery-delete" onClick={() => removeSaved(item.id)} aria-label={`${item.title} का सहेजा हिसाब हटाएँ`}><Trash2 size={16} aria-hidden="true" /></button></article>)}</div></section>}
    <DeliveryResources form={{ ...form, cropName: displayCropName }} selectedVehicle={selectedVehicle} onApplyLoadPlan={applyLoadPlan} onNotice={setNotice} />
    <p className="sb-delivery-privacy"><ShieldCheck size={14} aria-hidden="true" /> आपका ड्राफ़्ट इसी ब्राउज़र में रहता है। किसी ड्राइवर या व्यापारी को भेजा नहीं जाता।</p>
    <p className="sb-delivery-notice" role="status" aria-live="polite">{notice}</p>
  </section>;
}
