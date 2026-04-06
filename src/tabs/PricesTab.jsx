import { useState, useEffect, useMemo, useRef } from "react";
import { TrendingUp, TrendingDown, ChevronRight, BarChart3, ArrowUpRight, ArrowDownRight, ShoppingCart, AlertTriangle, Flame, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PriceCard from "../components/PriceCard";
import MiniChart from "../components/MiniChart";
import TickerBoard from "../components/TickerBoard";
import MandiCompare from "../components/MandiCompare";
import ArbitrageList from "../components/ArbitrageList";
import { getOutlierBounds, isOutlier } from "@/lib/outlier";

const MONTH_HI = {
  '01': 'जनवरी', '02': 'फ़रवरी', '03': 'मार्च', '04': 'अप्रैल',
  '05': 'मई', '06': 'जून', '07': 'जुलाई', '08': 'अगस्त',
  '09': 'सितम्बर', '10': 'अक्टूबर', '11': 'नवम्बर', '12': 'दिसम्बर',
  'Jan': 'जन', 'Feb': 'फ़र', 'Mar': 'मार्च', 'Apr': 'अप्रै',
  'May': 'मई', 'Jun': 'जून', 'Jul': 'जुला', 'Aug': 'अग',
  'Sep': 'सित', 'Oct': 'अक्टू', 'Nov': 'नव', 'Dec': 'दिस',
};
function formatMonthHi(m) {
  if (!m) return '';
  return MONTH_HI[m] || m;
}
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

// Pick most relevant default crop: highest |changePct| from common crops with decent records
function getDefaultCrop(allCrops, tickerData) {
  if (!allCrops || allCrops.length === 0) return 'paddy';
  if (tickerData && tickerData.length > 0) {
    const cropIds = new Set(allCrops.map(c => c.id));
    // Popular crops only: many mandis + records + decent price
    const common = tickerData.filter(t =>
      cropIds.has(t.id) && t.records > 5000 && (t.mandiCount || 0) > 80 && t.price > 200
    );
    if (common.length > 0) {
      // Pick top gainer (positive changePct preferred, as it's more interesting news)
      const gainers = common.filter(t => t.changePct > 2);
      if (gainers.length > 0) {
        return gainers.reduce((a, b) => b.changePct > a.changePct ? b : a).id;
      }
      // Fallback: biggest mover either way
      return common.reduce((a, b) => Math.abs(b.changePct) > Math.abs(a.changePct) ? b : a).id;
    }
  }
  const sorted = [...allCrops].sort((a, b) => (b.totalRecords || 0) - (a.totalRecords || 0));
  return sorted[0]?.id || 'paddy';
}

export default function PricesTab({ crops, stateParam, initialCropId, onCropConsumed, onMandiClick }) {
  const allCrops = crops.length > 0 ? crops : [];
  const mspCrops = allCrops.filter(c => c.msp);
  const displayCrops = allCrops;
  const [selectedCrop, setSelectedCrop] = useState(null); // will be set after ticker loads
  const [showAllCards, setShowAllCards] = useState(false);
  const [view, setView] = useState("chart"); // "chart" or "board"
  const [sliderIndex, setSliderIndex] = useState(0);
  const sliderRef = useRef(null);
  const autoSlideRef = useRef(null);
  const smartDefaultSet = useRef(false); // true once ticker has been used to set default

  useEffect(() => {
    if (displayCrops.length > 0 && selectedCrop && !displayCrops.find(c => c.id === selectedCrop)) {
      smartDefaultSet.current = false;
      setSelectedCrop(null);
    }
  }, [stateParam]);

  // Jump to crop from external navigation (e.g., MandisTab click)
  useEffect(() => {
    if (initialCropId) {
      setSelectedCrop(initialCropId);
      setView("chart");
      onCropConsumed?.();
    }
  }, [initialCropId]);

  const stateQ = stateParam && stateParam !== 'all' ? `&state=${stateParam}` : stateParam === 'all' ? '&state=all' : '';
  const tickerQ = stateParam ? `?state=${stateParam}` : '?state=all';
  const { data: tickerData } = useApi(`/ticker${tickerQ}`);

  // Set smart default crop using ticker data (once per state)
  useEffect(() => {
    if (tickerData && allCrops.length > 0 && !smartDefaultSet.current) {
      smartDefaultSet.current = true;
      setSelectedCrop(getDefaultCrop(allCrops, tickerData));
    }
  }, [tickerData, allCrops.length, stateParam]);

  const activeCrop = selectedCrop || allCrops[0]?.id || 'paddy';
  const { data: priceData } = useApi(`/prices/${activeCrop}?months=13${stateQ}`);
  const { data: mandiCompareData } = useApi(`/mandi-compare/${activeCrop}${tickerQ}`);

  const selectedMeta = crops.find(c => c.id === activeCrop) || crops[0];
  const history = priceData?.history?.filter(h => h.market) || [];
  const dailyHistory = priceData?.dailyHistory?.filter(h => h.market) || [];
  const lastUpdated = priceData?.lastUpdated || null;
  const latestPrice = history.length > 0 ? history[history.length - 1] : null;
  const prevPrice = history.length > 1 ? history[history.length - 2] : null;

  // Prefer latest day's price for hero card
  const latestDay = dailyHistory.length > 0 ? dailyHistory[dailyHistory.length - 1] : null;
  const yesterdayDay = dailyHistory.length > 1 ? dailyHistory[dailyHistory.length - 2] : null;

  // Hero card values: use daily if available, else monthly
  const heroPrice = latestDay?.market || latestPrice?.market || 0;
  const heroPrev = latestDay ? (yesterdayDay?.market || 0) : (prevPrice?.market || 0);
  const heroChange = heroPrev ? heroPrice - heroPrev : 0;
  const heroChangePct = heroPrev ? ((heroChange / heroPrev) * 100).toFixed(1) : "0.0";
  const heroIsUp = heroChange >= 0;
  const heroLabel = latestDay ? formatDateHi(latestDay.date) : formatMonthHi(latestPrice?.month);
  const heroCompareLabel = latestDay ? "कल से" : "पिछले महीने से";

  const change = latestPrice && prevPrice ? latestPrice.market - prevPrice.market : 0;
  const changePct = prevPrice?.market ? ((change / prevPrice.market) * 100).toFixed(1) : "0.0";
  const isUp = change >= 0;

  // Get signal for selected crop from ticker data
  const selectedTicker = tickerData?.find(t => t.id === activeCrop);

  // Outlier detection for best/worst mandi prices
  const mandiOutlierBounds = useMemo(() => {
    if (!mandiCompareData || mandiCompareData.length < 4) return null;
    return getOutlierBounds(mandiCompareData.map(m => m.recentPrice || m.avgPrice));
  }, [mandiCompareData]);

  // Top movers from ticker for slider
  const topMovers = useMemo(() => {
    if (!tickerData || tickerData.length === 0) return [];
    const cropIds = new Set(displayCrops.map(c => c.id));
    const valid = tickerData.filter(t => cropIds.has(t.id) && t.records > 2000 && t.price > 100 && t.changePct !== 0);
    const gainers = [...valid].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
    const losers = [...valid].sort((a, b) => a.changePct - b.changePct).slice(0, 3);
    // Interleave: 2 gainers, 1 loser, 2 gainers, 1 loser, 1 gainer
    const slides = [];
    gainers.forEach((g, i) => {
      slides.push({ ...g, type: 'up' });
      if (losers[i]) slides.push({ ...losers[i], type: 'down' });
    });
    return slides.slice(0, 6);
  }, [tickerData, displayCrops.length]);

  // Auto-slide
  useEffect(() => {
    if (topMovers.length < 2) return;
    autoSlideRef.current = setInterval(() => {
      setSliderIndex(i => (i + 1) % topMovers.length);
    }, 3500);
    return () => clearInterval(autoSlideRef.current);
  }, [topMovers.length]);

  const cropsWithPrices = displayCrops.slice(0, 8).map(c => {
    const ticker = tickerData?.find(t => t.id === c.id);
    return {
      ...c,
      displayName: c.nameHi || c.name,
      name: c.nameHi ? `${c.nameHi}` : c.name,
      market: c.avgPrice || c.msp || 0,
      changePct: ticker?.changePct ?? null,
      change: ticker?.change ?? null,
      mandiCount: ticker?.mandiCount ?? null,
    };
  });

  const visibleCards = showAllCards ? cropsWithPrices : cropsWithPrices.slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top Movers Slider ── */}
      {topMovers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tracking-wider font-semibold">
              <Flame size={11} className="text-orange-400"/>
              आज के टॉप मूवर्स
            </div>
            <div className="flex items-center gap-1">
              {topMovers.map((_, i) => (
                <button key={i} onClick={() => { setSliderIndex(i); clearInterval(autoSlideRef.current); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === sliderIndex ? 'bg-green-500 w-3' : 'bg-zinc-700'}`}/>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl" ref={sliderRef}>
            {topMovers.map((item, i) => (
              <div key={item.id}
                style={{ display: i === sliderIndex ? 'block' : 'none' }}
                onClick={() => { setSelectedCrop(item.id); clearInterval(autoSlideRef.current); }}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all active:scale-[0.98] ${
                  item.type === 'up'
                    ? 'bg-green-500/10 border-green-500/25'
                    : 'bg-red-500/10 border-red-500/25'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      item.type === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {item.emoji}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-foreground">{item.nameHi}</div>
                      <div className="text-[10px] text-muted-foreground">{item.mandiCount} मंडी · {item.records?.toLocaleString()} रिकॉर्ड</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-foreground">₹{item.price?.toLocaleString()}</div>
                    <div className={`flex items-center justify-end gap-0.5 text-[12px] font-bold ${item.type === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {item.type === 'up' ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
                      {item.type === 'up' ? '+' : ''}{item.changePct}%
                    </div>
                    <div className="text-[9px] text-muted-foreground">/क्विंटल</div>
                  </div>
                </div>
                {item.bestMandi && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/10 flex justify-between">
                    <div className="flex items-center gap-1">
                      <ArrowUpRight size={10} className="text-green-500"/>
                      <span className="text-[10px] text-foreground font-semibold">₹{item.bestMandi.price?.toLocaleString()} — {item.bestMandi.name}</span>
                    </div>
                    {item.worstMandi && (
                      <div className="flex items-center gap-1">
                        <ArrowDownRight size={10} className="text-red-500"/>
                        <span className="text-[10px] text-foreground font-semibold">₹{item.worstMandi.price?.toLocaleString()} — {item.worstMandi.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Market Stats Bar ── */}
      {tickerData && tickerData.length > 0 && (() => {
        const cropIds = new Set(displayCrops.map(c => c.id));
        const valid = tickerData.filter(t => cropIds.has(t.id) && t.records > 500 && t.price > 50 && t.changePct !== 0);
        const gainers = valid.filter(t => t.changePct > 0).length;
        const losers = valid.filter(t => t.changePct < 0).length;
        const totalMandis = valid.reduce((sum, t) => sum + (t.mandiCount || 0), 0);
        return (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'बढ़े', value: gainers, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20', icon: '▲' },
              { label: 'गिरे', value: losers, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', icon: '▼' },
              { label: 'मंडियाँ', value: totalMandis.toLocaleString(), color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: '🏪' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
                <div className={`text-base font-extrabold ${s.color}`}>{s.icon} {s.value}</div>
                <div className="text-[9px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Latest Price Hero — Enhanced with Signal */}
      {(latestDay || latestPrice) && (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <div className={`h-1 ${heroIsUp ? "bg-green-500" : "bg-red-500"}`}/>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-muted-foreground tracking-wider">
                थोक भाव — {heroLabel}
              </div>
              <div className="flex items-center gap-1.5">
                {selectedTicker?.signal && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                    selectedTicker.signal === 'sell' ? 'bg-green-500/15 border-green-500/30 text-green-500' :
                    selectedTicker.signal === 'buy' ? 'bg-red-500/15 border-red-500/30 text-red-500' :
                    'bg-amber-500/15 border-amber-500/30 text-amber-500'
                  }`}>
                    {selectedTicker.signalHi}
                  </span>
                )}
                {latestPrice?.msp && (
                  <Badge variant="outline" className="text-[10px] border-zinc-700 text-amber-500">
                    MSP ₹{latestPrice.msp?.toLocaleString()}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-foreground">
                {selectedMeta?.emoji} ₹{heroPrice?.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">/क्विंटल</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`flex items-center gap-1 text-sm font-bold ${heroIsUp ? "text-green-500" : "text-red-500"}`}>
                {heroIsUp ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                {heroIsUp ? "+" : ""}{heroChange.toLocaleString()} ({heroIsUp ? "+" : ""}{heroChangePct}%)
              </span>
              <span className="text-[10px] text-muted-foreground">{heroCompareLabel}</span>
            </div>
            {lastUpdated && (
              <div className="text-[9px] text-zinc-500 mt-1.5">
                Updated: {formatTimestamp(lastUpdated)}
              </div>
            )}
            {/* Best/Worst Mandi Quick Info */}
            {selectedTicker?.bestMandi && selectedTicker?.worstMandi && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                <div className="flex-1 flex items-center gap-1.5">
                  <ArrowUpRight size={12} className="text-green-500 shrink-0"/>
                  <div className="min-w-0">
                    <div className="text-[8px] text-green-500 font-semibold">सबसे ज़्यादा</div>
                    <div className="text-[10px] text-foreground font-bold truncate">
                      ₹{selectedTicker.bestMandi.price?.toLocaleString()} — {selectedTicker.bestMandi.name}{selectedTicker.bestMandi.stateCode ? `, ${selectedTicker.bestMandi.stateCode}` : ''}
                    </div>
                    {(() => { const m = mandiCompareData?.find(x => x.name === selectedTicker.bestMandi.name); const info = [m?.topVariety, m?.grade && m.grade !== 'Local' ? m.grade : null].filter(Boolean).join(' · '); return info ? <div className="text-[7px] text-zinc-400 italic truncate">{info}</div> : null; })()}
                    {isOutlier(selectedTicker.bestMandi.price, mandiOutlierBounds) && (
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
                      ₹{selectedTicker.worstMandi.price?.toLocaleString()} — {selectedTicker.worstMandi.name}{selectedTicker.worstMandi.stateCode ? `, ${selectedTicker.worstMandi.stateCode}` : ''}
                    </div>
                    {(() => { const m = mandiCompareData?.find(x => x.name === selectedTicker.worstMandi.name); const info = [m?.topVariety, m?.grade && m.grade !== 'Local' ? m.grade : null].filter(Boolean).join(' · '); return info ? <div className="text-[7px] text-zinc-400 italic truncate">{info}</div> : null; })()}
                    {isOutlier(selectedTicker.worstMandi.price, mandiOutlierBounds) && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <AlertTriangle size={7} className="text-amber-500 shrink-0"/>
                        <span className="text-[7px] text-amber-500">असामान्य भाव</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Sell This Crop Button */}
            <Link
              to={`/listing/new?type=sell&crop=${activeCrop}`}
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-colors"
            >
              <ShoppingCart size={13} />
              यह फसल बेचें
            </Link>
          </div>
        </Card>
      )}

      {/* Crop Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-muted-foreground tracking-wider font-semibold">
            फसल चुनें
          </div>
          {/* View toggle */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button onClick={() => setView("chart")}
              className={`text-[9px] px-2 py-0.5 rounded-md transition-all ${
                view === "chart" ? "bg-green-500 text-green-950 font-bold" : "text-zinc-400"
              }`}>
              📊 चार्ट
            </button>
            <button onClick={() => setView("board")}
              className={`text-[9px] px-2 py-0.5 rounded-md transition-all ${
                view === "board" ? "bg-green-500 text-green-950 font-bold" : "text-zinc-400"
              }`}>
              📋 बोर्ड
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {displayCrops.slice(0, 15).map(crop => (
            <Badge key={crop.id}
              onClick={() => setSelectedCrop(crop.id)}
              variant={activeCrop === crop.id ? "default" : "outline"}
              className={`shrink-0 cursor-pointer text-[11px] px-2.5 py-1 whitespace-nowrap transition-all active:scale-95 ${
                activeCrop === crop.id
                  ? "bg-green-500 text-green-950 hover:bg-green-600 border-green-500"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}>
              {crop.emoji} {crop.nameHi || crop.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Conditional: Chart view or Board view */}
      {view === "chart" ? (
        <>
          {/* Price Trend Chart */}
          {(history.length > 0 || dailyHistory.length > 0) && (
            <MiniChart
              data={history}
              dailyData={dailyHistory}
              title={`${selectedMeta?.emoji || ''} ${selectedMeta?.nameHi || selectedMeta?.name || ''}`}
              formatMonth={formatMonthHi}
            />
          )}

          {/* Mandi Comparison */}
          {mandiCompareData && mandiCompareData.length > 1 && (
            <MandiCompare
              data={mandiCompareData}
              cropName={selectedMeta?.nameHi || selectedMeta?.name}
              cropEmoji={selectedMeta?.emoji}
              dailyHistory={dailyHistory}
              shelfLife={selectedMeta?.shelfLife}
              onMandiClick={onMandiClick}
              cropId={activeCrop}
            />
          )}

          {/* Arbitrage Opportunities List */}
          <ArbitrageList stateParam={stateParam} onCropClick={(cropId) => setSelectedCrop(cropId)}/>

          {/* Price Cards Grid */}
          <div>
            <div className="text-[10px] text-muted-foreground tracking-wider font-semibold mb-2">
              {mspCrops.length > 0 ? "MSP vs बाज़ार भाव" : "बाज़ार भाव"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {visibleCards.map(crop => (
                <PriceCard key={crop.id} crop={crop} onClick={() => setSelectedCrop(crop.id)}/>
              ))}
            </div>
            {cropsWithPrices.length > 4 && (
              <button
                onClick={() => setShowAllCards(!showAllCards)}
                className="w-full mt-2 py-2 text-[11px] text-green-500 font-semibold flex items-center justify-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 active:bg-zinc-800 transition-colors cursor-pointer">
                {showAllCards ? "कम दिखाएं" : `सभी ${cropsWithPrices.length} फसलें देखें`}
                <ChevronRight size={12} className={`transition-transform ${showAllCards ? "rotate-90" : ""}`}/>
              </button>
            )}
          </div>

          {/* District Breakdown */}
          {priceData?.districtBreakdown?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-zinc-800">
                <div className="text-[10px] text-muted-foreground tracking-wider font-semibold">
                  ज़िला वार कारोबार — {selectedMeta?.nameHi || selectedMeta?.name}
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {priceData.districtBreakdown.slice(0, 8).map((d) => {
                  const maxRec = priceData.districtBreakdown[0]?.records || 1;
                  const pct = ((d.records / maxRec) * 100).toFixed(0);
                  return (
                    <div key={d.district || d.districtId} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-28 shrink-0 truncate">
                        {d.nameHi || d.district || d.name}
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
        </>
      ) : (
        /* Board View — Digital Board */
        <TickerBoard
          data={tickerData}
          onSelectCrop={setSelectedCrop}
          selectedCrop={selectedCrop}
        />
      )}
    </div>
  );
}
