import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, History, Info } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { MONTHS_HI, MONTHS_SHORT_HI, currentMonthIST } from '../utils/kccAdvice';
import { seasonalExtremes, sameMonthEarlier, yearTicks } from '../utils/priceHistory';
import '../styles/price-history.css';

const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
// Row: [YYYY-MM, median, p25, p75, mandis, level]. level is the chain-linked comparable price
// (older files have no level: fall back to the median); the spread is scaled with it.
const levelOf = row => row[5] ?? row[1];
const scaled = (row, value) => (value || row[1]) * levelOf(row) / row[1];
const monthLabel = ym => `${MONTHS_HI[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** Width of an element in CSS pixels (720 before it is measured, e.g. in prerendered HTML). */
function useWidth(ref) {
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    // Redraw only on real size changes (not every pixel of a resize drag).
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next) setWidth(previous => (Math.abs(previous - next) >= 8 ? next : previous));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function LongChart({ rows, title }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const box = useRef(null);
  // Drawn at the real width so axis text keeps its size on a phone instead of shrinking with the SVG.
  const width = Math.max(280, useWidth(box));
  const height = width < 480 ? 200 : 230;
  const pad = { top: 12, right: 10, bottom: 26, left: 52 };
  const values = rows.flatMap(row => [levelOf(row), scaled(row, row[3])]).filter(v => v > 0);
  const max = Math.max(...values) * 1.05;
  const min = Math.max(0, Math.min(...rows.map(row => scaled(row, row[2]))) * 0.9);
  const index = ym => {
    const [y, m] = ym.split('-').map(Number);
    return y * 12 + m - 1;
  };
  const first = index(rows[0][0]);
  const span = Math.max(1, index(rows.at(-1)[0]) - first);
  const x = ym => pad.left + ((index(ym) - first) / span) * (width - pad.left - pad.right);
  const y = v => pad.top + (1 - (v - min) / (max - min || 1)) * (height - pad.top - pad.bottom);
  // A gap of more than two months breaks the line instead of drawing across missing data.
  const segments = [];
  rows.forEach((row, i) => {
    if (!i || index(row[0]) - index(rows[i - 1][0]) > 2) segments.push([]);
    segments.at(-1).push(row);
  });
  const line = seg => seg.map((row, i) => `${i ? 'L' : 'M'}${x(row[0]).toFixed(1)},${y(levelOf(row)).toFixed(1)}`).join('');
  const band = seg => seg.length < 2 ? '' : `${seg.map((row, i) => `${i ? 'L' : 'M'}${x(row[0]).toFixed(1)},${y(scaled(row, row[3])).toFixed(1)}`).join('')}${seg.slice().reverse().map(row => `L${x(row[0]).toFixed(1)},${y(scaled(row, row[2])).toFixed(1)}`).join('')}Z`;
  const gridValues = [0, 0.5, 1].map(f => min + (max - min) * f);
  // The box has a fixed CSS height, so the prerendered chart and the measured one take the same space.
  return <div ref={box} className="sb-history-chart-box"><svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="sb-history-chart" role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-table`}>
    <title id={`${id}-t`}>{title}</title>
    {gridValues.map(v => <g key={v}><line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className="sb-history-grid" /><text x={pad.left - 6} y={y(v) + 4} textAnchor="end" className="sb-history-axis">{money(v)}</text></g>)}
    {yearTicks(rows, Math.max(3, Math.floor(width / 70))).map(ym => <text key={ym} x={x(ym)} y={height - 8} textAnchor="middle" className="sb-history-axis">{ym.slice(0, 4)}</text>)}
    {segments.map((seg, i) => <path key={`b${i}`} d={band(seg)} className="sb-history-band" />)}
    {segments.map((seg, i) => <path key={`l${i}`} d={line(seg)} className="sb-history-line" />)}
    <circle cx={x(rows.at(-1)[0])} cy={y(levelOf(rows.at(-1)))} r="4" className="sb-history-dot" />
  </svg>
  <YearTable id={`${id}-table`} rows={rows} /></div>;
}

/** The chart's data as text: one row per year (average of monthly prices, lowest and highest month). */
function YearTable({ id, rows }) {
  const years = [];
  for (const row of rows) {
    const year = row[0].slice(0, 4);
    if (years.at(-1)?.year !== year) years.push({ year, months: [] });
    years.at(-1).months.push(row);
  }
  return <details className="sb-history-table" id={id}>
    <summary>साल के अनुसार भाव की तालिका</summary>
    <table>
      <caption className="sr-only">हर साल के मासिक भावों का औसत, सबसे कम और सबसे ज़्यादा भाव वाला महीना, ₹/क्विंटल</caption>
      <thead><tr><th scope="col">साल</th><th scope="col">औसत</th><th scope="col">सबसे कम</th><th scope="col">सबसे ज़्यादा</th></tr></thead>
      <tbody>{years.slice().reverse().map(({ year, months }) => {
        const low = months.reduce((a, b) => (levelOf(b) < levelOf(a) ? b : a));
        const high = months.reduce((a, b) => (levelOf(b) > levelOf(a) ? b : a));
        return <tr key={year}><th scope="row">{year}</th><td>{money(months.reduce((sum, row) => sum + levelOf(row), 0) / months.length)}</td><td>{money(levelOf(low))} <small>{MONTHS_SHORT_HI[Number(low[0].slice(5, 7)) - 1]}</small></td><td>{money(levelOf(high))} <small>{MONTHS_SHORT_HI[Number(high[0].slice(5, 7)) - 1]}</small></td></tr>;
      })}</tbody>
    </table>
  </details>;
}

