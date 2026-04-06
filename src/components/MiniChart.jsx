import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y'];
const RANGE_LABELS = { '1D': '3 दिन', '1W': '7 दिन', '1M': '1 महीना', '3M': '3 महीने', '6M': '6 महीने', '1Y': '1 साल' };

export default function MiniChart({ data = [], dailyData = [], title = "PRICE TREND", formatMonth }) {
  const [range, setRange] = useState('1D');

  const isDaily = ['1D', '1W', '1M', '3M'].includes(range);

  const chartData = useMemo(() => {
    switch (range) {
      case '1D': return (dailyData.length > 0 ? dailyData : data).slice(-3);
      case '1W': return (dailyData.length > 0 ? dailyData : data).slice(-7);
      case '1M': return (dailyData.length > 0 ? dailyData : data).slice(-30);
      case '3M': return (dailyData.length > 0 ? dailyData : data).slice(-90);
      case '6M': return (data || []).slice(-6);
      case '1Y': return (data || []).slice(-12);
      default: return (dailyData.length > 0 ? dailyData : data).slice(-90);
    }
  }, [range, data, dailyData]);

  if (chartData.length === 0) return null;

  const hasMsp = chartData.some(d => d.msp && d.msp > 0);
  const prices = chartData.flatMap(d =>
    [d.msp, d.market, d.minPrice, d.maxPrice].filter(v => v && v > 0)
  );
  const dataMax = Math.max(...prices);
  const dataMin = Math.min(...prices);
  const padding = (dataMax - dataMin) * 0.15 || 100;
  const yMin = Math.max(0, Math.floor((dataMin - padding) / 100) * 100);
  const yMax = Math.ceil((dataMax + padding) / 100) * 100;
  const yRange = yMax - yMin || 1;

  const tickCount = 4;
  const tickStep = Math.ceil(yRange / tickCount / 100) * 100;
  const yTicks = [];
  for (let v = yMin; v <= yMax; v += tickStep) yTicks.push(v);

  const maxVol = Math.max(...chartData.map(d => d.volume || 0)) || 1;

  const leftPad = 48, rightPad = 12, topPad = 12, bottomPad = 48;
  const volH = 28;
  const chartW = 320;
  const chartH = 140;
  const totalW = leftPad + chartW + rightPad;
  const totalH = topPad + chartH + volH + bottomPad;

  const xStep = chartW / (chartData.length - 1 || 1);
  const barW = Math.min(xStep * 0.5, 16);

  const toX = (i) => leftPad + i * xStep;
  const toY = (val) => topPad + chartH - ((val - yMin) / yRange) * chartH;

  const marketPath = chartData
    .map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.market)}`)
    .join(" ");

  const areaPath =
    `M${toX(0)},${toY(chartData[0].market)} ` +
    chartData.slice(1).map((d, i) => `L${toX(i + 1)},${toY(d.market)}`).join(" ") +
    ` L${toX(chartData.length - 1)},${topPad + chartH} L${toX(0)},${topPad + chartH} Z`;

  const mspPath = hasMsp
    ? chartData.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.msp || d.market)}`).join(" ")
    : null;

  const last = chartData[chartData.length - 1];
  const prev = chartData.length > 1 ? chartData[chartData.length - 2] : last;
  const change = last.market - prev.market;
  const changePct = prev.market ? ((change / prev.market) * 100).toFixed(1) : "0.0";
  const isUp = change >= 0;

  // X-axis label: thin for daily to prevent overcrowding
  const labelInterval = isDaily ? Math.max(1, Math.ceil(chartData.length / 8)) : 1;

  function formatDailyLabel(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
    return dateStr;
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] text-muted-foreground tracking-wider">
            {title} — {RANGE_LABELS[range]}
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-extrabold text-foreground">
            ₹{last.market?.toLocaleString()}
          </span>
          <span className={`text-sm font-bold ${isUp ? "text-green-500" : "text-red-500"}`}>
            {isUp ? "+" : ""}{change.toLocaleString()} ({isUp ? "+" : ""}{changePct}%)
          </span>
        </div>
        {hasMsp && last.msp && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            MSP: ₹{last.msp.toLocaleString()}
            <span className={`ml-2 font-semibold ${last.market >= last.msp ? "text-green-500" : "text-red-500"}`}>
              MSP से {last.market >= last.msp ? "ऊपर" : "नीचे"}
            </span>
          </div>
        )}

        {/* Time Range Selector */}
        <div className="flex gap-1 mt-2">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                range === r
                  ? 'bg-green-500 text-green-950'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-2 pb-3">
        <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ height: 200 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02"/>
            </linearGradient>
          </defs>

          {/* Grid lines + Y-axis labels */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={leftPad} y1={toY(v)} x2={leftPad + chartW} y2={toY(v)}
                stroke="#27272a" strokeWidth="1"/>
              <text x={leftPad - 6} y={toY(v) + 3} textAnchor="end"
                fill="#71717a" fontSize="9" fontFamily="system-ui">
                {v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}
              </text>
            </g>
          ))}

          {/* Volume bars */}
          {chartData.map((d, i) => (
            <rect key={`v-${i}`}
              x={toX(i) - barW / 2}
              y={topPad + chartH + 4}
              width={barW}
              height={((d.volume || 0) / maxVol) * volH}
              fill="#27272a" rx={2}/>
          ))}

          {/* Min-Max range band */}
          {chartData.some(d => d.minPrice && d.maxPrice) && (
            <polygon
              points={
                chartData.map((d, i) => `${toX(i)},${toY(d.maxPrice || d.market)}`).join(" ") + " " +
                [...chartData].reverse().map((d, i) => `${toX(chartData.length - 1 - i)},${toY(d.minPrice || d.market)}`).join(" ")
              }
              fill="#14532d" opacity="0.4"/>
          )}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)"/>

          {/* MSP dashed line */}
          {mspPath && (
            <path d={mspPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.8"/>
          )}

          {/* Market line */}
          <path d={marketPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

          {/* Data points — show fewer dots on dense charts */}
          {chartData.map((d, i) => {
            const isLast = i === chartData.length - 1;
            const showDot = isLast || !isDaily || chartData.length <= 15 || i % labelInterval === 0;
            if (!showDot) return null;
            return (
              <circle key={i} cx={toX(i)} cy={toY(d.market)} r={isLast ? 4 : 2.5}
                fill={isLast ? "#22c55e" : "#18181b"} stroke="#22c55e" strokeWidth="1.5"/>
            );
          })}

          {/* Last point highlight */}
          <circle cx={toX(chartData.length - 1)} cy={toY(last.market)} r="7"
            fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4"/>

          {/* X-axis labels */}
          {chartData.map((d, i) => {
            const isLast = i === chartData.length - 1;
            const showLabel = isLast || i === 0 || i % labelInterval === 0;
            if (!showLabel) return null;

            const label = isDaily && d.date
              ? formatDailyLabel(d.date)
              : (formatMonth ? formatMonth(d.month) : d.month);

            return (
              <text key={`l-${i}`} x={toX(i)} y={topPad + chartH + volH + 18}
                textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="'Noto Sans Devanagari', system-ui">
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-4 border-t border-zinc-800 pt-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-3 h-[2px] bg-green-500 rounded"/> बाज़ार
        </div>
        {hasMsp && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-[2px] bg-amber-500 rounded" style={{ borderTop: "1px dashed #f59e0b" }}/> MSP
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 bg-zinc-800 rounded-sm"/> मात्रा
        </div>
      </div>
    </Card>
  );
}
