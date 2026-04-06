import { useState, useEffect } from 'react';
import { FileText, Eye } from 'lucide-react';
import { apiFetchAuth } from '../../api/client';
import EwayBillPreview from '../../components/eway/EwayBillPreview';

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

const STATUS_FILTERS = [
  { key: 'all', label: 'सभी' },
  { key: 'generated', label: 'जनरेटेड' },
  { key: 'active', label: 'सक्रिय' },
  { key: 'cancelled', label: 'रद्द' },
  { key: 'expired', label: 'समाप्त' },
];

const STATUS_STYLES = {
  generated: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  expired: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
};

const STATUS_LABELS = {
  generated: 'जनरेटेड',
  active: 'सक्रिय',
  cancelled: 'रद्द',
  expired: 'समाप्त',
};

export default function AdminEwayBills() {
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewBill, setViewBill] = useState(null);

  useEffect(() => {
    apiFetchAuth('/admin/eway-bills')
      .then(data => { setBills(data); setError(''); })
      .catch(err => setError(err.message || 'Bills लोड करने में विफल'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? bills
    : bills.filter(b => b.status === filter);

  // Viewing a bill detail
  if (viewBill) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setViewBill(null)}
          className="text-xs text-green-500 hover:underline"
        >
          &larr; वापस
        </button>
        <EwayBillPreview bill={viewBill} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-zinc-400 animate-pulse">लोड हो रहा है...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === tab.key
                ? 'bg-green-500 text-green-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Bills List */}
      <div className="space-y-2">
        {filtered.map(bill => {
          const item = bill.items?.[0];
          const statusStyle = STATUS_STYLES[bill.status] || STATUS_STYLES.generated;
          const statusLabel = STATUS_LABELS[bill.status] || bill.status;

          return (
            <div
              key={bill.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <FileText size={12} className="text-green-500 shrink-0" />
                    <span className="text-xs font-mono font-bold text-green-500">{bill.billNumber}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </div>
                  {item && (
                    <div className="text-xs text-foreground">{item.cropName} &middot; {item.quantity} {item.unit}</div>
                  )}
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {bill.from?.name || '-'} &rarr; {bill.to?.name || '-'}
                  </div>
                  <div className="text-[9px] text-zinc-600 mt-0.5">
                    {bill.userName} &middot; {formatDate(bill.createdAt)}
                  </div>
                </div>

                <button
                  onClick={() => setViewBill(bill)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-500 hover:text-foreground transition-colors shrink-0"
                >
                  <Eye size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-zinc-700 mb-2" />
            <div className="text-sm text-zinc-500">कोई E-way Bill नहीं मिला</div>
          </div>
        )}
      </div>
    </div>
  );
}
