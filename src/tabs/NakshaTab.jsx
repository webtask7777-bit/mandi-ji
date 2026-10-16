import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Compass, Copy, Info, Layers3, MapPin, RotateCcw, Search, Sprout, Store, Truck, X } from 'lucide-react';
import { useStateContext } from '../context/StateContext';
import { useApi } from '../hooks/useApi';
import LeafletMap from '../components/LeafletMap/LeafletMap';
import CropImage from '../components/CropImage';
import { districtCropMatch } from '../components/LeafletMap/mapStyles';
import { districtSearchText, findDistrictRecord, getMandiDistrictName, placeKey } from '../utils/mapData';
import { cropDetailPath } from '../utils/cropUrls';
import { getDataFreshness, getLatestQuoteDate } from '../utils/dataFreshness';
import { getMapMandiKey, resolveMapSelection, updateMapSearch } from '../utils/mapSelection';
import '@/styles/atlas.css';

const number = value => value != null && Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-IN') : '—';
const label = item => item?.nameHi || item?.name || 'नाम उपलब्ध नहीं';
function periodLabel(stats) {
  if (Array.isArray(stats?.dateRange)) {
    const latest = getLatestQuoteDate(stats.dateRange.map(date => ({ date })));
    return latest ? `${getDataFreshness(latest).dateLabel} तक के उपलब्ध रिकॉर्ड` : 'रिकॉर्ड की अवधि उपलब्ध नहीं';
  }
  const range = stats?.dateRange;
  const month = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')
    ? new Date(`${value}-01T12:00:00Z`).toLocaleDateString('hi-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;
  if (month(range?.from) && month(range?.to)) return `${month(range.from)} – ${month(range.to)} · स्रोत में महीने दिए हैं`;
  const date = getDataFreshness(range?.to);
  return date.date ? `${date.dateLabel} तक के उपलब्ध रिकॉर्ड` : 'इस क्षेत्र के रिकॉर्ड की तारीख उपलब्ध नहीं';
}

export default function NakshaTab({ districts = [], mandis = [], states = [], crops = [], cropDataReady = true, loading = false, error = null, onDeliveryCalculate }) {
  const { selectedState, selectStateDirect, stateNameHi, stateParam } = useStateContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [legacyDistrict, setLegacyDistrict] = useState(null);
  const [shareNotice, setShareNotice] = useState('');
  const [mapResetKey, setMapResetKey] = useState(0);
  const [limit, setLimit] = useState(40);
  const { data: stats, loading: statsLoading } = useApi(`/stats?state=${encodeURIComponent(stateParam)}`);
  const { crop, district, mandi: selectedMandi } = resolveMapSelection(searchParams, { districts, mandis, crops });
  const selectedCrop = crop?.id || '';
  const selectedDistrict = district?.name || legacyDistrict;
  const view = selectedDistrict || searchParams.get('mapList') === 'mandis' ? 'mandis' : 'districts';
  const mobileView = searchParams.get('mapView') === 'list' || (!searchParams.has('mapView') && selectedDistrict) ? 'list' : 'map';
  const updateSelection = changes => {
    setShareNotice('');
    setSearchParams(previous => updateMapSearch(previous, changes), { replace: true, preventScrollReset: true });
  };
  const cropOptions = crops.filter(item => item.totalRecords > 0).sort((a, b) => label(a).localeCompare(label(b), 'hi'));
  const cropLabels = cropOptions.reduce((counts, item) => { counts[label(item)] = (counts[label(item)] || 0) + 1; return counts; }, {});
  const search = query.trim().normalize('NFKC').toLowerCase();
  const districtMandis = selectedDistrict ? mandis.filter(mandi => {
    const match = findDistrictRecord(getMandiDistrictName(mandi), districts);
    return match ? placeKey(match.name) === placeKey(selectedDistrict) : placeKey(getMandiDistrictName(mandi)) === placeKey(selectedDistrict);
  }) : mandis;
  const stateRows = states.filter(item => `${item.name || ''} ${item.nameHi || ''} ${item.id || ''}`.toLowerCase().includes(search))
    .sort((a, b) => Number(b.totalRecords > 0) - Number(a.totalRecords > 0) || label(a).localeCompare(label(b), 'hi'));
  const districtRows = districts.filter(item => districtSearchText(item).includes(search)).sort((a, b) => label(a).localeCompare(label(b), 'hi'));
  const mandiRows = districtMandis.filter(item => `${item.name || ''} ${item.nameHi || ''} ${item.originalName || ''} ${getMandiDistrictName(item)} ${typeof item.district === 'object' ? item.district?.nameHi || '' : ''}`.toLowerCase().includes(search))
    .sort((a, b) => label(a).localeCompare(label(b), 'hi'));
  const rows = !selectedState ? stateRows : view === 'districts' ? districtRows : mandiRows;
  const scope = selectedState ? states.find(item => item.id === selectedState) : null;
  const summaries = selectedState
    ? [{ label: 'दर्ज ज़िले', value: loading || error ? null : districts.length, icon: <MapPin size={19} aria-hidden="true" /> }, { label: 'दर्ज मंडियाँ', value: loading || error ? null : mandis.length, icon: <Store size={19} aria-hidden="true" /> }, { label: 'दर्ज फसलें', value: cropDataReady ? cropOptions.length : null, icon: <Sprout size={19} aria-hidden="true" /> }]
    : [{ label: 'डेटा वाले राज्य / UT', value: states.length ? states.filter(item => item.totalRecords > 0).length : null, icon: <MapPin size={19} aria-hidden="true" /> }, { label: 'दर्ज मंडियाँ', value: stats?.totalMandis, icon: <Store size={19} aria-hidden="true" /> }, { label: 'दर्ज फसलें', value: stats?.totalCrops, icon: <Sprout size={19} aria-hidden="true" /> }];

  function chooseDistrict(name) {
    const found = findDistrictRecord(name, districts);
    setLegacyDistrict(found ? null : name);
    updateSelection({ mapDistrict: found?.name || null, mapMandi: null, mapList: 'mandis', mapView: 'list' });
    setQuery(''); setLimit(40);
  }
  function showDistricts() { setLegacyDistrict(null); updateSelection({ mapDistrict: null, mapMandi: null, mapList: null }); setQuery(''); setLimit(40); }
  function chooseMandi(mandi) {
    const found = findDistrictRecord(getMandiDistrictName(mandi), districts);
    setLegacyDistrict(null);
    updateSelection({ mapDistrict: found?.name || null, mapMandi: getMapMandiKey(mandi), mapList: 'mandis' });
  }
  function planDelivery(routeDirection) {
    const destination = selectedMandi ? `${label(selectedMandi)}${getMandiDistrictName(selectedMandi) ? ` · ${getMandiDistrictName(selectedMandi)}` : ''}` : label(district);
    onDeliveryCalculate?.({ priceBasis: 'location-only', routeDirection, ...(routeDirection === 'from' ? { buyMandi: destination } : { sellMandi: destination }), cropId: crop?.id || '', cropName: crop ? label(crop) : '' });
  }
  async function copyMapLink() {
    try { await navigator.clipboard.writeText(window.location.href); setShareNotice('नक्शे का लिंक कॉपी हो गया।'); }
    catch { setShareNotice('ब्राउज़र के पते से नक्शे का लिंक कॉपी करें।'); }
  }
  function cropTags(items = []) {
    return items.slice(0, 4).map((item, index) => {
      const id = typeof item === 'string' ? item : item.id || item.cropId;
      const known = id ? crops.find(value => value.id === id) : null;
      const text = known ? label(known) : typeof item === 'string' ? item : label(item);
      return known ? <Link key={`${id}-${index}`} to={cropDetailPath(id, stateParam)}>{text}<ArrowRight size={11} aria-hidden="true" /></Link> : <span key={`${text}-${index}`}>{text}</span>;
    });
  }

  return <div className="sb-atlas">
    <header className="sb-atlas-intro"><div><span className="sb-atlas-eyebrow"><Compass size={15} aria-hidden="true" /> राज्य से मंडी तक</span><h2>मंडी चुनें। खर्च समझें।</h2><p>अपने क्षेत्र की मंडियाँ खोजें, फसल के रिकॉर्ड देखें और भेजने से पहले ढुलाई का हिसाब जोड़ें।</p></div><Link className="sb-atlas-delivery-link" to="/delivery-calculator"><Truck size={20} aria-hidden="true" /><span>कितना पड़ेगा पहुँचाने में?<strong>डिलीवरी खर्च देखें <ArrowRight size={15} aria-hidden="true" /></strong></span></Link></header>
    <div className="sb-atlas-summary">{summaries.map(({ label: title, value, icon }) => <div key={title}><span className="sb-atlas-stat-icon">{icon}</span><div><strong>{number(value)}</strong><span>{title}</span></div></div>)}</div>
    <div className="sb-atlas-toolbar"><nav aria-label="नक्शे का क्षेत्र"><button type="button" onClick={() => selectStateDirect(null)} disabled={!selectedState}>भारत</button>{selectedState && <><ChevronRight size={14} aria-hidden="true" /><button type="button" onClick={showDistricts}>{stateNameHi}</button></>}{selectedDistrict && <><ChevronRight size={14} aria-hidden="true" /><span>{district ? label(district) : selectedDistrict}</span></>}</nav><button type="button" className="sb-atlas-reset" onClick={() => { setMapResetKey(key => key + 1); }}><RotateCcw size={14} aria-hidden="true" />नक्शा रीसेट</button></div>
    <div className="sb-atlas-filterbar"><label className="sb-atlas-crop-filter"><Sprout size={18} aria-hidden="true" /><span>फसल चुनें<select aria-label="नक्शे पर फसल चुनें" value={selectedCrop} onChange={event => updateSelection({ mapCrop: event.target.value })} disabled={!cropOptions.length}><option value="">सभी फसलें</option>{cropOptions.map(item => <option key={item.id} value={item.id}>{cropLabels[label(item)] > 1 ? `${label(item)} · ${item.name !== label(item) ? item.name : item.id}` : label(item)}</option>)}</select></span></label><p>फसल चुनने पर जहाँ रिकॉर्ड मिला है, उसकी पुष्टि देखें।</p><button type="button" className="sb-atlas-copy" onClick={copyMapLink}><Copy size={15} aria-hidden="true" />नक्शे का लिंक</button></div>
    {shareNotice && <p className="sb-atlas-share-notice" role="status">{shareNotice}</p>}
    <div className="sb-atlas-mobile-switch" role="group" aria-label="नक्शा या सूची"><button type="button" aria-pressed={mobileView === 'map'} onClick={() => updateSelection({ mapView: 'map' })}><MapPin size={16} />नक्शा</button><button type="button" aria-pressed={mobileView === 'list'} onClick={() => updateSelection({ mapView: 'list' })}><Search size={16} />सूची से खोजें</button></div>
    <div className="sb-atlas-workspace" data-mobile-view={mobileView}>
      <aside className="sb-atlas-explorer" aria-label="क्षेत्र और मंडी सूची">
        <div className="sb-atlas-explorer-top"><span className="sb-atlas-step">01</span><div><h3>{selectedState ? selectedDistrict ? `${district ? label(district) : selectedDistrict} की मंडियाँ` : `${stateNameHi} में खोजें` : 'अपना राज्य चुनें'}</h3><p>{selectedState ? 'सूची और नक्शा एक साथ काम करते हैं' : 'नक्शे पर टैप करें या सूची से चुनें'}</p></div></div>
        <label className="sb-atlas-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{!selectedState ? 'राज्य खोजें' : view === 'districts' ? 'ज़िला खोजें' : 'मंडी खोजें'}</span><input value={query} onChange={event => { setQuery(event.target.value); setLimit(40); }} placeholder={!selectedState ? 'राज्य / State खोजें' : view === 'districts' ? 'ज़िला / District खोजें' : 'मंडी / Mandi खोजें'} />{query && <button type="button" onClick={() => setQuery('')} aria-label="खोज साफ करें"><X size={15} /></button>}</label>
        {!selectedState && !query && <div className="sb-atlas-quick"><span>जल्दी खोलें</span>{['chhattisgarh', 'madhya-pradesh', 'maharashtra'].map(id => <button key={id} type="button" onClick={() => selectStateDirect(id)}>{label(states.find(item => item.id === id) || { name: id === 'chhattisgarh' ? 'छत्तीसगढ़' : id === 'madhya-pradesh' ? 'मध्य प्रदेश' : 'महाराष्ट्र' })}</button>)}</div>}
        {selectedState && <div className="sb-atlas-tabs" role="group" aria-label="सूची का प्रकार"><button type="button" aria-pressed={view === 'districts'} onClick={showDistricts}>ज़िले <span>{districts.length}</span></button><button type="button" aria-pressed={view === 'mandis'} onClick={() => { updateSelection({ mapList: 'mandis' }); setQuery(''); setLimit(40); }}>मंडियाँ <span>{districtMandis.length}</span></button></div>}
        {selectedDistrict && <button type="button" className="sb-atlas-back" onClick={showDistricts}><ArrowLeft size={13} aria-hidden="true" />सभी ज़िले देखें</button>}
        <div className="sb-atlas-results" aria-live="polite">{loading ? 'जानकारी खुल रही है…' : `${rows.length} ${!selectedState ? 'राज्य / UT' : view === 'districts' ? 'ज़िले' : 'मंडियाँ'}${query ? ' मिले' : ' उपलब्ध'}`}{selectedCrop && selectedState && view === 'districts' && <span>फसल की पुष्टि जहाँ उपलब्ध है</span>}</div>
        <div className="sb-atlas-list">
          {loading ? <div className="sb-atlas-list-status" role="status"><Layers3 size={25} /><p>इस क्षेत्र की जानकारी खुल रही है…</p></div> : error ? <div className="sb-atlas-list-status" role="alert"><Info size={24} /><p>क्षेत्र की जानकारी नहीं खुली।</p><button type="button" onClick={() => window.location.reload()}>दोबारा कोशिश करें</button></div> : rows.length === 0 ? <div className="sb-atlas-list-status"><Search size={24} /><strong>{query ? 'इस नाम का परिणाम नहीं मिला' : 'यहाँ की सूची उपलब्ध नहीं'}</strong><p>{query ? 'हिन्दी या English में दूसरा नाम खोजें।' : 'दूसरा ज़िला या राज्य चुनकर उपलब्ध रिकॉर्ड देखें।'}</p>{query && <button type="button" onClick={() => setQuery('')}>खोज साफ करें</button>}</div> : rows.slice(0, limit).map((item, index) => {
            const isMandi = selectedState && view === 'mandis';
            const matched = selectedCrop && selectedState && !isMandi && districtCropMatch(item, selectedCrop) === 'matched';
            const active = isMandi && selectedMandi === item;
            return <button type="button" className="sb-atlas-row" key={`${item.id || item.name}-${index}`} aria-pressed={!!active} onClick={() => !selectedState ? selectStateDirect(item.id) : isMandi ? chooseMandi(item) : chooseDistrict(item.name)}><span className={`sb-atlas-row-icon${matched ? ' is-match' : ''}`}>{isMandi ? <Store size={18} /> : matched ? <Check size={18} /> : <MapPin size={18} />}</span><span className="sb-atlas-row-copy"><strong>{label(item)}</strong><small>{!selectedState ? item.totalRecords > 0 ? `${number(item.totalMandis)} मंडियाँ · ${number(item.totalCrops)} फसलें` : 'इस स्रोत में रिकॉर्ड नहीं मिले' : isMandi ? getMandiDistrictName(item) || 'ज़िला उपलब्ध नहीं' : `${number(item.mandiCount ?? mandis.filter(m => placeKey(getMandiDistrictName(m)) === placeKey(item.name)).length)} मंडियाँ · ${number(item.totalRecords)} रिकॉर्ड`}</small>{matched && <em>{label(crop)} · प्रमुख सूची में दर्ज</em>}</span><ChevronRight size={16} aria-hidden="true" /></button>;
          })}
          {!loading && !error && rows.length > limit && <button type="button" className="sb-atlas-more" onClick={() => setLimit(value => value + 40)}>अगले {Math.min(40, rows.length - limit)} परिणाम देखें <ArrowRight size={14} /></button>}
        </div>
        {selectedMandi && onDeliveryCalculate && <div className="sb-atlas-inline-action"><strong><Store size={15} />{label(selectedMandi)}</strong><div className="sb-atlas-route-actions"><button type="button" onClick={() => planDelivery('from')}><Truck size={15} />यहाँ से मँगाएँ</button><button type="button" className="is-secondary" onClick={() => planDelivery('to')}><ArrowRight size={15} />यहाँ पहुँचाएँ</button></div></div>}
        <div className="sb-atlas-list-foot"><Info size={14} aria-hidden="true" /><span>सीमा न दिखे, तब भी सूची से ज़िला खोल सकते हैं।</span></div>
      </aside>
      <section className="sb-atlas-map-panel" aria-label="मंडी रिकॉर्ड का भौगोलिक दृश्य">
        <div className="sb-atlas-map-top"><div><span className="sb-atlas-step">02</span><strong>{selectedDistrict ? district ? label(district) : selectedDistrict : stateNameHi}</strong><span className="sb-atlas-map-level">{selectedDistrict ? 'ज़िले का क्षेत्र' : selectedState ? 'ज़िलों का नक्शा' : 'राज्यों का नक्शा'}</span></div></div>
        <LeafletMap stateData={states} districts={districts} mandis={mandis} crops={crops} selectedCrop={selectedCrop || null} selectedDistrict={selectedDistrict} onDistrictSelect={chooseDistrict} onStateSelect={selectStateDirect} mapResetKey={mapResetKey} />
        <div className="sb-atlas-legend"><span><i className="sb-atlas-legend-scale" />कम से अधिक रिकॉर्ड</span><span><i className="sb-atlas-legend-empty" />जानकारी नहीं मिली</span>{selectedCrop && <span><i className="sb-atlas-legend-outline" />फसल की पुष्टि नहीं</span>}</div>
      </section>
    </div>
    <div className="sb-atlas-below">
      <section className="sb-atlas-selection" aria-live="polite"><span className="sb-atlas-eyebrow"><MapPin size={14} aria-hidden="true" />{selectedMandi ? 'चुनी हुई मंडी' : selectedDistrict ? 'चुना हुआ ज़िला' : 'अगला कदम'}</span><h3>{selectedMandi ? label(selectedMandi) : district ? label(district) : selectedState ? 'ज़िला चुनकर मंडियाँ देखें' : 'अपने राज्य से शुरुआत करें'}</h3><p>{selectedMandi ? `${getMandiDistrictName(selectedMandi)} · ${stateNameHi}। नक्शे पर ज़िले का क्षेत्र है; मंडी का सटीक पता इस स्रोत में उपलब्ध नहीं है।` : district ? `${number(districtMandis.length)} मंडियाँ और ${number(district.totalRecords)} उपलब्ध रिकॉर्ड। सूची से मंडी चुनें, फिर ढुलाई का खर्च जोड़ें।` : selectedDistrict ? 'इस पुराने भौगोलिक नाम से मंडी रिकॉर्ड नहीं मिले। सभी ज़िले खोलकर उपलब्ध सूची से चुनें।' : 'नक्शे और सूची से उपलब्ध मंडियों तक पहुँचें। चुनी फसल का राज्य स्तर पर दर्ज भाव और उसकी तारीख अलग पृष्ठ पर देखें।'}</p>
        {(selectedMandi?.topCrops?.length > 0 || district?.topCrops?.length > 0) && <div className="sb-atlas-crop-tags" aria-label="प्रमुख दर्ज फसलें">{cropTags(selectedMandi?.topCrops || district?.topCrops)}</div>}
        <div className="sb-atlas-actions">{selectedMandi && onDeliveryCalculate && <><button type="button" onClick={() => planDelivery('from')}><Truck size={17} aria-hidden="true" />यहाँ से मँगाने का खर्च</button><button type="button" className="is-secondary" onClick={() => planDelivery('to')}><ArrowRight size={16} aria-hidden="true" />यहाँ पहुँचाने का खर्च</button></>}{crop && <Link to={cropDetailPath(crop.id, stateParam)}><CropImage id={crop.id} name={label(crop)} size="xs" />{label(crop)} · राज्य के दर्ज भाव <ArrowRight size={14} /></Link>}</div>
      </section>
      <aside className="sb-atlas-data-note"><span className="sb-atlas-eyebrow"><Info size={14} aria-hidden="true" />डेटा को समझें</span><strong>{statsLoading ? 'रिकॉर्ड की अवधि जाँच रहे हैं…' : periodLabel(stats)}</strong><p>रंग सभी फसलों के रिकॉर्ड की संख्या बताते हैं। ये भाव, बिक्री की मात्रा या मंडी की रैंकिंग नहीं हैं।</p><details><summary>फसल और नक्शे की सीमा</summary><p>फसल चुनने पर ठोस सीमा केवल उपलब्ध रिकॉर्ड में उसकी पुष्टि बताती है। टूटी सीमा का अर्थ फसल न होना नहीं है। ज़िले की प्रमुख फसल सूची पूरी सूची नहीं है। भौगोलिक सीमाएँ पुराने स्रोत से हैं; नए या बदले ज़िले सूची में मिल सकते हैं।</p></details><span className="sb-atlas-source">{selectedState === 'chhattisgarh' ? 'छत्तीसगढ़ कृषि विपणन के संकलित रिकॉर्ड' : 'data.gov.in के संकलित मंडी रिकॉर्ड'}{scope?.totalRecords != null ? ` · ${number(scope.totalRecords)} कुल रिकॉर्ड` : ''}</span></aside>
    </div>
  </div>;
}
