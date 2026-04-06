import { useState, useEffect } from 'react';
import { Trash2, Search } from 'lucide-react';
import { apiFetchAuth, apiDelete } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';

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

function formatCurrency(num) {
  return new Intl.NumberFormat('hi-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);
}

const FILTER_TABS = [
  { key: 'all', label: 'सभी' },
  { key: 'active', label: 'सक्रिय' },
  { key: 'expired', label: 'समाप्त' },
];

const TYPE_TABS = [
  { key: 'all', label: 'सभी' },
  { key: 'sell', label: 'बेचना' },
  { key: 'buy', label: 'खरीदना' },
];

export default function AdminListings() {
  const toast = useToast();
  const confirm = useConfirm();
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadListings() {
    setLoading(true);
    apiFetchAuth('/admin/listings')
      .then(data => { setListings(data); setError(''); })
      .catch(err => setError(err.message || 'लिस्टिंग लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadListings(); }, []);

  async function handleDelete(id) {
    const ok = await confirm('लिस्टिंग हटाएं?', 'क्या आप यह लिस्टिंग हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।');
    if (!ok) return;
    try {
      await apiDelete(`/admin/listings/${id}`);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('लिस्टिंग हटा दी गई');
    } catch (err) {
      toast.error(err.message || 'हटाने में विफल');
    }
  }

  // Check expiry
  const now = new Date();
  const enriched = listings.map(l => {
    const isExpired = l.expiresAt && new Date(l.expiresAt) < now;
    const effectiveStatus = isExpired && l.status === 'active' ? 'expired' : l.status;
    return { ...l, effectiveStatus };
  });

  let filtered = enriched;
  if (filter !== 'all') filtered = filtered.filter(l => l.effectiveStatus === filter);
  if (typeFilter !== 'all') filtered = filtered.filter(l => l.type === typeFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(l => l.cropName?.toLowerCase().includes(q) || l.userName?.toLowerCase().includes(q) || l.mandiName?.toLowerCase().includes(q));
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
      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
        <Search size={14} className="text-zinc-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="फसल, किसान, मंडी खोजें..."
          className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-zinc-600"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === tab.key
                ? 'bg-green-500 text-green-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {tab.label}
            <span className="ml-1 text-[10px] opacity-70">
              ({tab.key === 'all' ? enriched.length : enriched.filter(l => l.effectiveStatus === tab.key).length})
            </span>
          </button>
        ))}
        <div className="w-px h-5 bg-zinc-800" />
        {TYPE_TABS.map(tab => (
          <button
            key={`type-${tab.key}`}
            onClick={() => setTypeFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === tab.key
                ? 'bg-amber-500 text-amber-950 font-bold'
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

      {/* Listings */}
      <div className="space-y-2">
        {filtered.map(listing => (
          <div
            key={listing.id}
            className={`bg-zinc-900 border rounded-xl px-4 py-3 ${
              listing.effectiveStatus === 'expired'
                ? 'border-zinc-700 opacity-60'
                : listing.effectiveStatus === 'active'
                  ? 'border-zinc-800'
                  : 'border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">{listing.cropEmoji}</span>
                  <span className="text-sm font-semibold text-foreground">{listing.cropName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    listing.type === 'sell'
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  }`}>
                    {listing.type === 'sell' ? 'बेचना' : 'खरीदना'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    listing.effectiveStatus === 'active'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {listing.effectiveStatus === 'active' ? 'सक्रिय' : 'समाप्त'}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  {listing.userName} &middot; {listing.mandiName}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-foreground font-medium">
                    {formatCurrency(listing.pricePerUnit)}/q
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {listing.quantity} क्विंटल
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {formatDate(listing.createdAt)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(listing.id)}
                title="हटाएं"
                className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-red-500/15 hover:text-red-400 text-zinc-500 transition-colors shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">
            कोई लिस्टिंग नहीं मिली
          </div>
        )}
      </div>
    </div>
  );
}
