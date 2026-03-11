import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CG_DISTRICTS, CG_OUTLINE } from "../data/cg-districts";
import { REGION_COLORS } from "../data/constants";
import DistrictPopup from "./DistrictPopup";

export default function CGMap({ selectedMonth, mandis }) {
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);

  const districtData = selectedDistrict
    ? CG_DISTRICTS.find(d => d.id === selectedDistrict)
    : null;

  const districtMandis = mandis?.filter(m => m.districtId === selectedDistrict) || [];

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox="0 0 520 630" style={{ width: "100%", maxHeight: "55vh" }}>
        {/* Outer glow */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Outline */}
        <path d={CG_OUTLINE} fill="none" stroke="rgba(76,175,80,0.2)" strokeWidth="1.5"/>

        {/* District polygons */}
        {CG_DISTRICTS.map(d => {
          const color = REGION_COLORS[d.region] || "#4CAF50";
          const isSelected = selectedDistrict === d.id;
          const isHovered = hoveredDistrict === d.id;
          const hasMandiData = mandis?.some(m => m.districtId === d.id);

          return (
            <path
              key={d.id}
              d={d.path}
              fill={isSelected ? `${color}66` : isHovered ? `${color}44` : hasMandiData ? `${color}22` : `${color}0d`}
              stroke={isSelected ? color : `${color}66`}
              strokeWidth={isSelected ? 2 : 0.8}
              onClick={() => setSelectedDistrict(isSelected ? null : d.id)}
              onMouseEnter={() => setHoveredDistrict(d.id)}
              onMouseLeave={() => setHoveredDistrict(null)}
              style={{ cursor: "pointer", transition: "all 0.2s" }}
              filter={isSelected ? "url(#glow)" : undefined}
            />
          );
        })}

        {/* District labels */}
        {CG_DISTRICTS.map(d => {
          const color = REGION_COLORS[d.region] || "#4CAF50";
          const isSelected = selectedDistrict === d.id;
          return (
            <g key={`label-${d.id}`}>
              {/* Mandi dot */}
              <circle
                cx={d.center.x} cy={d.center.y} r={isSelected ? 5 : 3}
                fill={color} stroke="#0a1a0a" strokeWidth={1}
                style={{ transition: "all 0.2s" }}
              />
              {/* Name (show on hover or always for main ones) */}
              {(isSelected || hoveredDistrict === d.id) && (
                <text
                  x={d.center.x} y={d.center.y - 10}
                  textAnchor="middle" fill="#e8f5e9" fontSize="9" fontWeight="700"
                >
                  {d.nameHi}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* District popup */}
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
