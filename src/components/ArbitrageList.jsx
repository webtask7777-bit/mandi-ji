import { useState } from 'react';
import { ArrowRight, ArrowUpDown, Calculator } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getDataFreshness } from '../utils/dataFreshness';
import CropImage from './CropImage';
import '../styles/comparison.css';

const rupees = value => Number(value).toLocaleString('en-IN');

export default function ArbitrageList({ stateParam, onCropClick, onDeliveryCalculate }) {
  const [sort, setSort] = useState('spread');
  const [showAll, setShowAll] = useState(false);
  const q = `?state=${encodeURIComponent(stateParam || 'all')}`;
  const { data, loading, error } = useApi(`/arbitrage${q}`);

  if (loading) return <div className="sb-comparison-status" role="status">मंडी तुलना लोड हो रही है…</div>;
  if (error) return <div className="sb-comparison-status" role="status">मंडी तुलना अभी लोड नहीं हो सकी। कुछ देर बाद फिर खोलें।</div>;
  if (!Array.isArray(data) || !data.length) return <div className="sb-comparison-status"><strong>अभी मिलते-जुलते मंडी रिकॉर्ड नहीं मिले</strong><p>समान किस्म और ग्रेड का डेटा मिलने पर भाव का अंतर यहाँ दिखेगा।</p></div>;

  const sorted = [...data].sort((a, b) => sort === 'coverage' ? b.mandiCount - a.mandiCount : b.spread - a.spread);
  const visible = showAll ? sorted : sorted.slice(0, 4);
  return (
    <section className="sb-market-gaps" aria-labelledby="market-gaps-title">
      <div className="sb-comparison-heading">
        <div><span className="sb-comparison-eyebrow">मंडी से मंडी</span><h2 id="market-gaps-title">भाव का अंतर समझें</h2></div>
        <span className="sb-comparison-count">{data.length} तुलना</span>
      </div>
      <p className="sb-comparison-intro">एक जैसी दर्ज किस्म, ग्रेड और भाव के प्रकार वाले रिकॉर्ड। यह अंतर कुल मुनाफ़ा नहीं है।</p>
      <div className="sb-comparison-filters" aria-label="तुलना क्रम">
        <ArrowUpDown size={15} aria-hidden="true" />
        <button type="button" aria-pressed={sort === 'spread'} onClick={() => setSort('spread')}>भाव का अंतर</button>
        <button type="button" aria-pressed={sort === 'coverage'} onClick={() => setSort('coverage')}>ज़्यादा मंडी रिकॉर्ड</button>
      </div>
      <div className="sb-gap-grid">
        {visible.map(row => {
          const freshness = getDataFreshness(row.quoteDate);
          return <article key={row.cropId} className="sb-gap-card">
            <button type="button" className="sb-gap-card-heading" onClick={() => onCropClick?.(row.cropId)} aria-label={`${row.cropName} के भाव और इतिहास देखें`}><CropImage id={row.cropId} name={row.cropName} size="sm" /><div><h3>{row.cropName}</h3><p>{row.topVariety}{row.grade ? ` · ${row.grade}` : ''}</p></div><ArrowRight size={17} aria-hidden="true" /></button>
            <div className="sb-gap-route"><div><span>कम दर्ज भाव</span><strong>₹{rupees(row.buyPrice)}</strong><p>{row.buyMandi}{row.buyState ? `, ${row.buyState}` : ''}</p></div><ArrowRight size={18} aria-hidden="true" /><div><span>अधिक दर्ज भाव</span><strong>₹{rupees(row.sellPrice)}</strong><p>{row.sellMandi}{row.sellState ? `, ${row.sellState}` : ''}</p></div></div>
            <div className="sb-gap-footer"><span>अंतर / क्विंटल</span><strong>₹{rupees(row.spread)}</strong></div>
            <p className="sb-gap-provenance">{row.quoteDate ? `${freshness.dateLabel} · ${freshness.label}` : 'हर मंडी के भाव की तारीख उपलब्ध नहीं'} · {row.priceBasis === 'historical' ? 'ऐतिहासिक औसत' : 'हाल के रिकॉर्ड का औसत'}</p>
            {onDeliveryCalculate && <button type="button" className="sb-gap-calculate" onClick={() => onDeliveryCalculate({
              id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              cropId: row.cropId, cropName: row.cropName, buyMandi: [row.buyMandi, row.buyState].filter(Boolean).join(', '),
              sellMandi: [row.sellMandi, row.sellState].filter(Boolean).join(', '), buyPrice: row.buyPrice,
              sellPrice: row.sellPrice, quoteDate: row.quoteDate, priceBasis: row.priceBasis, variety: row.topVariety, grade: row.grade,
            })}><Calculator size={17} aria-hidden="true" />डिलीवरी जोड़कर तुलना करें<ArrowRight size={16} aria-hidden="true" /></button>}
          </article>;
        })}
      </div>
      {data.length > 4 && <button type="button" className="sb-comparison-more" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'कम तुलना दिखाएँ' : `सभी ${data.length} तुलना देखें`}</button>}
      <p className="sb-comparison-footnote">सड़क की दूरी और ढुलाई का वास्तविक खर्च उपलब्ध नहीं है। माल भेजने से पहले भाव, गुणवत्ता, शुल्क और खरीदार की पुष्टि करें।</p>
    </section>
  );
}
