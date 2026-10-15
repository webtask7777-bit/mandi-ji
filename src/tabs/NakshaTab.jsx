import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Info } from 'lucide-react';
import { useStateContext } from '../context/StateContext';
import LeafletMap from '../components/LeafletMap/LeafletMap';
import CropFilter from '../components/LeafletMap/CropFilter';
import StateExplorer from '../components/StateExplorer';
import '@/styles/secondary.css';

export default function NakshaTab({ districts, mandis, states, crops = [] }) {
  const { selectedState, selectStateDirect, stateNameHi } = useStateContext();
  const [selectedCrop, setSelectedCrop] = useState(null);
  useEffect(() => { if (selectedCrop && !crops.some(crop => crop.id === selectedCrop)) setSelectedCrop(null); }, [crops, selectedCrop]);
  const selectedCropName = crops.find(crop => crop.id === selectedCrop)?.nameHi || crops.find(crop => crop.id === selectedCrop)?.name;
  const districtCount = Array.isArray(districts) ? districts.length : null;
  const mandiCount = Array.isArray(mandis) ? mandis.length : null;
  const records = Array.isArray(districts) ? districts.reduce((sum, district) => sum + (Number(district.totalRecords) || 0), 0) : null;
  const number = value => value == null ? '—' : value.toLocaleString('en-IN');

  return <div className="sb-secondary-tab sb-map-tab flex flex-col">
    <div className="sb-secondary-heading"><div><span className="sb-secondary-eyebrow">अपने क्षेत्र को जानें</span><h2>{selectedState ? `${stateNameHi} की मंडियाँ` : 'मंडी डेटा का नक्शा'}</h2><p>राज्य चुनें, फिर ज़िले के उपलब्ध रिकॉर्ड और मंडियाँ देखें।</p></div>{selectedState && <button type="button" className="sb-secondary-outline" onClick={() => selectStateDirect(null)}><ArrowLeft size={17} />पूरा भारत</button>}</div>
    <div className="sb-map-location"><MapPin size={18} /><strong>{stateNameHi}</strong><span>{selectedCropName || 'सभी फसलें'}</span></div>
    {crops.length > 0 && <CropFilter crops={crops} selectedCrop={selectedCrop} onCropSelect={setSelectedCrop} />}
    <section className="sb-map-shell" aria-label="मंडी रिकॉर्ड का भौगोलिक दृश्य"><LeafletMap stateData={states} districts={districts} mandis={mandis} selectedCrop={selectedCrop} /><div className="sb-map-legend flex-wrap"><span>कम रिकॉर्ड</span><span className="sb-map-color-scale" aria-hidden="true" /><span>अधिक रिकॉर्ड</span>{selectedCrop && <span>टूटी सीमा: फसल की पुष्टि नहीं</span>}</div></section>
    <div className="sb-context-note"><Info size={17} /><p>{selectedState ? 'ज़िले पर टैप करके उसकी मंडियाँ देखें। ' : 'किसी राज्य पर टैप करके उसका डेटा खोलें। '}रंग सभी फसलों के उपलब्ध रिकॉर्ड की संख्या बताते हैं, भाव या बिक्री की मात्रा नहीं।{selectedCrop && (selectedState ? ' गहरी ठोस सीमा: ज़िले की प्रमुख फसल सूची में चुनी फसल का सटीक मिलान। टूटी सीमा: पुष्टि उपलब्ध नहीं; इस सूची में हर फसल नहीं होती, इसलिए इसका अर्थ फसल न होना नहीं है। नीचे के कुल आँकड़े सभी फसलों के हैं।' : ' गहरी ठोस सीमा: राज्य की सूची में चुनी फसल के रिकॉर्ड मिले। टूटी सीमा: इस स्रोत से पुष्टि उपलब्ध नहीं, फसल न होने का दावा नहीं।')}</p></div>
    {selectedState && districtCount > 0 && <><div className="sb-map-summary">{[{ label: 'दर्ज ज़िले', value: districtCount }, { label: 'दर्ज मंडियाँ', value: mandiCount }, { label: 'कुल उपलब्ध रिकॉर्ड', value: records }].map(item => <article key={item.label}><span>{item.label}</span><strong>{number(item.value)}</strong></article>)}</div><StateExplorer districts={districts} mandis={mandis} /></>}
    {selectedState && !districtCount && <div className="sb-secondary-empty"><MapPin size={28} /><h3>इस क्षेत्र का विवरण उपलब्ध नहीं</h3><p>{stateNameHi} के ज़िले और मंडी रिकॉर्ड अभी नहीं दिखाए जा सकते। दूसरे राज्य का उपलब्ध डेटा देखें।</p><button type="button" className="sb-secondary-outline" onClick={() => selectStateDirect(null)}>सभी राज्यों पर वापस जाएँ</button></div>}
  </div>;
}
