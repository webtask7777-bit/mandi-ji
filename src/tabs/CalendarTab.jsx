import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MONTHS, PHASE_COLORS, FALLBACK_SEASONS } from "../data/constants";
import { getMonthPhase } from "../utils/helpers";
import WeatherWidget from "../components/WeatherWidget";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SOLID_PHASE = {
  "Buvai": "#78350f",
  "Ugna": "#14532d",
  "Katai": "#9a3412",
  "Peak Arrival": "#713f12",
};

const PHASE_HI = {
  "Buvai": "बुवाई",
  "Ugna": "उगना",
  "Katai": "कटाई",
  "Peak Arrival": "आवक",
};

export default function CalendarTab({ selectedMonth, crops, seasons, isCG }) {
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
    <div className="flex flex-col gap-4">
      {isCG && <WeatherWidget districtId={1} />}

      {/* Active Crops */}
      <div>
        <div className="text-[10px] text-muted-foreground tracking-wider font-semibold mb-2">
          इस महीने सक्रिय फसलें
        </div>
        {activeCrops.length === 0 ? (
          <Card className="p-6 bg-zinc-900 border-zinc-800 text-center text-muted-foreground text-sm">
            इस महीने कोई मुख्य गतिविधि नहीं
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {activeCrops.map((crop) => {
              const phase = getMonthPhase(crop, selectedMonth);
              const isExpanded = selectedCrop === crop.id;
              return (
                <Card key={crop.id}
                  onClick={() => setSelectedCrop(isExpanded ? null : crop.id)}
                  className={`cursor-pointer transition-all active:scale-[0.98] overflow-hidden ${
                    isExpanded ? "bg-zinc-800 border-green-500" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                  }`}>
                  <div className="p-3 flex items-center gap-3">
                    <span className="text-xl shrink-0">{crop.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">
                        {crop.nameHi || crop.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{crop.region}</div>
                    </div>
                    {phase && (
                      <Badge className="text-[9px] px-1.5 py-0.5"
                        style={{ backgroundColor: PHASE_COLORS[phase.label], color: "#fff" }}>
                        {PHASE_HI[phase.label] || phase.label}
                      </Badge>
                    )}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden">
                        <div className="px-3 pb-3 border-t border-zinc-700">
                          <p className="text-xs text-muted-foreground mt-3 mb-3 leading-relaxed">
                            {crop.desc}
                          </p>
                          <div>
                            <div className="text-[9px] text-muted-foreground mb-1.5 tracking-wider">वार्षिक टाइमलाइन</div>
                            <div className="grid grid-cols-12 gap-0.5">
                              {MONTHS.map((mn, i) => {
                                const p = getMonthPhase(crop, i);
                                return (
                                  <div key={i}>
                                    <div className="h-5 rounded-sm"
                                      style={{
                                        background: p ? SOLID_PHASE[p.label] || PHASE_COLORS[p.label] : "#27272a",
                                        outline: i === selectedMonth ? "2px solid #22c55e" : "none",
                                        outlineOffset: "-1px",
                                      }}/>
                                    <div className="text-[7px] text-muted-foreground mt-0.5 text-center">{mn.slice(0,1)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Annual Calendar Grid */}
      <div>
        <div className="text-[10px] text-muted-foreground tracking-wider font-semibold mb-2">
          सभी फसलों का वार्षिक कैलेंडर
        </div>
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <div className="grid gap-0.5 px-3 py-2 border-b border-zinc-800"
            style={{ gridTemplateColumns: "60px repeat(12, 1fr)" }}>
            <div/>
            {MONTHS.map((m, i) => (
              <div key={i} className={`text-[7px] text-center ${i === selectedMonth ? "text-green-500 font-bold" : "text-muted-foreground"}`}>
                {m.slice(0,1)}
              </div>
            ))}
          </div>
          <div className="px-3 py-1">
            {crops.map(crop => (
              <div key={crop.id} className="grid gap-0.5 py-0.5 cursor-pointer hover:bg-zinc-800/50 rounded transition-colors"
                onClick={() => setSelectedCrop(selectedCrop === crop.id ? null : crop.id)}
                style={{ gridTemplateColumns: "60px repeat(12, 1fr)" }}>
                <div className="text-[9px] text-muted-foreground flex items-center gap-1 truncate">
                  <span className="shrink-0">{crop.emoji}</span>
                  <span className="truncate">{crop.nameHi || crop.name}</span>
                </div>
                {MONTHS.map((_, i) => {
                  const phase = getMonthPhase(crop, i);
                  return (
                    <div key={i} className="h-4 rounded-sm"
                      style={{
                        background: phase ? SOLID_PHASE[phase.label] || PHASE_COLORS[phase.label] : "#1c1c1e",
                        outline: i === selectedMonth ? "1.5px solid #22c55e" : "none",
                        outlineOffset: "-1px",
                      }}/>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {/* Compact ऋतु गाइड — right below calendar */}
        <div className="mt-2">
          <div className="text-[9px] text-muted-foreground tracking-wider font-semibold mb-1.5">ऋतु गाइड</div>
          <div className="flex gap-1.5">
            {displaySeasons.map(s => (
              <div key={s.id || s.name}
                className="flex-1 rounded-lg px-2 py-1.5 border border-zinc-800"
                style={{ backgroundColor: `${s.color}10` }}>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px]">{s.icon}</span>
                  <span className="text-[9px] font-bold" style={{ color: s.color }}>
                    {s.nameHi}
                  </span>
                </div>
                <div className="flex gap-px">
                  {MONTHS.map((_, i) => (
                    <div key={i} className="flex-1 h-1.5 rounded-full"
                      style={{ background: s.months.includes(i) ? s.color : "#27272a" }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
