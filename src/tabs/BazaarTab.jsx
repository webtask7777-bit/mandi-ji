import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Info, Plus, RefreshCw, Search, ShoppingBasket, Truck, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/api/client';
import ListingCard from '@/components/marketplace/ListingCard';
import '@/styles/secondary.css';

const expiryTime = listing => listing.expiresAt ? Date.parse(listing.expiresAt) : NaN;

export default function BazaarTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    apiFetch(`/listings?limit=20&page=${page}`)
      .then(data => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.listings || [];
        // Public browsing uses the existing public endpoint. Posting remains authenticated.
        // Hide expired listings even if an older backend still labels them active.
        const current = items.filter(listing => (!listing.status || listing.status === 'active') && (!Number.isFinite(expiryTime(listing)) || expiryTime(listing) > Date.now()));
        setListings(previous => {
          const combined = page === 1 ? current : [...previous, ...current];
          return [...new Map(combined.map(listing => [listing._id || listing.id, listing])).values()];
        });
        setHasMore(!Array.isArray(data) && Number(data.totalPages) > page);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, retry]);

  const visibleListings = useMemo(() => listings.filter(listing => {
    const typeMatches = typeFilter === 'all' || listing.type === typeFilter;
    const searchMatches = `${listing.cropNameHi || ''} ${listing.cropName || ''} ${listing.mandiName || ''} ${listing.district || ''} ${listing.state || ''}`.toLowerCase().includes(query.trim().toLowerCase());
    return typeMatches && searchMatches;
  }), [listings, query, typeFilter]);
  const createListing = type => navigate(`/listing/new?type=${type}`);

  return <div className="sb-secondary-tab sb-bazaar-tab flex flex-col">
    <section className="sb-bazaar-hero">
      <div><span className="sb-secondary-eyebrow">फसल का बाज़ार</span><h2>खरीद और बिक्री,<br />एक जगह।</h2><p>उपलब्ध लिस्टिंग देखें, अपनी ज़रूरत बताएँ और माल मँगाने का खर्च समझें।</p><div className="sb-bazaar-actions"><button type="button" onClick={() => createListing('sell')} className="sb-secondary-primary"><Plus size={18} />बेचने की लिस्टिंग</button><button type="button" onClick={() => createListing('buy')} className="sb-secondary-outline"><ShoppingBasket size={18} />खरीद की ज़रूरत</button></div>{!user && <small>लिस्टिंग देखना खुला है। अपनी लिस्टिंग जोड़ने के लिए लॉग इन करें।</small>}</div>
      <img src="/visuals/hero-mandi.webp" alt="अनाज की बोरियों वाली मंडी का सांकेतिक दृश्य" width="1280" height="853" />
    </section>

    <Link to="/transport" className="sb-bazaar-calculator"><span className="sb-feature-icon"><Truck size={23} /></span><span><strong>सस्ता भाव मिला — पहुँचने पर कितना पड़ेगा?</strong><small>वाहन और दूरी के हिसाब से डिलीवरी खर्च देखें।</small></span><ArrowRight size={21} /></Link>

    <section aria-labelledby="sb-listings-title">
      <div className="sb-section-title"><ClipboardList size={20} /><h3 id="sb-listings-title">उपलब्ध लिस्टिंग</h3>{!loading && <span>{listings.length} लोड हुईं</span>}</div>
      <div className="sb-bazaar-toolbar"><div className="sb-bazaar-filters" aria-label="लिस्टिंग प्रकार">{[{ key: 'all', label: 'सभी' }, { key: 'sell', label: 'बेचना है' }, { key: 'buy', label: 'खरीदना है' }].map(filter => <button type="button" key={filter.key} aria-pressed={typeFilter === filter.key} onClick={() => setTypeFilter(filter.key)}>{filter.label}</button>)}</div><label className="sb-secondary-search"><Search size={18} aria-hidden="true" /><span className="sr-only">लोड की गई लिस्टिंग में फसल या मंडी खोजें</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="फसल या मंडी खोजें" />{query && <button type="button" aria-label="लिस्टिंग की खोज हटाएँ" onClick={() => setQuery('')}><X size={16} /></button>}</label></div>
      {query.trim() && <p className="sb-data-caption">खोज लोड की गई लिस्टिंग में है{hasMore ? '; पुराने परिणामों के लिए और लिस्टिंग लोड करें।' : '।'}</p>}

      {loading && page === 1 && <div className="sb-listing-grid" role="status" aria-label="लिस्टिंग लोड हो रही हैं"><div className="sb-listing-skeleton" /><div className="sb-listing-skeleton" /></div>}
      {error && <div className="sb-secondary-empty" role="status"><RefreshCw size={25} /><h3>लिस्टिंग नहीं खुल सकीं</h3><p>इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।</p><button type="button" className="sb-secondary-outline" onClick={() => setRetry(value => value + 1)}>दोबारा कोशिश करें</button></div>}
      {!loading && !error && visibleListings.length === 0 && <div className="sb-secondary-empty"><img src="/visuals/empty-saved.webp" alt="" width="128" height="128" /><h3>{query || typeFilter !== 'all' ? 'इस खोज की लिस्टिंग नहीं मिली' : 'अभी उपलब्ध लिस्टिंग नहीं है'}</h3><p>{query || typeFilter !== 'all' ? 'दूसरी फसल या मंडी खोजें, या सभी लिस्टिंग देखें।' : 'अपनी बिक्री या खरीद की ज़रूरत जोड़कर शुरुआत करें।'}</p>{query || typeFilter !== 'all' ? <button type="button" className="sb-secondary-outline" onClick={() => { setTypeFilter('all'); setQuery(''); }}>खोज और फ़िल्टर हटाएँ</button> : <button type="button" className="sb-secondary-primary" onClick={() => createListing('sell')}><Plus size={17} />लिस्टिंग जोड़ें</button>}</div>}
      {visibleListings.length > 0 && <div className="sb-listing-grid">{visibleListings.map(listing => <div key={listing._id || listing.id}><ListingCard listing={listing} />{!Number.isFinite(expiryTime(listing)) && <p className="sb-data-caption">उपलब्धता की अंतिम तारीख दर्ज नहीं है।</p>}</div>)}</div>}
      {hasMore && !error && <div className="sb-load-more"><button type="button" className="sb-secondary-outline" disabled={loading} onClick={() => setPage(value => value + 1)}>{loading ? 'लोड हो रहा है…' : 'और लिस्टिंग देखें'}</button></div>}
    </section>
    <div className="sb-context-note"><Info size={17} /><p>लिस्टिंग में दिया भाव और उपलब्धता उपयोगकर्ता की जानकारी है। सौदे से पहले किस्म, गुणवत्ता, वजन, कुल डिलीवरी खर्च और भुगतान की शर्तें पक्की करें।</p></div>
  </div>;
}