function SeasonBars({ profile, month }) {
  const max = Math.max(5, ...profile.pct.filter(Number.isFinite).map(Math.abs));
  return <div className="sb-history-season" role="list">
    {profile.pct.map((pct, i) => <div key={MONTHS_SHORT_HI[i]} role="listitem" className={`sb-history-season__bar${i + 1 === month ? ' is-current' : ''}`} aria-label={`${MONTHS_HI[i]}${i + 1 === month ? ' (इस महीने)' : ''}: ${pct == null ? 'आँकड़ा नहीं' : `${pct > 0 ? '+' : ''}${Math.round(pct)}%`}`}>
      <div className="sb-history-season__track" aria-hidden="true">
        {pct != null && <span className={pct >= 0 ? 'is-up' : 'is-down'} style={{ height: `${Math.abs(pct) / max * 50}%` }} />}
      </div>
      <b aria-hidden="true" className={pct == null ? '' : pct >= 0 ? 'is-up' : 'is-down'}>{pct == null ? '–' : `${pct > 0 ? '+' : ''}${Math.round(pct)}%`}</b>
      <small aria-hidden="true">{MONTHS_SHORT_HI[i]}</small>
    </div>)}
  </div>;
}

/** On a crop price page: monthly price history since 2009 and the usual seasonal pattern. */
export default function PriceHistory({ cropId, cropName, stateId = 'all', stateNameHi }) {
  const query = stateId && stateId !== 'all' ? `?state=${encodeURIComponent(stateId)}` : '';
  const { data } = useApi(`/price-history/${encodeURIComponent(cropId)}${query}`, { revalidate: false });
  const month = currentMonthIST();
  const rows = data?.state?.length ? data.state : data?.all;
  const scopeHi = data?.state?.length ? stateNameHi : 'भारत';
  const profile = data?.seasonal?.state || data?.seasonal?.all;
  const profileScope = data?.seasonal?.state ? stateNameHi : 'भारत';
  const extremes = useMemo(() => (profile ? seasonalExtremes(profile.pct) : null), [profile]);
  const earlier = useMemo(() => (rows ? sameMonthEarlier(rows, month, [1, 5, 10]) : []), [rows, month]);
  if (!rows?.length) return null;
  const latest = rows.at(-1);
  return <section className="sb-detail-section sb-history" aria-labelledby="history-title">
    <span className="sb-detail-kicker"><History size={15} aria-hidden="true" /> लंबा भाव इतिहास</span>
    <h2 id="history-title">{cropName}: {rows[0][0].slice(0, 4)} से अब तक के भाव · {scopeHi}</h2>
    <p>हर महीने मंडियों के भाव का मध्य (median), ₹/क्विंटल। हल्की पट्टी = बीच की आधी मंडियों का भाव इसी दायरे में रहा। पुराने सालों में कम मंडियाँ भाव भेजती थीं, इसलिए रेखा उन्हीं मंडियों के भाव के बदलाव से जोड़ी गई है।</p>
    <p className="sb-history-note"><Info size={14} aria-hidden="true" /> ये भाव महँगाई जोड़े बिना हैं — 10 साल पहले का ₹1,500 आज के ₹1,500 के बराबर नहीं था।</p>
    <LongChart rows={rows} title={`${cropName} का ${scopeHi} में मासिक भाव, ${monthLabel(rows[0][0])} से ${monthLabel(latest[0])}`} />
    <div className="sb-history-facts">
      <div><span>सबसे नया महीना</span><strong>{money(latest[1])}</strong><small>{monthLabel(latest[0])} · {Number(latest[4]).toLocaleString('en-IN')} मंडियाँ</small></div>
      {earlier.map(item => <div key={item.yearsAgo}><span>{item.yearsAgo === 1 ? 'पिछले साल इसी महीने' : `${item.yearsAgo} साल पहले`}</span><strong>{money(levelOf(item.row))}</strong><small>{monthLabel(item.row[0])}</small></div>)}
    </div>
    {profile && extremes && <div className="sb-history-season-wrap">
      <h3><CalendarDays size={16} aria-hidden="true" /> किस महीने भाव आम तौर पर ऊँचा या नीचा रहता है</h3>
      <p>{profileScope} में {cropName} का भाव आम तौर पर <strong>{MONTHS_HI[extremes.high.month]}</strong> में सबसे ऊँचा (साल के औसत से {extremes.high.pct > 0 ? '+' : ''}{extremes.high.pct}%) और <strong>{MONTHS_HI[extremes.low.month]}</strong> में सबसे नीचा ({extremes.low.pct}%) रहता है।</p>
      <SeasonBars profile={profile} month={month} />
      <p className="sb-history-note"><Info size={14} aria-hidden="true" /> पिछले {profile.years} सालों के आँकड़ों पर आधारित — हर साल का भाव मौसम, आवक और माँग से अलग हो सकता है। बेचने से पहले आज का भाव ज़रूर देखें।</p>
    </div>}
    {data?.source && <p className="sb-history-source">स्रोत: <a href={data.source.url} target="_blank" rel="noopener noreferrer">Agmarknet के दैनिक मंडी भाव, data.gov.in<span className="sr-only"> (नई टैब में खुलेगा)</span></a></p>}
  </section>;
}
