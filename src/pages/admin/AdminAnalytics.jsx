import { useState, useEffect } from 'react';
import { BarChart3, Users, ShoppingCart, Leaf } from 'lucide-react';
import { apiFetchAuth } from '../../api/client';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetchAuth('/admin/stats').catch(() => null),
      apiFetchAuth('/admin/listings').catch(() => []),
    ])
      .then(([statsData, listingsData]) => {
        setStats(statsData);
        setListings(listingsData || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-zinc-400 animate-pulse">लोड हो रहा है...</div>
      </div>
    );
  }

  // Compute analytics from listings
  const sellCount = listings.filter(l => l.type === 'sell').length;
  const buyCount = listings.filter(l => l.type === 'buy').length;
  const activeCount = listings.filter(l => l.status === 'active').length;

  // Most popular crops
  const cropCounts = {};
  listings.forEach(l => {
    const name = l.cropName || 'अन्य';
    cropCounts[name] = (cropCounts[name] || 0) + 1;
  });
  const topCrops = Object.entries(cropCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCropCount = topCrops.length > 0 ? topCrops[0][1] : 1;

  // Listings by type bar
  const typeData = [
    { label: 'बेचना (Sell)', value: sellCount, color: 'bg-green-500' },
    { label: 'खरीदना (Buy)', value: buyCount, color: 'bg-blue-500' },
  ];
  const maxTypeValue = Math.max(sellCount, buyCount, 1);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-green-500" />
          <div className="text-sm font-bold text-foreground">सारांश</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xl font-black text-blue-400">{stats?.totalUsers ?? 0}</div>
            <div className="text-[10px] text-zinc-500">कुल उपयोगकर्ता</div>
          </div>
          <div>
            <div className="text-xl font-black text-green-400">{stats?.totalListings ?? 0}</div>
            <div className="text-[10px] text-zinc-500">कुल लिस्टिंग</div>
          </div>
          <div>
            <div className="text-xl font-black text-amber-400">{stats?.totalEwayBills ?? 0}</div>
            <div className="text-[10px] text-zinc-500">E-way Bills</div>
          </div>
          <div>
            <div className="text-xl font-black text-purple-400">{activeCount}</div>
            <div className="text-[10px] text-zinc-500">सक्रिय लिस्टिंग</div>
          </div>
        </div>
      </div>

      {/* Listings by Type */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={14} className="text-green-500" />
          <div className="text-sm font-bold text-foreground">लिस्टिंग प्रकार</div>
        </div>
        <div className="space-y-2">
          {typeData.map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-400">{item.label}</span>
                <span className="text-xs font-bold text-foreground">{item.value}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-500`}
                  style={{ width: `${Math.max((item.value / maxTypeValue) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Popular Crops */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Leaf size={14} className="text-green-500" />
          <div className="text-sm font-bold text-foreground">लोकप्रिय फसलें</div>
        </div>
        {topCrops.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-4">कोई डेटा नहीं</div>
        ) : (
          <div className="space-y-2">
            {topCrops.map(([name, count], i) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">
                    <span className="text-zinc-600 mr-1">#{i + 1}</span>
                    {name}
                  </span>
                  <span className="text-xs font-bold text-foreground">{count} लिस्टिंग</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{
                      width: `${Math.max((count / maxCropCount) * 100, 4)}%`,
                      opacity: 1 - (i * 0.08),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-green-500" />
          <div className="text-sm font-bold text-foreground">उपयोगकर्ता विश्लेषण</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <div className="text-lg font-black text-blue-400">{stats?.totalUsers ?? 0}</div>
            <div className="text-[10px] text-zinc-500">पंजीकृत</div>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <div className="text-lg font-black text-green-400">
              {(stats?.recentUsers || []).filter(u => u.kycStatus === 'verified').length}
            </div>
            <div className="text-[10px] text-zinc-500">KYC सत्यापित</div>
          </div>
        </div>
      </div>
    </div>
  );
}
