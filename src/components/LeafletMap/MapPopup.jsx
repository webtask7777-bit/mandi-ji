export default function MapPopup({ districtName, info, mandis = [] }) {
  const topCrops = info?.topCrops?.slice(0, 5) || [];
  const records = info?.totalRecords || 0;

  return (
    <div className="min-w-[180px] max-w-[240px]">
      {/* District name */}
      <div className="text-[13px] font-extrabold text-white leading-tight mb-1.5">
        {districtName}
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-[10px] text-zinc-400 mb-2">
        <span>🏪 {mandis.length} मंडी</span>
        <span>📊 {records} रिकॉर्ड</span>
      </div>

      {/* Mandis list (top 5) */}
      {mandis.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-zinc-500 font-bold tracking-wider mb-1">मंडी</div>
          <div className="flex flex-wrap gap-1">
            {mandis.slice(0, 5).map((m, i) => (
              <span
                key={i}
                className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded"
              >
                {m.name}
              </span>
            ))}
            {mandis.length > 5 && (
              <span className="text-[9px] text-zinc-500">+{mandis.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {/* Top crops */}
      {topCrops.length > 0 && (
        <div>
          <div className="text-[9px] text-zinc-500 font-bold tracking-wider mb-1">फसलें</div>
          <div className="flex flex-wrap gap-1">
            {topCrops.map((c, i) => (
              <span
                key={i}
                className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded"
              >
                {c.emoji || '🌱'} {c.nameHi || c.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
