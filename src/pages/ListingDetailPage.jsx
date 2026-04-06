import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Truck, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/api/client';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/utils/animations';

/**
 * Returns a human-readable relative time string in Hindi.
 */
function relativeTimeHindi(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'अभी';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'अभी';
  if (minutes < 60) return `${minutes} मिनट पहले`;
  if (hours < 24) return `${hours} घंटे पहले`;
  if (days < 7) return `${days} दिन पहले`;
  if (weeks < 5) return `${weeks} हफ़्ते पहले`;
  return `${months} महीने पहले`;
}

function formatIndianNumber(num) {
  if (num == null) return '0';
  const str = String(num);
  if (str.length <= 3) return str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${grouped},${last3}`;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/listings/${id}`)
      .then(data => {
        if (cancelled) return;
        // API may return { listing } or the listing directly
        setListing(data?.listing || data);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto">
        <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={20} className="text-zinc-400" />
            </button>
            <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
          </div>
        </header>
        <div className="px-4 py-6 flex flex-col gap-4">
          <div className="h-20 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="h-12 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="h-32 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="h-24 rounded-xl bg-zinc-900 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !listing) {
    return (
      <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
        <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={20} className="text-zinc-400" />
            </button>
            <h1 className="text-base font-bold">लिस्टिंग</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <span className="text-4xl">😕</span>
          <p className="text-sm text-zinc-400">{error || 'लिस्टिंग नहीं मिली'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-sm text-foreground"
          >
            वापस जाएं
          </button>
        </div>
      </div>
    );
  }

  const isSell = listing.type === 'sell';
  const emoji = listing.cropEmoji || '🌾';
  const displayName = listing.cropNameHi || listing.cropName || 'फसल';
  const mandiDisplay = listing.mandiName || listing.location?.mandi || '---';
  const districtDisplay = listing.location?.district || '';
  const stateDisplay = listing.location?.state || '';
  const locationParts = [mandiDisplay, districtDisplay, stateDisplay].filter(Boolean).join(', ');
  const sellerName = listing.userName || listing.user?.name || '---';
  const sellerPhone = listing.userPhone || listing.user?.phone || null;

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
          <h1 className="text-base font-bold truncate">{displayName}</h1>
        </div>
      </header>

      <motion.div {...fadeInUp} className="flex-1 px-4 py-4 flex flex-col gap-4 pb-8">
        {/* Crop Header */}
        <div className="flex items-center gap-4">
          <span className="text-5xl">{emoji}</span>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <span
              className={cn(
                'inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold',
                isSell
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-amber-500/20 text-amber-400'
              )}
            >
              {isSell ? 'बेचना' : 'खरीदना'}
            </span>
          </div>
        </div>

        {/* Price & Quantity */}
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">भाव</div>
              <div className="text-xl font-bold text-green-500">
                ₹{formatIndianNumber(listing.pricePerUnit || listing.price)}
                <span className="text-xs font-normal text-zinc-400">/क्विंटल</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">मात्रा</div>
              <div className="text-xl font-bold text-foreground">
                {listing.quantity}
                <span className="text-xs font-normal text-zinc-400"> क्विंटल</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Seller / Buyer Info */}
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="text-[10px] text-zinc-500 mb-2">
            {isSell ? 'विक्रेता जानकारी' : 'खरीदार जानकारी'}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <span className="text-lg">🧑‍🌾</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground truncate">{sellerName}</div>
              {user ? (
                sellerPhone ? (
                  <a
                    href={`tel:${sellerPhone}`}
                    className="flex items-center gap-1 text-xs text-green-500 mt-0.5"
                  >
                    <Phone size={12} />
                    {sellerPhone}
                  </a>
                ) : (
                  <div className="text-xs text-zinc-500 mt-0.5">फ़ोन उपलब्ध नहीं</div>
                )
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="text-xs text-amber-500 mt-0.5 underline"
                >
                  फ़ोन देखने के लिए लॉग इन करें
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="text-[10px] text-zinc-500 mb-2">स्थान</div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <MapPin size={16} className="text-green-500 shrink-0" />
            <span>{locationParts}</span>
          </div>
        </Card>

        {/* Description */}
        {listing.description && (
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <div className="text-[10px] text-zinc-500 mb-2">विवरण</div>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </Card>
        )}

        {/* Time */}
        {listing.createdAt && (
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Clock size={12} />
            <span>{relativeTimeHindi(listing.createdAt)}</span>
          </div>
        )}

        {/* Transport Calculator Link */}
        <Link
          to="/transport"
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-green-500 hover:border-green-500/40 transition-colors"
        >
          <Truck size={16} />
          ट्रांसपोर्ट कैलकुलेटर
        </Link>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="w-full h-11 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-300 active:scale-[0.98] transition-transform"
        >
          वापस जाएं
        </button>
      </motion.div>
    </div>
  );
}
