import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetchAuth, apiDelete } from '@/api/client';
import { Card } from '@/components/ui/card';
import ListingCard from '@/components/marketplace/ListingCard';
import { fadeInUp, staggerContainer } from '@/utils/animations';

export default function MyListingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchListings = useCallback(() => {
    setLoading(true);
    apiFetchAuth('/listings?userId=me')
      .then(data => {
        const items = Array.isArray(data) ? data : data?.listings || [];
        setListings(items);
      })
      .catch(err => {
        setError(err.message);
        setListings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) fetchListings();
    else setLoading(false);
  }, [user, fetchListings]);

  async function handleDelete(listingId) {
    if (deletingId) return;
    setDeletingId(listingId);
    try {
      await apiDelete(`/listings/${listingId}`);
      setListings(prev => prev.filter(l => (l._id || l.id) !== listingId));
    } catch (err) {
      setError(err.message || 'हटाने में समस्या हुई');
    } finally {
      setDeletingId(null);
    }
  }

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🔒</span>
        <p className="text-sm text-zinc-400 text-center">अपनी लिस्टिंग देखने के लिए लॉग इन करें</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 rounded-xl bg-green-500 text-green-950 font-bold text-sm"
        >
          लॉग इन करें
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <h1 className="text-base font-bold">मेरी लिस्टिंग</h1>
        </div>
      </header>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex-1 px-4 py-4 flex flex-col gap-2 pb-8"
      >
        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-zinc-900 animate-pulse border border-zinc-800" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && listings.length === 0 && (
          <motion.div {...fadeInUp} className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="text-5xl">📭</span>
            <p className="text-sm text-zinc-400 text-center">आपकी कोई लिस्टिंग नहीं है</p>
            <button
              onClick={() => navigate('/listing/new?type=sell')}
              className="px-5 py-2.5 rounded-xl bg-green-500 text-green-950 font-bold text-xs"
            >
              नई लिस्टिंग बनाएं
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-green-500 underline"
            >
              डैशबोर्ड पर जाएं
            </button>
          </motion.div>
        )}

        {/* Listings with delete */}
        {!loading && !error && listings.length > 0 && (
          <>
            <div className="text-[10px] text-zinc-500 mb-1">
              {listings.length} लिस्टिंग
            </div>
            {listings.map(listing => {
              const lid = listing._id || listing.id;
              return (
                <motion.div key={lid} {...fadeInUp} className="relative">
                  <ListingCard listing={listing} />
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(lid);
                    }}
                    disabled={deletingId === lid}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-500/20 transition-colors z-10"
                  >
                    <Trash2
                      size={14}
                      className={deletingId === lid ? 'text-zinc-600 animate-pulse' : 'text-red-400'}
                    />
                  </button>
                </motion.div>
              );
            })}
          </>
        )}
      </motion.div>
    </div>
  );
}
