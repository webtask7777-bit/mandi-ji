import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Clock3, Calculator, Phone, UserRound, Package, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/api/client';
import Brand from '@/components/Brand';
import CropImage, { CropImageLegend } from '@/components/CropImage';
import SEO from '@/components/SEO';
import '../styles/listing-detail.css';

const positiveNumber = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) > 0;
const number = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dateLabel = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;
};

function ListingShell({ children }) {
  return <div className="sb-listing-page">
    <header className="sb-listing-header"><div>
      <Link to="/" aria-label="सही भाव होम"><Brand /></Link>
      <Link to="/?tab=bazaar" className="sb-listing-back"><ArrowLeft size={17} aria-hidden="true" /> बाज़ार में वापस</Link>
    </div></header>
    <main id="main-content" className="sb-listing-main">{children}</main>
  </div>;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setListing(null);
    apiFetch(`/listings/${encodeURIComponent(id)}`)
      .then(data => { if (!cancelled) setListing(data?.listing || data); })
      .catch(err => { if (!cancelled) setError(err.message || 'लिस्टिंग लोड नहीं हो पाई'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, attempt]);

  if (loading) return <ListingShell><SEO title="फसल की लिस्टिंग" /><section className="sb-listing-status" role="status"><RefreshCw size={28} aria-hidden="true" /><h1>फसल की जानकारी आ रही है</h1><p>भाव, मात्रा और स्थान लोड हो रहे हैं।</p></section></ListingShell>;

  if (error || !listing) return <ListingShell><SEO title="लिस्टिंग उपलब्ध नहीं" noIndex={!error || /\bAPI (404|410|422):/.test(error)} /><section className="sb-listing-status" role="alert"><AlertCircle size={30} aria-hidden="true" /><h1>लिस्टिंग नहीं खुल पाई</h1><p>{error || 'इस लिस्टिंग की जानकारी उपलब्ध नहीं है।'}</p><button type="button" className="sb-listing-primary" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={17} aria-hidden="true" /> फिर कोशिश करें</button><Link to="/?tab=bazaar" className="sb-listing-back">दूसरी लिस्टिंग देखें <ArrowRight size={16} aria-hidden="true" /></Link></section></ListingShell>;

  const isSell = listing.type === 'sell';
  const displayName = listing.cropNameHi || listing.cropName || 'फसल';
  const mandiDisplay = listing.mandiName || listing.location?.mandi || '';
  const districtDisplay = listing.district || listing.location?.district || '';
  const stateDisplay = listing.state || listing.location?.state || '';
  const location = [...new Set([mandiDisplay, districtDisplay, stateDisplay].filter(Boolean))].join(', ');
  const sellerName = listing.userName || listing.user?.name || 'नाम उपलब्ध नहीं';
  const rawPhone = String(listing.userPhone || listing.user?.phone || '').trim();
  // Masked public numbers are display data, never usable dial targets.
  const phone = /^[+\d][\d\s()-]*$/.test(rawPhone) ? rawPhone.replace(/[\s()-]/g, '') : '';
  const validPhone = /^\+?\d{10,15}$/.test(phone);
  const expiresAt = Date.parse(listing.expiresAt);
  const isExpired = Number.isFinite(expiresAt) && expiresAt <= Date.now();
  const isActive = listing.status === 'active' && !isExpired;
  const createdLabel = dateLabel(listing.createdAt);
  const expiresLabel = dateLabel(listing.expiresAt);
  const price = positiveNumber(listing.pricePerUnit) ? Number(listing.pricePerUnit) : positiveNumber(listing.price) ? Number(listing.price) : null;
  const unit = String(listing.unit || '').toLowerCase();
  const unitLabel = ({ quintal: 'क्विंटल', kg: 'किलो', kilogram: 'किलो', tonne: 'टन', ton: 'टन' })[unit] || listing.unit || 'इकाई उपलब्ध नहीं';
  const quantityLabel = positiveNumber(listing.quantity) ? `${number(listing.quantity)} ${unitLabel}` : '';
  const listingTitle = [displayName, isSell ? 'बिक्री का प्रस्ताव' : 'खरीद की माँग', location, quantityLabel].filter(Boolean).join(' · ');
  const listingDescription = [
    `${displayName} की ${isSell ? 'बिक्री' : 'खरीद'} लिस्टिंग${location ? ` — ${location}` : ''}।`,
    quantityLabel ? `दर्ज मात्रा ${quantityLabel}।` : '',
    price !== null ? `दिया गया भाव ₹${number(price)}/${unitLabel}।` : '',
    createdLabel ? `लिस्टिंग की तारीख ${createdLabel}।` : '',
    'यह उपयोगकर्ता का प्रस्ताव है; उपलब्धता और भाव की पुष्टि करें।',
  ].filter(Boolean).join(' ');
  const canPrefill = isSell && unit === 'quintal' && price !== null && isActive;
  const openCalculator = () => navigate('/delivery-calculator', { state: { deliveryScenario: {
    id: globalThis.crypto?.randomUUID?.() || `listing-${id}-${Date.now()}`,
    cropId: listing.cropId, cropName: displayName,
    buyPrice: canPrefill ? price : '', sellPrice: '',
    buyMandi: isSell ? location : '', sellMandi: '',
    quoteDate: canPrefill ? listing.createdAt : null,
    priceBasis: canPrefill ? 'listing-offer' : '',
    variety: listing.variety || '', grade: listing.grade || '',
  } } });

  return <ListingShell>
    <SEO title={listingTitle} description={listingDescription} noIndex={!isActive} />
    <nav className="sb-listing-breadcrumb" aria-label="पृष्ठ पथ"><Link to="/?tab=bazaar">बाज़ार</Link><span aria-hidden="true">/</span><span>{displayName}</span></nav>
    {!isActive && <div className="sb-listing-alert" role="status"><Clock3 size={21} aria-hidden="true" /><div><strong>{isExpired ? 'इस लिस्टिंग की अवधि समाप्त हो गई है' : 'यह लिस्टिंग अभी सक्रिय नहीं है'}</strong><p>{isExpired && expiresLabel ? `${expiresLabel} को अवधि समाप्त हुई। ` : ''}दिखाई गई मात्रा और भाव वर्तमान उपलब्धता की पुष्टि नहीं करते।</p></div><Link to="/?tab=bazaar">सक्रिय लिस्टिंग देखें <ArrowRight size={16} aria-hidden="true" /></Link></div>}
    <div className="sb-listing-layout">
      <div className="sb-listing-content">
        <section className="sb-listing-offer" aria-labelledby="listing-title">
          <div className="sb-listing-offer-heading"><div><div className="sb-listing-badges"><span className={isSell ? 'is-sell' : 'is-buy'}>{isSell ? 'बिक्री का प्रस्ताव' : 'खरीद की माँग'}</span><span className={isActive ? 'is-active' : 'is-inactive'}>{isActive ? 'सक्रिय लिस्टिंग' : isExpired ? 'अवधि समाप्त' : 'निष्क्रिय'}</span></div><h1 id="listing-title">{displayName}</h1><p><MapPin size={16} aria-hidden="true" />{location || 'स्थान उपलब्ध नहीं'}</p></div><CropImage id={listing.cropId || listing.cropName} name={displayName} size="hero" /></div>
          <CropImageLegend />
          <dl className="sb-listing-price-grid"><div><dt>{isSell ? 'विक्रेता का माँगा गया भाव' : 'खरीदार का प्रस्तावित भाव'}</dt><dd>{price === null ? 'भाव उपलब्ध नहीं' : `₹${number(price)}`}<small> / {unitLabel}</small></dd></div><div><dt>{isSell ? 'दर्ज उपलब्ध मात्रा' : 'दर्ज माँग'}</dt><dd>{positiveNumber(listing.quantity) ? number(listing.quantity) : '—'}<small> {unitLabel}</small></dd></div></dl>
          <p className="sb-listing-offer-note"><Info size={16} aria-hidden="true" />यह उपयोगकर्ता का दिया हुआ प्रस्ताव है। यह सत्यापित सौदा या सरकारी मंडी भाव नहीं है।</p>
        </section>
        <section className="sb-listing-section"><h2><Package size={20} aria-hidden="true" />माल और लिस्टिंग की जानकारी</h2>
          <dl className="sb-listing-facts"><div><dt>मंडी / स्थान</dt><dd>{location || 'नहीं बताया गया'}</dd></div><div><dt>किस्म</dt><dd>{listing.variety || 'नहीं बताई गई'}</dd></div><div><dt>ग्रेड / गुणवत्ता</dt><dd>{listing.grade || 'नहीं बताया गया'}</dd></div><div><dt>लिस्टिंग की तारीख</dt><dd>{createdLabel || 'उपलब्ध नहीं'}</dd></div><div><dt>अंतिम तारीख</dt><dd>{expiresLabel || 'उपलब्ध नहीं'}</dd></div></dl>
          {listing.description ? <div className="sb-listing-description"><h3>लिस्टिंग का विवरण</h3><p>{listing.description}</p></div> : <p className="sb-listing-muted">इस लिस्टिंग में अतिरिक्त विवरण नहीं दिया गया है।</p>}
        </section>
      </div>
      <aside className="sb-listing-sidebar">
        <section className="sb-listing-contact"><span className="sb-listing-kicker">{isSell ? 'विक्रेता की जानकारी' : 'खरीदार की जानकारी'}</span><div className="sb-listing-person"><span><UserRound size={24} aria-hidden="true" /></span><div><h2>{sellerName}</h2><p>लिस्टिंग देने वाला उपयोगकर्ता</p></div></div>
          {!isActive ? <div className="sb-listing-contact-state"><Clock3 size={17} aria-hidden="true" /><span>निष्क्रिय लिस्टिंग के लिए संपर्क बंद है।</span></div> : !validPhone ? <div className="sb-listing-contact-state"><Phone size={17} aria-hidden="true" /><span>संपर्क नंबर सार्वजनिक रूप से उपलब्ध नहीं है।</span></div> : user ? <a href={`tel:${phone}`} className="sb-listing-primary"><Phone size={18} aria-hidden="true" /> {rawPhone}</a> : <Link to="/login" className="sb-listing-primary"><UserRound size={18} aria-hidden="true" /> संपर्क विकल्प के लिए लॉग इन करें</Link>}
        </section>
        <section className="sb-listing-delivery"><span className="sb-listing-calculator-icon"><Calculator size={25} strokeWidth={1.6} aria-hidden="true" /></span><span className="sb-listing-kicker">माल पहुँचने तक का हिसाब</span><h2>सिर्फ भाव नहीं,<br />पूरी लागत देखें।</h2><p>गाड़ी, दूरी, भाड़ा और वजन की कमी जोड़ें। देखें कि माल मँगाना आपके लिए कितना सही पड़ेगा।</p><button type="button" className="sb-listing-primary" onClick={openCalculator}>डिलीवरी का खर्च निकालें <ArrowRight size={18} aria-hidden="true" /></button><small>{canPrefill ? 'यहाँ दिया खरीद भाव आगे भर जाएगा। नया भाव विक्रेता से जाँचें।' : 'खरीद भाव और गाड़ी का वास्तविक भाड़ा कैलकुलेटर में भरें।'}</small></section>
      </aside>
    </div>
    <footer className="sb-listing-footer"><Brand compact /><p>सही भाव। समझकर फ़ैसला।</p><Link to="/?tab=bazaar">बाज़ार की दूसरी लिस्टिंग <ArrowRight size={16} aria-hidden="true" /></Link></footer>
  </ListingShell>;
}
