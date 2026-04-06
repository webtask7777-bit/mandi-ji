import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CG_DISTRICTS } from "../data/cg-districts";
import { REGION_COLORS } from "../data/constants";
import DistrictPopup from "./DistrictPopup";

const REGION_SOLID = {
  Plains: { idle: "#14532d", hover: "#166534", active: "#22c55e" },
  Bastar: { idle: "#44403c", hover: "#57534e", active: "#8D6E63" },
  "Northern Hills": { idle: "#134e4a", hover: "#115e59", active: "#26A69A" },
};

export default function CGMap({ selectedMonth, mandis }) {
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);

  const districtData = selectedDistrict
    ? CG_DISTRICTS.find(d => d.id === selectedDistrict)
    : null;
  const districtMandis = mandis?.filter(m => m.districtId === selectedDistrict) || [];

  return (
    <div className="relative">
      <svg viewBox="0 0 500 680" style={{ width: "100%", maxHeight: "60vh" }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* District polygons */}
        {CG_DISTRICTS.map(d => {
          const colors = REGION_SOLID[d.region] || REGION_SOLID.Plains;
          const regionColor = REGION_COLORS[d.region] || "#22c55e";
          const isSelected = selectedDistrict === d.id;
          const isHovered = hoveredDistrict === d.id;

          return (
            <path
              key={d.id}
              d={d.path}
              fill={isSelected ? colors.active : isHovered ? colors.hover : colors.idle}
              stroke={isSelected ? regionColor : isHovered ? "#71717a" : "#27272a"}
              strokeWidth={isSelected ? 2 : 0.8}
              strokeLinejoin="round"
              onClick={() => setSelectedDistrict(isSelected ? null : d.id)}
              onMouseEnter={() => setHoveredDistrict(d.id)}
              onMouseLeave={() => setHoveredDistrict(null)}
              style={{ cursor: "pointer", transition: "all 0.2s" }}
              filter={isSelected ? "url(#glow)" : undefined}
            />
          );
        })}

        {/* Labels */}
        {CG_DISTRICTS.map(d => {
          const regionColor = REGION_COLORS[d.region] || "#22c55e";
          const isSelected = selectedDistrict === d.id;
          const isHovered = hoveredDistrict === d.id;
          return (
            <g key={`label-${d.id}`}
              style={{ pointerEvents: "none" }}>
              <circle
                cx={d.center.x} cy={d.center.y} r={isSelected ? 4 : 2}
                fill={isSelected ? "#fff" : regionColor} stroke="#09090b" strokeWidth={0.5}
                style={{ transition: "all 0.2s" }}
              />
              {(isSelected || isHovered) && (
                <>
                  <rect
                    x={d.center.x - 30} y={d.center.y - 20}
                    width="60" height="14" rx="3"
                    fill="#09090b" opacity="0.85"/>
                  <text
                    x={d.center.x} y={d.center.y - 10}
                    textAnchor="middle" fill="#fafafa" fontSize="8" fontWeight="700"
                    fontFamily="'Noto Sans Devanagari', system-ui">
                    {d.nameHi}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      <AnimatePresence>
        {districtData && (
          <DistrictPopup
            district={districtData}
            mandis={districtMandis}
            onClose={() => setSelectedDistrict(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
