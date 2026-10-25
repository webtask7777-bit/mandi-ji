import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ChevronDown, ChevronUp, Search, SlidersHorizontal, Info } from 'lucide-react';
import { useStateContext } from '../context/StateContext';
import { flagOutliersByGroup } from '../lib/outlier';
import { getDataFreshness } from '../utils/dataFreshness';
import { cropDetailPath } from '../utils/cropUrls';
import { mandiPath } from '../../shared/mandiPages';
import { getComparisonPair, getMandiPrice, getMandiPriceBasis, getMandiQuoteDate, sortMandiPrices } from '../utils/marketComparison';
import '../styles/comparison.css';

const STATE_CODE_TO_ID = {
  AP: 'andhra-pradesh', AR: 'arunachal-pradesh', AS: 'assam', BR: 'bihar', CG: 'chhattisgarh', GA: 'goa', GJ: 'gujarat', HR: 'haryana', HP: 'himachal-pradesh', JK: 'jammu-kashmir', JH: 'jharkhand', KA: 'karnataka', KL: 'kerala', MP: 'madhya-pradesh', MH: 'maharashtra', MN: 'manipur', ML: 'meghalaya', MZ: 'mizoram', NL: 'nagaland', OD: 'odisha', OR: 'odisha', PB: 'punjab', RJ: 'rajasthan', SK: 'sikkim', TN: 'tamil-nadu', TS: 'telangana', TR: 'tripura', UP: 'uttar-pradesh', UK: 'uttarakhand', WB: 'west-bengal', DL: 'delhi', PY: 'puducherry', CH: 'chandigarh', AN: 'andaman-nicobar', LA: 'ladakh',
};
const money = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function MandiCompare({ data = [], cropName, onMandiClick, cropId, onDeliveryCalculate }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [variety, setVariety] = useState('all');
  const [sort, setSort] = useState('high');
  const { selectStateDirect, stateParam } = useStateContext();
  const validData = useMemo(() => sortMandiPrices(data || []), [data]);
  const varieties = useMemo(() => [...new Set(validData.map(row => row.topVariety).filter(Boolean))].sort(), [validData]);
  // Crop switches may retain this component. An old variety must not hide a new crop.
  const activeVariety = varieties.includes(variety) ? variety : 'all';
  const filtered = useMemo(() => validData.filter(row => (activeVariety === 'all' || row.topVariety === activeVariety) && `${row.name} ${row.district || ''} ${row.stateCode || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (getMandiPriceBasis(a) === 'recent' ? 0 : 1) - (getMandiPriceBasis(b) === 'recent' ? 0 : 1) || (sort === 'low' ? getMandiPrice(a) - getMandiPrice(b) : getMandiPrice(b) - getMandiPrice(a))), [validData, activeVariety, search, sort]);
  const pair = useMemo(() => getComparisonPair(filtered), [filtered]);
  // Unusual is judged within the same variety and grade; summary tiles leave flagged rows out.
  const flagged = useMemo(() => flagOutliersByGroup(filtered, getMandiPrice, row => `${row.topVariety || ''}|${row.grade || ''}`.toLowerCase()), [filtered]);
  const usual = useMemo(() => filtered.filter(row => !flagged.has(row)), [filtered, flagged]);
  if (!validData.length) return null;
  // Tiles describe current prices when there are any: old (historical-basis) rows such as a
  // July 2025 record are listed in the table but do not set the maximum or the average.
  const recentUsual = usual.filter(row => getMandiPriceBasis(row) === 'recent');
  const summaryRows = recentUsual.length ? recentUsual : usual.length ? usual : filtered;
  const max = Math.max(...summaryRows.map(getMandiPrice));
  const min = Math.min(...summaryRows.map(getMandiPrice));
  const average = summaryRows.length ? summaryRows.reduce((sum, row) => sum + getMandiPrice(row), 0) / summaryRows.length : 0;
  const excludedCount = filtered.length - summaryRows.length;
  const visible = showAll ? filtered : filtered.slice(0, 8);

  function calculatePair() {
    if (!pair) return;
    onDeliveryCalculate?.({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      cropId, cropName, buyMandi: [pair.low.name, pair.low.stateCode].filter(Boolean).join(', '),
      sellMandi: [pair.high.name, pair.high.stateCode].filter(Boolean).join(', '),
      buyPrice: getMandiPrice(pair.low), sellPrice: getMandiPrice(pair.high), quoteDate: pair.quoteDate, priceBasis: pair.basis, variety: pair.variety, grade: pair.grade });
  }

  return <section className="sb-mandi-comparison" id="sb-mandi-comparison" aria-label={`${cropName || 'फसल'} की मंडी तुलना`}>
    <div className="sb-comparison-heading"><div><span className="sb-comparison-eyebrow">बाज़ार को समझें</span><h2>{cropName} की मंडी तुलना</h2></div><span className="sb-comparison-count">{validData.length.toLocaleString('en-IN')} मंडी रिकॉर्ड</span></div>
    <p className="sb-comparison-intro">भाव ₹ / क्विंटल में। किस्म, ग्रेड और रिकॉर्ड की तारीख देखकर तुलना करें।</p>
    <div className="sb-comparison-toolbar"><label className="sb-comparison-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={event => { setSearch(event.target.value); setShowAll(false); }} placeholder="मंडी या ज़िला खोजें" aria-label="मंडी या ज़िला खोजें" /></label><label className="sb-comparison-select"><SlidersHorizontal size={15} aria-hidden="true" /><select aria-label="किस्म फ़िल्टर" value={activeVariety} onChange={event => { setVariety(event.target.value); setShowAll(false); }}><option value="all">सभी किस्में</option>{varieties.map(item => <option key={item} value={item}>{item}</option>)}</select></label><select aria-label="भाव क्रम" value={sort} onChange={event => setSort(event.target.value)}><option value="high">अधिक भाव पहले</option><option value="low">कम भाव पहले</option></select></div>
    {!!filtered.length && <div className="sb-comparison-summary"><div><span>अधिकतम दर्ज औसत</span><strong>₹{money(max)}</strong></div><div><span>मंडियों का साधारण औसत</span><strong>₹{money(average)}</strong></div><div><span>न्यूनतम दर्ज औसत</span><strong>₹{money(min)}</strong></div>{excludedCount > 0 && <small>{recentUsual.length ? 'केवल हाल के रिकॉर्ड; ' : ''}{(filtered.length - summaryRows.length).toLocaleString('en-IN')} पुराने या असामान्य रिकॉर्ड इन आँकड़ों में शामिल नहीं</small>}</div>}
    <div className="sb-comparison-table-wrap" tabIndex={0} role="region" aria-label="मंडी तुलना तालिका, छोटे पर्दे पर दाएँ-बाएँ स्क्रॉल करें"><table className="sb-comparison-table"><caption className="sr-only">{cropName} के उपलब्ध मंडी भाव, किस्म, ग्रेड और भाव की तारीख</caption><thead><tr><th scope="col">मंडी / किस्म</th><th scope="col">दर्ज भाव</th><th scope="col">रिकॉर्ड का आधार</th></tr></thead><tbody>{visible.map((row, index) => {
      const freshness = getDataFreshness(getMandiQuoteDate(row));
      return <tr key={`${row.stateCode}-${row.district}-${row.name}-${index}`}><td><div className="sb-mandi-name">{onMandiClick ? <button type="button" onClick={() => onMandiClick(row.name)}>{row.name}</button> : row.mandiSlug ? <Link to={mandiPath(row.mandiState, row.mandiSlug)}><strong>{row.name}</strong></Link> : <strong>{row.name}</strong>}{row.stateCode && <button type="button" className="sb-state-link" disabled={!STATE_CODE_TO_ID[row.stateCode]} onClick={() => selectStateDirect(STATE_CODE_TO_ID[row.stateCode])}>{row.stateCode}</button>}</div><span>{[row.district, row.topVariety, row.grade].filter(Boolean).join(' · ')}</span></td><td><strong className="sb-mandi-price">₹{money(getMandiPrice(row))}</strong>{flagged.has(row) && <small className="sb-outlier">असामान्य रिकॉर्ड</small>}</td><td><span>{getMandiPriceBasis(row) === 'recent' ? 'हाल के रिकॉर्ड का औसत' : 'ऐतिहासिक औसत'}</span><small>{freshness.dateLabel}</small></td></tr>;
    })}</tbody></table>{!filtered.length && <div className="sb-comparison-empty">इस खोज में मंडी नहीं मिली। दूसरा नाम या किस्म चुनें।</div>}</div>
    {filtered.length > 8 && <button type="button" className="sb-comparison-more" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? <><ChevronUp size={16} /> कम मंडियाँ दिखाएँ</> : <><ChevronDown size={16} /> सभी {filtered.length.toLocaleString('en-IN')} मंडियाँ देखें</>}</button>}
    <p className="sb-comparison-footnote"><Info size={14} aria-hidden="true" />अलग तारीखों, किस्मों या ग्रेड के औसत सीधे बिक्री का पक्का भाव नहीं बताते। साधारण औसत को आवक के अनुसार भार नहीं दिया गया है।</p>
    {pair && <div className="sb-comparison-pair"><div className="sb-pair-heading"><span>एक जैसे दर्ज प्रकार की तुलना</span><strong>{pair.variety}{pair.grade ? ` · ${pair.grade}` : ''}</strong></div><div className="sb-gap-route"><div><span>{pair.low.name}</span><strong>₹{money(getMandiPrice(pair.low))}</strong></div><ArrowRight size={18} aria-hidden="true" /><div><span>{pair.high.name}</span><strong>₹{money(getMandiPrice(pair.high))}</strong></div><div className="sb-pair-spread"><span>भाव अंतर / क्विंटल</span><strong>₹{money(pair.spread)}</strong></div></div><p>{pair.quoteDate ? getDataFreshness(pair.quoteDate).dateLabel : 'भाव की व्यक्तिगत तारीख उपलब्ध नहीं'} · {pair.count} रिकॉर्ड{pair.outliersExcluded ? ` · ${pair.outliersExcluded} असामान्य रिकॉर्ड हटाए गए` : ''}। दूरी और खर्च की पुष्टि आवश्यक है।</p>{onDeliveryCalculate && <button type="button" className="sb-pair-calculator" onClick={calculatePair}><Calculator size={19} aria-hidden="true" /><span><strong>इस अंतर में डिलीवरी खर्च निकालें</strong><small>दोनों मंडियों के भाव अगले कदम में भर जाएँगे</small></span><ArrowRight size={18} aria-hidden="true" /></button>}</div>}
    {cropId && <Link to={cropDetailPath(cropId, stateParam)} className="sb-comparison-crop-link">{cropName} की विस्तृत जानकारी <ArrowRight size={16} aria-hidden="true" /></Link>}
  </section>;
}
