import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PriceCard({ crop, onClick }) {
  const hasMsp = crop.msp && crop.msp > 0;
  const hasMarket = crop.market && crop.market > 0;

  if (!hasMarket && !hasMsp) return null;

  const mspUp = hasMsp ? crop.market >= crop.msp : true;
  const diff = hasMsp ? Math.abs(crop.market - crop.msp) : 0;
  const mspPct = hasMsp ? ((diff / crop.msp) * 100).toFixed(1) : "0";

  const hasChange = crop.changePct != null;
  const changeUp = (crop.changePct || 0) >= 0;
  const topBarUp = hasMsp ? mspUp : (hasChange ? changeUp : true);

  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:border-blue-500/40 group"
      onClick={onClick}>
      <div className={`h-0.5 ${topBarUp ? "bg-green-500" : "bg-red-500"}`}/>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-foreground truncate pr-1 flex items-center gap-1">
            {crop.emoji} {crop.displayName || crop.nameHi || crop.name}
            <ChevronRight size={10} className="text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0"/>
          </div>
          {hasMsp ? (
            <div className={`flex items-center gap-0.5 text-[11px] font-bold shrink-0 ${mspUp ? "text-green-500" : "text-red-500"}`}>
              {mspUp ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
              {mspPct}%
            </div>
          ) : hasChange && crop.changePct !== 0 ? (
            <div className={`flex items-center gap-0.5 text-[10px] font-bold shrink-0 ${changeUp ? "text-green-500" : "text-red-500"}`}>
              {changeUp ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
              {changeUp ? '+' : ''}{crop.changePct}%
            </div>
          ) : null}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] text-muted-foreground tracking-wider">थोक भाव · ₹/क्विंटल</div>
            <div className={`text-base font-extrabold ${topBarUp ? "text-green-500" : "text-red-500"}`}>
              ₹{(crop.market || 0).toLocaleString()}
            </div>
          </div>
          {hasMsp ? (
            <div className="text-right">
              <div className="text-[9px] text-muted-foreground tracking-wider">MSP</div>
              <div className="text-sm font-bold text-foreground">
                ₹{crop.msp.toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-[9px] text-muted-foreground tracking-wider">{crop.mandiCount ? 'मंडियाँ' : 'रिकॉर्ड'}</div>
              <div className="text-sm font-bold text-muted-foreground">
                {crop.mandiCount ? crop.mandiCount : (crop.totalRecords || 0)}
              </div>
            </div>
          )}
        </div>
        {/* MSP progress bar or today's change */}
        {hasMsp ? (
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${mspUp ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${Math.min((crop.market / crop.msp) * 50, 100)}%`, transition: "width 0.5s ease" }} />
          </div>
        ) : hasChange && crop.change != null && crop.change !== 0 ? (
          <div className={`mt-1.5 text-[9px] font-semibold ${changeUp ? 'text-green-500' : 'text-red-500'}`}>
            {changeUp ? '+' : ''}₹{Math.abs(crop.change).toLocaleString()} आज
          </div>
        ) : null}
      </div>
    </Card>
  );
}
