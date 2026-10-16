import { useState, useMemo, useId } from "react";
import { Card } from "@/components/ui/card";
import { comparableChange, gapNote } from '../utils/priceChange';

const RECORD_RANGES = [3, 7, 30, 'all'];
const COLORS = { forest: '#174C3C', gold: '#A37A25', grid: '#E4E9DE', muted: '#65796A', ink: '#1B3027', band: '#DDE7D3', volume: '#C0CDB5' };
const positiveNumber = value => Number.isFinite(Number(value)) && Number(value) > 0;

function availableRecords(records) {
  if (!Array.isArray(records)) return [];
  const valid = records.filter(record => record && positiveNumber(record.market));
  // ISO dates can be ordered without interpreting a month as a particular day.
  return valid.every(record => /^\d{4}-\d{2}(?:-\d{2})?$/.test(record.date || ''))
    ? [...valid].sort((a, b) => a.date.localeCompare(b.date))
    : valid;
}

function dateLabel(record, formatMonth) {
  const date = String(record.date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [, month, day] = date.split('-');
    return `${Number(day)}/${Number(month)}`;
  }
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-');
    return `${Number(month)}/${year.slice(2)}`;
  }
  return record.month ? (formatMonth ? formatMonth(record.month) : record.month) : '';
}

export default function MiniChart({ data = [], dailyData = [], title = "भाव का इतिहास", formatMonth }) {
  const [range, setRange] = useState(7);
  const [preferredSource, setPreferredSource] = useState('daily');
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `price-area-${instanceId}`;
  const titleId = `price-title-${instanceId}`;
  const descriptionId = `price-description-${instanceId}`;
  const dailyRecords = useMemo(() => availableRecords(dailyData), [dailyData]);
  const monthlyRecords = useMemo(() => availableRecords(data), [data]);
  const source = preferredSource === 'daily'
    ? (dailyRecords.length ? 'daily' : 'monthly')
    : (monthlyRecords.length ? 'monthly' : 'daily');
  const records = source === 'daily' ? dailyRecords : monthlyRecords;
  const chartData = range === 'all' ? records : records.slice(-range);

  if (!chartData.length) return null;

  const isMonthly = source === 'monthly';
  const hasMsp = chartData.some(record => positiveNumber(record.msp));
  const hasVolume = chartData.some(record => positiveNumber(record.volume));
  const hasPriceRange = chartData.some(record => positiveNumber(record.minPrice) && positiveNumber(record.maxPrice) && Number(record.minPrice) <= Number(record.maxPrice));
  const prices = chartData.flatMap(record => [record.market, record.msp,
    ...(positiveNumber(record.minPrice) && positiveNumber(record.maxPrice) && Number(record.minPrice) <= Number(record.maxPrice) ? [record.minPrice, record.maxPrice] : [])]
    .filter(positiveNumber).map(Number));
  const dataMax = Math.max(...prices);
  const dataMin = Math.min(...prices);
  const padding = (dataMax - dataMin) * .15 || Math.max(dataMax * .08, 20);
  const yMin = Math.max(0, Math.floor((dataMin - padding) / 100) * 100);
  const yMax = Math.ceil((dataMax + padding) / 100) * 100;
  const yRange = yMax - yMin || 1;
  const tickStep = Math.ceil(yRange / 4 / 100) * 100;
  const yTicks = [];
  for (let value = yMin; value <= yMax; value += tickStep) yTicks.push(value);

  const leftPad = 50, rightPad = 18, topPad = 16, bottomPad = 33;
  const chartW = 320, chartH = 140, volumeHeight = hasVolume ? 24 : 0;
  const totalW = leftPad + chartW + rightPad;
  const totalH = topPad + chartH + volumeHeight + bottomPad;
  const xStep = chartW / (chartData.length - 1 || 1);
  const barW = Math.min(xStep * .45, 14);
  const toX = index => chartData.length === 1 ? leftPad + chartW / 2 : leftPad + index * xStep;
  const toY = value => topPad + chartH - ((Number(value) - yMin) / yRange) * chartH;
  const marketPath = chartData.map((record, index) => `${index ? 'L' : 'M'}${toX(index)},${toY(record.market)}`).join(' ');
  const areaPath = `${marketPath} L${toX(chartData.length - 1)},${topPad + chartH} L${toX(0)},${topPad + chartH} Z`;
  // Start a fresh segment after every missing MSP. A market price is never an MSP fallback.
  const mspPath = chartData.map((record, index) => positiveNumber(record.msp)
    ? `${index > 0 && positiveNumber(chartData[index - 1].msp) ? 'L' : 'M'}${toX(index)},${toY(record.msp)}`
    : '').filter(Boolean).join(' ');
  const maxVolume = Math.max(...chartData.map(record => positiveNumber(record.volume) ? Number(record.volume) : 0), 1);
  const last = chartData.at(-1);
  const previous = chartData.at(-2);
  const comparison = comparableChange(last, previous, { daily: !isMonthly });
  const change = comparison.status === 'ok' ? comparison.change : null;
  const changePct = change !== null ? comparison.pct.toFixed(1) : null;
  const lastDate = last.date || (last.month ? (formatMonth ? formatMonth(last.month) : last.month) : 'तिथि उपलब्ध नहीं');
  const labels = new Set([0, chartData.length - 1]);
  // At most four well-spaced labels, including both ends of the selected records.
  if (chartData.length > 2) [1, 2].forEach(part => labels.add(Math.round((chartData.length - 1) * part / 3)));
  const buttonStyle = selected => ({ minHeight: 44, padding: '8px 12px', borderRadius: 8, border: '1px solid',
    borderColor: selected ? COLORS.forest : '#DCE3D6', background: selected ? COLORS.forest : '#F8FAF5',
    color: selected ? '#FFFFFF' : COLORS.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

  return (
    <Card className="overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#DDE3D7', gap: 0 }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${COLORS.grid}` }}>
        <h3 className="text-sm font-semibold" style={{ color: COLORS.ink }}>{title}</h3>
        <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
          {isMonthly ? 'मासिक औसत' : 'दिनवार रिकॉर्ड'} · {chartData.length} उपलब्ध रिकॉर्ड · अंतिम तिथि: {lastDate}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-3">
          <span className="text-2xl font-bold tabular-nums" style={{ color: COLORS.ink }}>₹{Number(last.market).toLocaleString('en-IN')}</span>
          <span className="text-xs" style={{ color: COLORS.muted }}>/क्विंटल</span>
          {change !== null && <span className="text-xs font-semibold" style={{ color: change < 0 ? '#A54235' : COLORS.forest }}>
            {change > 0 ? '+' : ''}{change.toLocaleString('en-IN')} ({change > 0 ? '+' : ''}{changePct}%)
          </span>}
        </div>
        {change !== null && <p className="text-xs mt-1" style={{ color: COLORS.muted }}>पिछले उपलब्ध रिकॉर्ड से बदलाव</p>}
        {comparison.status === 'gap' && <p className="text-xs mt-1" style={{ color: COLORS.muted }}>{gapNote(comparison)}।</p>}
        {positiveNumber(last.msp) && <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
          दर्ज MSP: ₹{Number(last.msp).toLocaleString('en-IN')}
          <span className="ml-2" style={{ color: Number(last.market) < Number(last.msp) ? '#A54235' : COLORS.forest }}>
            {Number(last.market) === Number(last.msp) ? 'MSP के बराबर' : `MSP से ${Number(last.market) > Number(last.msp) ? 'ऊपर' : 'नीचे'}`}
          </span>
        </p>}
        {dailyRecords.length > 0 && monthlyRecords.length > 0 && <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="भाव इतिहास का प्रकार">
          <button type="button" onClick={() => setPreferredSource('daily')} aria-pressed={!isMonthly} style={buttonStyle(!isMonthly)}>दिनवार रिकॉर्ड</button>
          <button type="button" onClick={() => setPreferredSource('monthly')} aria-pressed={isMonthly} style={buttonStyle(isMonthly)}>मासिक औसत</button>
        </div>}
        <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="अंतिम कितने उपलब्ध रिकॉर्ड दिखाएँ">
          {RECORD_RANGES.map(value => <button type="button" key={value} onClick={() => setRange(value)} aria-pressed={range === value} style={buttonStyle(range === value)}>
            {value === 'all' ? 'सभी' : `${value} रिकॉर्ड`}
          </button>)}
        </div>
      </div>

      <div className="px-2 pt-3 pb-1">
        <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ display: 'block', minHeight: 195 }} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
          <title id={titleId}>{`${title} — ${chartData.length} उपलब्ध रिकॉर्ड`}</title>
          <desc id={descriptionId}>
            {isMonthly ? 'मासिक औसत भाव।' : 'उपलब्ध दिनवार भाव।'} अंतिम रिकॉर्ड {lastDate}: ₹{Number(last.market).toLocaleString('en-IN')} प्रति क्विंटल।
            {change !== null ? ` पिछले उपलब्ध रिकॉर्ड से ${change > 0 ? 'वृद्धि' : change < 0 ? 'कमी' : 'बदलाव नहीं'}${change ? ` ₹${Math.abs(change).toLocaleString('en-IN')}` : ''}।` : ' तुलना के लिए पिछला रिकॉर्ड उपलब्ध नहीं।'}
            बिंदु रिकॉर्ड के क्रम में हैं; बीच की दूरी समान समय नहीं दर्शाती।
            {hasMsp ? ' सुनहरी टूटी रेखा केवल उपलब्ध MSP दिखाती है।' : ''}
          </desc>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.forest} stopOpacity=".13" />
            <stop offset="100%" stopColor={COLORS.forest} stopOpacity=".01" />
          </linearGradient></defs>
          {yTicks.map(value => <g key={value}>
            <line x1={leftPad} y1={toY(value)} x2={leftPad + chartW} y2={toY(value)} stroke={COLORS.grid} />
            <text x={leftPad - 8} y={toY(value) + 3} textAnchor="end" fill={COLORS.muted} fontSize="10" fontFamily="system-ui">
              {value.toLocaleString('en-IN')}
            </text>
          </g>)}
          {hasVolume && chartData.map((record, index) => positiveNumber(record.volume) && <rect key={`volume-${index}`}
            x={toX(index) - barW / 2} y={topPad + chartH + 5} width={barW}
            height={Number(record.volume) / maxVolume * volumeHeight} fill={COLORS.volume} rx="2" />)}
          {hasPriceRange && chartData.map((record, index) => positiveNumber(record.minPrice) && positiveNumber(record.maxPrice) && Number(record.minPrice) <= Number(record.maxPrice) && <line key={`range-${index}`}
            x1={toX(index)} x2={toX(index)} y1={toY(record.minPrice)} y2={toY(record.maxPrice)} stroke={COLORS.band} strokeWidth={Math.min(barW, 8)} strokeLinecap="round" />)}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          {hasMsp && <path data-series="msp" d={mspPath} fill="none" stroke={COLORS.gold} strokeWidth="1.6" strokeDasharray="5,4" />}
          {hasMsp && chartData.map((record, index) => positiveNumber(record.msp) && <circle key={`msp-${index}`} cx={toX(index)} cy={toY(record.msp)} r="2" fill={COLORS.gold} />)}
          <path d={marketPath} fill="none" stroke={COLORS.forest} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {chartData.map((record, index) => (labels.has(index) || chartData.length < 10) && <circle key={`point-${index}`}
            cx={toX(index)} cy={toY(record.market)} r={index === chartData.length - 1 ? 4 : 2.5} fill="#FFFFFF" stroke={COLORS.forest} strokeWidth="1.8" />)}
          {chartData.map((record, index) => labels.has(index) && <text key={`label-${index}`} x={toX(index)} y={topPad + chartH + volumeHeight + 23}
            textAnchor={chartData.length === 1 ? 'middle' : index === 0 ? 'start' : index === chartData.length - 1 ? 'end' : 'middle'} fill={COLORS.muted} fontSize="10" fontFamily="inherit">
            {dateLabel(record, formatMonth) || `#${records.length - chartData.length + index + 1}`}
          </text>)}
        </svg>
      </div>
      <div className="px-4 pt-3 pb-4" style={{ borderTop: `1px solid ${COLORS.grid}` }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: COLORS.muted }}>
          <span className="inline-flex items-center gap-1.5"><span style={{ width: 13, height: 3, background: COLORS.forest, borderRadius: 2 }} />बाज़ार भाव</span>
          {hasMsp && <span className="inline-flex items-center gap-1.5"><span style={{ width: 13, borderTop: `2px dashed ${COLORS.gold}` }} />दर्ज MSP</span>}
          {hasPriceRange && <span className="inline-flex items-center gap-1.5"><span style={{ width: 10, height: 10, background: COLORS.band, borderRadius: 2 }} />न्यूनतम–अधिकतम</span>}
          {hasVolume && <span className="inline-flex items-center gap-1.5"><span style={{ width: 10, height: 10, background: COLORS.volume, borderRadius: 2 }} />सापेक्ष मात्रा</span>}
        </div>
        <p className="text-[11px] leading-relaxed mt-3" style={{ color: COLORS.muted }}>बिंदु उपलब्ध रिकॉर्ड के क्रम में हैं। बीच की दूरी समान समय नहीं दर्शाती।</p>
      </div>
    </Card>
  );
}
