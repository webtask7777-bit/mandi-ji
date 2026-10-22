import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Check, Globe2, Languages, Search, Sprout } from 'lucide-react';
import SEO, { SITE_URL } from '../components/SEO';
import { LANGUAGES, AVAILABLE_LANGUAGES, SEARCH_LANGUAGES, languagePath, getLanguage } from '../../shared/languages.js';
import { useRememberedLanguage, useSuggestedLanguage } from '../hooks/useLanguagePreference';
import { readLanguageNavigation, buildLanguageBlogUrl, localizedToolsUrl } from '../utils/languageNavigation';
import '../styles/language-fonts.css';
import '../styles/language-chooser.css';

export default function LanguagesPage() {
  const [query, setQuery] = useState('');
  const [searchParams] = useSearchParams();
  const context = readLanguageNavigation(searchParams);
  const selection = { state: context.state, crop: context.crop || context.sourceCrop };
  const toolsPath = code => localizedToolsUrl({ ...context, toolLanguage: code, sourceCrop: selection.crop }, code, context.toolSection);
  const saved = useRememberedLanguage();
  const suggested = useSuggestedLanguage();
  const filtered = LANGUAGES.filter(item => `${item.name} ${item.english} ${item.code}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const available = filtered.filter(item => item.status === 'available');
  const pending = filtered.filter(item => item.status !== 'available');
  const current = getLanguage(context.toolLanguage);
  const recommendation = current || saved || suggested;
  const alternates = SEARCH_LANGUAGES.filter(item => item.code.length === 2).map(item => ({language:item.code,path:languagePath(item.code)}));
  return <div className="sb-language-surface sb-language-chooser" lang="hi" dir="ltr">
    <SEO title="अपनी भाषा चुनें — भारत के किसानों के लिए सही भाव" description="अपनी भाषा में दर्ज मंडी भाव खोजें और डिलीवरी खर्च का हिसाब करें। उपलब्ध भारतीय भाषाएँ और अनुवाद की स्थिति देखें।" path="/languages" language="hi" alternates={alternates} xDefaultPath="/languages" structuredData={{'@context':'https://schema.org','@type':'CollectionPage',name:'SahiBhav languages',url:`${SITE_URL}/languages`,inLanguage:['hi','en']}} />
    <a href="#language-options" className="sb-language-directory-skip">भाषा चुनने पर जाएँ / Choose a language</a>
    <header className="sb-language-chooser-header"><Link to="/" className="sb-language-wordmark" aria-label="सही भाव होम"><Sprout size={27} aria-hidden="true" />SahiBhav</Link><Link to="/">हिन्दी डैशबोर्ड <ArrowUpRight size={16} aria-hidden="true" /></Link></header>
    <main className="sb-language-chooser-main">
      <section className="sb-language-chooser-hero"><span className="sb-language-kicker"><Globe2 size={16} aria-hidden="true" /> भारत के किसानों के लिए · Free farmer tools</span><h1>अपनी भाषा में<br /><em>सही भाव।</em></h1><p lang="en">Choose your language. Check dated mandi prices and calculate delivery costs.</p><p>राज्य चुनें, फसल के दर्ज भाव देखें और माल लाने का खर्च निकालें।</p><div className="sb-language-coverage"><span><Check size={15} />{AVAILABLE_LANGUAGES.length} भाषा interfaces उपलब्ध</span><span>{LANGUAGES.length - AVAILABLE_LANGUAGES.length} अनुवाद बाकी</span><span>सभी सुविधाएँ मुफ़्त</span></div>
      {recommendation && <Link className="sb-language-recommendation" to={toolsPath(recommendation.code)}><span>{current ? 'अभी चुनी हुई भाषा' : saved ? 'आपकी सहेजी भाषा' : 'आपके ब्राउज़र की भाषा'}</span><strong lang={recommendation.code} dir={recommendation.dir}>{recommendation.name}</strong><ArrowUpRight size={19} aria-hidden="true" /></Link>}
      </section>
      <section id="language-options" aria-labelledby="language-title"><div className="sb-language-section-head"><div><span className="sb-language-kicker"><Languages size={17} aria-hidden="true" /> Select your language</span><h2 id="language-title">भाषा चुनें</h2></div><label className="sb-language-directory-search"><Search size={18} aria-hidden="true" /><span className="sr-only">भाषा खोजें / Search languages</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="हिन्दी, Tamil, বাংলা…" /></label></div>
      <div className="sb-language-options">{available.map(item => <Link key={item.code} className={`sb-language-option sb-language-script-${item.script}`} to={toolsPath(item.code)} hrefLang={item.code}><span className="sb-language-option-native" lang={item.code} dir={item.dir}>{item.name}</span><span className="sb-language-option-english" lang="en">{item.english}</span><span className={`sb-language-option-status ${item.searchReady ? '' : 'is-preview'}`}>{item.searchReady ? 'मंडी भाव + डिलीवरी हिसाब' : 'Preview · भाषा जाँच बाकी'}</span><ArrowUpRight size={20} aria-hidden="true" /></Link>)}</div>
      {pending.length > 0 && <div className="sb-language-pending"><h3>अगली भाषाएँ · Translation pending</h3><p>इन भाषाओं का पूरा अनुवाद और स्थानीय भाषा की जाँच बाकी है। अभी इन्हें उपलब्ध अनुवाद नहीं दिखाया गया है।</p><div>{pending.map(item => <span key={item.code} className={`sb-language-pending-item sb-language-script-${item.script}`}><strong lang={item.code} dir={item.dir}>{item.name}</strong><span lang="en">{item.english}</span></span>)}</div></div>}
      {!filtered.length && <p role="status">यह भाषा नहीं मिली / No matching language.</p>}
      </section>
      <aside className="sb-language-coverage-note"><h2>कौन-सी जानकारी अपनी भाषा में मिलेगी?</h2><p>इन pages पर भाव खोज, तारीख की जानकारी और delivery हिसाब का interface अनूदित है। सरकारी स्रोतों के मंडी, राज्य और कुछ फसल नाम मूल रूप में रहेंगे। हर लेख पर उसकी उपलब्ध भाषाएँ दी गई हैं। पूरी पुरानी app और हर लेख का अनुवाद अभी पूरा नहीं है।</p><p lang="en">Language previews are marked clearly. Help improve terminology through <Link to="/contact">contact and feedback</Link>. Language selection never changes prices, units or calculation rules.</p></aside>
    </main><footer className="sb-language-chooser-footer"><span>SahiBhav · फसल आपकी। फैसला आपका।</span><Link to={buildLanguageBlogUrl('hi', { ...context, sourceCrop: selection.crop })}>खेती की मार्गदर्शिकाएँ</Link><Link to="/contact">भाषा सुधार भेजें / Feedback</Link></footer>
  </div>;
}
