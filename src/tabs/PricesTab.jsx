import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, ChevronRight, ChevronLeft, BarChart3, ArrowUpRight, ArrowDownRight, ShoppingCart, AlertTriangle, Search, LayoutList, CalendarDays, Info, Sprout, ArrowRight, Bookmark, Calculator, Scale } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import PriceCard from "../components/PriceCard";
import CropImage from "../components/CropImage";
import MiniChart from "../components/MiniChart";
import TickerBoard from "../components/TickerBoard";
import MandiCompare from "../components/MandiCompare";
import ArbitrageList from "../components/ArbitrageList";
import { getOutlierBounds, isOutlier } from "@/lib/outlier";
import { comparableChange, gapNote } from "../utils/priceChange";
import { getDataFreshness } from "../utils/dataFreshness";
import { cropDetailPath } from "../utils/cropUrls";
import WhatsAppShare from "../components/WhatsAppShare";
import { getDashboardSourceCrop, getDashboardCropSearch } from "../utils/dashboardNavigation";
import "../styles/prices.css";

const HI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
/** "अक्टूबर 2026 · 1 दिन, 346 मंडियाँ": the ticker price says which month and how much data it rests on. */
function tickerPriceLabel(quote) {
  const m = /^(\d{4})-(\d{2})$/.exec(quote?.priceMonth || '');
  if (!m) return 'अंतिम दर्ज महीने का औसत';
  const parts = [`${HI_MONTHS[Number(m[2]) - 1]} ${m[1]}`];
  if (quote.priceDays) parts.push(`${quote.priceDays} दिन${quote.priceMandis ? `, ${quote.priceMandis} मंडियाँ` : ''}`);
  return `मंडियों का मध्य भाव · ${parts.join(' · ')}`;
}

const MONTH_HI = {
  '01': 'जनवरी', '02': 'फ़रवरी', '03': 'मार्च', '04': 'अप्रैल',
  '05': 'मई', '06': 'जून', '07': 'जुलाई', '08': 'अगस्त',
  '09': 'सितम्बर', '10': 'अक्टूबर', '11': 'नवम्बर', '12': 'दिसम्बर',
  Jan: 'जनवरी', Feb: 'फ़रवरी', Mar: 'मार्च', Apr: 'अप्रैल',
  May: 'मई', Jun: 'जून', Jul: 'जुलाई', Aug: 'अगस्त',
  Sep: 'सितम्बर', Oct: 'अक्टूबर', Nov: 'नवम्बर', Dec: 'दिसम्बर',
};
const formatMonthHi = month => MONTH_HI[month] || month || '';
const number = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
function formatTimestamp(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Date(value).toLocaleString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
}
function recordLabel(record) {
  if (!record) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(record.date || '')) return getDataFreshness(record.date).dateLabel;
  if (/^\d{4}-\d{2}$/.test(record.date || '')) {
    const [year, month] = record.date.split('-');
    return `${formatMonthHi(month)} ${year}`;
  }
  return formatMonthHi(record.month);
}

function getDefaultCrop(allCrops, tickerData) {
  if (!allCrops.length) return 'paddy';
  const cropIds = new Set(allCrops.map(crop => crop.id));
  const common = (tickerData || []).filter(item => cropIds.has(item.id) && item.records > 5000 && item.mandiCount > 80 && item.price > 200);
  // Choose an established, widely reported crop; a large price swing is not a
  // reason to promote a commodity to the default selection.
  const preferred = ['wheat', 'paddy', 'paddycommon', 'maize', 'bengal-gramgramwhole'];
  const familiar = preferred.find(id => common.some(item => item.id === id));
  if (familiar) return familiar;
  return [...allCrops].sort((a, b) => (b.totalRecords || 0) - (a.totalRecords || 0))[0].id;
}

