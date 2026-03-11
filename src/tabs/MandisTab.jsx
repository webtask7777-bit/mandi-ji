import { MONTHS, FALLBACK_REGIONS } from "../data/constants";
import { heatColor } from "../utils/helpers";
import AnimatedCard from "../components/AnimatedCard";

export default function MandisTab({ selectedMonth, heatmap, regions }) {
  const displayRegions = regions || FALLBACK_REGIONS;
  const displayHeatmap = heatmap || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Heatmap */}
      <div>
        <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 8 }}>
          MANDI ACTIVITY HEATMAP — {MONTHS[selectedMonth].toUpperCase()}
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px repeat(12, 1fr)", gap: 2, padding: 10 }}>
            <div/>
            {MONTHS.map((m, i) => (
              <div key={i} style={{ fontSize: 8, textAlign: "center", color: i === selectedMonth ? "#4CAF50" : "#546E7A", fontWeight: i === selectedMonth ? 700 : 400 }}>{m.slice(0,1)}</div>
            ))}
            {Object.entries(displayHeatmap).slice(0, 15).map(([mandi, vals]) => (
              <div key={mandi} style={{ display: "contents" }}>
                <div style={{ fontSize: 10, color: "#90A4AE", display: "flex", alignItems: "center" }}>🏪 {mandi}</div>
                {(vals || []).map((v, i) => (
                  <div key={i} style={{
                    height: 22, borderRadius: 4, background: heatColor(v),
                    outline: i === selectedMonth ? "2px solid #FFD700" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {i === selectedMonth && <span style={{ fontSize: 8, color: v > 6 ? "#0a1a0a" : "#e8f5e9", fontWeight: 700 }}>{v}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: "6px 12px 10px", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 9, color: "#546E7A" }}>Low</span>
            {["#1a2e1a","#1B5E20","#2E7D32","#4CAF50","#A5D6A7"].map(c => (
              <div key={c} style={{ width: 16, height: 10, background: c, borderRadius: 2 }}/>
            ))}
            <span style={{ fontSize: 9, color: "#546E7A" }}>High</span>
          </div>
        </div>
      </div>

      {/* Regions */}
      {displayRegions.map((r, idx) => (
        <AnimatedCard key={r.name} delay={idx * 0.08}
          style={{ background: `${r.color}0d`, border: `1px solid ${r.color}33`, borderRadius: 16, padding: 14 }}>
          <div style={{ fontWeight: 700, color: r.color, fontSize: 14, marginBottom: 4 }}>🗺️ {r.name}</div>
          <div style={{ fontSize: 11, color: "#78909C", marginBottom: 8 }}>📍 {r.districts}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {r.crops.map(c => (
              <span key={c} style={{ fontSize: 11, padding: "3px 10px", background: `${r.color}22`, border: `1px solid ${r.color}44`, borderRadius: 20, color: r.color }}>
                {c}
              </span>
            ))}
          </div>
        </AnimatedCard>
      ))}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Mandis", value: "69", icon: "🏪" },
          { label: "Records", value: "96K+", icon: "📊" },
          { label: "Districts", value: "33", icon: "🗺️" },
        ].map((s, idx) => (
          <AnimatedCard key={s.label} delay={idx * 0.06}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#A5D6A7" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#546E7A" }}>{s.label}</div>
          </AnimatedCard>
        ))}
      </div>
    </div>
  );
}
