import { useState, useEffect } from 'react';
import { Users, ShoppingCart, FileText, TrendingUp, RefreshCw } from 'lucide-react';
import { apiFetchAuth, apiPost } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const STAT_CARDS = [
  { key: 'totalUsers', label: 'कुल उपयोगकर्ता', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { key: 'totalListings', label: 'कुल लिस्टिंग', icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { key: 'totalEwayBills', label: 'कुल E-way Bills', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { key: 'activeListings', label: 'सक्रिय लिस्टिंग', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
];

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

export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  function loadStats() {
    setLoading(true);
    apiFetchAuth('/admin/stats')
      .then(data => { setStats(data); setError(''); })
      .catch(err => setError(err.message || 'स्टैट्स लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadStats(); }, []);

  async function handleSeedDemo() {
    setSeeding(true);
    try {
      const result = await apiPost('/admin/seed', {});
      toast.success(`डेमो डेटा बनाया: ${result.usersAdded} उपयोगकर्ता, ${result.listingsAdded} लिस्टिंग, ${result.billsAdded} बिल`);
      loadStats();
    } catch (err) {
      toast.error(err.message || 'सीड डेटा बनाने में विफल');
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-zinc-400 animate-pulse">लोड हो रहा है...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-red-400 mb-3">{error}</div>
        <button onClick={loadStats} className="text-xs text-green-500 hover:underline">
          पुनः प्रयास करें
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          const value = stats?.[card.key] ?? 0;
          return (
            <div
              key={card.key}
              className={`${card.bg} border ${card.border} rounded-xl px-4 py-3`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={card.color} />
                <span className="text-[10px] text-zinc-400 font-medium">{card.label}</span>
              </div>
              <div className={`text-2xl font-black ${card.color}`}>{value}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Users */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="text-sm font-bold text-foreground">हाल के उपयोगकर्ता</div>
          <button
            onClick={loadStats}
            className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={12} className="text-zinc-400" />
          </button>
        </div>
        <div className="divide-y divide-zinc-800">
          {(stats?.recentUsers || []).map(user => (
            <div key={user.id} className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">{user.name}</div>
                <div className="text-[10px] text-zinc-500">{user.phone} &middot; {formatDate(user.createdAt)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  user.role === 'admin'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {user.role}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  user.kycStatus === 'verified'
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {user.kycStatus || 'pending'}
                </span>
              </div>
            </div>
          ))}
          {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
            <div className="px-4 py-6 text-center text-xs text-zinc-500">
              कोई उपयोगकर्ता नहीं
            </div>
          )}
        </div>
      </div>

      {/* Top Crops Chart */}
      {stats?.topCrops?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="text-sm font-bold text-foreground">लोकप्रिय फसलें</div>
          </div>
          <div className="p-4 space-y-2.5">
            {stats.topCrops.map((crop, i) => {
              const maxCount = stats.topCrops[0].count;
              const pct = maxCount > 0 ? (crop.count / maxCount) * 100 : 0;
              const colors = ['bg-green-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-red-400'];
              return (
                <div key={crop.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground font-medium">{crop.name}</span>
                    <span className="text-[10px] text-zinc-500">{crop.count} लिस्टिंग</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-sm font-bold text-foreground mb-3">त्वरित कार्य</div>
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-500/25 transition-colors disabled:opacity-50"
        >
          {seeding ? 'सीडिंग...' : 'Seed Demo Data'}
        </button>
      </div>
    </div>
  );
}
