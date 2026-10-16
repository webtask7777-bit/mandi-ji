import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Globe2, MapPin, Search, ShieldCheck, Sprout, Truck } from 'lucide-react';
import { AVAILABLE_LANGUAGES, getLanguage, languagePath, LANGUAGE_STORAGE_KEY } from '../../shared/languages';
import { useRememberedLanguage } from '../hooks/useLanguagePreference';
import { getLanguageCopy, localizedCropName, formatLanguageNumber, formatLanguageDate } from '../i18n';
import { useApi } from '../hooks/useApi';
import SEO from '../components/SEO';
import NotFoundPage from './NotFoundPage';
import CropImage from '../components/CropImage';
import { cropDetailPath } from '../utils/cropUrls';
import { buildLanguageToolsUrl, calculateDeliveryEstimate, latestPriceRecord } from '../utils/languageTools';
import '../styles/languages.css';
import '../styles/language-fonts.css';

const EMPTY_FORM = { vehicle: 'smallVehicle', capacity: '', distance: '', rate: '', weight: '', extra: '', roundTrip: false };
const VEHICLES = ['smallVehicle', 'mediumVehicle', 'largeVehicle'];
const GUIDE_LINKS = [
  { code: 'hi', key: 'hindiGuides', path: '/blog?language=hi' },
  { code: 'mr', key: 'marathiGuides', path: '/blog/tamatar-vikri-vahatuk-kharch-marathi' },
  { code: 'gu', key: 'gujaratiGuides', path: '/blog/tameta-vechan-parivahan-kharch-gujarati' },
];

