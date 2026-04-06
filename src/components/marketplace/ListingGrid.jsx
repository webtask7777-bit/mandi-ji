import ListingCard from './ListingCard';

export default function ListingGrid({ listings = [], loading = false }) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-20 rounded-xl bg-zinc-900 animate-pulse border border-zinc-800"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (!listings || listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="text-4xl">🔍</span>
        <p className="text-sm text-zinc-400 text-center">कोई लिस्टिंग नहीं मिली</p>
      </div>
    );
  }

  // Listings
  return (
    <div className="flex flex-col gap-2">
      {listings.map(listing => (
        <ListingCard
          key={listing._id || listing.id}
          listing={listing}
        />
      ))}
    </div>
  );
}
