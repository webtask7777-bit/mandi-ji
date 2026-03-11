import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useApi } from "../hooks/useApi";
import PriceCard from "../components/PriceCard";
import MiniChart from "../components/MiniChart";

export default function PricesTab({ crops }) {
  const mspCrops = crops.filter(c => c.msp);
  const [selectedCrop, setSelectedCrop] = useState(mspCrops[0]?.id || 'paddy');
  const { data: priceData } = useApi(`/prices/${selectedCrop}?months=13`);

  const selectedMeta = crops.find(c => c.id === selectedCrop) || crops[0];
  const history = priceData?.history?.filter(h => h.market) || [];

  const cropsWithPrices = mspCrops.slice(0, 8).map(c => ({
    ...c,
    name: c.nameHi ? `${c.nameHi} (${c.name})` : c.name,
    market: c.avgPrice || c.msp,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Crop Selector */}
      <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1 }}>FASAL CHUNEIN</div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {mspCrops.slice(0, 15).map(crop => (
          <motion.button key={crop.id} whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedCrop(crop.id)}
            style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 20,
              background: selectedCrop === crop.id ? `${crop.color}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${selectedCrop === crop.id ? crop.color : "rgba(255,255,255,0.08)"}`,
              color: selectedCrop === crop.id ? crop.color : "#78909C",
              fontSize: 11, fontWeight: selectedCrop === crop.id ? 700 : 400,
              cursor: "pointer", transition: "all 0.2s",
            }}>
            {crop.emoji} {crop.nameHi}
          </motion.button>
        ))}
      </div>

      {/* Price Cards Grid */}
      <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginTop: 4 }}>MSP vs MARKET BHAV</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {cropsWithPrices.map(crop => (
          <PriceCard key={crop.id} crop={crop}/>
        ))}
      </div>

      {/* Dynamic Price Trend Chart */}
      {history.length > 0 && (
        <MiniChart data={history} title={`${selectedMeta?.emoji || '📈'} ${selectedMeta?.nameHi || ''} — ${history.length} MONTH TREND`}/>
      )}

      {/* District Breakdown */}
      {priceData?.districtBreakdown?.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", padding: 14 }}>
          <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 1, marginBottom: 10 }}>
            DISTRICT WISE TRADING — {selectedMeta?.nameHi}
          </div>
          {priceData.districtBreakdown.slice(0, 8).map((d) => {
            const maxRec = priceData.districtBreakdown[0]?.records || 1;
            return (
              <div key={d.districtId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#90A4AE", width: 90, flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {d.nameHi || d.name}
                </span>
                <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                  <div style={{
                    height: 6, borderRadius: 3, width: `${(d.records / maxRec) * 100}%`,
                    background: `linear-gradient(90deg, ${selectedMeta?.color || '#4CAF50'}, ${selectedMeta?.color || '#4CAF50'}88)`,
                    transition: "width 0.5s",
                  }}/>
                </div>
                <span style={{ fontSize: 9, color: "#546E7A", width: 40, textAlign: "right" }}>{d.records}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{
          background: "linear-gradient(135deg, rgba(255,179,0,0.15), rgba(76,175,80,0.1))",
          border: "1px solid rgba(255,179,0,0.3)", borderRadius: 16, padding: 14,
          display: "flex", alignItems: "center", gap: 12,
        }}>
        <AlertCircle size={20} color="#FFB300"/>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#FFB300" }}>Real Data</div>
          <div style={{ fontSize: 11, color: "#90A4AE", lineHeight: 1.4 }}>
            96K+ real records from CG Mandi Portal. Tap crop pills to compare trends.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
