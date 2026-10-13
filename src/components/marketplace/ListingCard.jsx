import CropImage from "@/components/CropImage";
import '@/styles/secondary.css';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Returns a human-readable relative time string in Hindi.
 */
function relativeTimeHindi(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return '';
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

/**
 * Format number with Indian comma grouping: 1,00,000
 */
function formatIndianNumber(num) {
  const value = Number(num);
  return Number.isFinite(value)
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)
    : '—';
}

export default function ListingCard({ listing }) {

  if (!listing) return null;

  const {
    _id,
    id,
    type,
    cropName,
    cropNameHi,
    cropId,
    price,
    pricePerUnit,
    quantity,
    mandiName,
    location,
    createdAt,
  } = listing;

  const displayPrice = pricePerUnit ?? price;

  const listingId = _id || id;
  const isSell = type === 'sell';
  const displayName = cropNameHi || cropName || 'फसल';
  const mandiDisplay = mandiName || location?.mandi || location?.district || '---';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="sb-listing-shell"
    >
      <Link to={`/listing/${listingId}`} className="sb-listing-link" aria-label={`${displayName} की ${isSell ? 'बिक्री' : 'खरीद'} लिस्टिंग देखें`}>
      <Card className="sb-listing-card p-3 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <div className="flex items-start gap-3">
          <div className="sb-listing-image"><CropImage id={cropId || cropName} name={displayName} size="lg" /></div>

          {/* Right: Details */}
          <div className="flex-1 min-w-0">
            <h3 className="sb-listing-name">{displayName}</h3>
            {/* Top row: price + type badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-foreground">
                {displayPrice != null ? `₹${formatIndianNumber(displayPrice)}/क्विंटल` : 'भाव बाद में'}
              </div>
              <span
                className={cn(
                  'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold',
                  isSell
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-amber-500/20 text-amber-400'
                )}
              >
                {isSell ? 'बेचना' : 'खरीदना'}
              </span>
            </div>

            {/* Quantity */}
            {quantity != null && (
              <div className="text-xs text-zinc-400 mt-0.5">
                {quantity} क्विंटल
              </div>
            )}

            {/* Bottom: location + time */}
            <div className="sb-listing-meta flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500">
              <span className="flex items-center gap-0.5 truncate">
                <MapPin size={10} className="shrink-0" />
                {mandiDisplay}
              </span>
              {createdAt && (
                <span className="flex items-center gap-0.5 shrink-0">
                  <Clock size={10} className="shrink-0" />
                  {relativeTimeHindi(createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
      </Link>
    </motion.div>
  );
}
