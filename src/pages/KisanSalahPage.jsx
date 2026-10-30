import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronRight, CloudSun, ExternalLink, Leaf, MapPin, Search, SlidersHorizontal, Sprout } from 'lucide-react';
import Brand from '../components/Brand';
import EditorialImage from '../components/EditorialImage';
import SEO, { SITE_URL } from '../components/SEO';
import { useApi } from '../hooks/useApi';
import '../styles/kisan-salah.css';

const IMD_URL = 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_district_current_lo.php';
const KVK_URL = 'https://icar.org.in/krishi-vigyan-kendras';
const CATEGORIES = [
  { id: '', label: 'सभी सवाल' },
  { id: 'कटाई और भंडारण', label: 'कटाई और भंडारण' },
  { id: 'मौसम और जोखिम', label: 'मौसम और नुकसान' },
  { id: 'फसल की तैयारी', label: 'अगली फसल' },
  { id: 'मंडी और लागत', label: 'बिक्री और ढुलाई' },
];
const PAGE_SIZE = 12;

// Optional question-style headings; the CMS determines which guides appear.
// Search, categories, scope, images and takeaways all use the published article.
const QUESTIONS = {
  'bheega-dhan-sukhana-nami-bhandaran': 'धान भीग गया है या भंडारण से पहले नमी की चिंता है?',
  'dhan-katai-barish-taiyari': 'धान काटना है और बारिश का अनुमान है?',
  'pala-sabji-fasal-taiyari': 'पाले की चेतावनी में सब्ज़ी की तैयारी कैसे करें?',
  'fasal-nuksan-barish-olavrishti-suchna': 'बारिश या ओले से नुकसान हुआ—क्या रिकॉर्ड रखें?',
  'raipur-krishi-mausam-forecast-kaise-padhen': 'मौसम की खबर से खेत का काम कैसे तय करें?',
  'dhan-ke-baad-rabi-fasal-chhattisgarh': 'धान के बाद क्या बोएँ, जब पानी सीमित हो?',
  'gehun-ki-buvai-sahi-samay-aur-tarika': 'गेहूँ की बुवाई से पहले समय, बीज और पानी कैसे जाँचें?',
  'tamatar-mandi-dhulai-ke-baad-bachat': 'दूर की मंडी में भाव अधिक है—भाड़े के बाद क्या बचेगा?',
  'mandi-bhav-min-max-modal-kaise-padhen': 'मंडी में न्यूनतम, अधिकतम और मोडल भाव का क्या मतलब है?',
  'enam-kisan-registration-bikri-bhugtan': 'eNAM पर पहली बार बेचने की तैयारी कैसे करें?',
  'mandi-taul-katauti-bhugtan-checklist': 'तौल, कटौती और भुगतान का हिसाब कैसे मिलाएँ?',
};

function nextStep(post) {
  if (post.category === 'मंडी और लागत') return { href: '/bechne-ka-hisab', label: 'बेचने का हिसाब लगाएँ' };
  const price = post.priceLinks?.[0];
  if (price) return { href: price.path, label: price.label };
  if (post.weatherRelevant) return { href: IMD_URL, label: 'जिला मौसम बुलेटिन', external: true };
  return { href: '/blog', label: 'सभी लेख देखें' };
}

function ResourceLink({ href, children, className = '' }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={15} aria-hidden="true" /><span className="ks-sr-only"> (नई टैब में खुलेगा)</span></a>;
}

