import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronRight, CloudSun, ExternalLink, Leaf, MapPin, Search, SlidersHorizontal, Sprout } from 'lucide-react';
import Brand from '../components/Brand';
import EditorialImage from '../components/EditorialImage';
import SEO, { SITE_URL } from '../components/SEO';
import '../styles/kisan-salah.css';

const IMD_URL = 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_district_current_lo.php';
const KVK_URL = 'https://icar.org.in/krishi-vigyan-kendras';
const CATEGORIES = [
  { id: 'all', label: 'सभी सवाल' },
  { id: 'harvest', label: 'कटाई और भंडारण' },
  { id: 'weather', label: 'मौसम और नुकसान' },
  { id: 'planning', label: 'अगली फसल' },
  { id: 'selling', label: 'बिक्री और ढुलाई' },
];

// These eight situation guides point to published Hindi articles. Translations
// are reached through the articles; they are not counted as additional advice.
const GUIDES = [
  {
    slug: 'bheega-dhan-sukhana-nami-bhandaran', category: 'harvest', crop: 'धान',
    question: 'धान भीग गया है या भंडारण से पहले नमी की चिंता है?',
    description: 'खेप की पहचान, सुखाने के विकल्प, नमी की reading और खरीद केंद्र भेजने से पहले पूछने वाले सवाल समझें।',
    scope: 'धान की सामान्य संभाल · खरीद के स्थानीय नियम जाँचें',
    image: '/editorial/bheega-dhan.webp', alt: 'धान का नमूना पकड़े हाथ, नमी मापने का यंत्र और ढका सुखाने का स्थान; सांकेतिक चित्र',
    includes: ['सुखाने की तैयारी', 'नमी की जाँच', 'खेप का रिकॉर्ड'],
    keywords: 'paddy wet damp moisture dhan bheega storage bhandaran सुखाना गीला बोरा नमी बारिश',
    next: { href: '/crop/paddycommon', label: 'सामान्य धान के दर्ज भाव' },
  },
  {
    slug: 'dhan-katai-barish-taiyari', category: 'harvest', crop: 'धान',
    question: 'धान काटना है और बारिश का अनुमान है?',
    description: 'जिले का बुलेटिन पढ़ने, खेत की अलग-अलग स्थिति देखने और मशीन बुलाने से पहले खलिहान तैयार करने की कार्यसूची।',
    scope: 'कटाई की तैयारी · अपने जिले के पूर्वानुमान से मिलाएँ',
    image: '/editorial/dhan-katai-barish.webp', alt: 'पके धान के खेत और बादलों को देखता आश्रय में बैठा किसान; सांकेतिक चित्र',
    includes: ['बुलेटिन की जाँच', 'खलिहान की तैयारी', 'काम की योजना'],
    keywords: 'paddy rain harvest dhan katai barish कटाई बरसात तिरपाल खलिहान',
    next: { href: IMD_URL, label: 'जिला मौसम बुलेटिन', external: true },
  },
  {
    slug: 'pala-sabji-fasal-taiyari', category: 'weather', crop: 'सब्ज़ियाँ',
    question: 'पाले की चेतावनी में सब्ज़ी की तैयारी कैसे करें?',
    description: 'नर्सरी, पानी और लो टनल से जुड़े तैयारी के सवाल पढ़ें। लागू तरीका अपनी फसल और स्थानीय सलाह से तय करें।',
    scope: 'रायपुर और जोधपुर के स्रोतों से सामान्य तैयारी',
    image: '/editorial/pala-sabji-taiyari.webp', alt: 'सब्ज़ी की पत्ती पर पाला और क्यारी पर सहारे वाला लो टनल; सांकेतिक चित्र',
    includes: ['स्थानीय चेतावनी', 'नर्सरी और कवर', 'सुबह की जाँच'],
    keywords: 'frost cold winter vegetable pala sabji ठंड शीतलहर नर्सरी टनल टमाटर गोभी',
    next: { href: IMD_URL, label: 'जिला मौसम बुलेटिन', external: true },
  },
  {
    slug: 'fasal-nuksan-barish-olavrishti-suchna', category: 'weather', crop: 'फसल नुकसान',
    question: 'बारिश या ओले से नुकसान हुआ—क्या रिकॉर्ड रखें?',
    description: 'फोटो, घटना का विवरण और खेप के कागज़ व्यवस्थित करने की गाइड। पात्रता, सूचना का समय और प्रक्रिया संबंधित संस्था से जाँचें।',
    scope: 'दस्तावेज़ की तैयारी · बीमा दावा स्वीकृत होने की गारंटी नहीं',
    image: '/editorial/fasal-nuksan-suchna.webp', alt: 'प्रभावित फसल की फोटो लेता किसान, पास में नोटबुक और दस्तावेज़; सांकेतिक चित्र',
    includes: ['घटना का विवरण', 'फोटो और दस्तावेज़', 'सूचना की तैयारी'],
    keywords: 'damage hail rain insurance claim fasal nuksan ola barish bima नुकसान ओलावृष्टि बीमा मुआवजा गिर गई',
    next: { href: '/blog?category=मौसम%20और%20जोखिम', label: 'मौसम से जुड़े लेख' },
  },
  {
    slug: 'raipur-krishi-mausam-forecast-kaise-padhen', category: 'weather', crop: 'रायपुर · छत्तीसगढ़',
    question: 'मौसम की खबर से खेत का काम कैसे तय करें?',
    description: 'पूर्वानुमान, चेतावनी और कृषि सलाह का फर्क समझें; सूचना का स्थान, जारी समय और वैध अवधि पढ़ने की गाइड।',
    scope: 'रायपुर और छत्तीसगढ़ के उदाहरण · वर्तमान पूर्वानुमान नीचे IMD पर देखें',
    image: '/editorial/raipur-krishi-mausam.webp', alt: 'धान की बालियों के बीच फोन पर धूप, बादल और बारिश के प्रतीक; सांकेतिक चित्र',
    includes: ['पूर्वानुमान का अर्थ', 'जगह और अवधि', 'खेत की डायरी'],
    keywords: 'weather forecast raipur chhattisgarh mausam barish मौसम वर्षा आंधी चेतावनी',
    next: { href: IMD_URL, label: 'अपने जिले की सलाह', external: true },
  },
  {
    slug: 'dhan-ke-baad-rabi-fasal-chhattisgarh', category: 'planning', crop: 'छत्तीसगढ़ · धान के बाद',
    question: 'धान के बाद क्या बोएँ, जब पानी सीमित हो?',
    description: 'खेत की नमी, उपलब्ध सिंचाई और खर्च का विवरण लेकर रबी के विकल्पों पर स्थानीय कृषि केंद्र से चर्चा की तैयारी करें।',
    scope: 'छत्तीसगढ़ की गाइड · हर राज्य की बुवाई सिफारिश नहीं',
    image: '/editorial/dhan-ke-baad-rabi.webp', alt: 'कटे धान का खेत, हरी रबी की कतारें और चना तथा गेहूँ के सांकेतिक पौधे',
    includes: ['खेत की प्रोफाइल', 'पानी और विकल्प', 'KVK से पूछें'],
    keywords: 'rabi paddy gram lentil dhan chana masoor छत्तीसगढ़ चना मसूर रबी अगली फसल पानी सिंचाई',
    next: { href: '/mandi-bhav/chhattisgarh/paddycommon', label: 'छत्तीसगढ़ के सामान्य धान भाव' },
  },
  {
    slug: 'gehun-ki-buvai-sahi-samay-aur-tarika', category: 'planning', crop: 'गेहूँ',
    question: 'गेहूँ की बुवाई से पहले समय, बीज और पानी कैसे जाँचें?',
    description: 'अपने उत्पादन क्षेत्र, किस्म, सिंचाई और बुवाई की परिस्थिति के अनुसार सही सवाल चुनें; स्थानीय तारीख और मात्रा की पुष्टि करें।',
    scope: 'तैयारी की गाइड · स्थानीय किस्म और सलाह के अनुसार',
    image: '/editorial/gehun-buvai.webp', alt: 'हथेली में गेहूँ के बीज और पीछे तैयार खेत की कतारें तथा पानी की नाली; सांकेतिक चित्र',
    includes: ['किस्म का चुनाव', 'बीज की खरीद', 'सिंचाई की तैयारी'],
    keywords: 'wheat sowing seed gehun gehu buvai buwai गेहूं गेहूँ बुवाई बीज सिंचाई',
    next: { href: '/crop/wheat', label: 'गेहूँ के दर्ज भाव' },
  },
  {
    slug: 'tamatar-mandi-dhulai-ke-baad-bachat', category: 'selling', crop: 'टमाटर',
    question: 'दूर की मंडी में भाव अधिक है—भाड़े के बाद क्या बचेगा?',
    description: 'बेचने योग्य वजन, खराबा, वाहन और ट्रिप का खर्च जोड़कर तुलना समझें। लेख का संख्यात्मक उदाहरण काल्पनिक है।',
    scope: 'टमाटर की लागत का उदाहरण · अपने वास्तविक खर्च भरें',
    image: '/editorial/tamatar-mandi-kharch.webp', alt: 'टमाटर के क्रेट, मालवाहक वाहन और दो मंडियों तक जाती सड़क; सांकेतिक चित्र',
    includes: ['बिक्री योग्य वजन', 'भाड़ा और खराबा', 'मंडी की तुलना'],
    keywords: 'tomato transport delivery sale mandi tamatar bhada kharcha ढुलाई भाड़ा किराया टमाटर बेचें बिक्री लागत',
    next: { href: '/delivery-calculator', label: 'डिलीवरी का हिसाब लगाएँ' },
  },
];

