import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Globe2, Languages, MapPin, Phone, Search, ShieldCheck, Sprout, Truck } from 'lucide-react';
import SEO, { SITE_URL } from '../components/SEO';
import Brand from '../components/Brand';
import { LANGUAGES, AVAILABLE_LANGUAGES, SEARCH_LANGUAGES, languagePath, getLanguage } from '../../shared/languages.js';
import { getIndiaRegion } from '../../shared/indiaRegions.js';
import cropNamesHi from '../i18n/locales/hi.crops.json';
import { useRememberedLanguage, useSuggestedLanguage } from '../hooks/useLanguagePreference';
import { hasContact } from '../data/contact';
import { readLanguageNavigation, buildLanguageBlogUrl, localizedToolsUrl } from '../utils/languageNavigation';
import '../styles/language-fonts.css';
import '../styles/language-chooser.css';

const LETTERS = { hi: 'अ', en: 'A', as: 'অ', bn: 'অ', gu: 'અ', kn: 'ಅ', ks: 'ک', mai: 'अ', ml: 'അ', mr: 'अ', ne: 'अ', or: 'ଅ', pa: 'ਅ', sa: 'अ', sd: 'س', ta: 'அ', te: 'అ', ur: 'ا' };

function LanguageArtwork({ name, className = '', hero = false }) {
  const src = `/visuals/${name}.webp`;
  return <img className={className} src={src} srcSet={`/visuals/${name}-640.webp 640w, /visuals/${name}-960.webp 960w, ${src} 1600w`} sizes={hero ? '(max-width: 760px) calc(100vw - 32px), 560px' : '(max-width: 650px) calc(100vw - 32px), 370px'} width="1600" height="900" alt="" aria-hidden="true" loading={hero ? 'eager' : 'lazy'} fetchPriority={hero ? 'high' : 'auto'} decoding="async" onError={event => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = 'true'; event.currentTarget.removeAttribute('srcset'); event.currentTarget.src = '/visuals/hero-harvest.webp'; } }} />;
}

