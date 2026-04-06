import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Scale, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/api/client';
import { Card } from '@/components/ui/card';
import AnimatedBuySellButton from '@/components/marketplace/AnimatedBuySellButton';
import ListingCard from '@/components/marketplace/ListingCard';
import { fadeInUp, staggerContainer } from '@/utils/animations';

export default function BazaarTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/listings?limit=20')
      .then(data => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.listings || [];
        setListings(items);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const sellCount = listings.filter(l => l.type === 'sell').length;
  const buyCount = listings.filter(l => l.type === 'buy').length;
  const filteredListings = typeFilter === 'all'
    ? listings
    : listings.filter(l => l.type === typeFilter);

  // If not logged in, show prompt
  if (!user) {
    return (
      <motion.div {...fadeInUp} className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-5xl">🏪</span>
        <h2 className="text-lg font-bold text-foreground">बाज़ार में आपका स्वागत है</h2>
        <p className="text-sm text-zinc-400 text-center px-8">
          फसल बेचने या खरीदने के लिए पहले लॉग इन करें
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 rounded-xl bg-green-500 text-green-950 font-bold text-sm"
        >
          लॉग इन करें
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-4"
    >
      {/* Buy/Sell Buttons */}
      <AnimatedBuySellButton
        onSell={() => navigate('/listing/new?type=sell')}
        onBuy={() => navigate('/listing/new?type=buy')}
      />

      {/* Quick Stats */}
      <motion.div {...fadeInUp} className="grid grid-cols-3 gap-2">
        {[
          { label: 'कुल लिस्टिंग', value: listings.length, emoji: '📋' },
          { label: 'विक्रेता', value: sellCount, emoji: '🧑‍🌾' },
          { label: 'खरीदार', value: buyCount, emoji: '🛒' },
        ].map((s, i) => (
          <Card key={i} className="p-3 bg-zinc-900 border-zinc-800 flex flex-col items-center gap-1">
            <span className="text-lg">{s.emoji}</span>
            <span className="text-base font-bold text-foreground">{s.value}</span>
            <span className="text-[10px] text-zinc-500">{s.label}</span>
          </Card>
        ))}
      </motion.div>

      {/* Shortcut Cards */}
      <motion.div {...fadeInUp} className="grid grid-cols-2 gap-2">
        <Link to="/transport">
          <Card className="p-3 bg-zinc-900 border-zinc-800 hover:border-green-500/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Truck size={16} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate">ट्रांसपोर्ट</div>
                <div className="text-[10px] text-zinc-500">कैलकुलेटर</div>
              </div>
              <ChevronRight size={14} className="text-zinc-600 shrink-0" />
            </div>
          </Card>
        </Link>

        <Link to="/eway-bill/new">
          <Card className="p-3 bg-zinc-900 border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Scale size={16} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate">E-way Bill</div>
                <div className="text-[10px] text-zinc-500">नया बिल बनाएं</div>
              </div>
              <ChevronRight size={14} className="text-zinc-600 shrink-0" />
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Recent Listings Section */}
      <motion.div {...fadeInUp}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground">हाल की लिस्टिंग</h3>
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-3">
          {[
            { key: 'all', label: 'सभी', count: listings.length },
            { key: 'sell', label: 'बेचना', count: sellCount },
            { key: 'buy', label: 'खरीदना', count: buyCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === tab.key
                  ? tab.key === 'sell' ? 'bg-green-500 text-green-950 font-bold'
                    : tab.key === 'buy' ? 'bg-amber-500 text-amber-950 font-bold'
                    : 'bg-green-500 text-green-950 font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-zinc-900 animate-pulse border border-zinc-800" />
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <p className="text-sm text-red-400">लिस्टिंग लोड नहीं हो सकी</p>
            <p className="text-[10px] text-zinc-500 mt-1">{error}</p>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filteredListings.length === 0 && (
          <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center gap-3">
            <span className="text-4xl">🏬</span>
            <p className="text-sm text-zinc-400 text-center">अभी कोई लिस्टिंग नहीं है</p>
            <button
              onClick={() => navigate('/listing/new?type=sell')}
              className="px-4 py-2 rounded-xl bg-green-500 text-green-950 font-bold text-xs"
            >
              पहली लिस्टिंग बनाएं
            </button>
          </Card>
        )}

        {/* Listings */}
        {!loading && !error && filteredListings.length > 0 && (
          <div className="flex flex-col gap-2">
            {filteredListings.map(listing => (
              <ListingCard key={listing._id || listing.id} listing={listing} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
