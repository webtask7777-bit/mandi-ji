import { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus, MapPin, Clock3, ShoppingCart, Calculator, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useApiSnapshot } from '../context/ApiSnapshotContext';
import { STATE_NAMES } from '../context/StateContext';
import Brand from '../components/Brand';
import CropImage, { CropImageLegend } from '../components/CropImage';
import MiniChart from '../components/MiniChart';
import MandiCompare from '../components/MandiCompare';
import SEO, { SITE_URL } from '../components/SEO';
import CropGuides from '../components/CropGuides';
import { getDataFreshness } from '../utils/dataFreshness';
import { comparableChange, gapNote } from '../utils/priceChange';
import { cropDetailPath } from '../utils/cropUrls';
import { getLanguage } from '../../shared/languages';
import { normalizeRegionId } from '../../shared/indiaRegions';
import { getCropIndexability } from '../../shared/cropIndexability';
import { readLanguageNavigation, localizedToolsUrl } from '../utils/languageNavigation';
import '../styles/detail.css';

const MONTH_HI = {
  '01': 'जनवरी', '02': 'फ़रवरी', '03': 'मार्च', '04': 'अप्रैल', '05': 'मई', '06': 'जून',
  '07': 'जुलाई', '08': 'अगस्त', '09': 'सितंबर', '10': 'अक्टूबर', '11': 'नवंबर', '12': 'दिसंबर',
  Jan: 'जनवरी', Feb: 'फ़रवरी', Mar: 'मार्च', Apr: 'अप्रैल', May: 'मई', Jun: 'जून',
  Jul: 'जुलाई', Aug: 'अगस्त', Sep: 'सितंबर', Oct: 'अक्टूबर', Nov: 'नवंबर', Dec: 'दिसंबर',
};
const money = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const positive = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
const formatMonthHi = value => MONTH_HI[value] || value;
function monthLabel(record) {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(record?.date || '')) {
    const [year, month] = record.date.split('-');
    return `${formatMonthHi(month)} ${year}`;
  }
  return record?.month ? `${formatMonthHi(record.month)}${record.year ? ` ${record.year}` : ' · वर्ष उपलब्ध नहीं'}` : 'महीना उपलब्ध नहीं';
}
function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('hi-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  }) + ' IST' : null;
}

