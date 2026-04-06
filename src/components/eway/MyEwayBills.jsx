import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetchAuth } from '../../api/client';
import EwayBillPreview from './EwayBillPreview';

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

const STATUS_STYLES = {
  generated: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'जनरेटेड' },
  active: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', label: 'सक्रिय' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'रद्द' },
  expired: { bg: 'bg-zinc-700/30', text: 'text-zinc-400', border: 'border-zinc-600/30', label: 'समाप्त' },
};

export default function MyEwayBills() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    apiFetchAuth('/eway-bill/my')
      .then(data => setBills(data))
      .catch(err => setError(err.message || 'Bills लोड करने में विफल'))
      .finally(() => setLoading(false));
  }, []);

  // Viewing a specific bill
  if (selectedBill) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-lg mx-auto">
          <header className="sticky top-0 z-30 bg-background border-b border-zinc-800">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setSelectedBill(null)}
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft size={16} className="text-zinc-400" />
              </button>
              <h1 className="text-base font-bold">Bill: {selectedBill.billNumber}</h1>
            </div>
          </header>
          <main className="px-4 py-4 pb-8">
            <EwayBillPreview bill={selectedBill} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={16} className="text-zinc-400" />
            </button>
            <h1 className="text-base font-bold">मेरे E-way Bills</h1>
          </div>
        </header>

        <main className="px-4 py-4 pb-8 space-y-3">
          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="text-sm text-zinc-400 animate-pulse">लोड हो रहा है...</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && bills.length === 0 && (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-zinc-700 mb-3" />
              <div className="text-sm font-medium text-zinc-400">कोई E-way Bill नहीं</div>
              <div className="text-xs text-zinc-600 mt-1">आपने अभी तक कोई E-way Bill नहीं बनाया है</div>
              <button
                onClick={() => navigate('/eway-bill')}
                className="mt-4 bg-green-500 hover:bg-green-600 text-green-950 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                नया Bill बनाएं
              </button>
            </div>
          )}

          {/* Bills List */}
          <AnimatePresence>
            {bills.map((bill, i) => {
              const statusStyle = STATUS_STYLES[bill.status] || STATUS_STYLES.generated;
              const item = bill.items?.[0];
              return (
                <motion.button
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedBill(bill)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-left hover:border-zinc-700 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-green-500">{bill.billNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                      {item && (
                        <div className="text-xs text-foreground font-medium">
                          {item.cropName} &middot; {item.quantity} {item.unit}
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {bill.from?.name || '-'} &rarr; {bill.to?.name || '-'}
                      </div>
                      <div className="text-[9px] text-zinc-600 mt-0.5">
                        {formatDate(bill.createdAt)}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600 mt-1 shrink-0" />
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
