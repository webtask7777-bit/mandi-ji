import { X } from "lucide-react";
import { motion } from "framer-motion";
import { REGION_COLORS } from "../data/constants";

export default function DistrictPopup({ district, mandis, onClose }) {
  if (!district) return null;

  const regionColor = REGION_COLORS[district.region] || "#4CAF50";

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(180deg, #0f260f, #0a1a0a)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px 20px 0 0",
        padding: "16px 20px 24px",
        zIndex: 20,
        maxHeight: "50%",
        overflowY: "auto",
      }}
    >
      {/* Handle */}
      <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 12px" }}/>

      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#e8f5e9" }}>
            {district.nameHi}
          </div>
          <div style={{ fontSize: 12, color: "#78909C" }}>{district.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <span style={{
            fontSize: 10, fontWeight: 700, color: regionColor,
            background: `${regionColor}22`, padding: "3px 10px",
            borderRadius: 20, border: `1px solid ${regionColor}44`,
          }}>
            {district.region}
          </span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
            padding: 6, cursor: "pointer", display: "flex",
          }}>
            <X size={16} color="#78909C"/>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {district.totalRecords && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: "rgba(76,175,80,0.1)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#4CAF50" }}>{(district.totalRecords/1000).toFixed(1)}K</div>
            <div style={{ fontSize: 9, color: "#546E7A" }}>Records</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,179,0,0.1)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#FFB300" }}>{(district.totalVolume/1000).toFixed(0)}K</div>
            <div style={{ fontSize: 9, color: "#546E7A" }}>Qtl Volume</div>
          </div>
          <div style={{ flex: 1, background: "rgba(38,166,154,0.1)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#26A69A" }}>{district.mandiCount || mandis?.length || 0}</div>
            <div style={{ fontSize: 9, color: "#546E7A" }}>Mandis</div>
          </div>
        </div>
      )}

      {/* Top Crops */}
      {district.topCrops?.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 6 }}>TOP CROPS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {district.topCrops.slice(0, 5).map((c, i) => (
              <span key={i} style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 12,
                background: `${regionColor}15`, border: `1px solid ${regionColor}33`,
                color: regionColor,
              }}>
                {c.emoji || '📦'} {c.nameHi} ({c.records})
              </span>
            ))}
          </div>
        </>
      )}

      {/* Mandis List */}
      <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 8 }}>
        MANDIS ({mandis?.length || 0})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {mandis?.map(m => (
          <div key={m.id} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "8px 12px",
            display: "flex", alignItems: "center", justifyContent: "between",
          }}>
            <div className="flex items-center gap-2" style={{ flex: 1 }}>
              <span style={{ fontSize: 14 }}>🏪</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#e8f5e9" }}>{m.nameHi}</div>
                {m.totalRecords && <div style={{ fontSize: 9, color: "#546E7A" }}>{m.totalRecords} records</div>}
              </div>
            </div>
            <span style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 12,
              background: m.isMain ? `${regionColor}22` : "rgba(255,255,255,0.05)",
              color: m.isMain ? regionColor : "#546E7A",
              border: `1px solid ${m.isMain ? regionColor + "44" : "rgba(255,255,255,0.08)"}`,
            }}>
              {m.isMain ? "Main" : "Sub-Yard"}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
