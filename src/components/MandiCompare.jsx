import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ChevronDown, ChevronUp, Search, SlidersHorizontal, Info } from 'lucide-react';
import { useStateContext } from '../context/StateContext';
import { getOutlierBounds, isOutlier } from '../lib/outlier';
import { getDataFreshness } from '../utils/dataFreshness';
import { calculateSaleScenario, getComparisonPair, getMandiPrice, getMandiPriceBasis, getMandiQuoteDate, sortMandiPrices } from '../utils/marketComparison';
import '../styles/comparison.css';

const STATE_CODE_TO_ID = {
  AP: 'andhra-pradesh', AR: 'arunachal-pradesh', AS: 'assam', BR: 'bihar', CG: 'chhattisgarh', GA: 'goa', GJ: 'gujarat', HR: 'haryana', HP: 'himachal-pradesh', JK: 'jammu-kashmir', JH: 'jharkhand', KA: 'karnataka', KL: 'kerala', MP: 'madhya-pradesh', MH: 'maharashtra', MN: 'manipur', ML: 'meghalaya', MZ: 'mizoram', NL: 'nagaland', OD: 'odisha', OR: 'odisha', PB: 'punjab', RJ: 'rajasthan', SK: 'sikkim', TN: 'tamil-nadu', TS: 'telangana', TR: 'tripura', UP: 'uttar-pradesh', UK: 'uttarakhand', WB: 'west-bengal', DL: 'delhi', PY: 'puducherry', CH: 'chandigarh', AN: 'andaman-nicobar', LA: 'ladakh',
};
const money = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function SaleScenario({ pair }) {
  const [values, setValues] = useState({ quantity: '10', buyPrice: String(getMandiPrice(pair.low)), sellPrice: String(getMandiPrice(pair.high)), totalCosts: '', lossPercent: '' });
  const result = calculateSaleScenario(values);
  const fields = [
    ['quantity', 'मात्रा (क्विंटल)', '10', 0.01],
    ['buyPrice', 'खरीद भाव (₹ / क्विंटल)', '', 0.01],
    ['sellPrice', 'बिक्री भाव (₹ / क्विंटल)', '', 0.01],
    ['totalCosts', 'सभी खर्च मिलाकर (₹)', 'ढुलाई, शुल्क, मज़दूरी…', 0],
    ['lossPercent', 'वजन की कमी (%)', 'शून्य हो तो 0 लिखें', 0],
  ];
  return <details className="sb-sale-scenario">
    <summary><Calculator size={18} aria-hidden="true" /><span>अपने खर्च के साथ हिसाब लगाएँ</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="sb-sale-body"><p>नीचे संदर्भ भाव भरे हैं। पक्का हिसाब लगाने से पहले खरीद और बिक्री का तय भाव भरें।</p>
      <div className="sb-sale-inputs">{fields.map(([key, label, placeholder, min]) => <label key={key}><span>{label}</span><input type="number" inputMode="decimal" min={min} max={key === 'lossPercent' ? 100 : undefined} step="any" value={values[key]} placeholder={placeholder} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}</div>
      <div className="sb-sale-result" aria-live="polite">{result ? <><span>भरे हुए भाव और खर्च पर अनुमान</span><strong className={result.result < 0 ? 'sb-negative' : ''}>{result.result < 0 ? '−' : ''}₹{money(Math.abs(result.result))}</strong><small>{result.result < 0 ? 'अनुमानित घाटा' : 'अनुमानित बचत'} · कुल लगत ₹{money(result.investment)} · बिक्री योग्य मात्रा {result.saleQuantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} क्विंटल</small></> : <p>खर्च और वजन की कमी सहित सभी मान भरें। खाली खर्च को शून्य नहीं माना जाता।</p>}</div>
    </div>
  </details>;
}

export default function MandiCompare({ data = [], cropName, onMandiClick, cropId }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [variety, setVariety] = useState('all');
  const [sort, setSort] = useState('high');
  const { selectStateDirect } = useStateContext();
  const validData = useMemo(() => sortMandiPrices(data || []), [data]);
  const varieties = useMemo(() => [...new Set(validData.map(row => row.topVariety).filter(Boolean))].sort(), [validData]);
  // Crop switches may retain this component. An old variety must not hide a new crop.
  const activeVariety = varieties.includes(variety) ? variety : 'all';
  const filtered = useMemo(() => validData.filter(row => (activeVariety === 'all' || row.topVariety === activeVariety) && `${row.name} ${row.district || ''} ${row.stateCode || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'low' ? getMandiPrice(a) - getMandiPrice(b) : getMandiPrice(b) - getMandiPrice(a)), [validData, activeVariety, search, sort]);
  const pair = useMemo(() => getComparisonPair(filtered), [filtered]);
  const bounds = useMemo(() => getOutlierBounds(filtered.map(getMandiPrice)), [filtered]);
  if (!validData.length) return null;
  const max = Math.max(...filtered.map(getMandiPrice));
  const min = Math.min(...filtered.map(getMandiPrice));
  const average = filtered.length ? filtered.reduce((sum, row) => sum + getMandiPrice(row), 0) / filtered.length : 0;
  const visible = showAll ? filtered : filtered.slice(0, 8);

  return <section className="sb-mandi-comparison" aria-label={`${cropName || 'फसल'} की मंडी तुलना`}>
    <div className="sb-comparison-heading"><div><span className="sb-comparison-eyebrow">बाज़ार को समझें</span><h2>{cropName} की मंडी तुलना</h2></div><span className="sb-comparison-count">{validData.length.toLocaleString('en-IN')} मंडी रिकॉर्ड</span></div>
    <p className="sb-comparison-intro">भाव ₹ / क्विंटल में। किस्म, ग्रेड और रिकॉर्ड की तारीख देखकर तुलना करें।</p>
    <div className="sb-comparison-toolbar"><label className="sb-comparison-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={event => { setSearch(event.target.value); setShowAll(false); }} placeholder="मंडी या ज़िला खोजें" aria-label="मंडी या ज़िला खोजें" /></label><label className="sb-comparison-select"><SlidersHorizontal size={15} aria-hidden="true" /><select aria-label="किस्म फ़िल्टर" value={activeVariety} onChange={event => { setVariety(event.target.value); setShowAll(false); }}><option value="all">सभी किस्में</option>{varieties.map(item => <option key={item} value={item}>{item}</option>)}</select></label><select aria-label="भाव क्रम" value={sort} onChange={event => setSort(event.target.value)}><option value="high">अधिक भाव पहले</option><option value="low">कम भाव पहले</option></select></div>
    {!!filtered.length && <div className="sb-comparison-summary"><div><span>अधिकतम दर्ज औसत</span><strong>₹{money(max)}</strong></div><div><span>मंडियों का साधारण औसत</span><strong>₹{money(average)}</strong></div><div><span>न्यूनतम दर्ज औसत</span><strong>₹{money(min)}</strong></div></div>}
    <div className="sb-comparison-table-wrap"><table className="sb-comparison-table"><thead><tr><th scope="col">मंडी / किस्म</th><th scope="col">दर्ज भाव</th><th scope="col">रिकॉर्ड का आधार</th></tr></thead><tbody>{visible.map((row, index) => {
      const freshness = getDataFreshness(getMandiQuoteDate(row));
      return <tr key={`${row.stateCode}-${row.district}-${row.name}-${index}`}><td><div className="sb-mandi-name">{onMandiClick ? <button type="button" onClick={() => onMandiClick(row.name)}>{row.name}</button> : <strong>{row.name}</strong>}{row.stateCode && <button type="button" className="sb-state-link" disabled={!STATE_CODE_TO_ID[row.stateCode]} onClick={() => selectStateDirect(STATE_CODE_TO_ID[row.stateCode])}>{row.stateCode}</button>}</div><span>{[row.district, row.topVariety, row.grade].filter(Boolean).join(' · ')}</span></td><td><strong className="sb-mandi-price">₹{money(getMandiPrice(row))}</strong>{isOutlier(getMandiPrice(row), bounds) && <small className="sb-outlier">असामान्य रिकॉर्ड</small>}</td><td><span>{getMandiPriceBasis(row) === 'recent' ? 'हाल के रिकॉर्ड का औसत' : 'ऐतिहासिक औसत'}</span><small>{freshness.dateLabel}</small></td></tr>;
    })}</tbody></table>{!filtered.length && <div className="sb-comparison-empty">इस खोज में मंडी नहीं मिली। दूसरा नाम या किस्म चुनें।</div>}</div>
    {filtered.length > 8 && <button type="button" className="sb-comparison-more" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? <><ChevronUp size={16} /> कम मंडियाँ दिखाएँ</> : <><ChevronDown size={16} /> सभी {filtered.length.toLocaleString('en-IN')} मंडियाँ देखें</>}</button>}
    <p className="sb-comparison-footnote"><Info size={14} aria-hidden="true" />अलग तारीखों, किस्मों या ग्रेड के औसत सीधे बिक्री का पक्का भाव नहीं बताते। साधारण औसत को आवक के अनुसार भार नहीं दिया गया है।</p>
    {pair && <div className="sb-comparison-pair"><div className="sb-pair-heading"><span>एक जैसे दर्ज प्रकार की तुलना</span><strong>{pair.variety}{pair.grade ? ` · ${pair.grade}` : ''}</strong></div><div className="sb-gap-route"><div><span>{pair.low.name}</span><strong>₹{money(getMandiPrice(pair.low))}</strong></div><ArrowRight size={18} aria-hidden="true" /><div><span>{pair.high.name}</span><strong>₹{money(getMandiPrice(pair.high))}</strong></div><div className="sb-pair-spread"><span>भाव अंतर / क्विंटल</span><strong>₹{money(pair.spread)}</strong></div></div><p>{pair.quoteDate ? getDataFreshness(pair.quoteDate).dateLabel : 'भाव की व्यक्तिगत तारीख उपलब्ध नहीं'} · {pair.count} रिकॉर्ड{pair.outliersExcluded ? ` · ${pair.outliersExcluded} असामान्य रिकॉर्ड हटाए गए` : ''}। दूरी और खर्च की पुष्टि आवश्यक है।</p><SaleScenario key={`${cropId}-${pair.low.name}-${pair.high.name}`} pair={pair} /></div>}
    {cropId && <Link to={`/crop/${cropId}`} className="sb-comparison-crop-link">{cropName} की विस्तृत जानकारी <ArrowRight size={16} aria-hidden="true" /></Link>}
  </section>;
}
