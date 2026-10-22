import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Info, MapPin, ShieldCheck, Truck } from 'lucide-react';
import Brand from '../components/Brand';
import SEO, { SITE_URL } from '../components/SEO';
import CalendarActivityIcon from '../components/CalendarActivityIcon';
import LocalWeatherLinks from '../components/LocalWeatherLinks';
import CalendarTab from '../tabs/CalendarTab';
import { useStateContext } from '../context/StateContext';
import { useApi } from '../hooks/useApi';
import { INDIA_REGIONS, getIndiaRegion, normalizeRegionId } from '../../shared/indiaRegions';
import { getCalendarCrops, getIndiaMonth, MONTH_NAMES } from '../utils/cropCalendar';
import { cropDetailPath } from '../utils/cropUrls';
import '../styles/kisan-calendar-page.css';

const PHASE_EXPLANATIONS = [
  { type: 'sowing', title: 'बुवाई की तैयारी', text: 'सूची में बुवाई का सामान्य महीना। खेत, पानी और किस्म के अनुसार स्थानीय समय की पुष्टि करें।' },
  { type: 'growing', title: 'फसल की देखभाल', text: 'सूची में बढ़वार का चरण। यह किसी खास सिंचाई, खाद या उपचार की तारीख नहीं बताता।' },
  { type: 'harvest', title: 'कटाई का समय', text: 'कटाई का सामान्य दौर। अपनी फसल की वास्तविक अवस्था और मौसम देखकर काम तय करें।' },
  { type: 'arrival', title: 'मंडी की मुख्य आवक', text: 'मंडी में आवक का सामान्य दौर। इसे आज की वास्तविक आवक, भाव या बिक्री की गारंटी न समझें।' },
];

const RELATED_GUIDES = [
  { slug: 'gehun-ki-buvai-sahi-samay-aur-tarika', label: 'गेहूँ की तैयारी', title: 'बुवाई से पहले पानी, किस्म और स्थानीय समय समझें', type: 'sowing' },
  { slug: 'dhan-katai-barish-taiyari', label: 'धान की कटाई', title: 'बारिश के अनुमान के साथ कटाई की तैयारी करें', type: 'harvest' },
  { slug: 'bheega-dhan-sukhana-nami-bhandaran', label: 'कटाई के बाद', title: 'भीगे धान की नमी, सुखाने और भंडारण की तैयारी', type: 'arrival' },
];

