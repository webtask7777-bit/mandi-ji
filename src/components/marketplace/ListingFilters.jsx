import { useRef, useEffect } from 'react';

const FILTER_OPTIONS = [
  { value: 'all', label: 'सभी', emoji: '📋' },
  { value: 'sell', label: 'बेचना', emoji: '🚚' },
  { value: 'buy', label: 'खरीदना', emoji: '🛒' },
];

export default function ListingFilters({ selected = 'all', onChange }) {
  const scrollRef = useRef(null);

  // Auto-scroll active filter into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selected]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
      style={{ scrollbarWidth: 'thin' }}
    >
      {FILTER_OPTIONS.map(opt => {
        const isActive = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            data-active={isActive ? 'true' : 'false'}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 ${
              isActive
                ? 'bg-green-500 text-green-950'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        );
      })}
    </div>
  );
}
