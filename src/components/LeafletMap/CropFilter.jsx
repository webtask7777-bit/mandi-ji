import { useRef, useEffect } from 'react';

export default function CropFilter({ crops = [], selectedCrop, onCropSelect }) {
  const scrollRef = useRef(null);

  // Auto-scroll selected crop into view
  useEffect(() => {
    if (!selectedCrop || !scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedCrop]);

  // Top 20 crops by record count for filter
  const topCrops = crops
    .filter(c => c.totalRecords > 0)
    .sort((a, b) => (b.totalRecords || 0) - (a.totalRecords || 0))
    .slice(0, 20);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
      style={{ scrollbarWidth: 'thin' }}
    >
      {/* सभी (All) badge */}
      <button
        onClick={() => onCropSelect(null)}
        data-active={!selectedCrop ? 'true' : 'false'}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 ${
          !selectedCrop
            ? 'bg-green-500 text-green-950'
            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
        }`}
      >
        🌾 सभी
      </button>

      {topCrops.map((crop) => {
        const isActive = selectedCrop === crop.id;
        return (
          <button
            key={crop.id}
            onClick={() => onCropSelect(isActive ? null : crop.id)}
            data-active={isActive ? 'true' : 'false'}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 ${
              isActive
                ? 'bg-green-500 text-green-950'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {crop.emoji || '🌱'} {crop.nameHi || crop.name}
          </button>
        );
      })}
    </div>
  );
}
