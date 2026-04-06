import { useState, useMemo } from "react";
import { INDIA_STATES } from "../data/india-states";
import { useStateContext } from "../context/StateContext";

const HEAT_SCALE = ["#14532d", "#166534", "#15803d", "#22c55e", "#4ade80"];
const NO_DATA_COLOR = "#1c1c1e";

// Large states that always show abbreviated labels
const LARGE_STATES = new Set([
  "uttar-pradesh", "madhya-pradesh", "maharashtra", "rajasthan",
  "gujarat", "karnataka", "andhra-pradesh", "tamil-nadu",
  "odisha", "west-bengal", "bihar", "jharkhand",
  "chhattisgarh", "assam", "kerala", "telangana",
  "haryana", "punjab", "himachal-pradesh", "uttarakhand",
]);

// Short Hindi labels for map
const SHORT_LABELS = {
  "uttar-pradesh": "उ.प्र.",
  "madhya-pradesh": "म.प्र.",
  "maharashtra": "महा.",
  "rajasthan": "राज.",
  "gujarat": "गुज.",
  "karnataka": "कर्ना.",
  "andhra-pradesh": "आ.प्र.",
  "tamil-nadu": "त.ना.",
  "odisha": "ओडिशा",
  "west-bengal": "प.बंगाल",
  "bihar": "बिहार",
  "jharkhand": "झार.",
  "chhattisgarh": "छ.ग.",
  "assam": "असम",
  "kerala": "केरल",
  "telangana": "तेलं.",
  "haryana": "हरि.",
  "punjab": "पंजाब",
  "himachal-pradesh": "हि.प्र.",
  "uttarakhand": "उ.खंड",
};

