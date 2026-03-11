export default function MiniChart({ data, title = "📈 PRICE TREND" }) {
  if (!data || data.length === 0) return null;
  const hasMsp = data.some(d => d.msp && d.msp > 0);
  const prices = data.flatMap(d => [d.msp, d.market, d.minPrice, d.maxPrice].filter(v => v && v > 0));
  const maxVal = Math.max(...prices);
  const minVal = Math.min(...prices) - 50;
  const range = maxVal - minVal || 1;
  const maxVol = Math.max(...data.map(d => d.volume || 0)) || 1;
  const w = 320, h = 100, volH = 25;
  const step = w / (data.length - 1 || 1);
  const barW = Math.min(step * 0.6, 18);

  const marketPoints = data.map((d, i) => `${i * step},${h - ((d.market - minVal) / range) * h}`).join(" ");
  const mspPoints = hasMsp ? data.map((d, i) => `${i * step},${h - (((d.msp || d.market) - minVal) / range) * h}`).join(" ") : null;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
      <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 12 }}>{title}</div>
      <svg viewBox={`-10 -10 ${w + 20} ${h + volH + 35}`} style={{ width: "100%", height: 150 }}>
        {/* Volume bars */}
        {data.map((d, i) => (
          <rect key={`v-${i}`} x={i * step - barW / 2} y={h + 2}
            width={barW} height={((d.volume || 0) / maxVol) * volH}
            fill="rgba(76,175,80,0.12)" rx={2}/>
        ))}
        {/* Min-Max range band */}
        {data.some(d => d.minPrice && d.maxPrice) && (
          <polygon
            points={
              data.map((d, i) => `${i * step},${h - (((d.maxPrice || d.market) - minVal) / range) * h}`).join(" ") + " " +
              [...data].reverse().map((d, i) => `${(data.length - 1 - i) * step},${h - (((d.minPrice || d.market) - minVal) / range) * h}`).join(" ")
            }
            fill="rgba(76,175,80,0.06)"/>
        )}
        {/* MSP dashed line */}
        {mspPoints && <polyline points={mspPoints} fill="none" stroke="#FFB300" strokeWidth="2" strokeDasharray="4,4" opacity="0.6"/>}
        {/* Market line */}
        <polyline points={marketPoints} fill="none" stroke="#4CAF50" strokeWidth="2.5"/>
        {data.map((d, i) => (
          <circle key={i} cx={i * step} cy={h - ((d.market - minVal) / range) * h} r="3" fill="#4CAF50"/>
        ))}
        {data.map((d, i) => (
          <text key={`l-${i}`} x={i * step} y={h + volH + 18} textAnchor="middle" fill="#546E7A" fontSize="8">{d.month}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
        {hasMsp && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#78909C" }}>
            <div style={{ width: 16, height: 2, background: "#FFB300", borderRadius: 1 }}/> MSP
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#78909C" }}>
          <div style={{ width: 16, height: 2, background: "#4CAF50", borderRadius: 1 }}/> Market
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#78909C" }}>
          <div style={{ width: 8, height: 8, background: "rgba(76,175,80,0.2)", borderRadius: 2 }}/> Volume
        </div>
      </div>
    </div>
  );
}