const SAVED_CROPS_KEY = 'sahibhav.saved-crops.v1';
function readSavedCrops() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVED_CROPS_KEY) || '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter(id => typeof id === 'string'))].slice(0, 100) : [];
  } catch { return []; }
}
const interactionId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function PricesTab({ crops = [], stateParam, initialCropId, onCropConsumed, onMandiClick, onDeliveryCalculate }) {
  const allCrops = useMemo(() => Array.isArray(crops) ? crops : [], [crops]);
  const [searchParams, setSearchParams] = useSearchParams();
  const routeCrop = getDashboardSourceCrop(searchParams, allCrops);
  const [selection, setSelection] = useState({ crop: initialCropId || null, navigationCrop: initialCropId });
  const [showAllCards, setShowAllCards] = useState(false);
  const [showAllCrops, setShowAllCrops] = useState(false);
  const [cropSearch, setCropSearch] = useState('');
  const [view, setView] = useState('chart');
  const [sliderIndex, setSliderIndex] = useState(0);
  const [savedCrops, setSavedCrops] = useState(readSavedCrops);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');

  const stateQ = stateParam && stateParam !== 'all' ? `&state=${encodeURIComponent(stateParam)}` : '&state=all';
  const tickerQ = `?state=${encodeURIComponent(stateParam || 'all')}`;
  const { data: tickerData, loading: tickerLoading, error: tickerError } = useApi(`/ticker${tickerQ}`);
  const ticker = Array.isArray(tickerData) ? tickerData : [];

  // A navigation request is consumed once. Adjusting this local selection
  // during render avoids an effect that briefly shows the previous crop.
  if (selection.navigationCrop !== initialCropId) {
    setSelection({ crop: initialCropId || selection.crop, navigationCrop: initialCropId });
    if (initialCropId) setView('chart');
  }
  useEffect(() => {
    if (!initialCropId) return;
    if (routeCrop !== initialCropId && allCrops.some(crop => crop.id === initialCropId)) {
      setSearchParams(previous => getDashboardCropSearch(previous, initialCropId, allCrops), { replace: true });
    }
    onCropConsumed?.();
  }, [initialCropId, onCropConsumed, allCrops, routeCrop, setSearchParams]);

  const activeCrop = initialCropId || routeCrop || (allCrops.some(crop => crop.id === selection.crop) ? selection.crop : getDefaultCrop(allCrops, tickerLoading ? [] : tickerData));
  const { data: priceData, loading: priceLoading, error: priceError } = useApi(`/prices/${activeCrop}?months=13${stateQ}`);
  const { data: mandiCompareData, loading: mandiLoading, error: mandiError } = useApi(`/mandi-compare/${activeCrop}${tickerQ}`);
  const selectedMeta = allCrops.find(crop => crop.id === activeCrop);
  const cropName = selectedMeta?.nameHi || selectedMeta?.name || activeCrop;
  const history = priceLoading ? [] : (priceData?.history || []).filter(record => Number(record.market) > 0);
  const dailyHistory = priceLoading ? [] : (priceData?.dailyHistory || []).filter(record => Number(record.market) > 0).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latestPrice = history.at(-1);
  const latestDay = dailyHistory.at(-1);
  const heroRecord = latestDay || latestPrice;
  const previousRecord = latestDay ? dailyHistory.at(-2) : history.at(-2);
  const heroPrice = heroRecord?.market;
  const heroComparison = comparableChange(heroRecord, previousRecord, { daily: Boolean(latestDay) });
  const hasPrevious = heroComparison.status === 'ok';
  const heroChange = hasPrevious ? heroComparison.change : null;
  const heroChangePct = hasPrevious ? heroComparison.pct.toFixed(1) : null;
  const freshness = getDataFreshness(heroRecord?.date);
  const selectedTicker = ticker.find(item => item.id === activeCrop);
  const comparisons = !mandiLoading && Array.isArray(mandiCompareData) ? mandiCompareData : [];
  const mandiOutlierBounds = comparisons.length >= 4 ? getOutlierBounds(comparisons.map(mandi => mandi.recentPrice || mandi.avgPrice)) : null;

  const validTicker = ticker.filter(item => allCrops.some(crop => crop.id === item.id) && Number(item.price) > 0);
  const topMovers = [...validTicker].filter(item => item.records > 2000 && Number.isFinite(Number(item.changePct)) && Number(item.changePct) !== 0)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 6);
  const mover = topMovers.length ? topMovers[sliderIndex % topMovers.length] : null;
  const gainers = validTicker.filter(item => Number(item.changePct) > 0).length;
  const losers = validTicker.filter(item => Number(item.changePct) < 0).length;
  const savedAvailable = allCrops.filter(crop => savedCrops.includes(crop.id));
  const filteredCrops = allCrops.filter(crop => (!savedOnly || savedCrops.includes(crop.id)) && `${crop.nameHi || ''} ${crop.name || ''} ${crop.id}`.toLowerCase().includes(cropSearch.trim().toLowerCase()));
  const visibleCrops = showAllCrops || cropSearch.trim() ? filteredCrops : filteredCrops.slice(0, 15);
  const cropsWithPrices = allCrops.slice(0, 12).map(crop => {
    const quote = ticker.find(item => item.id === crop.id);
    return { ...crop, displayName: crop.nameHi || crop.name, market: Number(quote?.price) > 0 ? quote.price : crop.avgPrice,
      priceLabel: Number(quote?.price) > 0 ? tickerPriceLabel(quote) : 'रिकॉर्ड का औसत', changePct: Number(quote?.prevPrice) > 0 ? quote.changePct : null,
      change: quote?.change ?? null, mandiCount: quote?.mandiCount ?? null, changeBasis: 'पिछले दर्ज महीने से' };
  });
  const visibleCards = showAllCards ? cropsWithPrices : cropsWithPrices.slice(0, 4);

  function toggleSavedCrop() {
    const next = savedCrops.includes(activeCrop) ? savedCrops.filter(id => id !== activeCrop) : [...savedCrops, activeCrop].slice(-100);
    setSavedCrops(next);
    try {
      window.localStorage.setItem(SAVED_CROPS_KEY, JSON.stringify(next));
      setSaveNotice(next.includes(activeCrop) ? `${cropName} इस ब्राउज़र में सेव है।` : `${cropName} सेव सूची से हटाई गई।`);
    } catch { setSaveNotice('सूची इस सत्र में सेव है; ब्राउज़र में स्थायी सेव उपलब्ध नहीं है।'); }
  }

  function calculateFromHero() {
    onDeliveryCalculate?.({ id: interactionId(), cropId: activeCrop, cropName, buyPrice: Number(heroPrice),
      quoteDate: freshness.date, priceBasis: latestDay ? 'daily-average' : 'monthly-average' });
  }

  function chooseCrop(id) {
    if (!allCrops.some(crop => crop.id === id)) return;
    setSelection(current => ({ ...current, crop: id }));
    setSearchParams(previous => getDashboardCropSearch(previous, id, allCrops), { replace: true });
  }

  return (
    <div className="sb-prices-page">
      {!tickerLoading && validTicker.length > 0 && <section className="sb-market-pulse" aria-label="उपलब्ध बाज़ार रिकॉर्ड का सार">
        <div className="sb-market-pulse__title"><span className="sb-eyebrow">बाज़ार का रुख़</span><strong>लगातार दो दर्ज महीनों के मध्य भाव में</strong></div>
        <div><TrendingUp size={19} className="sb-change--up" aria-hidden="true" /><strong>{number(gainers)}</strong><span>फसलों में बढ़त</span></div>
        <div><TrendingDown size={19} className="sb-change--down" aria-hidden="true" /><strong>{number(losers)}</strong><span>फसलों में गिरावट</span></div>
        <div><Sprout size={19} aria-hidden="true" /><strong>{number(validTicker.length)}</strong><span>फसलों के भाव</span></div>
      </section>}

      <section className="sb-crop-picker" id="sb-crop-picker" aria-labelledby="sb-crop-picker-title">
        <div className="sb-section-heading">
          <div><p className="sb-eyebrow">पहले अपनी फसल</p><h2 id="sb-crop-picker-title">किसका भाव जानना है?</h2></div>
          <label className="sb-crop-search"><Search size={18} aria-hidden="true" /><span className="sr-only">फसल खोजें</span><input type="search" value={cropSearch} onChange={event => setCropSearch(event.target.value)} placeholder="फसल खोजें…" /></label>
        </div>
        <div className="sb-picker-tools"><div className="sb-picker-filters" aria-label="फसल सूची"><button type="button" aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>सभी फसलें</button><button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}><Bookmark size={15} aria-hidden="true" />मेरी फसलें <span>{savedAvailable.length}</span></button></div><span>अपनी पसंद इस ब्राउज़र में रखें</span></div>
        <div className={`sb-crop-choices ${showAllCrops || cropSearch.trim() ? 'sb-crop-choices--expanded' : ''}`}>
          {visibleCrops.map(crop => <button type="button" key={crop.id} onClick={() => chooseCrop(crop.id)} aria-pressed={activeCrop === crop.id} className={`sb-crop-choice ${activeCrop === crop.id ? 'sb-crop-choice--active' : ''}`}>
            <CropImage id={crop.id} name={crop.nameHi || crop.name} size="lg" /><span>{crop.nameHi || crop.name}</span>{savedCrops.includes(crop.id) && <Bookmark className="sb-crop-choice__saved" size={13} aria-label="सेव की गई फसल" />}
          </button>)}
        </div>
        {filteredCrops.length === 0 && <p className="sb-empty-copy">{savedOnly ? 'इस सूची में फसल नहीं है। सभी फसलें खोलें, फिर भाव के पास सेव बटन दबाएँ।' : 'इस नाम से फसल नहीं मिली। हिंदी या अंग्रेज़ी नाम से खोजें।'}</p>}
        {!cropSearch.trim() && filteredCrops.length > 15 && <button type="button" className="sb-text-button" onClick={() => setShowAllCrops(!showAllCrops)} aria-expanded={showAllCrops}>{showAllCrops ? 'कम फसलें दिखाएँ' : `सभी ${filteredCrops.length} फसलें देखें`}<ChevronRight size={16} aria-hidden="true" /></button>}
        {filteredCrops.length > 0 && <details className="mt-3 rounded-xl border border-[#dfe6d8] bg-[#fffefb] px-4">
          <summary className="cursor-pointer py-3 text-sm font-semibold text-[#174c3c]">फसल वार मंडी भाव के पृष्ठ ({filteredCrops.length})</summary>
          <nav aria-label="फसल वार मंडी भाव" className="grid max-h-80 grid-cols-2 gap-x-4 overflow-y-auto pb-3 sm:grid-cols-3">
            {filteredCrops.map(crop => <Link key={crop.id} to={cropDetailPath(crop.id, stateParam)} className="flex min-h-11 items-center py-2 text-sm leading-relaxed text-[#174c3c] underline decoration-[#b3c5aa] underline-offset-4">{crop.nameHi || crop.name} मंडी भाव</Link>)}
          </nav>
        </details>}
      </section>

      <p className="sr-only" role="status">{saveNotice}</p>
      <div className="sb-section-heading sb-selected-heading">
        <div><p className="sb-eyebrow">भाव और बाज़ार</p><h2>{cropName}</h2><Link to={cropDetailPath(activeCrop, stateParam)} className="sb-text-button">{cropName} का पूरा भाव पृष्ठ <ArrowRight size={15} aria-hidden="true" /></Link></div>
        <div className="sb-selected-actions"><button type="button" className="sb-save-crop" onClick={toggleSavedCrop} aria-pressed={savedCrops.includes(activeCrop)} aria-label={`${cropName} ${savedCrops.includes(activeCrop) ? 'सेव सूची से हटाएँ' : 'सेव करें'}`}><Bookmark size={16} aria-hidden="true" fill={savedCrops.includes(activeCrop) ? 'currentColor' : 'none'} />{savedCrops.includes(activeCrop) ? 'सेव है' : 'सेव करें'}</button><div className="sb-view-toggle" aria-label="भाव देखने का तरीका">
          <button type="button" onClick={() => setView('chart')} aria-pressed={view === 'chart'}><BarChart3 size={16} aria-hidden="true" />विवरण</button>
          <button type="button" onClick={() => setView('board')} aria-pressed={view === 'board'}><LayoutList size={16} aria-hidden="true" />भाव बोर्ड</button>
        </div></div>
      </div>

      {view === 'chart' ? <>
        {priceLoading ? <div className="sb-price-loading" role="status"><span className="sb-loading-dot" />{cropName} के भाव लोड हो रहे हैं…</div> : priceError ? <div className="sb-price-empty" role="alert"><Info size={22} /><h3>भाव अभी लोड नहीं हो पाए</h3><p>कुछ देर बाद दोबारा कोशिश करें या दूसरी फसल चुनें।</p></div> : heroRecord ? <div className="sb-price-analysis">
          <section className="sb-quote-hero" aria-label={`${cropName} का उपलब्ध थोक भाव`}>
            <div className="sb-quote-hero__top"><span className="sb-eyebrow">उपलब्ध थोक भाव</span><span className={`sb-freshness sb-freshness--${freshness.status}`}><CalendarDays size={13} aria-hidden="true" />{freshness.isCurrent ? 'आज का रिकॉर्ड' : freshness.status === 'stale' ? 'पुराना रिकॉर्ड' : 'तारीख जाँचें'}</span></div>
            <div className="sb-quote-hero__main"><div><h3>{cropName}</h3><p className="sb-quote-date">{recordLabel(heroRecord) || 'भाव की तारीख उपलब्ध नहीं'}</p><div className="sb-hero-amount">₹{number(heroPrice)}</div><span className="sb-unit-label">प्रति क्विंटल · {latestDay ? 'उस दिन' : 'उस महीने'} {Number(heroRecord?.mandis) > 0 ? `${number(heroRecord.mandis)} मंडियों` : 'मंडियों'} का मध्य भाव</span></div><CropImage id={activeCrop} name={cropName} size="hero" /></div>
            {hasPrevious && <div className="sb-hero-change"><span className={`sb-change ${heroChange > 0 ? 'sb-change--up' : heroChange < 0 ? 'sb-change--down' : 'sb-change--flat'}`}>{heroChange >= 0 ? <ArrowUpRight size={18} aria-hidden="true" /> : <ArrowDownRight size={18} aria-hidden="true" />}{heroChange > 0 ? '+' : ''}₹{number(heroChange)} ({heroChange > 0 ? '+' : ''}{heroChangePct}%)</span><small>{recordLabel(previousRecord) ? `${recordLabel(previousRecord)} के रिकॉर्ड से` : 'पिछले उपलब्ध रिकॉर्ड से'}</small></div>}
            {heroComparison.status === 'gap' && <p className="sb-small-note">{gapNote(heroComparison)}।</p>}
            {Number(latestPrice?.msp) > 0 && <div className="sb-msp-line"><span>{priceData?.crop?.mspSeason ? `MSP ${priceData.crop.mspSeason}` : 'दर्ज MSP'}{priceData?.crop?.mspSource && <> · <a href={priceData.crop.mspSource} target="_blank" rel="noopener noreferrer">स्रोत: PIB</a></>}</span><strong>₹{number(latestPrice.msp)} <small>/ क्विंटल · FAQ गुणवत्ता</small></strong></div>}
            {!freshness.isCurrent && <p className="sb-quote-notice"><Info size={15} aria-hidden="true" />{freshness.label}। सौदे से पहले मंडी से भाव की पुष्टि करें।</p>}
            {Number(selectedTicker?.bestMandi?.price) >= 1 && Number(selectedTicker?.worstMandi?.price) >= 1 && <div className="sb-quote-range">
              {[{ label: 'दर्ज अधिकतम', market: selectedTicker.bestMandi }, { label: 'दर्ज न्यूनतम', market: selectedTicker.worstMandi }].map(({ label, market }) => {
                const details = comparisons.find(item => item.name === market.name);
                const variety = [details?.topVariety, details?.grade && details.grade !== 'Local' ? details.grade : null].filter(Boolean).join(' · ');
                return <div key={label}><span>{label}</span><strong>₹{number(market.price)}</strong><p>{market.name}{market.stateCode ? `, ${market.stateCode}` : ''}</p>{variety && <small>{variety}</small>}{isOutlier(market.price, mandiOutlierBounds) && <small className="sb-outlier"><AlertTriangle size={12} aria-hidden="true" />असामान्य भाव</small>}</div>;
              })}
            </div>}
            {selectedTicker?.bestMandi && <p className="sb-small-note">मंडी, किस्म और तारीख अलग हो सकती है।</p>}
            {onDeliveryCalculate && <button type="button" className="sb-delivery-cta" onClick={calculateFromHero}><span className="sb-delivery-cta__icon"><Calculator size={21} aria-hidden="true" /></span><span><strong>यहाँ से माल मँगाना सही रहेगा?</strong><small>गाड़ी, दूरी और खर्च के साथ हिसाब देखें</small></span><ArrowRight size={18} aria-hidden="true" /></button>}
            <Link to="/bechne-ka-hisab" state={{ saleScenario: { cropName } }} className="sb-sell-button"><Scale size={17} aria-hidden="true" />कहाँ बेचूँ? भाड़ा काटकर हिसाब करें<ArrowRight size={17} aria-hidden="true" /></Link>
            {Number(heroPrice) > 0 && <WhatsAppShare className="sb-quote-share" text={`${cropName} का मंडी भाव: ₹${number(heroPrice)}/क्विंटल · ${recordLabel(heroRecord) || ''}। हर मंडी का भाव देखें:`} path={cropDetailPath(activeCrop, stateParam)} />}
            <Link to={`/listing/new?type=sell&crop=${encodeURIComponent(activeCrop)}`} className="sb-sell-button"><ShoppingCart size={17} aria-hidden="true" />यह फसल बेचने की लिस्टिंग बनाएँ<ArrowRight size={17} aria-hidden="true" /></Link>
            {priceData?.lastUpdated && <p className="sb-sync-time">स्रोत से डेटा लिया गया: {formatTimestamp(priceData.lastUpdated)} · भाव की तारीख ऊपर देखें</p>}
          </section>
          <div className="sb-trend-panel"><MiniChart data={history} dailyData={dailyHistory} mspSeason={priceData?.crop?.mspSeason} title={`${cropName} का भाव इतिहास`} formatMonth={formatMonthHi} /><p className="sb-data-note"><Info size={15} aria-hidden="true" />यह उपलब्ध भावों का इतिहास है। मंडी और फसल की गुणवत्ता के अनुसार वास्तविक भाव बदल सकता है।</p></div>
        </div> : <div className="sb-price-empty"><Sprout size={30} /><h3>इस फसल का भाव अभी उपलब्ध नहीं है</h3><p>दूसरी फसल या राज्य चुनकर उपलब्ध रिकॉर्ड देखें।</p></div>}

        {mover && <section className="sb-mover-strip" aria-label="उपलब्ध रिकॉर्ड में प्रमुख बदलाव"><div className="sb-mover-strip__label"><p className="sb-eyebrow">भाव में बदलाव</p><h3>बाज़ार की हलचल</h3><span>पिछले दर्ज महीने से</span></div><button type="button" className="sb-mover-quote" onClick={() => chooseCrop(mover.id)}><CropImage id={mover.id} name={mover.nameHi || mover.name} size="md" /><span><strong>{mover.nameHi || mover.name}</strong><small>{mover.mandiCount ? `${number(mover.mandiCount)} मंडियों के रिकॉर्ड` : 'उपलब्ध रिकॉर्ड'}</small></span><b>₹{number(mover.price)}<small>महीने का मध्य भाव / क्विंटल</small></b><span className={`sb-change ${mover.changePct > 0 ? 'sb-change--up' : 'sb-change--down'}`}>{mover.changePct > 0 ? <ArrowUpRight size={18} aria-hidden="true" /> : <ArrowDownRight size={18} aria-hidden="true" />}{mover.changePct > 0 ? '+' : ''}{mover.changePct}%</span></button>{topMovers.length > 1 && <div className="sb-mover-controls"><button type="button" onClick={() => setSliderIndex(index => (index - 1 + topMovers.length) % topMovers.length)} aria-label="पिछली फसल"><ChevronLeft size={18} /></button><span>{sliderIndex % topMovers.length + 1}/{topMovers.length}</span><button type="button" onClick={() => setSliderIndex(index => (index + 1) % topMovers.length)} aria-label="अगली फसल"><ChevronRight size={18} /></button></div>}</section>}

        {comparisons.length > 1 && <div className="sb-market-comparison"><MandiCompare data={comparisons} cropName={cropName} cropEmoji="" dailyHistory={dailyHistory} shelfLife={selectedMeta?.shelfLife} onMandiClick={onMandiClick} cropId={activeCrop} onDeliveryCalculate={onDeliveryCalculate} /></div>}
        {mandiLoading && <div className="sb-comparison-status" role="status">मंडी वार रिकॉर्ड लोड हो रहे हैं…</div>}
        {mandiError && <div className="sb-comparison-status" role="status">मंडी वार तुलना अभी उपलब्ध नहीं है। दूसरी फसल या राज्य चुनकर देखें।</div>}
        <ArbitrageList stateParam={stateParam} onCropClick={chooseCrop} onDeliveryCalculate={onDeliveryCalculate} />

        {visibleCards.length > 0 && <section className="sb-crop-overview" aria-labelledby="sb-overview-title"><div className="sb-section-heading"><div><p className="sb-eyebrow">और फसलों पर नज़र</p><h2 id="sb-overview-title">बाज़ार भाव, एक जगह</h2></div><span className="sb-small-note">उपलब्ध रिकॉर्ड के आधार पर</span></div><div className="sb-price-card-grid">{visibleCards.map(crop => <PriceCard key={crop.id} crop={crop} onClick={() => chooseCrop(crop.id)} />)}</div>{cropsWithPrices.length > 4 && <button type="button" onClick={() => setShowAllCards(!showAllCards)} aria-expanded={showAllCards} className="sb-more-button">{showAllCards ? 'कम दिखाएँ' : `सभी ${cropsWithPrices.length} फसलें देखें`}<ChevronRight size={16} aria-hidden="true" /></button>}</section>}

        {!priceLoading && priceData?.districtBreakdown?.length > 0 && <section className="sb-district-records"><div className="sb-section-heading"><div><p className="sb-eyebrow">डेटा कहाँ से है?</p><h2>ज़िला वार रिकॉर्ड — {cropName}</h2></div></div><div className="sb-district-records__rows">{priceData.districtBreakdown.slice(0, 8).map(district => {
          const maxRecords = Math.max(...priceData.districtBreakdown.map(item => Number(item.records) || 0), 1);
          return <div key={district.district || district.districtId || district.name}><span>{district.nameHi || district.district || district.name}</span><span className="sb-record-bar"><span style={{ width: `${Math.max(0, Number(district.records) / maxRecords * 100)}%` }} /></span><strong>{number(district.records || 0)}</strong></div>;
        })}</div><p className="sb-small-note">यह दर्ज रिकॉर्ड की संख्या है, कारोबार की मात्रा नहीं।</p></section>}
      </> : tickerLoading ? <div className="sb-price-loading" role="status"><span className="sb-loading-dot" />भाव बोर्ड लोड हो रहा है…</div> : tickerError ? <div className="sb-price-empty" role="alert"><Info size={24} /><h3>भाव बोर्ड अभी नहीं खुल पाया</h3><p>दूसरा राज्य चुनें या कुछ देर बाद दोबारा कोशिश करें।</p></div> : <TickerBoard data={validTicker} onSelectCrop={id => { chooseCrop(id); setView('chart'); }} selectedCrop={activeCrop} />}
    </div>
  );
}