export default function CropDetailPage() {
  const { cropId, stateId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const navigation = readLanguageNavigation(searchParams);
  const returnLanguage = getLanguage(navigation.toolLanguage);
  const stateParam = normalizeRegionId(stateId) || 'all';
  const stateNameHi = stateId ? (STATE_NAMES[stateParam] || stateParam) : 'भारत';
  const dashboardPath = stateId ? `/mandi-bhav/${encodeURIComponent(stateParam)}` : '/';
  const nativeReturnPath = returnLanguage ? localizedToolsUrl({ toolLanguage: returnLanguage.code, state: stateParam, sourceCrop: cropId }, 'hi', 'prices') : null;
  const stateQuery = encodeURIComponent(stateParam);
  const cropQuery = encodeURIComponent(cropId);
  const { data: priceData, loading: priceLoading, error: priceError } = useApi(`/prices/${cropQuery}?months=13&state=${stateQuery}`);
  const priceRequest = `${stateParam}/${cropId}`;
  const { asOf } = useApiSnapshot();
  const indexability = getCropIndexability(priceData, { asOf, loading: priceLoading, error: priceError });
  const [lastIndexability, setLastIndexability] = useState(null);
  if (indexability.noIndex !== null && (lastIndexability?.request !== priceRequest || lastIndexability.noIndex !== indexability.noIndex)) {
    setLastIndexability({ request: priceRequest, noIndex: indexability.noIndex });
  }
  // Revalidation failures must not turn a known stale page back into indexable
  // content; pending requests must not be mistaken for an empty price history.
  const priceNoIndex = indexability.noIndex ?? (lastIndexability?.request === priceRequest ? lastIndexability.noIndex : false);
  const { data: mandiData, loading: mandiLoading, error: mandiError } = useApi(`/mandi-compare/${cropQuery}?state=${stateQuery}`);
  const { data: tickerData } = useApi(`/ticker?state=${stateQuery}`);
  const unavailable = [404, 422].includes(Number(priceError?.status)) || /\bAPI (404|422):/.test(priceError?.message || '');
  const cropTicker = Array.isArray(tickerData) ? tickerData.find(row => row.id === cropId) : null;
  const crop = priceData?.crop || cropTicker || {};
  const cropName = crop.nameHi || crop.name || cropId;
  const history = (Array.isArray(priceData?.history) ? priceData.history : []).filter(row => positive(row.market));
  const dailyHistory = (Array.isArray(priceData?.dailyHistory) ? priceData.dailyHistory : [])
    .filter(row => positive(row.market)).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  const latestDay = dailyHistory.at(-1);
  const latestMonth = history.at(-1);
  const heroRecord = latestDay || latestMonth;
  const previousRecord = latestDay ? dailyHistory.at(-2) : history.at(-2);
  const heroPrice = positive(heroRecord?.market) ? Number(heroRecord.market) : null;
  const comparison = heroPrice !== null ? comparableChange(heroRecord, previousRecord, { daily: Boolean(latestDay) }) : { status: 'none' };
  const change = comparison.status === 'ok' ? comparison.change : null;
  const changePct = change !== null ? comparison.pct : null;
  const freshness = getDataFreshness(latestDay?.date);
  const quoteLabel = latestDay ? freshness.dateLabel : latestMonth ? monthLabel(latestMonth) : 'भाव उपलब्ध नहीं';
  const priorLabel = previousRecord ? (latestDay ? getDataFreshness(previousRecord.date).dateLabel : monthLabel(previousRecord)) : null;
  const updatedLabel = priceData?.lastUpdated ? formatTimestamp(priceData.lastUpdated) : null;
  const mandis = Array.isArray(mandiData) ? mandiData : [];
  const districts = (Array.isArray(priceData?.districtBreakdown) ? priceData.districtBreakdown : [])
    .filter(row => Number(row.records) > 0).sort((a, b) => Number(b.records) - Number(a.records));
  const maxDistrictRecords = Math.max(...districts.map(row => Number(row.records)), 1);
  const msp = positive(heroRecord?.msp) ? Number(heroRecord.msp) : positive(crop.msp) ? Number(crop.msp) : null;
  const openDeliveryCalculator = payload => navigate('/delivery-calculator', { state: { deliveryScenario: {
    ...payload, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  } } });

  return (
    <div className="sb-detail-page">
      <SEO title={`${cropName}${crop.name && crop.name !== cropName ? ` (${crop.name})` : ''} का मंडी भाव — ${stateNameHi}${heroPrice !== null ? ` · ${quoteLabel}` : ''}`}
        description={`${stateNameHi} में ${cropName} का ताज़ा दर्ज मंडी भाव${heroPrice !== null ? `: ₹${money(heroPrice)}/क्विंटल, ${quoteLabel}` : ''}। हर मंडी का रेट, भाव का इतिहास और मंडी तुलना देखें। रिकॉर्ड की तारीख जाँचकर सौदे का भाव मंडी से पुष्टि करें।`}
        path={cropDetailPath(cropId, stateParam)} noIndex={unavailable || priceNoIndex}
        structuredData={cropName && !unavailable ? { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: `${stateNameHi} के मंडी भाव`, item: `${SITE_URL}${dashboardPath}` },
          { '@type': 'ListItem', position: 2, name: cropName, item: `${SITE_URL}${cropDetailPath(cropId, stateParam)}` },
        ] } : undefined} />
      <header className="sb-detail-header"><div className="sb-detail-header__inner">
        <Link to="/" aria-label="सही भाव के मुख्य पृष्ठ पर जाएँ"><Brand /></Link>
        <Link to={nativeReturnPath || dashboardPath} className="sb-detail-back"><ArrowLeft size={16} aria-hidden="true" />{returnLanguage ? <bdi lang={returnLanguage.code} dir={returnLanguage.dir}>{returnLanguage.name} · SahiBhav</bdi> : <span>{stateNameHi} के मंडी भाव</span>}</Link>
      </div></header>
      <main className="sb-detail-main" id="main-content">
        <nav className="sb-detail-breadcrumb" aria-label="पृष्ठ पथ"><Link to={dashboardPath}>{stateNameHi} के मंडी भाव</Link><span aria-hidden="true">/</span><span>{cropName}</span></nav>
        <section className="sb-crop-detail-heading">
          <div><span className="sb-detail-kicker">फसल की पूरी तस्वीर</span><h1>{cropName} के मंडी भाव</h1><p>{crop.name && crop.name !== cropName ? `${crop.name} · ` : ''}भाव का इतिहास देखें और मंडियों की तुलना करें।</p></div>
          <span className="sb-detail-location"><MapPin size={15} aria-hidden="true" />{stateNameHi || 'भारत'}</span>
        </section>
        {priceLoading ? <div className="sb-detail-status" role="status"><RefreshCw size={24} aria-hidden="true" /><h2>फसल के रिकॉर्ड लोड हो रहे हैं</h2><p>भाव, इतिहास और मंडी की जानकारी आ रही है।</p></div> : <>
          {priceError && <div className="sb-detail-notice" role="alert"><AlertCircle size={20} aria-hidden="true" /><div><strong>{unavailable ? 'यह फसल पृष्ठ उपलब्ध नहीं है' : 'भाव के रिकॉर्ड लोड नहीं हो पाए'}</strong><p>{unavailable ? 'इस क्षेत्र की उपलब्ध फसलों की सूची से भाव देखें।' : 'कनेक्शन की जाँच करें और पृष्ठ दोबारा खोलें।'}</p></div>{unavailable ? <Link to={dashboardPath}>उपलब्ध फसलें देखें</Link> : <button type="button" onClick={() => window.location.reload()}>फिर कोशिश करें</button>}</div>}
          <div className="sb-crop-detail-grid">
            <section className="sb-crop-quote" aria-label={`${cropName} का उपलब्ध भाव`}>
              <div className="sb-crop-quote__identity"><div><span className="sb-detail-kicker">{latestDay ? 'दैनिक रिकॉर्ड का भाव' : latestMonth ? 'महीने का मध्य भाव' : 'उपलब्ध मंडी भाव'}</span><h2>{cropName}</h2><p>{quoteLabel}</p></div><CropImage id={cropId} name={cropName} size="hero" /></div>
              <CropImageLegend />
              {heroPrice !== null ? <>
                <div className="sb-crop-quote__value"><strong>₹{money(heroPrice)}</strong><span>/ क्विंटल</span></div>
                {change !== null ? <div className={`sb-detail-change ${change > 0 ? 'is-up' : change < 0 ? 'is-down' : 'is-flat'}`}>
                  {change > 0 ? <TrendingUp size={18} aria-hidden="true" /> : change < 0 ? <TrendingDown size={18} aria-hidden="true" /> : <Minus size={18} aria-hidden="true" />}
                  <strong>{change > 0 ? '+' : change < 0 ? '−' : ''}₹{money(Math.abs(change))} ({changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%)</strong>
                  <span>{priorLabel} के रिकॉर्ड से</span>
                </div> : <p className="sb-detail-small">{comparison.status === 'gap' ? `${gapNote(comparison)}।` : 'बदलाव दिखाने के लिए पिछला रिकॉर्ड उपलब्ध नहीं है।'}</p>}
                <div className={`sb-detail-freshness ${latestDay && freshness.isCurrent ? 'is-current' : ''}`}><Clock3 size={15} aria-hidden="true" /><span>{latestDay ? freshness.label : 'मासिक रिकॉर्ड · दैनिक भाव नहीं'}</span></div>
                {updatedLabel && <p className="sb-detail-sync">स्रोत से डेटा लिया गया: {updatedLabel} · भाव की तारीख ऊपर देखें</p>}
              </> : <div className="sb-detail-no-price"><strong>इस क्षेत्र के भाव उपलब्ध नहीं हैं</strong><p>दूसरे क्षेत्र के रिकॉर्ड मुख्य मंडी भाव पृष्ठ पर देखें।</p><Link to={dashboardPath}>क्षेत्र बदलें <ArrowRight size={16} aria-hidden="true" /></Link></div>}
              {heroPrice !== null && <button type="button" className="sb-detail-primary" onClick={() => openDeliveryCalculator({ cropId, cropName, buyPrice: heroPrice, quoteDate: heroRecord?.date, priceBasis: latestDay ? 'daily-average' : 'monthly-average' })}><Calculator size={18} aria-hidden="true" />माल मँगाने का पूरा खर्च देखें<ArrowRight size={16} aria-hidden="true" /></button>}
              <Link to={`/listing/new?type=sell&crop=${encodeURIComponent(cropId)}`} className={heroPrice !== null ? 'sb-detail-text-link' : 'sb-detail-primary'}><ShoppingCart size={18} aria-hidden="true" />यह फसल बेचें<ArrowRight size={16} aria-hidden="true" /></Link>
            </section>
            <section className="sb-crop-detail-trend" aria-label="भाव का इतिहास">
              {history.length || dailyHistory.length ? <MiniChart data={history} dailyData={dailyHistory} mspSeason={priceData?.crop?.mspSeason} title={`${cropName} का भाव इतिहास`} formatMonth={formatMonthHi} /> : <div className="sb-detail-status sb-detail-status--compact"><TrendingUp size={24} aria-hidden="true" /><h2>भाव का इतिहास उपलब्ध नहीं है</h2><p>इस फसल के रिकॉर्ड आने पर यहाँ ग्राफ़ दिखाई देगा।</p></div>}
              <p className="sb-detail-data-note"><Info size={16} aria-hidden="true" />भाव उपलब्ध रिकॉर्ड के आधार पर हैं। किस्म, गुणवत्ता, तारीख और मंडी बदलने पर बिक्री का भाव अलग हो सकता है।</p>
            </section>
          </div>
        </>}
        {mandiLoading ? <div className="sb-detail-loading" role="status">मंडियों के रिकॉर्ड लोड हो रहे हैं…</div> : mandiError ? <div className="sb-detail-notice" role="alert"><Info size={18} aria-hidden="true" /><p>मंडी तुलना अभी लोड नहीं हो पाई। कृपया पृष्ठ दोबारा खोलें।</p></div> : mandis.length > 0 ? <MandiCompare key={`${cropId}-${stateQuery}`} data={mandis} cropName={cropName} cropId={cropId} dailyHistory={dailyHistory} onDeliveryCalculate={openDeliveryCalculator} /> : !priceLoading && <section className="sb-detail-section"><h2>मंडी तुलना</h2><p>इस फसल और क्षेत्र के लिए मंडी रिकॉर्ड उपलब्ध नहीं हैं।</p></section>}
        {(districts.length > 0 || cropTicker || msp !== null) && <div className="sb-detail-bottom-grid">
          {districts.length > 0 && <section className="sb-detail-section"><span className="sb-detail-kicker">डेटा कहाँ से है?</span><h2>ज़िला वार रिकॉर्ड</h2><p>उपलब्ध प्रविष्टियों की संख्या; व्यापार की मात्रा नहीं।</p><div className="sb-detail-districts">{districts.slice(0, 10).map(row => <div className="sb-detail-district" key={row.district}><span>{row.nameHi || row.district}</span><div className="sb-detail-district__track" aria-hidden="true"><span style={{ width: `${Number(row.records) / maxDistrictRecords * 100}%` }} /></div><strong>{Number(row.records).toLocaleString('en-IN')}</strong></div>)}</div></section>}
          <section className="sb-detail-section"><span className="sb-detail-kicker">एक नज़र में</span><h2>फसल की जानकारी</h2><dl className="sb-detail-facts">
            {Number.isFinite(Number(cropTicker?.mandiCount)) && cropTicker?.mandiCount != null && <div><dt>संग्रह में मंडियाँ</dt><dd>{Number(cropTicker.mandiCount).toLocaleString('en-IN')}</dd></div>}
            {Number.isFinite(Number(cropTicker?.records)) && cropTicker?.records != null && <div><dt>कुल रिकॉर्ड</dt><dd>{Number(cropTicker.records).toLocaleString('en-IN')}</dd></div>}
            {msp !== null && <div><dt>{crop.mspSeason ? `MSP ${crop.mspSeason}` : 'संग्रह में दिया MSP'}</dt><dd>₹{money(msp)}<small> / क्विंटल</small></dd></div>}
            <div><dt>भाव की इकाई</dt><dd>₹ / क्विंटल</dd></div>
          </dl>{msp !== null && <p className="sb-detail-small">{crop.mspSource ? <>MSP FAQ (औसत अच्छी) गुणवत्ता के लिए है; सरकारी खरीद की पात्रता और केंद्र अलग से जाँचें। <a href={crop.mspSource} target="_blank" rel="noopener noreferrer">स्रोत: PIB</a></> : 'MSP का फसल वर्ष इस रिकॉर्ड में नहीं दिया गया है। वर्तमान फसल वर्ष का MSP अलग से जाँचें।'}</p>}<Link to="/blog" className="sb-detail-text-link">मंडी भाव समझने के लिए पढ़ें <ArrowRight size={16} aria-hidden="true" /></Link></section>
        </div>}
        <CropGuides cropId={cropId} cropName={cropName} stateId={stateParam} />
        <footer className="sb-detail-footer"><Brand compact /><p>सही भाव। समझकर फ़ैसला।</p><Link to={nativeReturnPath || dashboardPath}>{returnLanguage ? <bdi lang={returnLanguage.code} dir={returnLanguage.dir}>{returnLanguage.name} · SahiBhav</bdi> : 'मुख्य पृष्ठ पर जाएँ'} <ArrowRight size={15} aria-hidden="true" /></Link></footer>
      </main>
    </div>
  );
}
