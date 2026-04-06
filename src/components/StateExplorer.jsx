import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BUBBLE_COLORS = ["#14532d", "#166534", "#15803d", "#22c55e", "#4ade80"];

export default function StateExplorer({ districts, mandis }) {
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [view, setView] = useState("districts"); // "districts" | "mandis"

  const districtList = districts || [];
  const mandiList = mandis || [];
  const maxRec = Math.max(...districtList.map(d => d.totalRecords || 1), 1);

  // Mandis for selected district
  const districtMandis = selectedDistrict
    ? mandiList.filter(m => m.district === selectedDistrict.name)
    : [];

  return (
    <div className="flex flex-col gap-3">
      {/* View Toggle */}
      <div className="flex gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg">
        <button
          onClick={() => { setView("districts"); setSelectedDistrict(null); }}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
            view === "districts" ? "bg-green-500 text-green-950" : "text-muted-foreground hover:text-foreground"
          }`}>
          <MapPin size={12}/> ज़िले ({districtList.length})
        </button>
        <button
          onClick={() => { setView("mandis"); setSelectedDistrict(null); }}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
            view === "mandis" ? "bg-green-500 text-green-950" : "text-muted-foreground hover:text-foreground"
          }`}>
          <Store size={12}/> मंडी ({mandiList.length})
        </button>
      </div>

      {/* Districts Bubble View */}
      {view === "districts" && (
        <div>
          <svg viewBox="0 0 320 280" className="w-full" style={{ maxHeight: "38vh" }}>
            {districtList.map((d, i) => {
              const heat = (d.totalRecords || 0) / maxRec;
              const bucket = Math.min(4, Math.floor(heat * 5));
              const r = Math.max(14, Math.min(32, Math.sqrt(d.totalRecords || 1) * 6));
              const cols = Math.ceil(Math.sqrt(districtList.length));
              const cellW = 320 / cols;
              const cellH = 280 / Math.ceil(districtList.length / cols);
              const cx = (i % cols) * cellW + cellW / 2;
              const cy = Math.floor(i / cols) * cellH + cellH / 2;
              const isSelected = selectedDistrict?.name === d.name;

              return (
                <g key={d.name} onClick={() => setSelectedDistrict(isSelected ? null : d)}
                  style={{ cursor: "pointer" }}>
                  <circle cx={cx} cy={cy} r={r}
                    fill={isSelected ? "#22c55e" : BUBBLE_COLORS[bucket]}
                    stroke={isSelected ? "#4ade80" : "#3f3f46"}
                    strokeWidth={isSelected ? 2 : 0.5}
                    style={{ transition: "all 0.2s" }}/>
                  <text x={cx} y={cy - 2} textAnchor="middle" fill={isSelected ? "#052e16" : "#d4d4d8"}
                    fontSize="6" fontWeight="700"
                    fontFamily="'Noto Sans Devanagari', system-ui">
                    {d.name.length > 10 ? d.name.slice(0, 8) + ".." : d.name}
                  </text>
                  <text x={cx} y={cy + 6} textAnchor="middle"
                    fill={isSelected ? "#052e16" : "#71717a"} fontSize="5">
                    {d.totalRecords || 0}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* District detail popup */}
          <AnimatePresence>
            {selectedDistrict && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}>
                <Card className="bg-zinc-900 border-zinc-700 p-3 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-sm text-foreground">{selectedDistrict.name}</div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDistrict(null)} className="h-6 w-6">
                      <X size={12} className="text-muted-foreground"/>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-zinc-800 rounded-lg px-2 py-1.5 text-center">
                      <div className="text-sm font-extrabold text-green-500">{selectedDistrict.totalRecords || 0}</div>
                      <div className="text-[8px] text-muted-foreground">रिकॉर्ड</div>
                    </div>
                    <div className="bg-zinc-800 rounded-lg px-2 py-1.5 text-center">
                      <div className="text-sm font-extrabold text-amber-500">{districtMandis.length}</div>
                      <div className="text-[8px] text-muted-foreground">मंडी</div>
                    </div>
                  </div>

                  {/* Top crops */}
                  {selectedDistrict.topCrops?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[9px] text-green-500 tracking-wider font-semibold mb-1">मुख्य फसलें</div>
                      <div className="flex gap-1 flex-wrap">
                        {selectedDistrict.topCrops.slice(0, 5).map((c, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-zinc-700 text-muted-foreground px-1.5 py-0">
                            {c.name} ({c.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mandis in this district */}
                  {districtMandis.length > 0 && (
                    <div>
                      <div className="text-[9px] text-green-500 tracking-wider font-semibold mb-1">मंडी सूची</div>
                      <div className="flex flex-col gap-1">
                        {districtMandis.map((m, i) => (
                          <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-md px-2 py-1.5">
                            <span className="text-[10px] text-foreground font-medium">{m.name}</span>
                            <span className="text-[9px] text-muted-foreground">{m.totalRecords || 0} rec</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Mandis List View */}
      {view === "mandis" && (
        <div className="flex flex-col gap-1.5">
          {mandiList.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-4 text-center text-muted-foreground text-xs">
              कोई मंडी डेटा उपलब्ध नहीं
            </Card>
          ) : (
            mandiList.map((m, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800 px-3 py-2 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[11px] text-foreground truncate">{m.name}</div>
                  <div className="text-[9px] text-muted-foreground">{m.district}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-green-500 font-bold">{m.totalRecords || 0}</span>
                  {m.topCrops?.length > 0 && (
                    <Badge variant="outline" className="text-[8px] border-zinc-700 text-muted-foreground px-1 py-0">
                      {m.topCrops[0].name}
                    </Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