export default function KisanCalendarPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stateParam: contextState } = useStateContext();
  const stateParam = normalizeRegionId(contextState);
  const state = getIndiaRegion(stateParam);
  const stateName = state?.nameHi || 'भारत';
  const requestedState = searchParams.get('state');
  const invalidState = requestedState && requestedState !== 'all' && !getIndiaRegion(requestedState);
  const requestedMonth = searchParams.get('calendarMonth');
  const month = /^(?:[1-9]|1[0-2])$/.test(requestedMonth || '') ? Number(requestedMonth) - 1 : getIndiaMonth();
  const { data, loading, error } = useApi(`/crops?state=${encodeURIComponent(stateParam)}`);
  const crops = Array.isArray(data) ? data : [];
  const calendarCount = getCalendarCrops(crops).length;
  const marketPath = state ? `/mandi-bhav/${state.id}` : '/';
  const guideParams = new URLSearchParams({ toolLanguage: 'hi' });
  if (state) guideParams.set('state', state.id);
  const guidePath = slug => `/blog/${slug}?${guideParams}`;
  const libraryPath = state ? `/blog?state=${encodeURIComponent(state.id)}` : '/blog';

  function chooseState(value) {
    const nextState = getIndiaRegion(value);
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (nextState) next.set('state', nextState.id); else next.delete('state');
      if (!/^(?:[1-9]|1[0-2])$/.test(next.get('calendarMonth') || '')) next.delete('calendarMonth');
      return next;
    }, { replace: true });
  }

  return <div className="kcp-page" lang="hi">
    <SEO title="किसान कैलेंडर — महीनेवार बुवाई, कटाई और मंडी आवक" description="महीना चुनकर उपलब्ध फसलों की बुवाई, बढ़वार, कटाई और मुख्य आवक का सामान्य कैलेंडर देखें। राज्य की फसल सूची, तैयारी की चेकलिस्ट और स्थानीय मौसम सलाह के लिंक।" path="/kisan-calendar" image="/visuals/hero-harvest.webp" imageAlt="सही भाव किसान कैलेंडर — खेत से मंडी तक की तैयारी" language="hi" structuredData={{ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': `${SITE_URL}/kisan-calendar#page`, url: `${SITE_URL}/kisan-calendar`, name: 'किसान कैलेंडर — महीनेवार बुवाई, कटाई और मंडी आवक', inLanguage: 'hi', description: 'उपलब्ध सामान्य फसल चक्र; जिले या किस्म की निश्चित खेती तारीखों का दावा नहीं।' }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'सही भाव', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'किसान कैलेंडर', item: `${SITE_URL}/kisan-calendar` }] }] }} />
    <a className="kcp-skip" href="#calendar-content">कैलेंडर पर जाएँ</a>
    <header className="kcp-header"><Link to={marketPath} aria-label="सही भाव होम"><Brand /></Link><nav aria-label="मुख्य लिंक"><Link to={libraryPath}>किसान गाइड</Link><Link to={marketPath}>मंडी भाव <ArrowUpRight size={16} aria-hidden="true" /></Link></nav></header>
    <main className="kcp-main">
      <nav className="kcp-breadcrumb" aria-label="पृष्ठ पथ"><Link to={marketPath}>सही भाव</Link><span aria-hidden="true">/</span><span aria-current="page">किसान कैलेंडर</span></nav>
      <section className="kcp-intro" aria-labelledby="calendar-page-title"><div><span className="kcp-eyebrow"><CalendarDays size={17} aria-hidden="true" />महीनेवार खेत से मंडी तक</span><h1 id="calendar-page-title">किसान कैलेंडर</h1><p>बुवाई, फसल की देखभाल, कटाई और मंडी की मुख्य आवक का सामान्य क्रम समझें। महीना बदलें, अपनी फसल खोजें और अगले काम की तैयारी करें।</p><div className="kcp-intro-links"><a href="#calendar-content">कैलेंडर खोलें <ArrowRight size={15} aria-hidden="true" /></a><a href="#calendar-method">जानकारी का आधार समझें</a></div></div><div className="kcp-scope-card"><label htmlFor="calendar-state"><MapPin size={16} aria-hidden="true" />किस राज्य की फसल सूची?</label><select id="calendar-state" value={state?.id || 'all'} onChange={event => chooseState(event.target.value)}><option value="all">भारत · सभी उपलब्ध फसलें</option>{INDIA_REGIONS.map(region => <option key={region.id} value={region.id}>{region.nameHi}</option>)}</select><p><b>{MONTH_NAMES[month]}</b> · {stateName}{!loading && !error && <span> · {calendarCount} फसलों का कैलेंडर</span>}</p><small>राज्य बदलने से सूची बदलती है; स्थानीय बुवाई की तारीख निश्चित नहीं होती।</small></div></section>
      {invalidState && <p className="kcp-query-note" role="status"><Info size={16} aria-hidden="true" />लिंक का राज्य पहचाना नहीं गया। अभी भारत की उपलब्ध फसल सूची दिखाई गई है।</p>}
      <div id="calendar-content" className="kcp-calendar-content"><CalendarTab crops={crops} loading={loading} error={error} stateName={stateName} stateParam={stateParam} onCropClick={cropId => navigate(cropDetailPath(cropId, stateParam))} /></div>

      <section className="kcp-explainer" aria-labelledby="calendar-reading-title"><div className="kcp-section-heading"><span className="kcp-eyebrow">चार चरण, चार अलग बातें</span><h2 id="calendar-reading-title">कैलेंडर को कैसे पढ़ें?</h2><p>एक फसल के कई चरण एक ही महीने में दिख सकते हैं। चरणों की गिनती को जोड़कर कुल अलग फसलों की संख्या न मानें।</p></div><div className="kcp-phase-explanations">{PHASE_EXPLANATIONS.map(phase => <article key={phase.type}><CalendarActivityIcon type={phase.type} size={58} /><h3>{phase.title}</h3><p>{phase.text}</p></article>)}</div></section>

      <section id="calendar-method" className="kcp-method" aria-labelledby="calendar-method-title"><div className="kcp-method-heading"><ShieldCheck size={27} aria-hidden="true" /><div><span className="kcp-eyebrow">आधार और सीमाएँ</span><h2 id="calendar-method-title">सामान्य योजना, स्थानीय पुष्टि के साथ।</h2></div></div><div className="kcp-method-columns"><div><h3>यहाँ क्या दिखता है?</h3><p>सही भाव में संग्रहीत सामान्य महीनेवार फसल चक्र दिखते हैं। केवल वही फसलें शामिल होती हैं जिनकी उपयुक्त कैलेंडर जानकारी उपलब्ध है। महीना अपने-आप भारत के समय के अनुसार चुना जाता है; आप कोई दूसरा महीना भी देख सकते हैं।</p><p>“—” या खाली गतिविधि का मतलब जानकारी उपलब्ध नहीं है। इससे यह निष्कर्ष न निकालें कि उस महीने खेती या कारोबार नहीं होता। तैयार चावल जैसे प्रसंस्कृत उत्पाद को धान की खेती का कैलेंडर नहीं दिया गया है।</p></div><div><h3>किस बात की पुष्टि बाकी है?</h3><p>इस महीनेवार सूची में जिले और किस्म के अनुसार सत्यापित स्रोत अभी संलग्न नहीं हैं। इसे IMD या किसी कृषि संस्थान का आपके खेत के लिए जारी स्थानीय कैलेंडर न समझें। राज्य की सूची में दिखना उस समय को पूरे राज्य के लिए प्रमाणित नहीं करता।</p><p>बारिश, सिंचाई, किस्म और वास्तविक फसल अवस्था के अनुसार स्थानीय कृषि केंद्र से समय मिलाएँ। नीचे दिए IMD लिंक स्थानीय सलाह जाँचने के लिए हैं; वे इस सामान्य कैलेंडर के महीनों का स्रोत होने का दावा नहीं हैं।</p></div></div><div className="kcp-method-foot"><Info size={16} aria-hidden="true" /><p>तैयारी के निशान केवल इसी ब्राउज़र में सेव होते हैं। कोई मौसम चेतावनी या रिमाइंडर अपने-आप नहीं भेजा जाता।</p><Link to="/contact">सुधार सुझाएँ <ArrowUpRight size={15} aria-hidden="true" /></Link></div></section>
      <LocalWeatherLinks language="hi" />

      <section className="kcp-guides" aria-labelledby="calendar-guides-title"><div className="kcp-section-heading kcp-section-heading--links"><div><span className="kcp-eyebrow"><BookOpen size={16} aria-hidden="true" />अगली तैयारी के लिए</span><h2 id="calendar-guides-title">महीने के साथ, काम की समझ भी।</h2></div><Link to={libraryPath}>सभी गाइड <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="kcp-guide-grid">{RELATED_GUIDES.map(guide => <Link className="kcp-guide-card" key={guide.slug} to={guidePath(guide.slug)}><CalendarActivityIcon type={guide.type} size={65} /><span>{guide.label}</span><h3>{guide.title}</h3><strong>स्रोतों के साथ पढ़ें <ArrowUpRight size={16} aria-hidden="true" /></strong></Link>)}</div></section>
      <section className="kcp-delivery"><span className="kcp-delivery-icon"><Truck size={31} aria-hidden="true" /></span><div><span className="kcp-eyebrow">कटाई के बाद, बिक्री की तैयारी</span><h2>भाव के साथ ढुलाई भी जोड़ें।</h2><p>मंडी भेजने से पहले वाहन, दूरी, माल की मात्रा और बाकी खर्च का अनुमान बनाएँ।</p></div><Link to="/delivery-calculator">डिलीवरी खर्च निकालें <ArrowUpRight size={18} aria-hidden="true" /></Link></section>
    </main>
    <footer className="kcp-footer"><span>सही भाव · फसल आपकी। फैसला आपका।</span><div><Link to="/data-status">भाव के डेटा की जानकारी</Link><Link to="/contact">संपर्क और सुझाव</Link></div></footer>
  </div>;
}
