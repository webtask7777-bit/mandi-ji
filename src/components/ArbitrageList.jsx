import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useApi } from "../hooks/useApi";
import { useNavigate } from "react-router-dom";

const SORTS = [
  { key: "score",    label: "बेस्ट ट्रेड",    icon: "🏆", title: "मुनाफ़ा ÷ दूरी स्कोर" },
  { key: "profit",   label: "ज़्यादा मुनाफ़ा",  icon: "💰", title: "सबसे ज़्यादा नेट मुनाफ़ा" },
  { key: "distance", label: "कम दूरी",         icon: "📍", title: "नज़दीकी मंडी" },
];

function scoreOf(r) { return r.netProfit / Math.sqrt(r.distance); }

export default function ArbitrageList({ stateParam, onCropClick }) {
  const [sort, setSort] = useState("score");
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const q = stateParam && stateParam !== "all" ? `?state=${stateParam}` : "?state=all";
  const { data, loading } = useApi(`/arbitrage${q}`);

  if (loading) return (
    <div className="flex items-center gap-2 px-1 py-4 text-[11px] text-zinc-500">
      <div className="w-3 h-3 rounded-full border-2 border-green-500 border-t-transparent animate-spin"/>
      अवसर खोज रहे हैं…
    </div>
  );
  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => {
    if (sort === "profit")   return b.netProfit - a.netProfit;
    if (sort === "distance") return a.distance - b.distance;
    return scoreOf(b) - scoreOf(a);
  });

  const visible = showAll ? sorted : sorted.slice(0, 6);

  const riskColor = (r) => {
    if (r.varietyMismatch) return "text-orange-400";
    if (r.distance > 1000) return "text-red-400";
    if (r.distance > 500 || r.interState) return "text-amber-400";
    return "text-green-400";
  };

  const riskLabel = (r) => {
    if (r.varietyMismatch) return "⚠️ किस्म अलग";
    if (r.distance > 1000) return "🔴 बहुत दूर";
    if (r.distance > 500)  return "🟡 इंटर-स्टेट";
    if (r.interState)      return "🟡 इंटर-स्टेट";
    return "🟢 कम जोखिम";
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-muted-foreground tracking-wider font-semibold">
          🏆 आज के टॉप अवसर — कहाँ से क्या माल भेजें
        </div>
        <div className="text-[8px] text-zinc-600">{data.length} ट्रेड मिले</div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1.5 mb-2.5">
        {SORTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`text-[9px] font-bold px-2 py-1 rounded-full border transition-colors ${
              sort === s.key
                ? "bg-green-500/15 border-green-500/40 text-green-400"
                : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Trade cards */}
      <div className="space-y-2">
        {visible.map((r, i) => (
          <button
            key={`${r.cropId}-${i}`}
            onClick={() => onCropClick?.(r.cropId)}
            className="w-full text-left"
          >
            <Card className="bg-zinc-900 border-zinc-800 hover:border-green-500/30 transition-all active:scale-[0.99] overflow-hidden">
              {/* top profit bar */}
              <div
                className="h-0.5 bg-gradient-to-r from-green-600 to-green-400"
                style={{ width: `${Math.min(Math.max((r.roi / 50) * 100, 5), 100)}%` }}
              />
              <div className="px-3 py-2.5">
                {/* Row 1: crop + rank + risk */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-extrabold text-zinc-600 w-3">#{i + 1}</span>
                    <span className="text-[12px]">{r.cropEmoji}</span>
                    <span className="text-[11px] font-bold text-foreground">{r.cropName}</span>
                    {r.topVariety && <span className="text-[8px] text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded shrink-0">{r.topVariety}</span>}
                  </div>
                  <span className={`text-[8px] font-bold ${riskColor(r)}`}>{riskLabel(r)}</span>
                </div>

                {/* Row 2: buy → sell route */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="flex-1 bg-red-500/8 border border-red-500/15 rounded px-2 py-1 min-w-0">
                    <div className="text-[7px] text-red-400 font-semibold mb-0.5">खरीदें</div>
                    <div className="text-[10px] font-bold text-foreground truncate">{r.buyMandi}</div>
                    <div className="text-[8px] text-red-400">₹{r.buyPrice.toLocaleString()}</div>
                    {r.buyState && <div className="text-[7px] text-zinc-600">{r.buyState}</div>}
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <ArrowRight size={12} className="text-zinc-600"/>
                    <div className="text-[7px] text-zinc-600 mt-0.5">{r.distance} km</div>
                  </div>
                  <div className="flex-1 bg-green-500/8 border border-green-500/15 rounded px-2 py-1 min-w-0">
                    <div className="text-[7px] text-green-400 font-semibold mb-0.5">बेचें</div>
                    <div className="text-[10px] font-bold text-foreground truncate">{r.sellMandi}</div>
                    <div className="text-[8px] text-green-400">₹{r.sellPrice.toLocaleString()}</div>
                    {r.sellState && <div className="text-[7px] text-zinc-600">{r.sellState}</div>}
                  </div>
                </div>

                {/* Row 3: profit stats */}
                <div className="grid grid-cols-4 gap-1 border-t border-zinc-800/60 pt-1.5">
                  <div className="text-center">
                    <div className="text-[7px] text-zinc-600">भाव अंतर</div>
                    <div className="text-[9px] font-bold text-amber-400">₹{r.spread.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-zinc-600">ट्रांसपोर्ट</div>
                    <div className="text-[9px] font-bold text-red-400">-₹{r.costPerQ.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-zinc-600">नेट/क्विंटल</div>
                    <div className="text-[9px] font-extrabold text-green-400">₹{r.netProfit.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-zinc-600">ROI</div>
                    <div className="text-[9px] font-extrabold text-green-400">+{r.roi}%</div>
                  </div>
                </div>

                {/* 10 quintal summary */}
                <div className="mt-1.5 flex items-center justify-between bg-green-500/5 border border-green-500/10 rounded px-2 py-1">
                  <span className="text-[8px] text-zinc-500">10 क्विंटल पर</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-zinc-600">निवेश ₹{r.investment.toLocaleString()}</span>
                    <span className="text-[9px] font-extrabold text-green-400">मुनाफ़ा ₹{r.totalProfit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {data.length > 6 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full mt-2 py-1.5 text-[10px] text-green-500 font-semibold border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors"
        >
          {showAll ? "↑ कम दिखाएं" : `↓ सभी ${data.length} अवसर देखें`}
        </button>
      )}

      <div className="mt-1.5 text-[8px] text-zinc-700 px-1">
        * 10 क्विंटल ट्रक, state-centroid से दूरी अनुमान। कारोबार से पहले मंडी से भाव कन्फर्म करें।
      </div>
    </div>
  );
}