export default function IndiaMap({ stateData }) {
  const [hoveredState, setHoveredState] = useState(null);
  const { selectedState, setSelectedState } = useStateContext();

  // Build lookup map from stateData array
  const stateMap = useMemo(() => {
    const map = {};
    if (stateData) {
      for (const s of stateData) map[s.id] = s;
    }
    return map;
  }, [stateData]);

  // Calculate heat values (0-4 buckets)
  const maxRec = useMemo(() => {
    if (!stateData?.length) return 1;
    return Math.max(...stateData.map(s => s.totalRecords || 0), 1);
  }, [stateData]);

  function getHeatBucket(stateId) {
    const info = stateMap[stateId];
    if (!info || !info.totalRecords) return -1; // no data
    const heat = info.totalRecords / maxRec;
    return Math.min(4, Math.floor(heat * 5));
  }

  function getFill(stateId, isSelected, isHovered) {
    if (isSelected) return "#22c55e";
    const bucket = getHeatBucket(stateId);
    if (bucket < 0) {
      return isHovered ? "#27272a" : NO_DATA_COLOR;
    }
    if (isHovered) {
      return HEAT_SCALE[Math.min(4, bucket + 1)];
    }
    return HEAT_SCALE[bucket];
  }

  function getStroke(stateId, isSelected, isHovered) {
    if (isSelected) return "#22c55e";
    if (isHovered) return "#71717a";
    return "#3f3f46";
  }

  const hoveredInfo = hoveredState ? stateMap[hoveredState] : null;
  const hoveredStateDef = hoveredState ? INDIA_STATES.find(s => s.id === hoveredState) : null;

  return (
    <div>
      <svg viewBox="0 0 550 620" style={{ width: "100%", maxHeight: "58vh" }}>
        <defs>
          <filter id="state-glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="map-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/>
          </filter>
        </defs>

        {/* Map group with shadow */}
        <g filter="url(#map-shadow)">
          {INDIA_STATES.map(s => {
            const isSelected = selectedState === s.id;
            const isHovered = hoveredState === s.id;

            return (
              <path
                key={s.id}
                d={s.path}
                fill={getFill(s.id, isSelected, isHovered)}
                stroke={getStroke(s.id, isSelected, isHovered)}
                strokeWidth={isSelected ? 2 : isHovered ? 1.2 : 0.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                onClick={() => setSelectedState(s.id)}
                onMouseEnter={() => setHoveredState(s.id)}
                onMouseLeave={() => setHoveredState(null)}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
                filter={isSelected ? "url(#state-glow)" : undefined}
              />
            );
          })}
        </g>

        {/* Selected state pulsing ring */}
        {selectedState && (() => {
          const s = INDIA_STATES.find(st => st.id === selectedState);
          if (!s) return null;
          return (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={s.center.x} cy={s.center.y} r="6" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" from="4" to="16" dur="1.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
              </circle>
            </g>
          );
        })()}

        {/* Always-visible labels for large states */}
        {INDIA_STATES.map(s => {
          if (!LARGE_STATES.has(s.id)) return null;
          const isSelected = selectedState === s.id;
          const isHovered = hoveredState === s.id;
          if (isSelected || isHovered) return null; // handled separately below

          return (
            <g key={`lbl-${s.id}`} style={{ pointerEvents: "none" }}>
              <text
                x={s.center.x} y={s.center.y + 2}
                textAnchor="middle" fill="#a1a1aa" fontSize="5.5" fontWeight="600"
                fontFamily="'Noto Sans Devanagari', system-ui"
                opacity="0.7">
                {SHORT_LABELS[s.id] || s.nameHi}
              </text>
            </g>
          );
        })}

        {/* Mandi count badges for states with data */}
        {stateData?.map(s => {
          const st = INDIA_STATES.find(i => i.id === s.id);
          if (!st || !s.totalMandis || selectedState === s.id || hoveredState === s.id) return null;
          return (
            <g key={`cnt-${s.id}`} style={{ pointerEvents: "none" }}>
              <circle cx={st.center.x} cy={st.center.y + 9} r="6"
                fill="#052e16" stroke="#22c55e" strokeWidth="0.5" opacity="0.85"/>
              <text x={st.center.x} y={st.center.y + 11.5}
                textAnchor="middle" fill="#4ade80" fontSize="5" fontWeight="800">
                {s.totalMandis}
              </text>
            </g>
          );
        })}

        {/* Hover tooltip with stats */}
        {hoveredStateDef && !selectedState && (
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={hoveredStateDef.center.x - 50} y={hoveredStateDef.center.y - 30}
              width="100" height={hoveredInfo ? 32 : 18} rx="5"
              fill="#09090b" stroke="#3f3f46" strokeWidth="0.5" opacity="0.95"
            />
            <text
              x={hoveredStateDef.center.x} y={hoveredStateDef.center.y - 18}
              textAnchor="middle" fill="#fafafa" fontSize="8" fontWeight="700"
              fontFamily="'Noto Sans Devanagari', system-ui">
              {hoveredStateDef.nameHi}
            </text>
            {hoveredInfo ? (
              <text
                x={hoveredStateDef.center.x} y={hoveredStateDef.center.y - 6}
                textAnchor="middle" fill="#a1a1aa" fontSize="6"
                fontFamily="system-ui">
                🏪 {hoveredInfo.totalMandis || 0} मंडी · 🌾 {hoveredInfo.totalCrops || 0} फसल
              </text>
            ) : (
              <text
                x={hoveredStateDef.center.x} y={hoveredStateDef.center.y - 6}
                textAnchor="middle" fill="#71717a" fontSize="6"
                fontFamily="system-ui">
                डेटा उपलब्ध नहीं
              </text>
            )}
          </g>
        )}

        {/* Selected state label */}
        {selectedState && (() => {
          const s = INDIA_STATES.find(st => st.id === selectedState);
          if (!s) return null;
          const info = stateMap[selectedState];
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={s.center.x - 50} y={s.center.y - 28}
                width="100" height={info ? 30 : 18} rx="5"
                fill="#052e16" stroke="#22c55e" strokeWidth="1" opacity="0.95"
              />
              <text
                x={s.center.x} y={s.center.y - 16}
                textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="800"
                fontFamily="'Noto Sans Devanagari', system-ui">
                {s.nameHi}
              </text>
              {info && (
                <text
                  x={s.center.x} y={s.center.y - 5}
                  textAnchor="middle" fill="#86efac" fontSize="6"
                  fontFamily="system-ui">
                  🏪 {info.totalMandis} मंडी · 🌾 {info.totalCrops} फसल
                </text>
              )}
            </g>
          );
        })()}
      </svg>

      {/* Color Legend */}
      <div className="flex items-center justify-center gap-1.5 mt-1 px-4">
        <span className="text-[8px] text-muted-foreground">कम</span>
        {HEAT_SCALE.map((c, i) => (
          <div key={i} className="w-5 h-2 rounded-sm" style={{ background: c }}/>
        ))}
        <span className="text-[8px] text-muted-foreground">ज़्यादा</span>
        <div className="w-px h-3 bg-zinc-700 mx-1"/>
        <div className="w-5 h-2 rounded-sm" style={{ background: NO_DATA_COLOR, border: "0.5px solid #3f3f46" }}/>
        <span className="text-[8px] text-muted-foreground">N/A</span>
      </div>
    </div>
  );
}
