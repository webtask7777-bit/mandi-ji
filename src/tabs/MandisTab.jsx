import { useState, useMemo, useEffect } from "react";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { MONTHS, FALLBACK_REGIONS } from "../data/constants";
import { useApi } from "../hooks/useApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const HEAT = ["#18181b", "#14532d", "#166534", "#15803d", "#22c55e"];
function heatSolid(val) {
  if (val <= 1) return HEAT[0];
  if (val <= 3) return HEAT[1];
  if (val <= 5) return HEAT[2];
  if (val <= 7) return HEAT[3];
  return HEAT[4];
}

export default function MandisTab({ selectedMonth, heatmap, regions, stateParam, onCropClick, jumpToMandi, onMandiConsumed }) {
  const [showAllHeatmap, setShowAllHeatmap] = useState(false);
  const [showAllGainers, setShowAllGainers] = useState(false);
  const [showAllLosers, setShowAllLosers] = useState(false);

  // Show a context banner when navigated here from a mandi name click
  useEffect(() => {
    if (jumpToMandi) {
      // consume after showing
      const t = setTimeout(() => onMandiConsumed?.(), 8000);
      return () => clearTimeout(t);
    }
  }, [jumpToMandi]);

  const tickerQ = stateParam ? `?state=${stateParam}` : '?state=all';
  const { data: tickerData } = useApi(`/ticker${tickerQ}`);

  const displayRegions = regions || FALLBACK_REGIONS;
  const displayHeatmap = heatmap || {};
  const showRegions = regions && regions.length > 0;
  const heatmapEntries = Object.entries(displayHeatmap);
  const visibleHeatmap = showAllHeatmap ? heatmapEntries : heatmapEntries.slice(0, 15);

  // Computed market stats
  const stats = useMemo(() => {
    if (!tickerData || tickerData.length === 0) return null;
    const crops = tickerData.length;
    const totalMandis = tickerData.reduce((s, t) => s + (t.mandiCount || 0), 0);
    const topGainers = [...tickerData].filter(t => t.changePct > 0).sort((a, b) => b.changePct - a.changePct);
    const topLosers = [...tickerData].filter(t => t.changePct < 0).sort((a, b) => a.changePct - b.changePct);
    const gainers = topGainers;
    const losers = topLosers;
    const flat = tickerData.filter(t => t.changePct === 0);
    const mostActive = [...tickerData].sort((a, b) => b.records - a.records).slice(0, 5);
    const maxRecords = mostActive[0]?.records || 1;

    const mspCrops = tickerData.filter(t => t.msp);
    const aboveMsp = mspCrops.filter(t => t.mspDiffPct > 0).sort((a, b) => b.mspDiffPct - a.mspDiffPct);
    const belowMsp = mspCrops.filter(t => t.mspDiffPct < 0).sort((a, b) => a.mspDiffPct - b.mspDiffPct);

    const sellCrops = tickerData.filter(t => t.signal === 'sell');
    const holdCrops = tickerData.filter(t => t.signal === 'hold');
    const buyCrops = tickerData.filter(t => t.signal === 'buy');

    return {
      crops, totalMandis,
      gainers, losers, flat,
      gainerPct: crops > 0 ? ((gainers.length / crops) * 100).toFixed(0) : 0,
      loserPct: crops > 0 ? ((losers.length / crops) * 100).toFixed(0) : 0,
      topGainers, topLosers, mostActive, maxRecords,
      aboveMsp, belowMsp,
      sellCrops, holdCrops, buyCrops,
    };
  }, [tickerData]);

  return (
    <div className="flex flex-col gap-4">

      {/* Jump-to-mandi context banner */}
      {jumpToMandi && (
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-lg px-3 py-2">
          <span className="text-[12px]">🏪</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-blue-400 font-bold">मंडी खोजें: {jumpToMandi}</div>
            <div className="text-[9px] text-zinc-500">भाव टैब से आए — यहाँ मंडी-वार डेटा देखें</div>
          </div>
          <button onClick={() => onMandiConsumed?.()} className="text-zinc-600 hover:text-zinc-400 text-[10px]">✕</button>
        </div>
      )}

      {/* ── A. Market Overview Strip ──────────────────────── */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-zinc-900 border-zinc-800 p-2.5 text-center">
            <div className="text-[8px] text-zinc-500 font-semibold tracking-wider">फसलें</div>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{stats.crops}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-2.5 text-center">
            <div className="text-[8px] text-zinc-500 font-semibold tracking-wider">मंडी</div>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{stats.totalMandis.toLocaleString()}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-2.5 text-center">
            <div className="text-[8px] text-green-500 font-semibold tracking-wider">तेज़ी</div>
            <div className="text-lg font-extrabold text-green-500 mt-0.5">{stats.gainers.length}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-2.5 text-center">
            <div className="text-[8px] text-red-500 font-semibold tracking-wider">मंदी</div>
            <div className="text-lg font-extrabold text-red-500 mt-0.5">{stats.losers.length}</div>
          </Card>
        </div>
      )}

      {/* ── B. Market Breadth Bar ─────────────────────────── */}
      {stats && (
        <Card className="bg-zinc-900 border-zinc-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-amber-500"/>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider">मार्केट ब्रेड्थ</span>
            </div>
            <span className="text-[9px] text-zinc-500">
              {stats.flat.length > 0 && `${stats.flat.length} स्थिर`}
            </span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
            {stats.gainers.length > 0 && (
              <div className="bg-green-500 transition-all duration-700" style={{ width: `${stats.gainerPct}%` }}/>
            )}
            {stats.losers.length > 0 && (
              <div className="bg-red-500 transition-all duration-700" style={{ width: `${stats.loserPct}%` }}/>
            )}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-green-500 font-bold">
              <TrendingUp size={10} className="inline mr-0.5"/> {stats.gainers.length} तेज़ी ({stats.gainerPct}%)
            </span>
            <span className="text-[10px] text-red-500 font-bold">
              {stats.losers.length} मंदी ({stats.loserPct}%) <TrendingDown size={10} className="inline ml-0.5"/>
            </span>
          </div>
        </Card>
      )}

      {/* ── C. Top Gainers & Losers ───────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          {/* Gainers */}
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-1.5">
              <ArrowUpRight size={12} className="text-green-500"/>
              <span className="text-[10px] text-green-500 font-bold tracking-wider">तेज़ी</span>
              <span className="text-[8px] text-zinc-500 ml-auto">{stats.topGainers.length}</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {(showAllGainers ? stats.topGainers : stats.topGainers.slice(0, 5)).map(t => (
                <div key={t.id} onClick={() => onCropClick?.(t.id)} className="px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs shrink-0">{t.emoji}</span>
                    <span className="text-[10px] text-foreground font-medium truncate">{t.nameHi}</span>
                  </div>
                  <span className="text-[10px] text-green-500 font-bold shrink-0 ml-1">+{t.changePct}%</span>
                </div>
              ))}
            </div>
            {stats.topGainers.length > 5 && (
              <button onClick={() => setShowAllGainers(!showAllGainers)}
                className="w-full py-1.5 text-[9px] text-green-500 font-semibold border-t border-zinc-800 hover:bg-zinc-800/50">
                {showAllGainers ? "कम" : `+${stats.topGainers.length - 5} और`}
              </button>
            )}
          </Card>

          {/* Losers */}
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-1.5">
              <ArrowDownRight size={12} className="text-red-500"/>
              <span className="text-[10px] text-red-500 font-bold tracking-wider">मंदी</span>
              <span className="text-[8px] text-zinc-500 ml-auto">{stats.topLosers.length}</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {(showAllLosers ? stats.topLosers : stats.topLosers.slice(0, 5)).map(t => (
                <div key={t.id} onClick={() => onCropClick?.(t.id)} className="px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs shrink-0">{t.emoji}</span>
                    <span className="text-[10px] text-foreground font-medium truncate">{t.nameHi}</span>
                  </div>
                  <span className="text-[10px] text-red-500 font-bold shrink-0 ml-1">{t.changePct}%</span>
                </div>
              ))}
            </div>
            {stats.topLosers.length > 5 && (
              <button onClick={() => setShowAllLosers(!showAllLosers)}
                className="w-full py-1.5 text-[9px] text-red-500 font-semibold border-t border-zinc-800 hover:bg-zinc-800/50">
                {showAllLosers ? "कम" : `+${stats.topLosers.length - 5} और`}
              </button>
            )}
          </Card>
        </div>
      )}

      {/* ── D. Most Active by Volume ──────────────────────── */}
      {stats && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={12} className="text-amber-500"/>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wider">सबसे ज़्यादा कारोबार</span>
          </div>
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-zinc-800 grid grid-cols-[1fr_70px_80px] text-[8px] text-zinc-500 font-semibold tracking-wider">
              <div>फसल</div>
              <div className="text-right">भाव</div>
              <div className="text-right">रिकॉर्ड</div>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {stats.mostActive.map((t, i) => {
                const barPct = (t.records / stats.maxRecords * 100).toFixed(0);
                return (
                  <div key={t.id} onClick={() => onCropClick?.(t.id)} className="px-3 py-2 cursor-pointer hover:bg-zinc-800/50 active:scale-[0.98] transition-all">
                    <div className="grid grid-cols-[1fr_70px_80px] items-center">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] text-zinc-500 font-bold w-3">{i + 1}</span>
                        <span className="text-xs shrink-0">{t.emoji}</span>
                        <span className="text-[11px] text-foreground font-semibold truncate">{t.nameHi}</span>
                      </div>
                      <div className={`text-right text-[11px] font-bold tabular-nums ${
                        t.change > 0 ? "text-green-500" : t.change < 0 ? "text-red-500" : "text-foreground"
                      }`}>
                        ₹{t.price?.toLocaleString()}
                      </div>
                      <div className="text-right text-[10px] text-zinc-400 font-medium tabular-nums">
                        {t.records?.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500/60 rounded-full transition-all duration-500" style={{ width: `${barPct}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── E. MSP Monitor ────────────────────────────────── */}
      {stats && (stats.aboveMsp.length > 0 || stats.belowMsp.length > 0) && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck size={12} className="text-green-500"/>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wider">MSP मॉनिटर</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Above MSP */}
            <Card className="bg-zinc-900 border-zinc-800 p-3">
              <div className="text-[9px] text-green-500 font-bold mb-2 flex items-center gap-1">
                <ShieldCheck size={10}/>
                MSP से ऊपर ({stats.aboveMsp.length})
              </div>
              <div className="flex flex-col gap-1.5">
                {stats.aboveMsp.slice(0, 6).map(t => (
                  <div key={t.id} onClick={() => onCropClick?.(t.id)} className="flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 rounded px-1 -mx-1 active:scale-[0.98] transition-all">
                    <span className="text-[10px] text-foreground truncate">{t.emoji} {t.nameHi}</span>
                    <span className="text-[9px] text-green-500 font-bold shrink-0 ml-1">+{t.mspDiffPct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Below MSP */}
            <Card className="bg-zinc-900 border-zinc-800 p-3">
              <div className="text-[9px] text-red-500 font-bold mb-2 flex items-center gap-1">
                <ShieldAlert size={10}/>
                MSP से नीचे ({stats.belowMsp.length})
              </div>
              <div className="flex flex-col gap-1.5">
                {stats.belowMsp.slice(0, 6).map(t => (
                  <div key={t.id} onClick={() => onCropClick?.(t.id)} className="flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 rounded px-1 -mx-1 active:scale-[0.98] transition-all">
                    <span className="text-[10px] text-foreground truncate">{t.emoji} {t.nameHi}</span>
                    <span className="text-[9px] text-red-500 font-bold shrink-0 ml-1">{t.mspDiffPct}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── F. Signal Distribution ────────────────────────── */}
      {stats && (
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-2">
            सिग्नल वितरण
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* बेचें (Sell) */}
            <Card className="bg-zinc-900 border-zinc-800 p-2.5">
              <div className="text-[9px] font-bold mb-1.5 text-green-500">
                बेचें ({stats.sellCrops.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {stats.sellCrops.slice(0, 8).map(t => (
                  <span key={t.id} onClick={() => onCropClick?.(t.id)} className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 cursor-pointer hover:bg-green-500/20 active:scale-95 transition-all">
                    {t.emoji}
                  </span>
                ))}
                {stats.sellCrops.length > 8 && (
                  <span className="text-[8px] text-zinc-500 px-1 py-0.5">+{stats.sellCrops.length - 8}</span>
                )}
              </div>
            </Card>
            {/* होल्ड (Hold) */}
            <Card className="bg-zinc-900 border-zinc-800 p-2.5">
              <div className="text-[9px] font-bold mb-1.5 text-amber-500">
                होल्ड ({stats.holdCrops.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {stats.holdCrops.slice(0, 8).map(t => (
                  <span key={t.id} onClick={() => onCropClick?.(t.id)} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 active:scale-95 transition-all">
                    {t.emoji}
                  </span>
                ))}
                {stats.holdCrops.length > 8 && (
                  <span className="text-[8px] text-zinc-500 px-1 py-0.5">+{stats.holdCrops.length - 8}</span>
                )}
              </div>
            </Card>
            {/* खरीदें (Buy) */}
            <Card className="bg-zinc-900 border-zinc-800 p-2.5">
              <div className="text-[9px] font-bold mb-1.5 text-red-500">
                खरीदें ({stats.buyCrops.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {stats.buyCrops.slice(0, 8).map(t => (
                  <span key={t.id} onClick={() => onCropClick?.(t.id)} className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 cursor-pointer hover:bg-red-500/20 active:scale-95 transition-all">
                    {t.emoji}
                  </span>
                ))}
                {stats.buyCrops.length > 8 && (
                  <span className="text-[8px] text-zinc-500 px-1 py-0.5">+{stats.buyCrops.length - 8}</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── G. Heatmap (preserved) ────────────────────────── */}
      {heatmapEntries.length > 0 && (
        <div>
          <div className="text-[10px] text-muted-foreground tracking-wider font-semibold mb-2">
            मंडी गतिविधि — 12 महीने
          </div>
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[360px]">
                <div className="grid gap-0.5 px-3 py-2 border-b border-zinc-800"
                  style={{ gridTemplateColumns: "72px repeat(12, 1fr)" }}>
                  <div/>
                  {MONTHS.map((m, i) => (
                    <div key={i} className={`text-[7px] text-center ${i === selectedMonth ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                      {m.slice(0,1)}
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1">
                  {visibleHeatmap.map(([mandi, vals]) => (
                    <div key={mandi} className="grid gap-0.5 py-0.5 cursor-pointer hover:bg-zinc-800/30 rounded transition-colors"
                      style={{ gridTemplateColumns: "72px repeat(12, 1fr)" }}>
                      <div className="text-[9px] text-muted-foreground flex items-center truncate">{mandi}</div>
                      {(vals || []).map((v, i) => (
                        <div key={i} className="h-5 rounded-sm flex items-center justify-center"
                          style={{
                            background: heatSolid(v),
                            outline: i === selectedMonth ? "1.5px solid #f59e0b" : "none",
                            outlineOffset: "-1px",
                          }}>
                          {i === selectedMonth && <span className="text-[7px] font-bold text-foreground">{v}</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {heatmapEntries.length > 15 && (
              <button onClick={() => setShowAllHeatmap(!showAllHeatmap)}
                className="w-full py-2 flex items-center justify-center gap-1 text-[11px] text-green-500 font-semibold border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                {showAllHeatmap ? (
                  <><ChevronUp size={14}/> कम दिखाएं</>
                ) : (
                  <><ChevronDown size={14}/> सभी {heatmapEntries.length} मंडी देखें</>
                )}
              </button>
            )}

            <div className="px-3 py-2 flex items-center gap-1 border-t border-zinc-800">
              <span className="text-[9px] text-muted-foreground">कम</span>
              {HEAT.map(c => (
                <div key={c} className="w-4 h-2.5 rounded-sm" style={{ background: c }}/>
              ))}
              <span className="text-[9px] text-muted-foreground">ज़्यादा</span>
            </div>
          </Card>
        </div>
      )}

      {/* Regions — only for CG */}
      {showRegions && (
        <div>
          <div className="text-[10px] text-muted-foreground tracking-wider font-semibold mb-2">
            क्षेत्र
          </div>
          <div className="flex flex-col gap-2">
            {displayRegions.map((r) => (
              <Card key={r.name} className="bg-zinc-900 border-zinc-800 p-3 cursor-pointer hover:border-zinc-600 transition-colors active:scale-[0.99]">
                <div className="font-bold text-sm mb-1" style={{ color: r.color }}>{r.name}</div>
                <div className="text-[10px] text-muted-foreground mb-2">{r.districts}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {r.crops.map(c => (
                    <Badge key={c} variant="outline" className="text-[10px]" style={{ borderColor: r.color, color: r.color }}>
                      {c}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