export default function LanguagesPage() {
  const [query, setQuery] = useState('');
  const [searchParams] = useSearchParams();
  const context = readLanguageNavigation(searchParams);
  const selection = { state: context.state, crop: context.crop || context.sourceCrop };
  const navContext = { ...context, sourceCrop: selection.crop };
  const toolsPath = (code, section = context.toolSection) => localizedToolsUrl({ ...navContext, toolLanguage: code }, code, section);
  const saved = useRememberedLanguage();
  const suggested = useSuggestedLanguage();
  const searchTerm = query.trim().normalize('NFKC').toLocaleLowerCase();
  const filtered = LANGUAGES.filter(item => `${item.name} ${item.english} ${item.code}`.normalize('NFKC').toLocaleLowerCase().includes(searchTerm));
  const available = filtered.filter(item => item.status === 'available');
  const pending = filtered.filter(item => item.status !== 'available');
  const current = getLanguage(context.toolLanguage);
  const recommendation = current || saved || suggested || getLanguage('hi');
  const recommendationLabel = current ? 'अभी चुनी हुई भाषा' : saved ? 'आपकी सहेजी भाषा' : suggested ? 'आपके ब्राउज़र की भाषा' : 'यहाँ से शुरू करें';
  const state = getIndiaRegion(selection.state);
  const cropName = Object.hasOwn(cropNamesHi, selection.crop) ? cropNamesHi[selection.crop] : '';
  const previewCount = AVAILABLE_LANGUAGES.filter(item => !item.searchReady).length;
  const guidePath = buildLanguageBlogUrl(recommendation.code, navContext);
  const alternates = SEARCH_LANGUAGES.filter(item => item.code.length === 2).map(item => ({ language: item.code, path: languagePath(item.code) }));
  const resources = [
    { name: 'mandi-market-v1', icon: Sprout, title: 'अपनी फसल का भाव', text: 'दर्ज तारीख के साथ भाव देखें और उपलब्ध रिकॉर्ड समझें।', link: toolsPath(recommendation.code, 'prices'), action: 'मंडी भाव देखें', number: '01' },
    { name: 'farm-delivery-v1', icon: Truck, title: 'पहुँचने तक का खर्च', text: 'दूरी, वाहन और माल की मात्रा जोड़कर ढुलाई का हिसाब करें।', link: toolsPath(recommendation.code, 'delivery'), action: 'खर्च निकालें', number: '02' },
    { name: 'farm-journal-v1', icon: BookOpen, title: 'खेती की काम की बात', text: 'कटाई, मौसम और बिक्री की तैयारी पर स्रोतों के साथ गाइड पढ़ें।', link: guidePath, action: 'उपलब्ध गाइड पढ़ें', number: '03' },
    { name: 'language-farmers-v1', icon: Phone, title: 'फसल सलाह (हिंदी)', text: 'आपके ज़िले में इस महीने कौन-से कीट-रोग आम हैं और किसान कॉल सेंटर ने क्या सलाह दी।', link: selection.state ? `/fasal-salah/${selection.state}` : '/fasal-salah', action: 'फसल सलाह देखें', number: '04' },
  ];

  return <div className="sb-language-surface sb-language-chooser" lang="hi" dir="ltr">
    <SEO title="अपनी भाषा चुनें — भारत के किसानों के लिए सही भाव" description="अपनी भाषा में दर्ज मंडी भाव खोजें और डिलीवरी खर्च का हिसाब करें। उपलब्ध भारतीय भाषाएँ और अनुवाद की स्थिति देखें।" path="/languages" language="hi" image="/visuals/language-farmers-v1.webp" imageAlt="सही भाव — अपनी भाषा में खेती और मंडी की जानकारी" alternates={alternates} xDefaultPath="/languages" structuredData={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'SahiBhav languages', url: `${SITE_URL}/languages`, inLanguage: ['hi', 'en'] }} />
    <a href="#language-options" className="sb-language-directory-skip">भाषा चुनने पर जाएँ / Choose a language</a>
    <header className="sb-language-chooser-header">
      <Link to={toolsPath('hi', 'prices')} className="sb-language-wordmark" aria-label="सही भाव होम"><Brand /></Link>
      <nav aria-label="मुख्य लिंक"><span className="sb-language-chooser-free"><span />सभी सुविधाएँ मुफ़्त</span><Link to={toolsPath('hi', 'prices')}>मंडी भाव <ArrowUpRight size={16} aria-hidden="true" /></Link></nav>
    </header>
    <main className="sb-language-chooser-main">
      <section className="sb-language-chooser-hero" aria-labelledby="language-hero-title">
        <div className="sb-language-chooser-copy">
          <span className="sb-language-kicker"><Globe2 size={16} aria-hidden="true" /> अपनी बोली। अपना भरोसा।</span>
          <h1 id="language-hero-title">भाषा आपकी।<br /><em>सही भाव आपका।</em></h1>
          <p className="sb-language-hero-description">खेत से मंडी तक की जानकारी अब अपनी भाषा में। फसल के दर्ज भाव देखें, ढुलाई का खर्च समझें और तैयारी के साथ आगे बढ़ें।</p>
          <p className="sb-language-hero-english" lang="en">Choose your language. Keep your crop and state.</p>
          <div className="sb-language-hero-actions"><Link className="sb-language-recommendation" to={toolsPath(recommendation.code)}><span><small>{recommendationLabel}</small><strong><bdi lang={recommendation.code} dir={recommendation.dir}>{recommendation.name}</bdi> में आगे बढ़ें</strong></span><ArrowRight size={20} aria-hidden="true" /></Link><a className="sb-language-all-link" href="#language-options">सभी भाषाएँ <ChevronDown size={17} aria-hidden="true" /></a></div>
          {(selection.state && selection.state !== 'all' || selection.crop) && <div className="sb-language-selection" aria-label="आपका चुना हुआ राज्य और फसल"><small>आपका चयन साथ रहेगा</small><div>{selection.state && selection.state !== 'all' && <span><MapPin size={15} aria-hidden="true" />{state?.nameHi || <bdi lang="en">{selection.state}</bdi>}</span>}{selection.crop && <span><Sprout size={15} aria-hidden="true" />{cropName || <>फसल ID: <bdi lang="en">{selection.crop}</bdi></>}</span>}</div></div>}
        </div>
        <div className="sb-language-hero-visual">
          <div className="sb-language-photo"><LanguageArtwork name="language-farmers-v1" hero /><span className="sb-language-photo-note">सांकेतिक AI चित्र</span><div className="sb-language-photo-caption"><span>फसल आपकी। फैसला आपका।</span><strong>जानकारी, जो अपनी लगे।</strong></div></div>
          <span className="sb-language-script-chip sb-language-script-chip--one" lang="pa">ਪੰਜਾਬੀ <Check size={13} aria-hidden="true" /></span><span className="sb-language-script-chip sb-language-script-chip--two" lang="ta">தமிழ்</span><span className="sb-language-script-chip sb-language-script-chip--three" lang="hi">हिन्दी <Check size={13} aria-hidden="true" /></span>
          <span className="sb-language-visual-seal" aria-hidden="true"><Languages size={25} /><small>अपनी भाषा<br />में साथ</small></span>
        </div>
      </section>
      <div className="sb-language-coverage" aria-label="भाषाओं की उपलब्धता"><div><Languages size={21} aria-hidden="true" /><span><strong>{SEARCH_LANGUAGES.length}</strong> भाषाओं में भाव व हिसाब</span></div><div><Globe2 size={21} aria-hidden="true" /><span><strong>{previewCount}</strong> भाषा प्रीव्यू · जाँच बाकी</span></div><div><BookOpen size={21} aria-hidden="true" /><span><strong>{LANGUAGES.length - AVAILABLE_LANGUAGES.length}</strong> भाषाओं का अनुवाद बाकी</span></div><p>भाषा बदलेगी।<br /><b>भाव और हिसाब वही रहेंगे।</b></p></div>

      <section id="language-options" className="sb-language-directory" aria-labelledby="language-title">
        <div className="sb-language-section-head"><div><span className="sb-language-kicker">अपनी भाषा, बस एक चयन</span><h2 id="language-title">आप किस भाषा में पढ़ेंगे?</h2><p lang="en">Select a language to continue.</p></div><label className="sb-language-directory-search"><Search size={19} aria-hidden="true" /><span className="sr-only">भाषा खोजें / Search languages</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="हिन्दी, Tamil, বাংলা…" /></label></div>
        <div className="sb-language-options">{available.map((item, index) => <Link key={item.code} className={`sb-language-option sb-language-script-${item.script} sb-language-option--tone-${index % 4} ${current?.code === item.code ? 'is-selected' : ''}`} to={toolsPath(item.code)} hrefLang={item.code}><span className="sb-language-letter" lang={item.code} dir={item.dir} aria-hidden="true">{LETTERS[item.code] || item.code}</span>{current?.code === item.code ? <span className="sb-language-selected-tag"><Check size={12} aria-hidden="true" />चुनी हुई</span> : <ArrowUpRight className="sb-language-option-arrow" size={18} aria-hidden="true" />}<span className="sb-language-option-native" lang={item.code} dir={item.dir}>{item.name}</span><span className="sb-language-option-english" lang="en">{item.english}</span><span className={`sb-language-option-status ${item.searchReady ? '' : 'is-preview'}`}><span />{item.searchReady ? 'मंडी भाव + डिलीवरी हिसाब' : 'Preview · भाषा जाँच बाकी'}</span></Link>)}</div>
        {!filtered.length && <div className="sb-language-no-results" role="status"><Search size={26} aria-hidden="true" /><h3>यह भाषा नहीं मिली</h3><p lang="en">Try the native name, English name or language code.</p><button type="button" onClick={() => setQuery('')}>सभी भाषाएँ देखें <ArrowRight size={16} aria-hidden="true" /></button></div>}
        {pending.length > 0 && <div className="sb-language-pending"><div><span className="sb-language-kicker">आगे की तैयारी</span><h3>इन भाषाओं में भी मिलेंगे।</h3><p>अनुवाद और स्थानीय भाषा की जाँच बाकी है। ये विकल्प अभी खुलेंगे नहीं।</p></div><div className="sb-language-pending-list">{pending.map(item => <span key={item.code} className={`sb-language-pending-item sb-language-script-${item.script}`}><strong lang={item.code} dir={item.dir}>{item.name}</strong><span lang="en">{item.english}</span></span>)}</div></div>}
      </section>

      <section className="sb-language-resources" aria-labelledby="language-resources-title"><div className="sb-language-section-head"><div><span className="sb-language-kicker">मंडी से आगे, आपके काम की बात</span><h2 id="language-resources-title">अगला कदम, समझकर।</h2></div><span className="sb-language-resource-note">आपके राज्य और फसल के चयन के साथ</span></div><div className="sb-language-resource-grid">{resources.map(({ name, icon: Icon, title, text, link, action, number }) => <Link className="sb-language-resource-card" key={name} to={link}><div className="sb-language-resource-art"><LanguageArtwork name={name} /><span className="sb-language-resource-number">{number}</span><span className="sb-language-resource-icon"><Icon size={20} aria-hidden="true" /></span></div><div className="sb-language-resource-copy"><h3>{title}</h3><p>{text}</p><span>{action}<ArrowUpRight size={18} aria-hidden="true" /></span></div></Link>)}</div><small className="sb-language-art-note">बैनर सांकेतिक AI चित्र हैं। गाइड केवल उनकी उपलब्ध भाषाओं में मिलेंगी।</small></section>
      <aside className="sb-language-coverage-note"><span className="sb-language-note-icon"><ShieldCheck size={27} aria-hidden="true" /></span><div><h2>अपनी भाषा में जानकारी। समझकर फैसला।</h2><p>भाव खोज, तारीख की जानकारी और डिलीवरी हिसाब का इंटरफ़ेस अनूदित है। सरकारी स्रोतों के मंडी, राज्य और कुछ फसल नाम मूल रूप में रहेंगे। हर लेख की उपलब्ध भाषा अलग हो सकती है; पूरी app और हर लेख का अनुवाद अभी पूरा नहीं है।</p>{/* Only offered once a monitored contact channel exists (src/data/contact.js). */}{hasContact() && <Link to="/contact">किसी शब्द में सुधार सुझाएँ <ArrowUpRight size={16} aria-hidden="true" /></Link>}</div></aside>
    </main>
    <footer className="sb-language-chooser-footer"><span>सही भाव · फसल आपकी। फैसला आपका।</span><div><Link to={guidePath}>खेती की मार्गदर्शिकाएँ</Link>{hasContact() && <Link to="/contact">संपर्क और सुझाव</Link>}<Link to="/editorial-policy">संपादकीय नीति</Link></div></footer>
  </div>;
}
