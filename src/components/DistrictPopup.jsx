import { X } from "lucide-react";
import { motion } from "framer-motion";
import { REGION_COLORS } from "../data/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DistrictPopup({ district, mandis, onClose }) {
  if (!district) return null;
  const regionColor = REGION_COLORS[district.region] || "#22c55e";

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 rounded-t-2xl p-4 pb-6 z-20 max-h-[50%] overflow-y-auto"
    >
      {/* Handle */}
      <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3"/>

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-extrabold text-base text-foreground">{district.nameHi}</div>
          <div className="text-xs text-muted-foreground">{district.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge style={{ backgroundColor: regionColor, color: "#fff" }} className="text-[10px]">
            {district.region}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X size={14} className="text-muted-foreground"/>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {district.totalRecords && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-zinc-800 border-zinc-700 p-2 text-center">
            <div className="text-sm font-extrabold text-green-500">{(district.totalRecords/1000).toFixed(1)}K</div>
            <div className="text-[9px] text-muted-foreground">Records</div>
          </Card>
          <Card className="bg-zinc-800 border-zinc-700 p-2 text-center">
            <div className="text-sm font-extrabold text-amber-500">{(district.totalVolume/1000).toFixed(0)}K</div>
            <div className="text-[9px] text-muted-foreground">Qtl Volume</div>
          </Card>
          <Card className="bg-zinc-800 border-zinc-700 p-2 text-center">
            <div className="text-sm font-extrabold text-green-500">{district.mandiCount || mandis?.length || 0}</div>
            <div className="text-[9px] text-muted-foreground">Mandis</div>
          </Card>
        </div>
      )}

      {/* Top Crops */}
      {district.topCrops?.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] text-green-500 tracking-widest font-semibold mb-1.5">TOP CROPS</div>
          <div className="flex gap-1.5 flex-wrap">
            {district.topCrops.slice(0, 5).map((c, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-zinc-700 text-muted-foreground">
                {c.emoji || ''} {c.nameHi} ({c.records})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Mandis List */}
      <div className="text-[11px] text-green-500 tracking-widest font-semibold mb-2">
        MANDIS ({mandis?.length || 0})
      </div>
      <div className="flex flex-col gap-1.5">
        {mandis?.map(m => (
          <Card key={m.id} className="bg-zinc-800 border-zinc-700 px-3 py-2 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-foreground">{m.nameHi}</div>
              {m.totalRecords && <div className="text-[9px] text-muted-foreground">{m.totalRecords} records</div>}
            </div>
            <Badge variant={m.isMain ? "default" : "outline"}
              className={m.isMain ? "bg-green-500 text-green-950 text-[9px]" : "border-zinc-600 text-muted-foreground text-[9px]"}>
              {m.isMain ? "Main" : "Sub-Yard"}
            </Badge>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