function LanguageTools({ language, copy: t }) {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedState = query.get('state') || 'all';
  const requestedCrop = query.get('crop');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  // The saved choice survives a reload: read it back instead of starting as "not saved".
  const savedLanguage = useRememberedLanguage();
  const [rememberedNow, setRemembered] = useState(false);
  const remembered = rememberedNow || savedLanguage?.code === language.code;
  const [form, setForm] = useState(EMPTY_FORM);
  const [calculation, setCalculation] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const statesRequest = useApi('/states');
  const states = useMemo(() => (Array.isArray(statesRequest.data) ? statesRequest.data : []).filter(state => state.id && state.name), [statesRequest.data]);
  const selectedState = requestedState === 'all' ? 'all' : states.some(state => state.id === requestedState) ? requestedState : null;
  const currentState = states.find(state => state.id === selectedState);
  const scopeAvailable = selectedState === 'all' || Boolean(currentState && currentState.hasData !== false && Number(currentState.totalRecords) > 0);
  const cropsRequest = useApi(scopeAvailable ? `/crops?state=${encodeURIComponent(selectedState)}` : null);
  const crops = useMemo(() => Array.isArray(cropsRequest.data) ? cropsRequest.data : [], [cropsRequest.data]);
  const selectedCrop = requestedCrop ? crops.find(crop => crop.id === requestedCrop) || null : crops.find(crop => crop.id === 'wheat') || crops[0] || null;
  const priceRequest = useApi(selectedCrop && selectedState ? `/prices/${encodeURIComponent(selectedCrop.id)}?state=${encodeURIComponent(selectedState)}&months=13` : null);
  const record = latestPriceRecord(priceRequest.data);
  const sourceName = selectedCrop?.name || selectedCrop?.nameEn || selectedCrop?.id;
  const cropName = selectedCrop ? localizedCropName(selectedCrop, language.code) : '';
  const number = (value, options = {}) => formatLanguageNumber(value, language.code, { maximumFractionDigits: 2, ...options });
  const currency = value => number(value, { style: 'currency', currency: 'INR' });
  const filteredCrops = useMemo(() => {
    const term = search.trim().normalize('NFKC').toLocaleLowerCase();
    return crops.filter(crop => [localizedCropName(crop, language.code), crop.name, crop.nameEn, crop.nameHi, crop.id].filter(Boolean).some(name => String(name).normalize('NFKC').toLocaleLowerCase().includes(term)));
  }, [search, crops, language.code]);

  const setSelection = (state, crop) => {
    setVisibleCount(12);
    navigate(buildLanguageToolsUrl(language.code, { state, crop }), { replace: true });
  };
  const switchLanguage = code => {
    setRemembered(false);
    navigate(buildLanguageToolsUrl(code, { state: selectedState || requestedState, crop: selectedCrop?.id || requestedCrop }));
  };
  const rememberLanguage = () => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language.code);
      setRemembered(true);
    } catch { setRemembered(false); }
  };
  const changeForm = (key, value) => {
    // Choosing a vehicle only labels the trip; it never erases capacity or rate already entered.
    setForm(previous => ({ ...previous, [key]: value }));
    setCalculation(null);
    setInvalid(false);
  };
  const calculate = event => {
    event.preventDefault();
    const result = calculateDeliveryEstimate(form);
    setInvalid(!result.valid);
    setCalculation(result.valid ? result : null);
  };
  const retry = () => window.location.reload();
  const unavailable = statesRequest.error || cropsRequest.error;
  const loadingCrops = statesRequest.loading || cropsRequest.loading;
  const recordDate = record ? formatLanguageDate(record.date, language.code, record.basis === 'monthly' ? { year: 'numeric', month: 'long', day: undefined } : {}) : '';

  return <div className={`sb-language-page sb-language-surface sb-language-script-${language.script}`} lang={language.code} dir={language.dir}>
    <SEO title={t.title} description={t.description} path={languagePath(language.code)} language={language.code} noIndex={language.searchReady === false}
      image="/visuals/hero-harvest.webp" imageAlt={t.title}
      alternates={AVAILABLE_LANGUAGES.filter(item => item.code.length === 2 && item.searchReady !== false).map(item => ({ language: item.code, path: languagePath(item.code) }))} xDefaultPath="/languages" />
    <a className="sb-language-skip" href="#language-tools">{t.skip}</a>
    <header className="sb-language-header">
      <div className="sb-language-header-inner">
        <Link to="/languages" className="sb-language-brand" aria-label="SahiBhav"><img src="/brand/app-icon.svg" alt="" width="40" height="40" /><span lang="en" dir="ltr">SahiBhav<span className="sb-language-brand-dot">.</span></span></Link>
        <div className="sb-language-header-actions">
          <label className="sb-language-switch"><Globe2 size={17} aria-hidden="true" /><span className="sb-language-sr">{t.language}</span>
            <select aria-label={t.language} value={language.code} onChange={event => switchLanguage(event.target.value)}>{AVAILABLE_LANGUAGES.map(item => <option key={item.code} value={item.code} lang={item.code}>{item.name}</option>)}</select><ChevronDown size={15} aria-hidden="true" />
          </label>
          <Link to="/languages" className="sb-language-all">{t.allLanguages}</Link>
        </div>
      </div>
    </header>
    <main id="language-tools" className="sb-language-main">
      <section className="sb-language-hero" aria-labelledby="language-title">
        <div className="sb-language-hero-copy"><span className="sb-language-eyebrow"><span aria-hidden="true" />{t.eyebrow}</span><h1 id="language-title">{t.headline}</h1><p>{t.intro}</p>
          <div className="sb-language-hero-actions"><a className="sb-language-button" href="#language-prices"><Sprout size={18} aria-hidden="true" />{t.prices}<ArrowRight size={17} aria-hidden="true" /></a><a className="sb-language-text-link" href="#language-delivery">{t.delivery}<ArrowRight size={16} aria-hidden="true" /></a></div>
          <button className={`sb-language-remember ${remembered ? 'is-saved' : ''}`} type="button" onClick={rememberLanguage}>{remembered ? <Check size={16} aria-hidden="true" /> : <Globe2 size={16} aria-hidden="true" />}<span role="status">{remembered ? t.saved : t.remember}</span></button>
        </div>
        <div className="sb-language-hero-art" aria-hidden="true"><img src="/visuals/hero-harvest.webp" alt="" width="1280" height="853" fetchPriority="high" decoding="async" /><div className="sb-language-free"><ShieldCheck size={20} /><span>{t.free}</span></div></div>
      </section>
      <nav className="sb-language-jumpnav" aria-label={t.title}><a href="#language-prices"><Sprout size={17} aria-hidden="true" />{t.prices}</a><a href="#language-delivery"><Truck size={17} aria-hidden="true" />{t.delivery}</a><a href="#language-guides"><BookOpen size={17} aria-hidden="true" />{t.guides}</a></nav>
      <section id="language-prices" className="sb-language-section" aria-labelledby="language-prices-title">
        <div className="sb-language-section-heading"><div><span className="sb-language-section-number" aria-hidden="true">01 /</span><h2 id="language-prices-title">{t.prices}</h2></div><span className="sb-language-place"><MapPin size={16} aria-hidden="true" /><span lang={selectedState === 'all' ? language.code : 'en'}>{selectedState === 'all' ? t.allIndia : currentState?.name || t.empty}</span></span></div>
        <div className="sb-language-prices-grid">
          <div className="sb-language-panel sb-language-crop-picker">
            <div className="sb-language-filters"><label><span>{t.state}</span><select value={selectedState || requestedState} onChange={event => { setSearch(''); setSelection(event.target.value, null); }} disabled={statesRequest.loading || Boolean(statesRequest.error)}><option value="all">{t.allIndia}</option>{!selectedState && requestedState !== 'all' && <option value={requestedState}>{t.empty}</option>}{states.map(state => <option key={state.id} value={state.id} lang="en">{state.name}</option>)}</select></label><label><span>{t.search}</span><span className="sb-language-search"><Search size={17} aria-hidden="true" /><input type="search" value={search} placeholder={t.searchHint} onChange={event => { setSearch(event.target.value); setVisibleCount(12); }} /></span></label></div>
            {unavailable ? <div className="sb-language-status" role="alert"><p>{t.error}</p><button type="button" onClick={retry}>{t.retry}</button></div> : loadingCrops ? <div className="sb-language-status" role="status">{t.loading}</div> : <>
              <div className="sb-language-crop-list" role="group" aria-label={t.crop}>{filteredCrops.slice(0, visibleCount).map(crop => {
                const name = localizedCropName(crop, language.code);
                const english = crop.name || crop.nameEn || crop.id;
                return <button type="button" key={crop.id} aria-pressed={selectedCrop?.id === crop.id} className={`sb-language-crop ${selectedCrop?.id === crop.id ? 'is-selected' : ''}`} onClick={() => setSelection(selectedState, crop.id)}><CropImage id={crop.id} name={crop.nameHi || crop.name} size="sm" /><span className="sb-language-crop-name"><strong lang={name === english ? 'en' : language.code}>{name}</strong>{name !== english && <small lang="en">{english}</small>}</span>{selectedCrop?.id === crop.id && <Check size={15} aria-hidden="true" />}</button>;
              })}</div>
              {!filteredCrops.length && <p className="sb-language-status">{t.empty}</p>}
              {filteredCrops.length > visibleCount && <button className="sb-language-show-more" type="button" onClick={() => setVisibleCount(count => count + 12)}>{t.showMore}<ChevronDown size={16} aria-hidden="true" /></button>}
            </>}
            <p className="sb-language-small-note">{t.sourceNames}</p>
          </div>
          <div className="sb-language-price-side">
            <article className="sb-language-price-card" aria-live="polite" aria-atomic="true">
              <span className="sb-language-price-label">{t.updated}</span>
              {selectedCrop && <div className="sb-language-price-crop"><div><h3 lang={cropName === sourceName ? 'en' : language.code}>{cropName}</h3>{cropName !== sourceName && <span lang="en">{sourceName}</span>}</div><CropImage id={selectedCrop.id} name={selectedCrop.nameHi || selectedCrop.name} size="sm" /></div>}
              {priceRequest.loading || loadingCrops ? <p className="sb-language-price-status" role="status">{t.loading}</p> : priceRequest.error ? <div className="sb-language-price-status" role="alert"><p>{t.error}</p><button type="button" onClick={retry}>{t.retry}</button></div> : record ? <><p className="sb-language-price-value"><bdi>{currency(record.market)}</bdi><span>{t.perQuintal}</span></p><div className="sb-language-record-date"><span>{record.basis === 'daily' ? t.daily : t.monthly}</span><strong><span className="sb-language-sr">{t.recorded}: </span><time dateTime={record.date}>{recordDate}</time></strong></div></> : <p className="sb-language-price-status">{t.noPrice}</p>}
              {selectedCrop && <Link className="sb-language-history-link" to={cropDetailPath(selectedCrop.id, selectedState)}>{t.detailsHindi}<ArrowRight size={16} aria-hidden="true" /></Link>}
            </article>
            <div className="sb-language-method"><CircleHelp size={21} aria-hidden="true" /><div><h3>{t.methodTitle}</h3><p>{t.methodBody}</p></div></div>
          </div>
        </div>
        <p className="sb-language-price-disclaimer">{t.priceNote}</p>
      </section>
      <section id="language-delivery" className="sb-language-section" aria-labelledby="language-delivery-title">
        <div className="sb-language-section-heading"><div><span className="sb-language-section-number" aria-hidden="true">02 /</span><h2 id="language-delivery-title">{t.delivery}</h2></div><Truck size={26} aria-hidden="true" /></div>
        <div className="sb-language-delivery-grid"><form className="sb-language-panel sb-language-form" onSubmit={calculate} noValidate>
          <fieldset className="sb-language-vehicle-choice"><legend>{t.vehicle}</legend><div>{VEHICLES.map((vehicle, index) => <label className={form.vehicle === vehicle ? 'is-selected' : ''} key={vehicle}><input type="radio" name="vehicle" value={vehicle} checked={form.vehicle === vehicle} onChange={() => changeForm('vehicle', vehicle)} /><Truck size={24 + index * 3} aria-hidden="true" /><span>{t[vehicle]}</span></label>)}</div></fieldset>
          <p className="sb-language-small-note">{t.vehicleNote}</p>
          <div className="sb-language-form-fields">{['capacity', 'weight', 'distance', 'rate', 'extra'].map(key => <label key={key} className={key === 'extra' ? 'sb-language-field-wide' : ''}><span>{t[key]}</span><input name={key} type="text" inputMode="decimal" autoComplete="off" value={form[key]} onChange={event => changeForm(key, event.target.value)} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'language-calculation-error' : undefined} required /></label>)}</div>
          <label className="sb-language-checkbox"><input type="checkbox" checked={form.roundTrip} onChange={event => changeForm('roundTrip', event.target.checked)} /><span>{t.roundTrip}</span></label>
          {invalid && <p className="sb-language-form-error" id="language-calculation-error" role="alert">{t.invalid}</p>}
          <button className="sb-language-button sb-language-calculate" type="submit">{t.calculate}<ArrowRight size={18} aria-hidden="true" /></button>
        </form><aside className="sb-language-result" aria-live="polite" aria-atomic="true"><span className="sb-language-result-icon" aria-hidden="true"><Truck size={31} /></span><h3>{t.totalCost}</h3>
          {calculation ? <><p className="sb-language-total"><bdi>{currency(calculation.totalCost)}</bdi></p><dl><div><dt>{t.trips}</dt><dd><bdi>{number(calculation.trips, { maximumFractionDigits: 0 })}</bdi></dd></div><div><dt>{t.totalDistance}</dt><dd><bdi>{number(calculation.totalDistance)}</bdi> {t.km}</dd></div><div><dt>{t.perKg}</dt><dd><bdi>{currency(calculation.perKg)}</bdi></dd></div></dl></> : <p className="sb-language-result-instruction">{t.vehicleNote}</p>}
          <p className="sb-language-estimate-note"><CircleHelp size={17} aria-hidden="true" />{t.estimateNote}</p>
        </aside></div>
      </section>
      <section id="language-guides" className="sb-language-section sb-language-guides" aria-labelledby="language-guides-title"><div className="sb-language-section-heading"><div><span className="sb-language-section-number" aria-hidden="true">03 /</span><h2 id="language-guides-title">{t.guides}</h2></div><BookOpen size={25} aria-hidden="true" /></div><p>{t.guideNote}</p><div className="sb-language-guide-grid">{GUIDE_LINKS.map(guide => <Link key={guide.code} to={guide.path}><span lang={guide.code}>{getLanguage(guide.code).name}</span><strong>{t[guide.key]}</strong><ArrowRight size={18} aria-hidden="true" /></Link>)}</div></section>
      <footer className="sb-language-footer"><div className="sb-language-footer-top"><Link to="/languages" className="sb-language-brand"><img src="/brand/app-icon.svg" alt="" width="34" height="34" /><span lang="en" dir="ltr">SahiBhav<span className="sb-language-brand-dot">.</span></span></Link><span className="sb-language-footer-free"><ShieldCheck size={17} aria-hidden="true" />{t.free}</span></div><p>{t.translationNote}</p><div className="sb-language-footer-links"><Link to="/languages">{t.allLanguages}</Link><Link to="/">{t.home}</Link><Link to="/about">{t.about}</Link><Link to="/privacy">{t.privacy}</Link><Link to="/contact">{t.feedback}</Link></div><div className="sb-language-sources"><span>{t.dataSource}</span><a href="https://www.data.gov.in/" target="_blank" rel="noopener noreferrer" lang="en">data.gov.in</a><a href="https://agmarknet.gov.in/" target="_blank" rel="noopener noreferrer" lang="en">Agmarknet</a><a href="https://agriportal.cg.nic.in/" target="_blank" rel="noopener noreferrer" lang="en">agriportal.cg.nic.in</a></div></footer>
    </main>
  </div>;
}

export default function LanguageToolsPage() {
  const { language: code } = useParams();
  const language = getLanguage(code);
  const copy = language && getLanguageCopy(code);
  if (!language || !copy) return <NotFoundPage />;
  return <LanguageTools language={language} copy={copy} />;
}
