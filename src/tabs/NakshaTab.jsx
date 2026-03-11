import { REGION_COLORS } from "../data/constants";
import CGMap from "../components/CGMap";
import AnimatedCard from "../components/AnimatedCard";

export default function NakshaTab({ selectedMonth, districts, mandis }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 4 }}>
        CHHATTISGARH KA NAKSHA
      </div>

      {/* Region legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(REGION_COLORS).map(([region, color]) => (
          <span key={region} style={{
            fontSize: 10, padding: "3px 10px",
            background: `${color}22`, border: `1px solid ${color}44`,
            borderRadius: 20, color,
          }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4, verticalAlign: "middle" }}/>
            {region}
          </span>
        ))}
      </div>

      {/* Map */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden", position: "relative",
      }}>
        <CGMap selectedMonth={selectedMonth} mandis={mandis}/>
      </div>

      {/* District count by region */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Plains", count: districts?.filter(d => d.region === "Plains").length || 20, color: "#4CAF50" },
          { label: "Bastar", count: districts?.filter(d => d.region === "Bastar").length || 7, color: "#8D6E63" },
          { label: "Hills", count: districts?.filter(d => d.region === "Northern Hills").length || 6, color: "#26A69A" },
        ].map((r, idx) => (
          <AnimatedCard key={r.label} delay={idx * 0.06}
            style={{ background: `${r.color}0d`, border: `1px solid ${r.color}33`, borderRadius: 12, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: r.color }}>{r.count}</div>
            <div style={{ fontSize: 10, color: "#78909C" }}>{r.label}</div>
          </AnimatedCard>
        ))}
      </div>

      {/* Instruction */}
      <div style={{
        background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12,
        fontSize: 11, color: "#546E7A", textAlign: "center",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        👆 Kisi bhi district par tap karein mandis dekhne ke liye
      </div>
    </div>
  );
}
