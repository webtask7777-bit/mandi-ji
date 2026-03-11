import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MONTHS, PHASE_COLORS, FALLBACK_SEASONS } from "../data/constants";
import { getMonthPhase } from "../utils/helpers";
import WeatherWidget from "../components/WeatherWidget";
import AnimatedCard from "../components/AnimatedCard";

export default function CalendarTab({ selectedMonth, crops, seasons }) {
  const [selectedCrop, setSelectedCrop] = useState(null);
  const displaySeasons = seasons || FALLBACK_SEASONS;

  const activeCrops = crops.filter(c => {
    const s = c.sowingMonths || c.sowing;
    const g = c.growingMonths || c.growing;
    const h = c.harvestMonths || c.harvest;
    const p = c.peakMonths || c.peak;
    return s?.includes(selectedMonth) || g?.includes(selectedMonth) ||
           h?.includes(selectedMonth) || p?.includes(selectedMonth);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Weather Widget */}
      <WeatherWidget districtId={1} />

      {/* Active Crops */}
      <div>
        <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 8 }}>
          {MONTHS[selectedMonth].toUpperCase()} MEIN ACTIVE FASAL
        </div>
        {activeCrops.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "#546E7A", fontSize: 13 }}>
            Is mahine koi major activity nahi
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeCrops.map((crop, idx) => {
              const phase = getMonthPhase(crop, selectedMonth);
              const isExpanded = selectedCrop === crop.id;
              return (
                <AnimatedCard key={crop.id} delay={idx * 0.05}
                  onClick={() => setSelectedCrop(isExpanded ? null : crop.id)}
                  style={{
                    background: isExpanded ? `linear-gradient(135deg, ${crop.bg}, rgba(0,0,0,0.2))` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isExpanded ? crop.color + "66" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 16, padding: 14, cursor: "pointer",
                    boxShadow: isExpanded ? `0 4px 24px ${crop.color}22` : "none",
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 28 }}>{crop.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {crop.nameHi ? `${crop.nameHi} (${crop.name})` : crop.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#78909C" }}>📍 {crop.region}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {phase && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: phase.color,
                          background: `${phase.color}22`, padding: "3px 8px",
                          borderRadius: 20, border: `1px solid ${phase.color}44`,
                        }}>
                          {phase.icon} {phase.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: "hidden", marginTop: 14 }}
                      >
                        <p style={{ fontSize: 12, color: "#90A4AE", marginBottom: 12, lineHeight: 1.5 }}>
                          {crop.desc}
                        </p>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, color: "#546E7A", marginBottom: 6 }}>SEASONAL TIMELINE</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 2 }}>
                            {MONTHS.map((mn, i) => {
                              const p = getMonthPhase(crop, i);
                              return (
                                <div key={i}>
                                  <div style={{
                                    height: 20, borderRadius: 4,
                                    background: p ? PHASE_COLORS[p.label] : "rgba(255,255,255,0.05)",
                                    outline: i === selectedMonth ? "2px solid white" : "none",
                                  }}/>
                                  <div style={{ fontSize: 8, color: "#546E7A", marginTop: 2, textAlign: "center" }}>{mn.slice(0,1)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {crop.mandis && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {(Array.isArray(crop.mandis) ? crop.mandis : []).map(m => (
                              <span key={m} style={{
                                fontSize: 11, padding: "4px 10px",
                                background: `${crop.color}22`, border: `1px solid ${crop.color}44`,
                                borderRadius: 20, color: crop.color,
                              }}>🏪 {m}</span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </AnimatedCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Annual Calendar Grid */}
      <div>
        <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 12 }}>
          SABHI FASAL KA VARSHIK CALENDAR
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px repeat(12, 1fr)", gap: 2, padding: "10px 10px 4px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div/>
            {MONTHS.map((m, i) => (
              <div key={i} style={{ fontSize: 8, textAlign: "center", color: i === selectedMonth ? "#4CAF50" : "#546E7A", fontWeight: i === selectedMonth ? 700 : 400 }}>
                {m.slice(0,1)}
              </div>
            ))}
          </div>
          {crops.map(crop => (
            <div key={crop.id} style={{ display: "grid", gridTemplateColumns: "80px repeat(12, 1fr)", gap: 2, padding: "4px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 10, color: "#90A4AE", display: "flex", alignItems: "center", gap: 4 }}>
                {crop.emoji} <span style={{ fontSize: 9 }}>{crop.nameHi || crop.name}</span>
              </div>
              {MONTHS.map((_, i) => {
                const phase = getMonthPhase(crop, i);
                return (
                  <div key={i} style={{
                    height: 16, borderRadius: 3,
                    background: phase ? PHASE_COLORS[phase.label] : "rgba(255,255,255,0.04)",
                    outline: i === selectedMonth ? "1.5px solid rgba(255,255,255,0.4)" : "none",
                  }}/>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Seasons */}
      <div>
        <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 8 }}>SEASON GUIDE</div>
        {displaySeasons.map((s, idx) => (
          <AnimatedCard key={s.id || s.name} delay={idx * 0.08}
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}33`, borderRadius: 12, padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.nameHi} ({s.name})</div>
              <div style={{ fontSize: 11, color: "#78909C" }}>{s.desc}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
              {MONTHS.map((_, i) => (
                <div key={i} style={{ width: 6, height: 20, borderRadius: 2, background: s.months.includes(i) ? s.color : "rgba(255,255,255,0.05)" }}/>
              ))}
            </div>
          </AnimatedCard>
        ))}
      </div>
    </div>
  );
}
