export const heatColor = (val) => {
  if (val <= 1) return "#1a2e1a";
  if (val <= 3) return "#1B5E20";
  if (val <= 5) return "#2E7D32";
  if (val <= 7) return "#4CAF50";
  return "#A5D6A7";
};

export const getSeasonForMonth = (m) => {
  if ([5,6,7,8,9,10,11].includes(m)) return "kharif";
  if ([0,1,2,3,10,11].includes(m)) return "rabi";
  return "zaid";
};

export const getMonthPhase = (crop, m) => {
  const sowing = crop.sowingMonths || crop.sowing;
  const growing = crop.growingMonths || crop.growing;
  const harvest = crop.harvestMonths || crop.harvest;
  const peak = crop.peakMonths || crop.peak;
  if (peak?.includes(m)) return { label: "Peak Arrival", icon: "🔥", color: "#FFD700" };
  if (harvest?.includes(m)) return { label: "Katai", icon: "⚔️", color: "#FF8C00" };
  if (growing?.includes(m)) return { label: "Ugna", icon: "🌱", color: "#4CAF50" };
  if (sowing?.includes(m)) return { label: "Buvai", icon: "🌰", color: "#8D6E63" };
  return null;
};

// Map API crop shape to the display format used by components
export const formatCrop = (crop) => ({
  id: crop.id,
  name: `${crop.nameHi} (${crop.name})`,
  emoji: crop.emoji,
  region: crop.region,
  color: crop.color,
  bg: crop.bg,
  sowing: crop.sowingMonths,
  growing: crop.growingMonths,
  harvest: crop.harvestMonths,
  peak: crop.peakMonths,
  msp: crop.msp,
  market: 0, // filled from prices
  volume: 0,
  mandis: [],
  desc: crop.desc,
});
