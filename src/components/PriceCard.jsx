import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";

export default function PriceCard({ crop }) {
  if (!crop.msp) return null;
  const up = crop.market >= crop.msp;
  const diff = Math.abs(crop.market - crop.msp);
  const pct = ((diff / crop.msp) * 100).toFixed(1);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      style={{ background: crop.bg, border: `1px solid ${crop.color}33` }}
      className="rounded-2xl p-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: crop.color }}>
          {crop.emoji} {crop.name}
        </span>
        <span className={`text-xs font-bold flex items-center gap-1 ${up ? "text-green-400" : "text-red-400"}`}>
          {up ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
          {pct}%
        </span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <div>
          <div className="text-gray-500 text-[10px]">MSP</div>
          <div className="text-gray-200 font-bold">₹{crop.msp.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-500 text-[10px]">Market</div>
          <div className="font-bold" style={{ color: up ? "#4CAF50" : "#ef4444" }}>
            ₹{crop.market.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
        <div className="h-1 rounded-full transition-all duration-700"
          style={{ width: `${Math.min((crop.market / crop.msp) * 50, 100)}%`, background: crop.color }} />
      </div>
    </motion.div>
  );
}
