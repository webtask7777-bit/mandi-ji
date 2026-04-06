import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, MapPin, ChevronDown, ChevronUp, Trophy, AlertTriangle, Truck, ArrowRight, ShieldAlert, Lightbulb, BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOutlierBounds, isOutlier } from "@/lib/outlier";
import { useStateContext } from "../context/StateContext";

// State centroid coordinates (lat, lng) for all Indian states/UTs
const STATE_COORDS = {
  AP: [15.91, 79.74], AR: [28.22, 94.73], AS: [26.20, 92.94], BR: [25.09, 85.31],
  CG: [21.27, 81.86], GA: [15.30, 74.00], GJ: [22.26, 71.19], HR: [29.06, 76.09],
  HP: [31.10, 77.17], JK: [33.73, 76.92], JH: [23.61, 85.27], KA: [15.32, 75.72],
  KL: [10.85, 76.27], MP: [22.97, 78.66], MH: [19.75, 75.71], MN: [24.66, 93.91],
  ML: [25.47, 91.37], MZ: [23.16, 92.94], NL: [26.16, 94.60], OD: [20.94, 84.80],
  PB: [31.15, 75.34], RJ: [27.02, 74.22], SK: [27.53, 88.51], TN: [11.13, 78.66],
  TS: [17.12, 79.02], TR: [23.75, 91.75], UP: [26.85, 80.91], UK: [30.07, 79.35],
  WB: [22.98, 87.85], DL: [28.70, 77.10], PY: [11.94, 79.81], CH: [30.74, 76.79],
  AN: [11.66, 92.73], DN: [20.19, 73.02], LD: [10.57, 72.64],
};

// Maps 2-letter state codes to StateContext IDs (hyphenated format)
const STATE_CODE_TO_ID = {
  AP: 'andhra-pradesh', AR: 'arunachal-pradesh', AS: 'assam', BR: 'bihar',
  CG: 'chhattisgarh', GA: 'goa', GJ: 'gujarat', HR: 'haryana',
  HP: 'himachal-pradesh', JK: 'jammu-kashmir', JH: 'jharkhand', KA: 'karnataka',
  KL: 'kerala', MP: 'madhya-pradesh', MH: 'maharashtra', MN: 'manipur',
  ML: 'meghalaya', MZ: 'mizoram', NL: 'nagaland', OD: 'odisha', OR: 'odisha',
  PB: 'punjab', RJ: 'rajasthan', SK: 'sikkim', TN: 'tamil-nadu',
  TS: 'telangana', TR: 'tripura', UP: 'uttar-pradesh', UK: 'uttarakhand',
  WB: 'west-bengal', DL: 'delhi', PY: 'puducherry', CH: 'chandigarh',
  AN: 'andaman-nicobar', LA: 'ladakh',
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35); // ×1.35 road factor
}

function geoDistance(mandiA, mandiB) {
  const cA = STATE_COORDS[mandiA.stateCode];
  const cB = STATE_COORDS[mandiB.stateCode];
  if (cA && cB) return Math.max(50, haversineKm(cA[0], cA[1], cB[0], cB[1]));
  // Fallback: same state → 150 km avg intra-state
  if (mandiA.stateCode && mandiA.stateCode === mandiB.stateCode) return 150;
  return 800; // unknown cross-state fallback
}

function calcTransport(originMandi, destMandi, qty = 10) {
  const dist = geoDistance(originMandi, destMandi);
  // truck-small: base=1000, perKm=20, cap=70
  const trips = Math.ceil(qty / 70);
  const baseCost = 1000 * trips;
  const distCost = dist * 20 * trips;
  const loading = qty * 5;
  const toll = dist * 0.5;
  const total = baseCost + distCost + loading + toll;
  return { distance: dist, totalCost: Math.round(total), costPerQuintal: Math.round(total / qty), loading, toll: Math.round(toll) };
}

