import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, ChevronDown, ChevronUp, Info, RefreshCw, ShieldCheck, Store, X } from 'lucide-react';
import CropImage from '@/components/CropImage';
import { MONTHS } from '../data/constants';
import { useApi } from '../hooks/useApi';
import { getDataFreshness, getLatestQuoteDate } from '../utils/dataFreshness';
import '@/styles/secondary.css';

const HEAT = ['#edf0e6', '#c7d6b7', '#8cad8a', '#507f63', '#174c3c'];
const heatSolid = value => HEAT[value <= 1 ? 0 : value <= 3 ? 1 : value <= 5 ? 2 : value <= 7 ? 3 : 4];
const number = value => value != null && Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
const change = value => `${value > 0 ? '+' : ''}${number(value)}%`;

export default function MandisTab({ selectedMonth, heatmap, regions, stateParam, onCropClick, jumpToMandi, onMandiConsumed }) {
  const [showAllHeatmap, setShowAllHeatmap] = useState(false);
  const [showAllGainers, setShowAllGainers] = useState(false);
  const [showAllLosers, setShowAllLosers] = useState(false);
  const [month, setMonth] = useState(selectedMonth);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setMonth(selectedMonth); }, [selectedMonth]);
  useEffect(() => {
    if (!jumpToMandi) return;
    const timer = setTimeout(() => onMandiConsumed?.(), 8000);
    return () => clearTimeout(timer);
  }, [jumpToMandi, onMandiConsumed]);

  const query = `?state=${encodeURIComponent(stateParam || 'all')}&refresh=${retry}`;
  const { data: tickerData, loading, error } = useApi(`/ticker${query}`);
  const { data: summaryData } = useApi(`/stats${query}`);
  const summaryDate = Array.isArray(summaryData?.dateRange)
    ? getLatestQuoteDate(summaryData.dateRange.map(date => ({ date })))
    : summaryData?.dateRange?.to;
  const freshness = getDataFreshness(summaryDate);
  const totalMandis = Number.isFinite(summaryData?.totalMandis) ? summaryData.totalMandis : null;
  const heatmapEntries = Object.entries(heatmap || {}).filter(([, values]) => Array.isArray(values));
  const visibleHeatmap = showAllHeatmap ? heatmapEntries : heatmapEntries.slice(0, 15);
  const selectedMonthHasRecords = heatmapEntries.some(([, values]) => Number(values[month]) > 0);

  const stats = useMemo(() => {
    if (!Array.isArray(tickerData) || !tickerData.length) return null;
    const comparable = tickerData.filter(crop => crop.price > 0 && crop.prevPrice > 0 && Number.isFinite(crop.changePct));
    const gainers = comparable.filter(crop => crop.changePct > 0).sort((a, b) => b.changePct - a.changePct);
    const losers = comparable.filter(crop => crop.changePct < 0).sort((a, b) => a.changePct - b.changePct);
    const flat = comparable.filter(crop => crop.changePct === 0);
    const mostActive = [...tickerData].sort((a, b) => (b.records || 0) - (a.records || 0)).slice(0, 5);
    const mspCrops = tickerData.filter(crop => crop.msp > 0 && Number.isFinite(crop.mspDiffPct));
    return {
      crops: tickerData.length, comparableCount: comparable.length,
      missingChange: tickerData.length - comparable.length, gainers, losers, flat, mostActive,
      maxRecords: Math.max(1, mostActive[0]?.records || 0),
      gainerPct: comparable.length ? gainers.length / comparable.length * 100 : 0,
      loserPct: comparable.length ? losers.length / comparable.length * 100 : 0,
      aboveMsp: mspCrops.filter(crop => crop.mspDiffPct > 0).sort((a, b) => b.mspDiffPct - a.mspDiffPct),
      belowMsp: mspCrops.filter(crop => crop.mspDiffPct < 0).sort((a, b) => a.mspDiffPct - b.mspDiffPct),
    };
  }, [tickerData]);

  const cropButton = (crop, metric, direction) => <button type="button" key={crop.id} className="sb-market-crop-row" onClick={() => onCropClick?.(crop.id)} aria-label={`${crop.nameHi || crop.name}: ${metric}; भाव का विवरण देखें`}><span><CropImage id={crop.id} name={crop.nameHi || crop.name} size="sm" /><strong>{crop.nameHi || crop.name}</strong></span><b data-direction={direction}>{metric}</b></button>;

  return <div className="sb-secondary-tab sb-mandis-tab flex flex-col">
    <div className="sb-secondary-heading"><div><span className="sb-secondary-eyebrow">मंडी नज़र</span><h2>बाज़ार की चाल समझें</h2><p>उपलब्ध मासिक औसत में बदलाव और मंडी रिकॉर्ड एक जगह।</p></div><span className="sb-feature-icon"><BarChart3 size={28} /></span></div>
    {jumpToMandi && <div className="sb-mandi-context"><Store size={20} /><div><strong>मंडी संदर्भ: {jumpToMandi}</strong><p>भाव टैब से आए हैं। नीचे उपलब्ध मंडियों का रिकॉर्ड इतिहास देखें।</p></div><button type="button" onClick={() => onMandiConsumed?.()} aria-label="मंडी संदेश बंद करें"><X size={18} /></button></div>}
    {loading && <div className="sb-listing-grid" role="status" aria-label="मंडी सारांश लोड हो रहा है"><div className="sb-listing-skeleton" /><div className="sb-listing-skeleton" /></div>}
    {!loading && error && <div className="sb-secondary-empty" role="status"><RefreshCw size={27} /><h3>मंडी सारांश नहीं खुल सका</h3><p>नेटवर्क जाँचें और फिर कोशिश करें।</p><button type="button" className="sb-secondary-outline" onClick={() => setRetry(value => value + 1)}>दोबारा कोशिश करें</button></div>}
    {!loading && !error && !stats && <div className="sb-secondary-empty"><BarChart3 size={27} /><h3>इस क्षेत्र का भाव सारांश उपलब्ध नहीं</h3><p>ऊपर से दूसरा राज्य चुनकर उसके उपलब्ध रिकॉर्ड देखें।</p></div>}
    {stats && <>
      <div className="sb-context-note"><Info size={18} /><div><strong>डेटासेट का अंतिम दर्ज दिन: {freshness.dateLabel}{freshness.date ? ` · ${freshness.label}` : ''}</strong><p>तेज़ी / मंदी: पिछला उपलब्ध मासिक औसत बनाम नवीनतम उपलब्ध मासिक औसत। हर फसल की अलग तारीख इस सारांश में उपलब्ध नहीं है।</p></div></div>
      <div className="sb-market-overview">{[{ label: 'दर्ज फसलें', value: stats.crops }, { label: 'रिपोर्टिंग मंडियाँ', value: totalMandis }, { label: 'मासिक औसत बढ़ा', value: stats.gainers.length, direction: 'up' }, { label: 'मासिक औसत घटा', value: stats.losers.length, direction: 'down' }].map(item => <article key={item.label}><span>{item.label}</span><strong data-direction={item.direction}>{item.value == null ? '—' : number(item.value)}</strong></article>)}</div>
      <section className="sb-market-panel"><div className="sb-section-title"><Activity size={19} /><h3>मासिक औसत में बदलाव</h3><span>{stats.comparableCount} तुलनीय फसलें</span></div><div className="sb-market-breadth" aria-hidden="true"><span style={{ width: `${stats.gainerPct}%` }} /><span style={{ width: `${stats.loserPct}%` }} /></div><div className="sb-breadth-labels"><span><ArrowUpRight size={17} />{stats.gainers.length} तेज़ी</span><span>{stats.flat.length} स्थिर</span><span>{stats.losers.length} मंदी<ArrowDownRight size={17} /></span></div>{stats.missingChange > 0 && <p className="sb-data-caption">{stats.missingChange} फसलों का पिछला तुलनीय औसत नहीं मिला; इन्हें तेज़ी / मंदी की गणना में शामिल नहीं किया गया है।</p>}</section>
      <div className="sb-market-two-col">{[{ title: 'मासिक औसत में तेज़ी', items: stats.gainers, expanded: showAllGainers, toggle: setShowAllGainers, direction: 'up' }, { title: 'मासिक औसत में मंदी', items: stats.losers, expanded: showAllLosers, toggle: setShowAllLosers, direction: 'down' }].map(group => <section className="sb-market-panel" key={group.title}><div className="sb-section-title">{group.direction === 'up' ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}<h3>{group.title}</h3><span>{group.items.length}</span></div><div className="sb-market-crop-list">{(group.expanded ? group.items : group.items.slice(0, 5)).map(crop => cropButton(crop, change(crop.changePct), group.direction))}{!group.items.length && <p className="sb-data-caption">तुलनीय रिकॉर्ड में इस श्रेणी की फसल नहीं मिली।</p>}</div>{group.items.length > 5 && <button type="button" className="sb-market-more" aria-expanded={group.expanded} onClick={() => group.toggle(!group.expanded)}>{group.expanded ? 'कम दिखाएँ' : `सभी ${group.items.length} फसलें देखें`}{group.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>}</section>)}</div>
      <section className="sb-market-panel"><div className="sb-section-title"><BarChart3 size={19} /><h3>सबसे अधिक दर्ज रिकॉर्ड</h3></div><p className="sb-data-caption">रिकॉर्ड की संख्या डेटा कवरेज बताती है; यह बिक्री की मात्रा या मूल्य नहीं है। भाव ₹ / क्विंटल में उपलब्ध मासिक औसत हैं।</p><div className="sb-market-ranking-head"><span>फसल</span><span>मासिक औसत</span><span>रिकॉर्ड</span></div>{stats.mostActive.map((crop, index) => <button type="button" key={crop.id} onClick={() => onCropClick?.(crop.id)} className="sb-market-ranking"><span><small>{index + 1}</small><CropImage id={crop.id} name={crop.nameHi || crop.name} size="sm" /><strong>{crop.nameHi || crop.name}</strong></span><b>{crop.price > 0 ? `₹${number(crop.price)}` : '—'}</b><span>{number(crop.records)}</span><i style={{ width: `${Math.min(100, (crop.records || 0) / stats.maxRecords * 100)}%` }} /></button>)}</section>
      {(stats.aboveMsp.length > 0 || stats.belowMsp.length > 0) && <section><div className="sb-section-title"><ShieldCheck size={20} /><h3>MSP (2026-27) से तुलना</h3></div><p className="sb-data-caption">डेटासेट के MSP और मासिक औसत की तुलना। खरीद सुनिश्चित नहीं है; विपणन वर्ष, किस्म और खरीद केंद्र की शर्तें अलग से जाँचें।</p><div className="sb-market-two-col">{[{ title: 'दर्ज MSP से ऊपर', items: stats.aboveMsp, direction: 'up' }, { title: 'दर्ज MSP से नीचे', items: stats.belowMsp, direction: 'down' }].map(group => <div key={group.title} className="sb-market-panel"><div className="sb-section-title"><h3>{group.title}</h3><span>{group.items.length}</span></div>{group.items.slice(0, 6).map(crop => cropButton(crop, change(crop.mspDiffPct), group.direction))}{!group.items.length && <p className="sb-data-caption">इस श्रेणी में रिकॉर्ड नहीं मिला।</p>}{group.items.length > 6 && <p className="sb-data-caption">सबसे बड़े अंतर वाली 6 फसलें दिखाई गई हैं।</p>}</div>)}</div></section>}
    </>}

    <section><div className="sb-section-title"><h3>महीनेवार रिकॉर्ड सूचकांक</h3><label className="sb-heatmap-month">महीना<select value={month} onChange={event => setMonth(Number(event.target.value))}>{MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label></div><p className="sb-data-caption">उपलब्ध ऐतिहासिक रिकॉर्ड का सूचकांक (1–10); वर्ष अलग नहीं दिए गए हैं। “—” का अर्थ स्रोत में उस महीने का रिकॉर्ड नहीं मिला, मंडी बंद होना नहीं है।</p>
      {heatmapEntries.length ? <>{!selectedMonthHasRecords && <div className="sb-context-note"><Info size={17} /><p>{MONTHS[month]} के लिए इन मंडियों का दर्ज सूचकांक उपलब्ध नहीं है। दूसरे महीनों का उपलब्ध इतिहास नीचे देखें।</p></div>}<div className="sb-calendar-table-scroll" role="region" tabIndex={0} aria-label="मंडी का महीनेवार रिकॉर्ड इतिहास; सभी महीने देखने के लिए दाएँ स्क्रॉल करें"><table className="sb-calendar-table sb-heatmap-table"><caption className="sr-only">महीने के अनुसार मंडी रिकॉर्ड सूचकांक</caption><thead><tr><th scope="col">मंडी</th>{MONTHS.map((name, index) => <th scope="col" key={name} data-current={month === index}>{name}</th>)}</tr></thead><tbody>{visibleHeatmap.map(([mandi, values]) => <tr key={mandi}><th scope="row">{mandi}</th>{MONTHS.map((name, index) => { const value = Number(values[index]); const hasRecord = Number.isFinite(value) && value > 0; return <td key={name} data-current={month === index}><span className="sb-calendar-cell" style={{ background: hasRecord ? heatSolid(value) : '#f2f3ee', color: hasRecord && value > 5 ? '#fff' : '#536559' }} title={`${mandi} · ${name}: ${hasRecord ? `${value}/10` : 'रिकॉर्ड उपलब्ध नहीं'}`}>{hasRecord ? value : '—'}</span></td>; })}</tr>)}</tbody></table></div><div className="sb-heatmap-footer"><div className="sb-phase-legend"><span>कम</span>{HEAT.map(color => <i key={color} style={{ background: color }} />)}<span>ज़्यादा</span></div>{heatmapEntries.length > 15 && <button type="button" className="sb-secondary-outline" aria-expanded={showAllHeatmap} onClick={() => setShowAllHeatmap(!showAllHeatmap)}>{showAllHeatmap ? 'कम दिखाएँ' : `सभी ${heatmapEntries.length} मंडियाँ देखें`}{showAllHeatmap ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>}</div></> : <div className="sb-secondary-empty"><p>इस क्षेत्र का महीनेवार रिकॉर्ड सूचकांक उपलब्ध नहीं है।</p></div>}
    </section>
    {Array.isArray(regions) && regions.length > 0 && <section><div className="sb-section-title"><h3>क्षेत्र का परिचय</h3></div><div className="sb-season-grid">{regions.map(region => <article key={region.name}><h4>{region.name}</h4><p>{region.districts}</p><div className="sb-region-crops">{(region.crops || []).map(crop => <span key={crop}>{crop}</span>)}</div></article>)}</div></section>}
  </div>;
}
