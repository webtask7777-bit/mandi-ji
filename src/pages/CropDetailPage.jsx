import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ShoppingCart, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useStateContext } from "../context/StateContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MiniChart from "../components/MiniChart";
import MandiCompare from "../components/MandiCompare";
import SEO from "../components/SEO";
import { getOutlierBounds, isOutlier } from "@/lib/outlier";

const MONTH_HI = {
  '01': 'जनवरी', '02': 'फ़रवरी', '03': 'मार्च', '04': 'अप्रैल',
  '05': 'मई', '06': 'जून', '07': 'जुलाई', '08': 'अगस्त',
  '09': 'सितम्बर', '10': 'अक्टूबर', '11': 'नवम्बर', '12': 'दिसम्बर',
};
function formatMonthHi(m) { return MONTH_HI[m] || m; }
function formatDateHi(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTH_HI[m] || m}`;
}
function formatTimestamp(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST';
}

export default function CropDetailPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { stateParam, stateNameHi } = useStateContext();

  const stateQ = stateParam && stateParam !== 'all' ? `&state=${stateParam}` : '&state=all';
  const tickerQ = stateParam ? `?state=${stateParam}` : '?state=all';

  const { data: priceData, loading: priceLoading } = useApi(`/prices/${cropId}?months=13${stateQ}`);
  const { data: mandiData } = useApi(`/mandi-compare/${cropId}${tickerQ}`);
  const { data: tickerData } = useApi(`/ticker${tickerQ}`);

  const cropTicker = tickerData?.find(t => t.id === cropId);
  const history = priceData?.history?.filter(h => h.market) || [];
  const dailyHistory = priceData?.dailyHistory?.filter(h => h.market) || [];
  const lastUpdated = priceData?.lastUpdated || null;
  const cropMeta = priceData?.crop || cropTicker || {};

  // Hero price calculations
  const latestDay = dailyHistory.length > 0 ? dailyHistory[dailyHistory.length - 1] : null;
  const yesterdayDay = dailyHistory.length > 1 ? dailyHistory[dailyHistory.length - 2] : null;
  const latestMonth = history.length > 0 ? history[history.length - 1] : null;
  const prevMonth = history.length > 1 ? history[history.length - 2] : null;

  const heroPrice = latestDay?.market || latestMonth?.market || cropTicker?.price || 0;
  const heroPrev = latestDay ? (yesterdayDay?.market || 0) : (prevMonth?.market || 0);
  const heroChange = heroPrev ? heroPrice - heroPrev : (cropTicker?.change || 0);
  const heroChangePct = heroPrev ? ((heroChange / heroPrev) * 100).toFixed(1) : (cropTicker?.changePct || 0);
  const heroIsUp = heroChange >= 0;
  const heroLabel = latestDay ? formatDateHi(latestDay.date) : formatMonthHi(latestMonth?.month);

  // Outlier detection for best/worst mandi
  const mandiOutlierBounds = useMemo(() => {
    if (!mandiData || mandiData.length < 4) return null;
    return getOutlierBounds(mandiData.map(m => m.recentPrice || m.avgPrice));
  }, [mandiData]);

  if (priceLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground w-full max-w-lg mx-auto flex flex-col">
        <header className="sticky top-0 z-30 bg-background border-b border-zinc-800 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeft size={16}/> वापस
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground animate-pulse">लोड हो रहा है...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground w-full max-w-lg mx-auto flex flex-col">
      <SEO
        title={`${cropMeta.nameHi || cropId} भाव — ₹${heroPrice?.toLocaleString()}/क्विंटल`}
        description={`${cropMeta.nameHi || cropId} (${cropMeta.name || cropId}) का ताज़ा मंडी भाव ₹${heroPrice?.toLocaleString()}/क्विंटल। मंडी तुलना, मुनाफ़ा कैलकुलेटर, MSP जानकारी।`}
        path={`/crop/${cropId}`}
      />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16}/> वापस
          </button>
          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
            {stateNameHi}
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-8 flex flex-col gap-4">
        {/* Crop Title */}
        <div>
          <div className="text-xl font-extrabold">
            {cropMeta.emoji || cropTicker?.emoji || ''} {cropMeta.nameHi || cropTicker?.nameHi || cropId}
          </div>
          <div className="text-[11px] text-muted-foreground">{cropMeta.name || cropTicker?.name || cropId}</div>
        </div>

        {/* Hero Price Card */}
        {heroPrice > 0 && (
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className={`h-1 ${heroIsUp ? "bg-green-500" : "bg-red-500"}`}/>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-muted-foreground tracking-wider">
                  ताज़ा भाव — {heroLabel}
                </div>
                <div className="flex items-center gap-1.5">
                  {cropTicker?.signal && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                      cropTicker.signal === 'sell' ? 'bg-green-500/15 border-green-500/30 text-green-500' :
                      cropTicker.signal === 'buy' ? 'bg-red-500/15 border-red-500/30 text-red-500' :
                      'bg-amber-500/15 border-amber-500/30 text-amber-500'
                    }`}>
                      {cropTicker.signalHi}
                    </span>
                  )}
                  {cropMeta.msp && (
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-amber-500">
                      MSP ₹{cropMeta.msp?.toLocaleString()}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-foreground">
                  ₹{heroPrice?.toLocaleString()}
                </span>
                <span className="text-[11px] text-muted-foreground">/क्विंटल</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`flex items-center gap-1 text-sm font-bold ${heroIsUp ? "text-green-500" : "text-red-500"}`}>
                  {heroIsUp ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                  {heroIsUp ? "+" : ""}{heroChange.toLocaleString()} ({heroIsUp ? "+" : ""}{heroChangePct}%)
                </span>
              </div>
              {lastUpdated && (
                <div className="text-[9px] text-zinc-500 mt-1.5">
                  Updated: {formatTimestamp(lastUpdated)}
                </div>
              )}

              {/* Best/Worst Mandi */}
              {cropTicker?.bestMandi && cropTicker?.worstMandi && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                  <div className="flex-1 flex items-center gap-1.5">
                    <ArrowUpRight size={12} className="text-green-500 shrink-0"/>
                    <div className="min-w-0">
                      <div className="text-[8px] text-green-500 font-semibold">सबसे ज़्यादा</div>
                      <div className="text-[10px] text-foreground font-bold truncate">
                        ₹{cropTicker.bestMandi.price?.toLocaleString()} — {cropTicker.bestMandi.name}{cropTicker.bestMandi.stateCode ? `, ${cropTicker.bestMandi.stateCode}` : ''}
                      </div>
                      {(() => { const m = mandiData?.find(x => x.name === cropTicker.bestMandi.name); const info = [m?.topVariety, m?.grade && m.grade !== 'Local' ? m.grade : null].filter(Boolean).join(' · '); return info ? <div className="text-[7px] text-zinc-400 italic truncate">{info}</div> : null; })()}
                      {isOutlier(cropTicker.bestMandi.price, mandiOutlierBounds) && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle size={7} className="text-amber-500 shrink-0"/>
                          <span className="text-[7px] text-amber-500">असामान्य भाव</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-1.5">
                    <ArrowDownRight size={12} className="text-red-500 shrink-0"/>
                    <div className="min-w-0">
                      <div className="text-[8px] text-red-500 font-semibold">सबसे कम</div>
                      <div className="text-[10px] text-foreground font-bold truncate">
                        ₹{cropTicker.worstMandi.price?.toLocaleString()} — {cropTicker.worstMandi.name}{cropTicker.worstMandi.stateCode ? `, ${cropTicker.worstMandi.stateCode}` : ''}
                      </div>
                      {(() => { const m = mandiData?.find(x => x.name === cropTicker.worstMandi.name); const info = [m?.topVariety, m?.grade && m.grade !== 'Local' ? m.grade : null].filter(Boolean).join(' · '); return info ? <div className="text-[7px] text-zinc-400 italic truncate">{info}</div> : null; })()}
                      {isOutlier(cropTicker.worstMandi.price, mandiOutlierBounds) && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle size={7} className="text-amber-500 shrink-0"/>
                          <span className="text-[7px] text-amber-500">असामान्य भाव</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sell Button */}
              <Link
                to={`/listing/new?type=sell&crop=${cropId}`}
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-colors"
              >
                <ShoppingCart size={13} />
                यह फसल बेचें
              </Link>
            </div>
          </Card>
        )}

        {/* Price Chart */}
        {(history.length > 0 || dailyHistory.length > 0) && (
          <MiniChart
            data={history}
            dailyData={dailyHistory}
            title={`${cropMeta.emoji || ''} ${cropMeta.nameHi || cropId}`}
            formatMonth={formatMonthHi}
          />
        )}

        {/* Mandi Comparison (includes arbitrage card) */}
        {mandiData && mandiData.length > 1 && (
          <MandiCompare
            data={mandiData}
            cropName={cropMeta.nameHi || cropId}
            cropEmoji={cropMeta.emoji}
          />
        )}

        {/* District Breakdown */}
        {priceData?.districtBreakdown?.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-zinc-800">
              <div className="text-[10px] text-muted-foreground tracking-wider font-semibold">
                ज़िला वार कारोबार
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {priceData.districtBreakdown.slice(0, 10).map((d) => {
                const maxRec = priceData.districtBreakdown[0]?.records || 1;
                const pct = ((d.records / maxRec) * 100).toFixed(0);
                return (
                  <div key={d.district} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 shrink-0 truncate">
                      {d.nameHi || d.district}
                    </span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500"
                        style={{ width: `${pct}%`, transition: "width 0.5s ease" }}/>
                    </div>
                    <span className="text-[10px] text-zinc-400 w-8 text-right font-medium">
                      {d.records}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Crop Info */}
        {cropTicker && (
          <Card className="bg-zinc-900 border-zinc-800 p-3">
            <div className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-2">फसल जानकारी</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">कुल मंडी</span>
                <span className="text-foreground font-semibold">{cropTicker.mandiCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">कुल रिकॉर्ड</span>
                <span className="text-foreground font-semibold">{cropTicker.records?.toLocaleString()}</span>
              </div>
              {cropTicker.msp && (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">MSP</span>
                    <span className="text-amber-500 font-semibold">₹{cropTicker.msp.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">MSP से</span>
                    <span className={`font-semibold ${cropTicker.mspDiffPct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {cropTicker.mspDiffPct > 0 ? '+' : ''}{cropTicker.mspDiffPct}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