export default function KisanSalahPage() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const params = new URLSearchParams({ language: 'hi', limit: String(PAGE_SIZE), page: String(page) });
  if (search) params.set('q', search);
  if (category) params.set('category', category);
  const { data, loading: apiLoading, error } = useApi(`/cms/blog?${params}`);
  const loading = apiLoading || query.trim() !== search;
  const matches = !loading && !error && Array.isArray(data?.posts) ? data.posts : [];
  const total = Number(data?.total) || 0;
  const totalPages = Number(data?.totalPages) || 0;
  const filtered = Boolean(query.trim() || category);
  function clearFilters() { setQuery(''); setSearch(''); setCategory(''); setPage(1); }

  return <div className="ks-page" lang="hi">
    <SEO title="किसान समस्या और सलाह — मौसम, कटाई, भंडारण और बिक्री" description="धान भीगने, पाले, बारिश से नुकसान, रबी की तैयारी और टमाटर की ढुलाई जैसे सवालों के लिए सही भाव की स्रोत सहित गाइड खोजें। स्थानीय कृषि सलाह और IMD बुलेटिन तक पहुँचें।" path="/kisan-salah" image="/editorial/journal-overview.webp" imageAlt="खेती से मंडी तक तैयारी के लिए धान, गेहूँ और टमाटर का सांकेतिक चित्र" structuredData={{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', name: 'किसान समस्या और सलाह', url: `${SITE_URL}/kisan-salah`, inLanguage: 'hi', description: 'खेती की स्थिति के अनुसार उपलब्ध संपादकीय गाइड और आधिकारिक स्थानीय सलाह खोजें।', isAccessibleForFree: true },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'सही भाव', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'किसान समस्या और सलाह', item: `${SITE_URL}/kisan-salah` }] },
    ] }} />
    <a href="#salah-main" className="ks-skip">मुख्य जानकारी पर जाएँ</a>
    <header className="ks-header"><div><Link to="/" aria-label="सही भाव होम"><Brand /></Link><nav aria-label="मुख्य नेविगेशन"><Link to="/">मंडी भाव</Link><Link to="/blog">सभी लेख</Link><Link to="/delivery-calculator">डिलीवरी खर्च <ArrowRight size={16} aria-hidden="true" /></Link></nav></div></header>
    <main id="salah-main" className="ks-main">
      <nav className="ks-breadcrumb" aria-label="आप यहाँ हैं"><Link to="/">होम</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">किसान समस्या और सलाह</span></nav>
      <section className="ks-hero" aria-labelledby="salah-title">
        <div><span className="ks-kicker"><Sprout size={17} aria-hidden="true" /> सही भाव · किसान सहायता</span><h1 id="salah-title">खेत में सवाल है?<br /><em>यहाँ से शुरुआत करें।</em></h1><p>मौसम, कटाई, भंडारण या बिक्री—अपनी स्थिति चुनें। काम की गाइड पढ़ें, उसका लागू क्षेत्र देखें और ज़रूरत पर स्थानीय कृषि केंद्र तक पहुँचें।</p><div className="ks-hero-actions"><a href="#salah-guides" className="ks-button">अपना सवाल खोजें <ArrowRight size={17} aria-hidden="true" /></a><a href="#local-help" className="ks-text-link">स्थानीय सलाह कहाँ लें?</a></div></div>
        <aside className="ks-start-card" aria-label="गाइड पढ़ने का तरीका"><Leaf size={29} aria-hidden="true" /><h2>सही सवाल से<br />बेहतर तैयारी।</h2><ol><li><span>01</span><div><strong>स्थिति मिलाएँ</strong><p>फसल, अवस्था और अपने खेत की समस्या।</p></div></li><li><span>02</span><div><strong>गाइड का दायरा पढ़ें</strong><p>लेख किस क्षेत्र और परिस्थिति के लिए है?</p></div></li><li><span>03</span><div><strong>अगला कदम चुनें</strong><p>आधिकारिक सलाह, मंडी भाव या खर्च का हिसाब।</p></div></li></ol><span className="ks-free"><Check size={15} aria-hidden="true" /> सभी गाइड और कैलकुलेटर मुफ़्त</span></aside>
      </section>

      <section className="ks-guide-section" id="salah-guides" aria-labelledby="guide-heading" aria-busy={loading}>
        <div className="ks-section-heading"><div><span className="ks-kicker">आपकी स्थिति, संबंधित गाइड</span><h2 id="guide-heading">अभी किस बात की चिंता है?</h2></div><span className="ks-count">{loading ? 'खोज जारी है…' : error ? 'गाइड उपलब्ध नहीं' : `${total} ${filtered ? 'संबंधित' : 'उपलब्ध'} गाइड`}</span></div>
        <div className="ks-filters"><label className="ks-search"><span className="ks-sr-only">अपनी फसल या समस्या खोजें</span><Search size={20} aria-hidden="true" /><input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} maxLength={160} placeholder="जैसे: भीगा धान, पाला, टमाटर या ढुलाई" aria-controls="salah-results" /></label><div className="ks-filter-options" role="group" aria-label="गाइड का विषय"><SlidersHorizontal size={16} aria-hidden="true" />{CATEGORIES.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setPage(1); }}>{item.label}</button>)}</div></div>
        <div className="ks-result-bar"><p role="status" aria-live="polite">{loading ? 'प्रकाशित लेखों में आपका सवाल खोज रहे हैं…' : error ? 'अभी लेखों की सूची लोड नहीं हो पाई।' : filtered ? `${total} संबंधित गाइड मिलीं` : 'प्रकाशित लेखों में से अपनी स्थिति के अनुसार चुनें।'}</p>{filtered && <button type="button" onClick={clearFilters}>फ़िल्टर हटाएँ</button>}</div>
        <div className="ks-grid" id="salah-results">{matches.map(post => {
          const question = QUESTIONS[post.slug] || post.title;
          const next = nextStep(post);
          return <article className="ks-card" key={post.slug}>
            <Link className="ks-card-image" to={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true"><EditorialImage src={post.coverImage} alt="" loading="lazy" decoding="async" sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1200px) calc((100vw - 80px) / 2), 556px" /><span>सांकेतिक चित्र</span></Link>
            <div className="ks-card-body"><span className="ks-crop">{post.category}</span><h3><Link to={`/blog/${post.slug}`}>{question}</Link></h3><p>{post.excerpt}</p><ul className="ks-includes" aria-label="इस गाइड में">{(post.takeaways || []).slice(0, 2).map(item => <li key={item}><Check size={13} aria-hidden="true" />{item}</li>)}</ul>{post.regionLabel && <p className="ks-scope"><MapPin size={14} aria-hidden="true" />{post.regionLabel}</p>}<div className="ks-card-actions"><Link to={`/blog/${post.slug}`} aria-label={`${question} — गाइड पढ़ें`}>गाइड पढ़ें <ArrowRight size={16} aria-hidden="true" /></Link>{next.external ? <ResourceLink href={next.href}>{next.label}</ResourceLink> : <Link to={next.href}>{next.label} <ChevronRight size={15} aria-hidden="true" /></Link>}</div></div>
          </article>;
        })}</div>
        {!loading && error && <div className="ks-empty" role="alert"><h3>लेखों की सूची अभी नहीं खुली।</h3><p>इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें। नीचे स्थानीय कृषि सलाह के लिंक उपलब्ध हैं।</p><a href="/kisan-salah" className="ks-button">फिर से कोशिश करें</a><Link to="/blog" className="ks-text-link">सभी लेख खोलें <ArrowRight size={16} aria-hidden="true" /></Link></div>}
        {!loading && !error && totalPages > 1 && <nav className="ks-pagination" aria-label="सलाह के पृष्ठ"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>पिछला पृष्ठ</button><span>पृष्ठ {page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>अगला पृष्ठ</button></nav>}
        {!loading && !error && matches.length === 0 && <div className="ks-empty"><Search size={29} aria-hidden="true" /><h3>इस सवाल पर अभी गाइड उपलब्ध नहीं है।</h3><p>फसल का छोटा नाम या दूसरा विषय आज़माएँ। रोग, कीट या पत्ती के लक्षण के लिए नीचे स्थानीय सलाह का रास्ता देखें।</p><button type="button" className="ks-button" onClick={clearFilters}>सभी गाइड देखें</button><a href="#local-help" className="ks-text-link">स्थानीय सहायता देखें <ArrowRight size={16} aria-hidden="true" /></a></div>}
      </section>

      <section id="local-help" className="ks-local" aria-labelledby="local-heading"><div className="ks-section-heading"><div><span className="ks-kicker">जब खेत की स्थिति अलग हो</span><h2 id="local-heading">अपने जिले की सलाह तक पहुँचें।</h2><p>पत्ती पीली पड़ना, दाग, कीड़े या अचानक मुरझाने के लिए अभी हमारी सत्यापित उपचार गाइड उपलब्ध नहीं है। यहाँ तस्वीर से रोग की पहचान या दवा की मात्रा नहीं दी जाती।</p></div></div><div className="ks-local-grid"><article><CloudSun size={26} aria-hidden="true" /><span className="ks-kicker">भारत मौसम विज्ञान विभाग</span><h3>मौसम का स्थानीय संदर्भ</h3><p>IMD का जिला कृषि मौसम बुलेटिन खोलें। अपना जिला, जारी तारीख, वैध अवधि और फसल की अवस्था मिलाएँ।</p><ResourceLink href={IMD_URL}>जिला बुलेटिन · स्थानीय भाषा</ResourceLink></article><article><Sprout size={26} aria-hidden="true" /><span className="ks-kicker">भारतीय कृषि अनुसंधान परिषद</span><h3>कृषि विज्ञान केंद्र खोजें</h3><p>ICAR की राज्यवार सूची में अपना राज्य चुनकर संबंधित कृषि विज्ञान केंद्र का विवरण देखें। संपर्क और उपलब्ध सेवा की केंद्र से पुष्टि करें।</p><ResourceLink href={KVK_URL}>ICAR की KVK सूची खोलें</ResourceLink></article></div><div className="ks-consult"><BookOpen size={22} aria-hidden="true" /><div><h3>बात करने से पहले अपना विवरण तैयार करें</h3><p>जिला और गाँव, फसल और किस्म, बुवाई की तारीख, लक्षण कब दिखे, खेत का कितना हिस्सा प्रभावित है और अब तक किए गए काम लिख लें। अपने सवाल और उपलब्ध तस्वीरें साथ रखें, ताकि स्थानीय कृषि कर्मी को स्थिति समझा सकें।</p></div></div></section>

      <section className="ks-method" aria-labelledby="method-heading"><div><span className="ks-kicker">इन गाइडों का उपयोग</span><h2 id="method-heading">जानकारी का दायरा साफ़ है।</h2><p>यह पृष्ठ सही भाव की उपलब्ध संपादकीय गाइडों को किसान के सवाल से जोड़ता है। हर लेख में स्रोत, लागू क्षेत्र और समीक्षा की तारीख पढ़ें। उदाहरण के खर्च को वास्तविक भाड़ा, पुराने बुलेटिन को आज की चेतावनी या सामान्य तैयारी को हर खेत की सिफारिश न मानें।</p></div><div className="ks-method-note"><strong>स्थानीय स्रोतों की जाँच</strong><time dateTime="2026-10-22">22 अक्टूबर 2026</time><p>ऊपर IMD और ICAR के बाहरी लिंक हैं। केंद्र से बातचीत, फोटो भेजना या बीमा दावा इस पृष्ठ से जमा नहीं होता।</p><Link to="/blog">सभी लेख और भाषाएँ <ArrowRight size={16} aria-hidden="true" /></Link></div></section>
      <footer className="ks-footer"><span>सही भाव · जानकारी से बेहतर तैयारी</span><Link to="/">मंडी भाव देखें <ArrowRight size={16} aria-hidden="true" /></Link></footer>
    </main>
  </div>;
}