export default function MandiCompare({ data, cropName, cropEmoji, dailyHistory = [], shelfLife, onMandiClick, cropId }) {
  const [showAll, setShowAll] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const navigate = useNavigate();
  const { selectStateDirect } = useStateContext();

  function handleStateClick(code) {
    const stateId = STATE_CODE_TO_ID[code];
    if (stateId) selectStateDirect(stateId);
  }

  if (!data || data.length === 0) return null;

  // Prefer recentPrice (last 7 days) over all-time avgPrice
  const getPrice = (m) => m.recentPrice || m.avgPrice;
  const avgPrice = Math.round(data.reduce((sum, m) => sum + getPrice(m), 0) / data.length);
  const best = data[0]; // already sorted desc by recentPrice/avgPrice
  const worst = data[data.length - 1];
  const spread = getPrice(best) - getPrice(worst);

  const outlierBounds = useMemo(() => getOutlierBounds(data.map(getPrice)), [data]);
  const bestIsOutlier = isOutlier(getPrice(best), outlierBounds);
  const worstIsOutlier = isOutlier(getPrice(worst), outlierBounds);

  // Same-variety filter: find the most common non-"Local" variety and use only those mandis for buy/sell comparison
  const compareData = useMemo(() => {
    const counts = {};
    data.forEach(m => { if (m.topVariety && m.topVariety !== 'Local') counts[m.topVariety] = (counts[m.topVariety] || 0) + 1; });
    const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const filtered = topEntry ? data.filter(m => m.topVariety === topEntry[0]) : null;
    return (filtered && filtered.length >= 2) ? filtered : data;
  }, [data]);

  const activeVariety = useMemo(() => {
    const counts = {};
    data.forEach(m => { if (m.topVariety && m.topVariety !== 'Local') counts[m.topVariety] = (counts[m.topVariety] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [data]);

  const varietyFiltered = compareData !== data;
  const compareOutlierBounds = useMemo(() => getOutlierBounds(compareData.map(getPrice)), [compareData]);

  // For buy/sell: use same-variety data
  const compareBest  = compareData[0];
  const compareWorst = compareData[compareData.length - 1];
  const compareBestIsOutlier  = isOutlier(getPrice(compareBest), compareOutlierBounds);
  const compareWorstIsOutlier = isOutlier(getPrice(compareWorst), compareOutlierBounds);

  const safeBest  = compareBestIsOutlier  ? (compareData.find((m, i) => i > 0 && !isOutlier(getPrice(m), compareOutlierBounds)) || compareBest)  : compareBest;
  const safeWorst = compareWorstIsOutlier ? ([...compareData].reverse().find(m => !isOutlier(getPrice(m), compareOutlierBounds)) || compareWorst) : compareWorst;
  const priceAdjusted = compareBestIsOutlier || compareWorstIsOutlier;
  const safeSellPrice = getPrice(safeBest);
  const safeBuyPrice  = getPrice(safeWorst);
  const safeSpread = safeSellPrice - safeBuyPrice;

  // Arbitrage calculation
  const qty = 10;
  const transport = compareData.length >= 2 ? calcTransport(safeWorst, safeBest, qty) : null;
  const netProfitPerQ = transport ? (safeSpread - transport.costPerQuintal) : 0;
  const totalProfit = netProfitPerQ * qty;
  const showArbitrage = safeSpread > 500 && compareData.length >= 2;

  const visible = showAll ? data : data.slice(0, 8);
  const maxPrice = getPrice(best);

  return (
    <div>
      <div className="text-[10px] text-muted-foreground tracking-wider font-semibold mb-2">
        {cropEmoji} {cropName} — मंडी तुलना ({data.length} मंडी)
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card className="bg-zinc-900 border-zinc-800 p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <Trophy size={10} className="text-green-500"/>
            <span className="text-[8px] text-green-500 font-bold tracking-wider">सबसे ज़्यादा</span>
          </div>
          <div className="text-sm font-extrabold text-green-500">₹{getPrice(best).toLocaleString()}</div>
          <div className="text-[8px] text-zinc-500 truncate mt-0.5">
            <button onClick={() => onMandiClick?.(best.name)} className="hover:text-green-400 underline decoration-dotted transition-colors">{best.name}</button>
            {best.stateCode && <button onClick={() => handleStateClick(best.stateCode)} className="text-blue-400/70 hover:text-blue-300 ml-0.5 underline decoration-dotted transition-colors">, {best.stateCode}</button>}
          </div>
          {(best.topVariety || best.grade) && (
            <div className="text-[7px] text-zinc-400 italic truncate mt-0.5">{[best.topVariety, best.grade].filter(Boolean).join(' · ')}</div>
          )}
          {isOutlier(getPrice(best), outlierBounds) && (
            <div className="flex items-center gap-0.5 mt-1">
              <AlertTriangle size={8} className="text-amber-500 shrink-0"/>
              <span className="text-[7px] text-amber-500 font-semibold">असामान्य भाव</span>
            </div>
          )}
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[8px] text-amber-500 font-bold tracking-wider">औसत</span>
          </div>
          <div className="text-sm font-extrabold text-amber-500">₹{avgPrice.toLocaleString()}</div>
          <div className="text-[8px] text-zinc-500 mt-0.5">{data.length} मंडी</div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle size={10} className="text-red-500"/>
            <span className="text-[8px] text-red-500 font-bold tracking-wider">सबसे कम</span>
          </div>
          <div className="text-sm font-extrabold text-red-500">₹{getPrice(worst).toLocaleString()}</div>
          <div className="text-[8px] text-zinc-500 truncate mt-0.5">
            <button onClick={() => onMandiClick?.(worst.name)} className="hover:text-red-400 underline decoration-dotted transition-colors">{worst.name}</button>
            {worst.stateCode && <button onClick={() => handleStateClick(worst.stateCode)} className="text-blue-400/70 hover:text-blue-300 ml-0.5 underline decoration-dotted transition-colors">, {worst.stateCode}</button>}
          </div>
          {(worst.topVariety || worst.grade) && (
            <div className="text-[7px] text-zinc-400 italic truncate mt-0.5">{[worst.topVariety, worst.grade].filter(Boolean).join(' · ')}</div>
          )}
          {isOutlier(getPrice(worst), outlierBounds) && (
            <div className="flex items-center gap-0.5 mt-1">
              <AlertTriangle size={8} className="text-amber-500 shrink-0"/>
              <span className="text-[7px] text-amber-500 font-semibold">असामान्य भाव</span>
            </div>
          )}
        </Card>
      </div>

      {/* Variety mismatch info — summary cards show all varieties, but calculator uses same-variety data */}
      {best.topVariety && worst.topVariety && best.topVariety !== worst.topVariety && (
        <div className="flex items-start gap-1.5 bg-orange-500/8 border border-orange-500/20 rounded-lg px-2.5 py-2 mb-3">
          <AlertTriangle size={10} className="text-orange-400/70 shrink-0 mt-0.5"/>
          <div className="text-[9px] text-orange-300/70">
            ऊपर के कार्ड अलग किस्म दिखाते हैं ({best.topVariety} vs {worst.topVariety}) — मुनाफ़ा कैलकुलेटर केवल <span className="font-bold text-orange-300">{activeVariety || best.topVariety}</span> की तुलना करता है
          </div>
        </div>
      )}

      {/* Arbitrage / Profit Calculator */}
      {showArbitrage && transport && (
        <Card className="bg-zinc-900 border-zinc-800 mb-3 p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Truck size={12} className="text-amber-500"/>
            <span className="text-[10px] text-amber-500 font-bold tracking-wider">मुनाफ़ा कैलकुलेटर ({qty} क्विंटल)</span>
          </div>

          {/* Same-variety filter badge */}
          {varietyFiltered && activeVariety && (
            <div className="flex items-center gap-1.5 bg-blue-500/8 border border-blue-500/20 rounded-lg px-2.5 py-1.5 mb-2.5">
              <span className="text-[9px]">🔍</span>
              <div className="text-[9px] text-blue-300/80">
                <span className="font-bold text-blue-400">किस्म फ़िल्टर:</span> केवल <span className="font-semibold">{activeVariety}</span> ({compareData.length}/{data.length} मंडी) — सटीक तुलना
              </div>
            </div>
          )}

          {/* Outlier price disclaimer */}
          {priceAdjusted && (
            <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-2 mb-2.5">
              <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5"/>
              <div>
                <div className="text-[10px] text-amber-400 font-bold">असामान्य भाव — अगली विश्वसनीय मंडी से गणना</div>
                <div className="text-[9px] text-amber-300/80 mt-0.5">
                  {[
                    compareBestIsOutlier && `${compareBest.name} (₹${getPrice(compareBest).toLocaleString()}) छोड़ा → ${safeBest.name} (₹${safeSellPrice.toLocaleString()})`,
                    compareWorstIsOutlier && `${compareWorst.name} (₹${getPrice(compareWorst).toLocaleString()}) छोड़ा → ${safeWorst.name} (₹${safeBuyPrice.toLocaleString()})`,
                  ].filter(Boolean).join(' · ')} — भाव कन्फर्म करें
                </div>
              </div>
            </div>
          )}

          {/* Buy → Sell flow */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              <div className="text-[8px] text-red-400 font-semibold">खरीदें{compareWorstIsOutlier && <span className="text-amber-400 ml-1">*</span>}</div>
              <div className="text-[11px] font-bold truncate">
                <button onClick={() => onMandiClick?.(safeWorst.name)} className="text-foreground hover:text-red-300 underline decoration-dotted transition-colors">{safeWorst.name}</button>
                {safeWorst.stateCode && <button onClick={() => handleStateClick(safeWorst.stateCode)} className="text-blue-400/70 hover:text-blue-300 ml-0.5 underline decoration-dotted transition-colors text-[10px]">{safeWorst.stateCode}</button>}
              </div>
              <div className="text-[10px] text-red-400 font-bold">₹{safeBuyPrice.toLocaleString()}/क्वि</div>
            </div>
            <ArrowRight size={16} className="text-zinc-500 shrink-0"/>
            <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
              <div className="text-[8px] text-green-400 font-semibold">बेचें{compareBestIsOutlier && <span className="text-amber-400 ml-1">*</span>}</div>
              <div className="text-[11px] font-bold truncate">
                <button onClick={() => onMandiClick?.(safeBest.name)} className="text-foreground hover:text-green-300 underline decoration-dotted transition-colors">{safeBest.name}</button>
                {safeBest.stateCode && <button onClick={() => handleStateClick(safeBest.stateCode)} className="text-blue-400/70 hover:text-blue-300 ml-0.5 underline decoration-dotted transition-colors text-[10px]">{safeBest.stateCode}</button>}
              </div>
              <div className="text-[10px] text-green-400 font-bold">₹{safeSellPrice.toLocaleString()}/क्वि</div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-zinc-400">भाव अंतर</span>
              <span className="text-foreground font-semibold">
                ₹{safeSpread.toLocaleString()}/क्वि
                {priceAdjusted && <span className="text-[8px] text-zinc-500 ml-1 line-through">₹{spread.toLocaleString()}</span>}
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-1.5 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">ट्रांसपोर्ट (~{transport.distance} km)</span>
                <span className="text-red-400">-₹{(transport.costPerQuintal - 5 - Math.round(transport.toll / qty)).toLocaleString()}/क्वि</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">लोदिंग/अनलोदिंग</span>
                <span className="text-red-400">-₹5/क्वि</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">टोल अनुमान</span>
                <span className="text-red-400">-₹{Math.round(transport.toll / qty)}/क्वि</span>
              </div>
            </div>
            <div className="border-t border-zinc-800 pt-1.5">
              <div className="flex justify-between items-center">
                <span className={`font-bold ${netProfitPerQ > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  अनुमानित मुनाफ़ा
                </span>
                <span className={`font-bold text-[12px] ${netProfitPerQ > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{netProfitPerQ.toLocaleString()}/क्वि
                </span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-zinc-500">{qty} क्विंटल पर कुल</span>
                <span className={`font-bold ${totalProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ₹{totalProfit.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="border-t border-zinc-800 pt-1.5 mt-1.5">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-semibold">कुल निवेश ({qty} क्वि खरीद)</span>
                <span className="text-blue-400 font-bold">₹{(safeBuyPrice * qty).toLocaleString()}</span>
              </div>
              {totalProfit > 0 && (
                <div className="flex justify-between mt-0.5">
                  <span className="text-zinc-500">रिटर्न (ROI)</span>
                  <span className="text-green-400 font-bold">+{((totalProfit / (safeBuyPrice * qty)) * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Trading Analysis */}
      {showArbitrage && transport && (() => {
        const interState = safeBest.stateCode && safeWorst.stateCode && safeBest.stateCode !== safeWorst.stateCode;
        const shrinkageLoss = Math.round(safeSellPrice * 0.025);

        // Price volatility from last 7 daily prices
        const last7 = (dailyHistory || []).slice(-7).map(d => d.market).filter(Boolean);
        let volatilityLevel = null;
        let volatilityCV = null;
        let trend7 = null;
        if (last7.length >= 3) {
          const avg7 = last7.reduce((a, b) => a + b, 0) / last7.length;
          const stdDev7 = Math.sqrt(last7.reduce((s, p) => s + Math.pow(p - avg7, 2), 0) / last7.length);
          volatilityCV = Math.round((stdDev7 / avg7) * 100);
          volatilityLevel = volatilityCV > 15 ? 'high' : volatilityCV > 7 ? 'medium' : 'low';
          trend7 = last7[last7.length - 1] - last7[0]; // positive = rising, negative = falling
        }

        const opportunityLevel = spread > 5000 ? 'high' : spread > 2000 ? 'medium' : 'low';
        const opportunityConfig = {
          high:   { label: 'High Profit · High Risk', color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/25',    dot: '🔴' },
          medium: { label: 'Moderate Opportunity',    color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25', dot: '🟡' },
          low:    { label: 'Low Risk Arbitrage',      color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/25', dot: '🟢' },
        }[opportunityLevel];

        // Pre-compute total journey hours (needed for shelf life check)
        const preLoadMins = 90;
        const preTravelMins = Math.ceil(transport.distance / 40) * 60;
        const preBorderMins = interState ? 90 : 0;
        const preUnloadMins = 60;
        const preJourneyHours = Math.ceil((preLoadMins + preTravelMins + preBorderMins + preUnloadMins) / 60);

        const risks = [];
        // Shelf life perishability risk (check first — highest priority warning)
        if (shelfLife) {
          const shelfHours = shelfLife * 24;
          if (preJourneyHours > shelfHours) {
            risks.push({ icon: '🚨', text: `${cropName} की शेल्फ लाइफ ${shelfLife} दिन है — यात्रा ${preJourneyHours} घंटे (${Math.round(preJourneyHours/24*10)/10} दिन) लेगी। माल पहुँचने से पहले खराब हो सकता है!` });
          } else if (preJourneyHours > shelfHours * 0.75) {
            const remainingHours = Math.round(shelfHours - preJourneyHours);
            risks.push({ icon: '⏰', text: `${cropName} की शेल्फ लाइफ का ${Math.round(preJourneyHours/shelfHours*100)}% यात्रा में खर्च होगा — पहुँचने पर सिर्फ ${remainingHours} घंटे बचेंगे, जल्दी बेचें` });
          }
        }
        // Volatility risk
        if (volatilityLevel === 'high') risks.push({ icon: '📉', text: `पिछले 7 दिनों में भाव ${volatilityCV}% उतार-चढ़ाव — बहुत अस्थिर (Highly Volatile), रेट घंटों में बदल सकता है` });
        else if (volatilityLevel === 'medium') risks.push({ icon: '📊', text: `पिछले 7 दिनों में ${volatilityCV}% भाव उतार-चढ़ाव — सामान्य अस्थिरता, सावधानी बरतें` });
        else if (volatilityLevel === 'low') risks.push({ icon: '✅', text: `पिछले 7 दिनों में भाव अपेक्षाकृत स्थिर (${volatilityCV}% variation) — अनुकूल संकेत` });
        // Glut effect
        if (data.length > 50) risks.push({ icon: '⚠️', text: `${data.length} मंडियाँ रिपोर्ट कर रही हैं — कोई भी व्यापारी यह डेटा देख सकता है, अतिरिक्त ट्रक पहुँचते ही भाव गिरेगा` });
        // Distress sale
        if (interState) risks.push({ icon: '🛂', text: `${safeWorst.stateCode} → ${safeBest.stateCode} इंटर-स्टेट — अगर माल नहीं बिका तो वापस लाना मुश्किल (Distress Sale का खतरा)` });
        // Outlier price
        if (compareBestIsOutlier || compareWorstIsOutlier) risks.push({ icon: '🔎', text: `${[compareBestIsOutlier && compareBest.name, compareWorstIsOutlier && compareWorst.name].filter(Boolean).join(', ')} का भाव असामान्य था — अगली विश्वसनीय मंडी से गणना की गई है, भाव कन्फर्म करें` });
        // Shrinkage
        risks.push({ icon: '🌿', text: `परिवहन में 2–3% वजन घट सकता है (~₹${shrinkageLoss}/क्विंटल का नुकसान)` });

        const tips = [
          `पहले सिर्फ 1–2 क्विंटल का Trial Run करें, बड़ा ट्रक बाद में`,
          `मंडी में सबसे पहले पहुँचने वाले ट्रक को सबसे अच्छा भाव मिलता है (Early Arrival)`,
          `माल भेजने से पहले ${best.name} के थोक व्यापारी से Base Price कन्फर्म करें`,
        ];
        if (interState) tips.push(`E-way Bill + Tax Invoice तैयार रखें (बॉर्डर पर देरी से माल खराब हो सकता है)`);
        if (data.length > 1) tips.push(`भाव गिरे तो नज़दीकी मंडी (Backup Market) का विकल्प पहले से तय करें`);

        return (
          <Card className="bg-zinc-900 border-zinc-800 mb-3 overflow-hidden">
            <button
              onClick={() => setShowAnalysis(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <BarChart2 size={12} className="text-blue-400"/>
                <span className="text-[10px] text-blue-400 font-bold tracking-wider">व्यापार विश्लेषण</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${opportunityConfig.bg} ${opportunityConfig.color}`}>
                  {opportunityConfig.dot} {opportunityConfig.label}
                </span>
              </div>
              {showAnalysis ? <ChevronUp size={13} className="text-zinc-500"/> : <ChevronDown size={13} className="text-zinc-500"/>}
            </button>

            {showAnalysis && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-800/60">

                {/* Price Stability Bar */}
                {volatilityLevel && (
                  <div className="pt-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] text-zinc-400 font-bold tracking-wider">भाव स्थिरता (7 दिन)</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        volatilityLevel === 'low'    ? 'bg-green-500/15 text-green-400' :
                        volatilityLevel === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                                                       'bg-red-500/15 text-red-400'
                      }`}>
                        {volatilityLevel === 'low' ? '🟢 स्थिर' : volatilityLevel === 'medium' ? '🟡 सामान्य' : '🔴 अस्थिर'} · {volatilityCV}% CV
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        volatilityLevel === 'low' ? 'bg-green-500' : volatilityLevel === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${Math.min(volatilityCV * 3, 100)}%` }}/>
                    </div>
                    {trend7 !== null && (
                      <div className={`text-[9px] mt-1 ${trend7 > 0 ? 'text-green-400' : trend7 < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                        {trend7 > 0 ? '↗ भाव बढ़ रहा है' : trend7 < 0 ? '↘ भाव गिर रहा है' : '→ भाव स्थिर'} (7 दिन में {trend7 > 0 ? '+' : ''}₹{Math.abs(trend7).toLocaleString()})
                      </div>
                    )}
                  </div>
                )}

                {/* Risks */}
                <div className={volatilityLevel ? "border-t border-zinc-800/60 pt-2.5" : "pt-2.5"}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <ShieldAlert size={10} className="text-amber-400"/>
                    <span className="text-[9px] text-amber-400 font-bold tracking-wider">जोखिम</span>
                  </div>
                  <div className="space-y-1.5">
                    {risks.map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[10px] shrink-0 mt-px">{r.icon}</span>
                        <span className="text-[10px] text-zinc-400 leading-tight">{r.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="border-t border-zinc-800/60 pt-2.5">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Lightbulb size={10} className="text-green-400"/>
                    <span className="text-[9px] text-green-400 font-bold tracking-wider">सुझाव</span>
                  </div>
                  <div className="space-y-1.5">
                    {tips.map((t, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[10px] text-green-500 font-bold shrink-0 mt-px">✓</span>
                        <span className="text-[10px] text-zinc-400 leading-tight">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buyer Action Plan */}
                <div className="border-t border-zinc-800/60 pt-2.5">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px]">🤝</span>
                    <span className="text-[9px] text-purple-400 font-bold tracking-wider">खरीदार कैसे सेट करें</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { step: '1', icon: '🏛️', title: 'मंडी सचिव से लिस्ट लें', desc: `${safeBest.name} मंडी कार्यालय से सक्रिय लाइसेंस धारी व्यापारियों की लिस्ट मांगें` },
                      { step: '2', icon: '📱', title: 'WhatsApp मार्केटिंग', desc: `माल रवाना करने से पहले 4–5 प्रमुख आढ़तियों को फोटो + वजन + लोडिंग टाइम भेजें — "A-Grade माल" लिखें` },
                      { step: '3', icon: '🎯', title: 'सैंपल से बोली बढ़ाएं', desc: `ट्रक पहुँचने पर पहले 2–3 बोरियां खोलकर दिखाएं — चमक और मजबूती देखकर Auction ऊपर जाती है` },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-2 bg-purple-500/5 border border-purple-500/15 rounded-lg px-2.5 py-2">
                        <span className="text-[9px] font-extrabold text-purple-500 shrink-0 mt-0.5">{item.step}</span>
                        <div>
                          <div className="text-[9px] font-bold text-purple-300">{item.icon} {item.title}</div>
                          <div className="text-[8px] text-zinc-500 leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contingency Plan */}
                <div className="border-t border-zinc-800/60 pt-2.5">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px]">🛡️</span>
                    <span className="text-[9px] text-zinc-300 font-bold tracking-wider">आपातकालीन योजना (Plan B)</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { risk: '🚫 मंडी बंदी / हड़ताल', plan: `निकलने से पहले ${safeBest.name} के स्थानीय एजेंट से पुष्टि करें। नज़दीकी Alternate Mandi का नाम पहले से तय रखें` },
                      ...(interState ? [{ risk: '🛂 बॉर्डर पर देरी', plan: `E-Way Bill + GST बिल की 3 प्रतियां रखें। ड्राइवर को ₹2,000–3,000 आपातकालीन नकद दें (${safeWorst.stateCode}→${safeBest.stateCode} बॉर्डर के लिए)` }] : []),
                      { risk: '🌧️ रास्ते में बारिश', plan: `Double Tarpaulin चेक करें (~${transport.distance} km सफर)। सब्जी के लिए प्लास्टिक लाइनिंग वाली बोरियां इस्तेमाल करें` },
                      { risk: '🔧 गाड़ी का ब्रेकडाउन', plan: 'ट्रांसपोर्टर से "Vehicle Replacement" क्लॉज़ रखें। रास्ते के मुख्य शहरों के मैकेनिक का नंबर पास रखें' },
                      { risk: '📉 मार्केट क्रैश', plan: `Split Delivery: ${qty} क्विंटल है तो ${Math.floor(qty/2)}+${Math.ceil(qty/2)} अलग-अलग 2 मंडियों में उतारने का विकल्प रखें` },
                    ].map((item, i) => (
                      <div key={i} className="bg-zinc-800/40 rounded-lg p-2">
                        <div className="text-[9px] font-bold text-zinc-300 mb-0.5">{item.risk}</div>
                        <div className="text-[9px] text-zinc-500 leading-tight">✓ {item.plan}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transport Intelligence */}
                {(() => {
                  const name = (cropName || '').toLowerCase();
                  let vehicle;
                  if (/टमाटर|पत्तागोभी|बैंगन|फूलगोभी|पालक|धनिया|हरी मिर्च/.test(name))
                    vehicle = { type: 'Open Body / हवादार ट्रक', note: 'जल्दी खराब — वेंटिलेशन ज़रूरी', icon: '🌬️', col: 'text-blue-400 bg-blue-500/10' };
                  else if (/पेठा|प्याज|आलू|अदरक|लहसुन|कद्दू/.test(name))
                    vehicle = { type: '10-चक्का / 17 टन ट्रक', note: 'सख्त माल — Tonnage प्राथमिकता', icon: '🚛', col: 'text-amber-400 bg-amber-500/10' };
                  else if (/चावल|गेहूं|दाल|मक्का|सरसों|धान|सोयाबीन/.test(name))
                    vehicle = { type: 'Closed Container / तिरपाल', note: 'अनाज — नमी से सुरक्षा ज़रूरी', icon: '🌾', col: 'text-green-400 bg-green-500/10' };
                  else if (/अंगूर|सेब|केला|आम|स्ट्रॉबेरी/.test(name))
                    vehicle = { type: 'Cold Storage (Reefer)', note: 'प्रीमियम फल — तापमान नियंत्रण', icon: '❄️', col: 'text-cyan-400 bg-cyan-500/10' };
                  else
                    vehicle = { type: 'Standard Truck / तिरपाल', note: 'Double Tarpaulin अनिवार्य', icon: '🚐', col: 'text-zinc-400 bg-zinc-700/30' };

                  // ── Journey Timeline calculations ──
                  const loadingMins = 90;           // 1.5h loading at origin
                  const travelMins = Math.ceil(transport.distance / 40) * 60;
                  const borderMins = interState ? 90 : 0;  // 1.5h border crossing
                  const unloadMins = 60;            // 1h unloading at destination
                  const totalMins = loadingMins + travelMins + borderMins + unloadMins;
                  const totalHours = Math.ceil(totalMins / 60);

                  // "Depart Now" arrival estimate
                  const now = new Date();
                  const arrivalNow = new Date(now.getTime() + totalMins * 60000);
                  const arrHour = arrivalNow.getHours();
                  const arrMin = arrivalNow.getMinutes();
                  const arrTimeStr = `${arrHour < 12 ? 'सुबह' : arrHour < 17 ? 'दोपहर' : arrHour < 20 ? 'शाम' : 'रात'} ${arrHour === 0 ? 12 : arrHour > 12 ? arrHour - 12 : arrHour}:${String(arrMin).padStart(2,'0')} बजे`;
                  const inPrimetime = arrHour >= 4 && arrHour < 7;
                  const tooEarly = arrHour >= 0 && arrHour < 4;
                  const tooLate = arrHour >= 7;

                  // Optimal departure for 5 AM arrival (middle of prime window)
                  const targetArrival = new Date();
                  targetArrival.setHours(5, 0, 0, 0);
                  if (targetArrival <= now) targetArrival.setDate(targetArrival.getDate() + 1);
                  const optDepart = new Date(targetArrival.getTime() - totalMins * 60000);
                  const optH = optDepart.getHours();
                  const optM = optDepart.getMinutes();
                  const optPeriod = optH < 5 ? 'रात' : optH < 12 ? 'सुबह' : optH < 17 ? 'दोपहर' : 'शाम';
                  const optStr = `${optPeriod} ${optH === 0 ? 12 : optH > 12 ? optH - 12 : optH}:${String(optM).padStart(2,'0')} बजे`;
                  const isToday = optDepart.getDate() === now.getDate();
                  const travelHours = Math.ceil(travelMins / 60);
                  const bufferHours = 4;

                  // Fixed = freight hire (baseCost + perKm) = total - loading - toll
                  const fixedCost = Math.round(transport.totalCost - transport.loading - transport.toll);
                  // Variable = loading/unloading + toll
                  const varCost = Math.round(transport.loading + transport.toll);
                  const invisibleCost = Math.round(getPrice(best) * 0.025 * qty);

                  return (
                    <div className="border-t border-zinc-800/60 pt-2.5">
                      <div className="flex items-center gap-1 mb-2.5">
                        <span className="text-[11px]">🚛</span>
                        <span className="text-[9px] text-zinc-300 font-bold tracking-wider">ट्रांसपोर्ट इंटेलिजेंस</span>
                      </div>

                      {/* Shelf Life Danger Banner */}
                      {shelfLife && totalHours > shelfLife * 24 && (
                        <div className="bg-red-500/15 border border-red-500/40 rounded-lg px-2.5 py-2 mb-2.5">
                          <div className="text-[11px] text-red-400 font-bold">🚨 खराब होने का खतरा!</div>
                          <div className="text-[10px] text-red-300 mt-0.5">
                            {cropName} की शेल्फ लाइफ <b>{shelfLife} दिन</b> है, यात्रा <b>{Math.round(totalHours/24*10)/10} दिन</b> लेगी — माल पहुँचने से पहले खराब हो सकता है।
                          </div>
                        </div>
                      )}

                      {/* Vehicle Recommendation */}
                      <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-2.5 ${vehicle.col}`}>
                        <span className="text-[12px]">{vehicle.icon}</span>
                        <div>
                          <div className={`text-[9px] font-bold ${vehicle.col.split(' ')[0]}`}>{vehicle.type}</div>
                          <div className="text-[8px] text-zinc-500">{vehicle.note}</div>
                        </div>
                      </div>

                      {/* 3-Cost Dashboard */}
                      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                        {[
                          { label: 'Fixed', sub: 'भाड़ा + टोल', val: fixedCost, col: 'text-zinc-300' },
                          { label: 'Variable', sub: 'लोडिंग + हमाली', val: varCost, col: 'text-amber-400' },
                          { label: 'Invisible', sub: 'घटाव + सड़ाव', val: invisibleCost, col: 'text-red-400' },
                        ].map(c => (
                          <div key={c.label} className="bg-zinc-800/40 rounded-lg p-2 text-center">
                            <div className={`text-[9px] font-bold ${c.col}`}>{c.label}</div>
                            <div className="text-[8px] text-zinc-500 mb-0.5">{c.sub}</div>
                            <div className={`text-[10px] font-extrabold ${c.col}`}>₹{c.val.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>

                      {/* Journey Timeline */}
                      <div className="bg-zinc-800/30 rounded-xl px-2.5 py-2.5 mb-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[9px] text-zinc-300 font-bold">⏱️ यात्रा समयरेखा</div>
                          <div className="text-[8px] text-zinc-500">कुल ~{totalHours}h</div>
                        </div>

                        {/* Steps */}
                        <div className="space-y-1 mb-2.5">
                          {[
                            { icon: '📦', label: 'लोडिंग', mins: loadingMins, col: 'text-amber-400' },
                            { icon: '🚛', label: `यात्रा (~${transport.distance} km)`, mins: travelMins, col: 'text-blue-400' },
                            ...(interState ? [{ icon: '🛂', label: `बॉर्डर (${safeWorst.stateCode}→${safeBest.stateCode})`, mins: borderMins, col: 'text-orange-400' }] : []),
                            { icon: '🏪', label: `अनलोडिंग (${safeBest.name})`, mins: unloadMins, col: 'text-green-400' },
                          ].map((step, i, arr) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px]">{step.icon}</span>
                                {i < arr.length - 1 && <div className="w-px h-3 bg-zinc-700 mt-0.5"/>}
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-[9px] text-zinc-400">{step.label}</span>
                                <span className={`text-[9px] font-bold ${step.col}`}>
                                  {step.mins >= 60 ? `${Math.floor(step.mins/60)}h${step.mins%60 ? ` ${step.mins%60}m` : ''}` : `${step.mins}m`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Depart Now → Arrival */}
                        <div className={`rounded-lg px-2 py-1.5 mb-1.5 border ${
                          inPrimetime ? 'bg-green-500/10 border-green-500/25' :
                          tooEarly    ? 'bg-blue-500/10 border-blue-500/25' :
                                        'bg-amber-500/10 border-amber-500/25'
                        }`}>
                          <div className="text-[8px] text-zinc-500 mb-0.5">अभी निकलें तो पहुँचेंगे</div>
                          <div className={`text-[11px] font-extrabold ${inPrimetime ? 'text-green-400' : tooEarly ? 'text-blue-400' : 'text-amber-400'}`}>
                            {arrTimeStr}
                          </div>
                          <div className={`text-[8px] mt-0.5 ${inPrimetime ? 'text-green-500' : tooEarly ? 'text-blue-400' : 'text-amber-500'}`}>
                            {inPrimetime ? '✅ Prime Time! 4–7 AM — सबसे अच्छा भाव मिलेगा' :
                             tooEarly    ? '🌙 बहुत जल्दी — मंडी खुलने से पहले पहुँचेंगे' :
                                           '⚠️ देर हो जाएगी — Prime Time (4–7 AM) छूट जाएगा'}
                          </div>
                        </div>

                        {/* Optimal departure */}
                        <div className="flex items-center justify-between bg-zinc-900/60 rounded-lg px-2 py-1.5">
                          <div>
                            <div className="text-[8px] text-zinc-500">इष्टतम प्रस्थान (5 AM arrival के लिए)</div>
                            <div className="text-[10px] font-bold text-green-400">{optStr} {isToday ? 'आज' : 'कल'}</div>
                          </div>
                          <div className="text-[8px] text-zinc-600 text-right">
                            {travelHours}h यात्रा<br/>{interState ? '+1.5h बॉर्डर' : '+1.5h लोडिंग'}
                          </div>
                        </div>
                      </div>

                      {/* Checklist */}
                      <div>
                        <div className="text-[9px] text-zinc-400 font-bold mb-1.5">📋 ऑपरेशनल चेकलिस्ट</div>
                        <div className="space-y-1">
                          {[
                            { done: true,  text: 'GPS वाला ट्रक बुक करें या ड्राइवर से Location Share करवाएं' },
                            { done: interState, text: `E-Way Bill + Mandi Gate Pass + RC Copy (3 प्रतियां)` },
                            { done: true,  text: 'Double Tarpaulin चेक — बारिश में अनाज/पेठे की स्किन खराब होती है' },
                            { done: interState, text: 'ड्राइवर को ₹2,000–3,000 आपातकालीन नकद दें (बॉर्डर देरी के लिए)' },
                          ].map((item, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className={`text-[9px] font-bold shrink-0 mt-px ${item.done ? 'text-green-500' : 'text-zinc-600'}`}>
                                {item.done ? '✓' : '○'}
                              </span>
                              <span className="text-[9px] text-zinc-500 leading-tight">{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {interState && (
                        <div className="mt-2 flex items-start gap-1.5 bg-blue-500/8 border border-blue-500/15 rounded-lg px-2 py-1.5">
                          <span className="text-[10px] shrink-0">💡</span>
                          <span className="text-[9px] text-blue-400 leading-tight">
                            <span className="font-bold">Return Load:</span> {safeBest.stateCode} से वापस आने वाले ट्रक में माल भरें — किराया 20% कम हो सकता है
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <p className="text-[8px] text-zinc-600 border-t border-zinc-800/60 pt-2">
                  * यह विश्लेषण उपलब्ध मंडी डेटा पर आधारित अनुमान है। वास्तविक कारोबार से पहले स्थानीय व्यापारी से सत्यापन करें।
                </p>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Spread indicator */}
      <Card className="bg-zinc-900 border-zinc-800 mb-3 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-muted-foreground">भाव अंतर (स्प्रेड)</span>
          <span className="text-[11px] font-bold text-amber-500">₹{spread.toLocaleString()}</span>
        </div>
        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 rounded-full"
            style={{ width: "100%" }}/>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-red-500">₹{getPrice(worst).toLocaleString()}</span>
          <span className="text-[8px] text-green-500">₹{getPrice(best).toLocaleString()}</span>
        </div>
      </Card>

      {/* Mandi List */}
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-800 grid grid-cols-[1fr_70px_60px] gap-1 text-[8px] text-zinc-500 font-semibold tracking-wider">
          <div>मंडी</div>
          <div className="text-right">भाव</div>
          <div className="text-right">औसत से</div>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {visible.map((m, idx) => {
            const price = getPrice(m);
            const diff = price - avgPrice;
            const diffPct = avgPrice > 0 ? ((diff / avgPrice) * 100).toFixed(1) : "0.0";
            const isAbove = diff > 0;
            const barWidth = maxPrice > 0 ? (price / maxPrice * 100) : 0;

            return (
              <div key={`${m.name}-${idx}`} className="px-3 py-2 hover:bg-zinc-800/30 transition-colors">
                <div className="grid grid-cols-[1fr_70px_60px] gap-1 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {idx === 0 && <Trophy size={9} className="text-green-500 shrink-0"/>}
                      <button onClick={() => onMandiClick?.(m.name)} className="text-[11px] font-semibold text-foreground hover:text-green-400 underline decoration-dotted truncate transition-colors text-left">{m.name}</button>
                      {m.stateCode && <button onClick={() => handleStateClick(m.stateCode)} className="text-[9px] text-blue-400/60 hover:text-blue-300 underline decoration-dotted shrink-0 transition-colors">{m.stateCode}</button>}
                    </div>
                    <div className="text-[8px] text-zinc-500 truncate">
                      {m.district}{m.topVariety ? ` · ${m.topVariety}` : ''}{m.grade && m.grade !== 'Local' ? ` · ${m.grade}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => cropId && navigate(`/crop/${cropId}`)}
                    className={`text-right text-[11px] font-bold tabular-nums flex items-center justify-end gap-0.5 w-full ${
                      isAbove ? "text-green-500 hover:text-green-300" : "text-red-500 hover:text-red-300"
                    } ${cropId ? 'cursor-pointer underline decoration-dotted' : 'cursor-default'} transition-colors`}
                  >
                    {isOutlier(price, outlierBounds) && <AlertTriangle size={9} className="text-amber-500 shrink-0"/>}
                    ₹{price.toLocaleString()}
                  </button>
                  <div className={`text-right text-[10px] font-semibold ${
                    isAbove ? "text-green-500" : "text-red-500"
                  }`}>
                    {isAbove ? "+" : ""}{diffPct}%
                  </div>
                </div>
                {/* Bar */}
                <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    isAbove ? "bg-green-500" : "bg-red-500"
                  }`} style={{ width: `${barWidth}%` }}/>
                </div>
              </div>
            );
          })}
        </div>

        {data.length > 8 && (
          <button onClick={() => setShowAll(!showAll)}
            className="w-full py-2 flex items-center justify-center gap-1 text-[11px] text-green-500 font-semibold border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
            {showAll ? <><ChevronUp size={14}/> कम दिखाएं</> : <><ChevronDown size={14}/> सभी {data.length} मंडी देखें</>}
          </button>
        )}
      </Card>
    </div>
  );
}
