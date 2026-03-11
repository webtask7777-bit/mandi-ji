import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Leaf, Bell } from "lucide-react";
import { useApi } from "./hooks/useApi";
import { MONTHS, SEASON_COLORS, FALLBACK_CROPS, FALLBACK_SEASONS, FALLBACK_REGIONS } from "./data/constants";
import { getSeasonForMonth } from "./utils/helpers";
import { tabVariants } from "./utils/animations";

import CalendarTab from "./tabs/CalendarTab";
import MandisTab from "./tabs/MandisTab";
import PricesTab from "./tabs/PricesTab";
import NakshaTab from "./tabs/NakshaTab";

const TABS = [
  { id: "calendar", label: "📅 Calendar" },
  { id: "mandis", label: "🏪 Mandis" },
  { id: "prices", label: "📈 Bhav" },
  { id: "naksha", label: "🗺️ Naksha" },
];

export default function MandiJiDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState("calendar");

  // API data with fallbacks
  const { data: apiCrops } = useApi('/crops');
  const { data: apiMandis } = useApi('/mandis');
  const { data: apiDistricts } = useApi('/districts');
  const { data: apiHeatmap } = useApi('/mandis/heatmap');
  const { data: dashStats } = useApi('/stats');

  const crops = apiCrops || FALLBACK_CROPS;
  const seasons = FALLBACK_SEASONS;
  const mandis = apiMandis || [];
  const districts = apiDistricts || [];
  const heatmap = apiHeatmap || {};

  return (
    <div style={{
      fontFamily: "'Noto Sans Devanagari', 'Mukta', sans-serif",
      background: "#0a1a0a",
      minHeight: "100vh",
      color: "#e8f5e9",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
      overflowX: "hidden",
      overflowY: "auto",
    }}>
      {/* Ambient BG */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(76,175,80,0.15) 0%, transparent 70%)",
      }}/>

      {/* ── HEADER ── */}
      <header style={{ position: "relative", zIndex: 10, padding: "16px 20px 0" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div whileTap={{ scale: 0.9, rotate: -10 }} style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #4CAF50, #FFB300)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Leaf size={20} color="#0a1a0a" strokeWidth={2.5}/>
            </motion.div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                मंडी<span style={{ color: "#FFB300" }}>जी</span>
              </div>
              <div style={{ fontSize: 10, color: "#66BB6A", letterSpacing: 1, textTransform: "uppercase" }}>
                Chhattisgarh • {dashStats?.totalMandis || 69} Mandis • {dashStats ? `${(dashStats.totalRecords/1000).toFixed(0)}K Records` : ''}
              </div>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} style={{
            background: "rgba(255,179,0,0.15)", border: "1px solid rgba(255,179,0,0.3)",
            borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#FFB300",
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
          }}>
            <Bell size={12}/> Alert
          </motion.button>
        </div>

        {/* Month Selector */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: "#66BB6A", marginBottom: 8, letterSpacing: 1 }}>MAHINA CHUNEIN</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollSnapType: "x mandatory" }}>
            {MONTHS.map((m, i) => {
              const season = getSeasonForMonth(i);
              const color = SEASON_COLORS[season];
              const isSelected = i === selectedMonth;
              return (
                <motion.button key={i} whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedMonth(i)}
                  style={{
                    flexShrink: 0, width: 44, height: 56, borderRadius: 12, scrollSnapAlign: "center",
                    border: isSelected ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                    background: isSelected ? `linear-gradient(180deg, ${color}22, ${color}44)` : "rgba(255,255,255,0.03)",
                    color: isSelected ? color : "#78909C",
                    fontSize: 11, fontWeight: isSelected ? 700 : 400, cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                    transition: "all 0.2s", transform: isSelected ? "translateY(-2px)" : "none",
                    boxShadow: isSelected ? `0 4px 16px ${color}44` : "none",
                  }}>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>
                    {season === "kharif" ? "☀️" : season === "rabi" ? "❄️" : "🌤️"}
                  </span>
                  {m}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 16,
          background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 3 }}>
          {TABS.map(tab => (
            <motion.button key={tab.id} whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 11,
                fontWeight: activeTab === tab.id ? 700 : 400,
                background: activeTab === tab.id
                  ? "linear-gradient(135deg, rgba(76,175,80,0.3), rgba(255,179,0,0.2))"
                  : "transparent",
                border: activeTab === tab.id ? "1px solid rgba(76,175,80,0.4)" : "1px solid transparent",
                color: activeTab === tab.id ? "#A5D6A7" : "#78909C",
                cursor: "pointer", transition: "all 0.2s",
              }}>
              {tab.label}
            </motion.button>
          ))}
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main style={{ padding: "16px 20px 100px", position: "relative", zIndex: 5 }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={tabVariants}
            initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.2 }}>
            {activeTab === "calendar" && <CalendarTab selectedMonth={selectedMonth} crops={crops} seasons={seasons}/>}
            {activeTab === "mandis" && <MandisTab selectedMonth={selectedMonth} heatmap={heatmap} regions={FALLBACK_REGIONS}/>}
            {activeTab === "prices" && <PricesTab crops={crops}/>}
            {activeTab === "naksha" && <NakshaTab selectedMonth={selectedMonth} districts={districts} mandis={mandis}/>}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
