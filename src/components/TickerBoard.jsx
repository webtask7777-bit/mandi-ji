import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SIGNAL_STYLES = {
  sell: { bg: "bg-green-500/15", border: "border-green-500/30", text: "text-green-500", label: "बेचें" },
  buy: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-500", label: "खरीदें" },
  hold: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-500", label: "होल्ड" },
};

export default function TickerBoard({ data, onSelectCrop, selectedCrop }) {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState("records"); // records, price, change, signal

  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => {
    if (sortBy === "price") return b.price - a.price;
    if (sortBy === "change") return Math.abs(b.changePct) - Math.abs(a.changePct);
    if (sortBy === "signal") {
      const order = { sell: 0, buy: 1, hold: 2 };
      return (order[a.signal] || 2) - (order[b.signal] || 2);
    }
    return b.records - a.records;
  });

  const visible = expanded ? sorted : sorted.slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-muted-foreground tracking-wider font-semibold flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
          डिजिटल बोर्ड
        </div>
        <div className="flex gap-1">
          {[
            { key: "records", label: "लोकप्रिय" },
            { key: "price", label: "भाव" },
            { key: "signal", label: "सिग्नल" },
          ].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`text-[9px] px-1.5 py-0.5 rounded-md transition-all ${
                sortBy === s.key ? "bg-green-500/20 text-green-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_70px_60px_52px] gap-1 px-3 py-1.5 border-b border-zinc-800 text-[8px] text-zinc-500 tracking-wider font-semibold">
          <div>फसल</div>
          <div className="text-right">भाव ₹/क्वि</div>
          <div className="text-right">बदलाव</div>
          <div className="text-center">सिग्नल</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-800/50">
          {visible.map((item, idx) => {
            const isUp = item.change > 0;
            const isDown = item.change < 0;
            const isFlat = item.change === 0;
            const sig = SIGNAL_STYLES[item.signal] || SIGNAL_STYLES.hold;
            const isSelected = selectedCrop === item.id;

            return (
              <div key={item.id}
                onClick={() => onSelectCrop?.(item.id)}
                className={`grid grid-cols-[1fr_70px_60px_52px] gap-1 px-3 py-2 cursor-pointer transition-all active:scale-[0.99] ${
                  isSelected ? "bg-green-500/10" : "hover:bg-zinc-800/50"
                }`}>
                {/* Crop Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs shrink-0">{item.emoji}</span>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-semibold truncate ${isSelected ? "text-green-500" : "text-foreground"}`}>
                      {item.nameHi}
                    </div>
                    {item.bestMandi && (
                      <div className="text-[8px] text-zinc-500 truncate">
                        {item.mandiCount} मंडी · {item.bestMandi.name}{item.bestMandi.stateCode ? `, ${item.bestMandi.stateCode}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex flex-col justify-center">
                  <div className={`text-[12px] font-bold tabular-nums ${
                    isUp ? "text-green-500" : isDown ? "text-red-500" : "text-foreground"
                  }`}>
                    ₹{item.price?.toLocaleString()}
                  </div>
                  {item.msp && (
                    <div className="text-[7px] text-zinc-500">
                      MSP ₹{item.msp.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Change */}
                <div className="text-right flex items-center justify-end gap-0.5">
                  {isFlat ? (
                    <span className="text-zinc-500 text-[10px]">—</span>
                  ) : (
                    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${
                      isUp ? "text-green-500" : "text-red-500"
                    }`}>
                      {isUp ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                      {Math.abs(item.changePct)}%
                    </span>
                  )}
                </div>

                {/* Signal */}
                <div className="flex items-center justify-center">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${sig.bg} ${sig.border} border ${sig.text}`}>
                    {sig.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand/collapse */}
        {sorted.length > 10 && (
          <button onClick={() => setExpanded(!expanded)}
            className="w-full py-2 flex items-center justify-center gap-1 text-[11px] text-green-500 font-semibold border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
            {expanded ? <><ChevronUp size={14}/> कम दिखाएं</> : <><ChevronDown size={14}/> सभी {sorted.length} फसलें</>}
          </button>
        )}
      </Card>

      {/* Signal Legend */}
      <div className="flex items-center gap-3 mt-2 px-1">
        {Object.entries(SIGNAL_STYLES).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${s.bg} ${s.border} border`}/>
            <span className={`text-[9px] ${s.text}`}>{s.label}</span>
          </div>
        ))}
        <div className="text-[8px] text-zinc-600 ml-auto">MSP + ट्रेंड आधारित</div>
      </div>
    </div>
  );
}