const normalize = value => value.normalize('NFKC').toLocaleLowerCase('hi').replace(/\s+/g, ' ').trim();

function ResourceLink({ href, children, className = '' }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={15} aria-hidden="true" /><span className="ks-sr-only"> (नई टैब में खुलेगा)</span></a>;
}

export default function KisanSalahPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const words = normalize(query).split(' ').filter(Boolean);
  const matches = GUIDES.filter(guide => {
    const text = normalize([guide.question, guide.description, guide.crop, guide.scope, guide.keywords, ...guide.includes].join(' '));
    return (category === 'all' || guide.category === category) && words.every(word => text.includes(word));
  });
  const filtered = Boolean(query.trim() || category !== 'all');
  function clearFilters() { setQuery(''); setCategory('all'); }

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

      <section className="ks-guide-section" id="salah-guides" aria-labelledby="guide-heading">
        <div className="ks-section-heading"><div><span className="ks-kicker">आपकी स्थिति, संबंधित गाइड</span><h2 id="guide-heading">अभी किस बात की चिंता है?</h2></div><span className="ks-count">{GUIDES.length} उपलब्ध गाइड</span></div>
        <div className="ks-filters"><label className="ks-search"><span className="ks-sr-only">अपनी फसल या समस्या खोजें</span><Search size={20} aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={160} placeholder="जैसे: भीगा धान, पाला, टमाटर या ढुलाई" aria-controls="salah-results" /></label><div className="ks-filter-options" role="group" aria-label="गाइड का विषय"><SlidersHorizontal size={16} aria-hidden="true" />{CATEGORIES.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div></div>
        <div className="ks-result-bar"><p role="status" aria-live="polite">{filtered ? `${matches.length} संबंधित गाइड मिलीं` : 'प्रकाशित लेखों में से अपनी स्थिति के अनुसार चुनें।'}</p>{filtered && <button type="button" onClick={clearFilters}>फ़िल्टर हटाएँ</button>}</div>
        <div className="ks-grid" id="salah-results">{matches.map(guide => <article className="ks-card" key={guide.slug}>
          <Link className="ks-card-image" to={`/blog/${guide.slug}`} tabIndex={-1} aria-hidden="true"><EditorialImage src={guide.image} alt="" loading="lazy" decoding="async" sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1200px) calc((100vw - 80px) / 2), 556px" /><span>सांकेतिक चित्र</span></Link>
          <div className="ks-card-body"><span className="ks-crop">{guide.crop}</span><h3><Link to={`/blog/${guide.slug}`}>{guide.question}</Link></h3><p>{guide.description}</p><ul className="ks-includes" aria-label="इस गाइड में">{guide.includes.map(item => <li key={item}><Check size={13} aria-hidden="true" />{item}</li>)}</ul><p className="ks-scope"><MapPin size={14} aria-hidden="true" />{guide.scope}</p><div className="ks-card-actions"><Link to={`/blog/${guide.slug}`} aria-label={`${guide.question} — गाइड पढ़ें`}>गाइड पढ़ें <ArrowRight size={16} aria-hidden="true" /></Link>{guide.next.external ? <ResourceLink href={guide.next.href}>{guide.next.label}</ResourceLink> : <Link to={guide.next.href}>{guide.next.label} <ChevronRight size={15} aria-hidden="true" /></Link>}</div></div>
        </article>)}</div>
        {matches.length === 0 && <div className="ks-empty"><Search size={29} aria-hidden="true" /><h3>इस सवाल पर अभी गाइड उपलब्ध नहीं है।</h3><p>फसल का छोटा नाम या दूसरा विषय आज़माएँ। रोग, कीट या पत्ती के लक्षण के लिए नीचे स्थानीय सलाह का रास्ता देखें।</p><button type="button" className="ks-button" onClick={clearFilters}>सभी गाइड देखें</button><a href="#local-help" className="ks-text-link">स्थानीय सहायता देखें <ArrowRight size={16} aria-hidden="true" /></a></div>}
      </section>

      <section id="local-help" className="ks-local" aria-labelledby="local-heading"><div className="ks-section-heading"><div><span className="ks-kicker">जब खेत की स्थिति अलग हो</span><h2 id="local-heading">अपने जिले की सलाह तक पहुँचें।</h2><p>पत्ती पीली पड़ना, दाग, कीड़े या अचानक मुरझाने के लिए अभी हमारी सत्यापित उपचार गाइड उपलब्ध नहीं है। यहाँ तस्वीर से रोग की पहचान या दवा की मात्रा नहीं दी जाती।</p></div></div><div className="ks-local-grid"><article><CloudSun size={26} aria-hidden="true" /><span className="ks-kicker">भारत मौसम विज्ञान विभाग</span><h3>मौसम का स्थानीय संदर्भ</h3><p>IMD का जिला कृषि मौसम बुलेटिन खोलें। अपना जिला, जारी तारीख, वैध अवधि और फसल की अवस्था मिलाएँ।</p><ResourceLink href={IMD_URL}>जिला बुलेटिन · स्थानीय भाषा</ResourceLink></article><article><Sprout size={26} aria-hidden="true" /><span className="ks-kicker">भारतीय कृषि अनुसंधान परिषद</span><h3>कृषि विज्ञान केंद्र खोजें</h3><p>ICAR की राज्यवार सूची में अपना राज्य चुनकर संबंधित कृषि विज्ञान केंद्र का विवरण देखें। संपर्क और उपलब्ध सेवा की केंद्र से पुष्टि करें।</p><ResourceLink href={KVK_URL}>ICAR की KVK सूची खोलें</ResourceLink></article></div><div className="ks-consult"><BookOpen size={22} aria-hidden="true" /><div><h3>बात करने से पहले अपना विवरण तैयार करें</h3><p>जिला और गाँव, फसल और किस्म, बुवाई की तारीख, लक्षण कब दिखे, खेत का कितना हिस्सा प्रभावित है और अब तक किए गए काम लिख लें। अपने सवाल और उपलब्ध तस्वीरें साथ रखें, ताकि स्थानीय कृषि कर्मी को स्थिति समझा सकें।</p></div></div></section>

      <section className="ks-method" aria-labelledby="method-heading"><div><span className="ks-kicker">इन गाइडों का उपयोग</span><h2 id="method-heading">जानकारी का दायरा साफ़ है।</h2><p>यह पृष्ठ सही भाव की उपलब्ध संपादकीय गाइडों को किसान के सवाल से जोड़ता है। हर लेख में स्रोत, लागू क्षेत्र और समीक्षा की तारीख पढ़ें। उदाहरण के खर्च को वास्तविक भाड़ा, पुराने बुलेटिन को आज की चेतावनी या सामान्य तैयारी को हर खेत की सिफारिश न मानें।</p></div><div className="ks-method-note"><strong>स्थानीय स्रोतों की जाँच</strong><time dateTime="2026-10-22">22 अक्टूबर 2026</time><p>ऊपर IMD और ICAR के बाहरी लिंक हैं। केंद्र से बातचीत, फोटो भेजना या बीमा दावा इस पृष्ठ से जमा नहीं होता।</p><Link to="/blog">सभी लेख और भाषाएँ <ArrowRight size={16} aria-hidden="true" /></Link></div></section>
      <footer className="ks-footer"><span>सही भाव · जानकारी से बेहतर तैयारी</span><Link to="/">मंडी भाव देखें <ArrowRight size={16} aria-hidden="true" /></Link></footer>
    </main>
  </div>;
}
