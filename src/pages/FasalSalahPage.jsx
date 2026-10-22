import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Bug, CalendarDays, ChevronDown, Info, Leaf, MapPin, Phone, Search, Sprout, TrendingUp } from 'lucide-react';
import SEO, { SITE_URL } from '../components/SEO';
import Brand from '../components/Brand';
import { useApi } from '../hooks/useApi';
import { cropDetailPath } from '../utils/cropUrls';
import {
  FAMILY_LABEL, KIND_LABEL, MONTHS_HI, MONTHS_SHORT_HI, currentMonthIST, dateHi, liftLabel, monthYearHi,
  nextMonth, parseMonth, perHundred, risingNext, salahPath, scriptLang, searchPlaces,
} from '../utils/kccAdvice';
import '../styles/detail.css';
import '../styles/fasal-salah.css';

const KIND_ICON = { keet: Bug, rog: Leaf, poshan: Sprout, kharpatwar: Leaf, kheti: Sprout };
const number = n => Number(n || 0).toLocaleString('en-IN');

function SourceNote({ meta, placeName, calls }) {
  if (!meta) return null;
  const range = `${monthYearHi(meta.coverage.from)} – ${dateHi(meta.coverage.newestCall)}`;
  return <div className="sb-salah-source" role="note">
    <Info size={18} aria-hidden="true" />
    <div>
      <strong>{meta.mode === 'live' ? 'ताज़ा सवालों के साथ मौसमी पैटर्न' : 'यह पिछले सालों का मौसमी पैटर्न है, इस साल की चेतावनी नहीं'}</strong>
      <p>
        {calls && placeName
          ? `किसान कॉल सेंटर (1800-180-1551) पर ${placeName} के किसानों के ${number(calls)} सवालों से बना (${range})।`
          : `किसान कॉल सेंटर (1800-180-1551) पर किसानों के ${meta.calls ? `${number(meta.calls)} ` : ''}सवालों से बना (${range})।`}
        {meta.mode !== 'live' && ` सरकारी स्रोत में ${dateHi(meta.coverage.sourceNewestCall)} के बाद के सवाल अभी नहीं आए हैं; नए सवाल आते ही यहाँ ताज़ा बदलाव भी दिखेंगे।`}
        {meta.sampled && ' अभी केवल नमूना डेटा जुड़ा है — प्रतिशत अनुमान हैं।'}
        {' '}<a href={meta.sourceUrl} target="_blank" rel="noopener noreferrer">स्रोत: data.gov.in</a>
      </p>
    </div>
  </div>;
}

function MonthPicker({ month, onChange }) {
  const ref = useRef(null);
  // On a narrow screen the chosen month can sit off-screen in the scrolling row.
  useEffect(() => {
    const row = ref.current;
    const button = row?.querySelector('[aria-pressed="true"]');
    if (!row || !button) return;
    const rowBox = row.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    row.scrollLeft += buttonBox.left - rowBox.left - (rowBox.width - buttonBox.width) / 2;
  }, [month]);
  return <div className="sb-salah-months" role="group" aria-label="महीना चुनें" ref={ref}>
    {MONTHS_SHORT_HI.map((label, index) => <button key={label} type="button" aria-pressed={month === index + 1} onClick={() => onChange(index + 1)} aria-label={MONTHS_HI[index]}>{label}</button>)}
  </div>;
}

function Answers({ items, scopeHi }) {
  if (!items?.length) return <p className="sb-salah-muted">इस समस्या का लिखित जवाब इस क्षेत्र के रिकॉर्ड में नहीं मिला।</p>;
  return <ol className="sb-salah-answers">
    {items.map(item => <li key={`${item.q}-${item.answeredOn}`}>
      <p className="sb-salah-question" lang={scriptLang(item.q)}><span>सवाल</span>{item.q}</p>
      <p className="sb-salah-answer" lang={scriptLang(item.a)}><span>KCC का जवाब</span>{item.a}</p>
      <small>{item.asked > 1 ? `${item.stateHi || scopeHi ? `${item.stateHi || scopeHi} में ` : ''}${number(item.asked)} बार पूछा गया · ` : item.stateHi ? `${item.stateHi} · ` : ''}{item.answeredOn ? `जवाब की तारीख ${dateHi(item.answeredOn)}` : ''}</small>
    </li>)}
  </ol>;
}

function ProblemCard({ rank, item, topic, qa, stateId, scopeHi }) {
  const [open, setOpen] = useState(rank === 1);
  if (!topic) return null;
  const Icon = KIND_ICON[topic.kind] || Leaf;
  const lift = liftLabel(item.lift);
  const panelId = `salah-answers-${item.key.replace(/[^a-z0-9-]/gi, '-')}`;
  return <li className={`sb-salah-problem sb-salah-kind-${topic.kind}`}>
    <div className="sb-salah-problem__head">
      <span className="sb-salah-rank" aria-hidden="true">{String(rank).padStart(2, '0')}</span>
      <div className="sb-salah-problem__title">
        <span className="sb-salah-kind"><Icon size={14} aria-hidden="true" />{KIND_LABEL[topic.kind]}</span>
        <h3>{topic.cropHi} · {topic.problemHi}</h3>
        <div className="sb-salah-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, item.share * 2.5)}%` }} /></div>
        <p>फसल से जुड़े हर {perHundred(item.share)} सवाल{item.callsPerYear ? ` · हर साल लगभग ${number(item.callsPerYear)} फ़ोन` : ''}{lift ? <strong> · {lift}</strong> : null}</p>
      </div>
    </div>
    <button type="button" className="sb-salah-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      {open ? 'जवाब छिपाएँ' : 'KCC ने क्या सलाह दी?'} <ChevronDown size={16} aria-hidden="true" />
    </button>
    <div id={panelId} hidden={!open}>
      <Answers items={qa} scopeHi={scopeHi} />
      {topic.mandiCrop && <Link className="sb-detail-text-link" to={cropDetailPath(topic.mandiCrop, stateId || 'all')}>{topic.cropHi} का मंडी भाव देखें <ArrowRight size={15} aria-hidden="true" /></Link>}
    </div>
  </li>;
}

function YearPattern({ series, topics, month }) {
  const keys = Object.keys(series || {}).filter(key => topics?.[key]);
  if (!keys.length) return null;
  return <section className="sb-detail-section sb-salah-pattern" aria-labelledby="salah-pattern-title">
    <span className="sb-detail-kicker"><CalendarDays size={15} aria-hidden="true" /> साल भर का पैटर्न</span>
    <h2 id="salah-pattern-title">कौन-सी समस्या किस महीने ज़ोर पकड़ती है</h2>
    <p>गहरा रंग = उस समस्या के सबसे ज़्यादा सवाल वाला महीना। हर पंक्ति अपनी ही सबसे ऊँची संख्या से तुलना है।{Object.values(series).some(values => values.includes(null)) && ' धारीदार खाने = उस महीने का आँकड़ा अभी नहीं जुड़ा।'}</p>
    <div className="sb-salah-heat-scroll">
      <table className="sb-salah-heat">
        <caption className="sr-only">हर समस्या के सवाल महीने के अनुसार, सबसे ज़्यादा वाले महीने को 100 मानकर</caption>
        <thead><tr><th scope="col">समस्या</th>{MONTHS_SHORT_HI.map((label, index) => <th key={label} scope="col" className={index + 1 === month ? 'is-current' : ''}>{label}</th>)}</tr></thead>
        <tbody>{keys.map(key => <tr key={key}>
          <th scope="row">{topics[key].cropHi} · {topics[key].problemHi}</th>
          {series[key].map((value, index) => <td key={index} className={`${index + 1 === month ? 'is-current' : ''}${value == null ? ' is-unknown' : ''}`} style={value == null ? undefined : { '--level': value / 100 }}><span className="sr-only">{MONTHS_HI[index]}: {value == null ? 'आँकड़ा नहीं' : value}</span></td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function FamilyMix({ families, month }) {
  const entries = Object.entries(families || {}).filter(([, share]) => share > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return <section className="sb-detail-section" aria-labelledby="salah-family-title">
    <span className="sb-detail-kicker">फ़ोन किस बारे में आते हैं</span>
    <h2 id="salah-family-title">{MONTHS_HI[month - 1]} में किसान किस बारे में पूछते हैं</h2>
    <div className="sb-salah-mix" aria-hidden="true">{entries.map(([family, share]) => <span key={family} className={`sb-salah-mix-${family}`} style={{ flexGrow: share }} />)}</div>
    <ul className="sb-salah-mix-legend">{entries.map(([family, share]) => <li key={family}><span className={`sb-salah-dot sb-salah-mix-${family}`} aria-hidden="true" />{FAMILY_LABEL[family] || family} <strong>{share < 1 ? '1% से कम' : `${Math.round(share)}%`}</strong></li>)}</ul>
  </section>;
}

function Alerts({ alerts, topics }) {
  if (!alerts?.length) return null;
  return <section className="sb-salah-alerts" aria-labelledby="salah-alerts-title">
    <h2 id="salah-alerts-title"><AlertTriangle size={18} aria-hidden="true" /> पिछले 14 दिनों में अचानक बढ़े सवाल</h2>
    <ul>{alerts.map(alert => topics[alert.key] && <li key={alert.key}><strong>{topics[alert.key].cropHi} · {topics[alert.key].problemHi}</strong> — {number(alert.recent)} सवाल, जबकि पिछले सालों में इन्हीं दिनों औसतन {number(alert.usual)}</li>)}</ul>
  </section>;
}

function PlaceFinder({ states }) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchPlaces(states, query), [query, states]);
  return <div className="sb-salah-finder">
    <label htmlFor="salah-district-search">अपना ज़िला खोजें</label>
    <div className="sb-salah-finder__input"><Search size={16} aria-hidden="true" /><input id="salah-district-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="जैसे Raipur, Nashik, Ludhiana" autoComplete="off" /></div>
    {matches.length > 0 && <ul className="sb-salah-finder__results">{matches.map(({ state, district }) => <li key={`${state.id}/${district.id}`}><Link to={salahPath(state.id, district.id)}><MapPin size={14} aria-hidden="true" />{district.name}<small>{state.nameHi}</small></Link></li>)}</ul>}
    {query.trim().length >= 2 && !matches.length && <p className="sb-salah-muted">इस नाम का ज़िला नहीं मिला। अंग्रेज़ी नाम से खोजें।</p>}
  </div>;
}

export default function FasalSalahPage() {
  const { stateId, districtId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = parseMonth(searchParams.get('mahina'), currentMonthIST());
  const level = districtId ? 'district' : stateId ? 'state' : 'india';
  const apiPath = level === 'district' ? `/kcc/districts/${encodeURIComponent(stateId)}/${encodeURIComponent(districtId)}` : level === 'state' ? `/kcc/states/${encodeURIComponent(stateId)}` : '/kcc';
  const { data, loading, error } = useApi(apiPath);
  const { data: index } = useApi(level === 'india' ? null : '/kcc');
  const meta = data?.meta;
  const places = level === 'india' ? data?.states : index?.states;

  const setMonth = value => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    if (value === currentMonthIST()) next.delete('mahina'); else next.set('mahina', String(value));
    return next;
  }, { replace: true });

  const placeName = level === 'district' ? data?.name : level === 'state' ? data?.nameHi : 'भारत';
  const stateNameHi = level === 'district' ? data?.state?.nameHi : data?.nameHi;
  const monthData = data?.months?.[month - 1];
  const top = monthData?.top || [];
  const upcoming = risingNext(data?.months, month);
  const path = salahPath(stateId, districtId);
  const title = placeName ? `${placeName} में ${MONTHS_HI[month - 1]} की फसल समस्याएँ — किसान कॉल सेंटर के सवाल` : 'फसल सलाह — किसान कॉल सेंटर के सवाल';
  const firstTopic = top[0] && data?.topics?.[top[0].key];
  const description = placeName
    ? `${placeName} के किसान ${MONTHS_HI[month - 1]} में किसान कॉल सेंटर से सबसे ज़्यादा ${firstTopic ? `${firstTopic.cropHi} में ${firstTopic.problemHi}` : 'फसल की समस्याओं'} के बारे में पूछते हैं। हर समस्या पर KCC की सलाह और अगले महीने की तैयारी।`
    : 'किसान कॉल सेंटर के लाखों सवालों से जानें कि आपके ज़िले में इस महीने कौन-से कीट, रोग और खाद की समस्याएँ आती हैं — और KCC ने क्या सलाह दी।';
  const breadcrumbs = [{ name: 'फसल सलाह', path: '/fasal-salah' }, stateId && { name: stateNameHi || stateId, path: salahPath(stateId) }, districtId && { name: placeName || districtId, path }].filter(Boolean);
  const notFound = error && /404/.test(String(error.message || error.status || ''));

  return <div className="sb-detail-page sb-salah-page">
    <SEO title={title} description={description} path={path} noIndex={Boolean(meta?.sampled) || Boolean(error)}
      structuredData={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: `${SITE_URL}${crumb.path}` })) }} />
    <header className="sb-detail-header"><div className="sb-detail-header__inner">
      <Link to="/" aria-label="सही भाव होम"><Brand /></Link>
      <Link to={level === 'district' ? salahPath(stateId) : level === 'state' ? '/fasal-salah' : '/'} className="sb-detail-back"><ArrowLeft size={16} aria-hidden="true" /> {level === 'district' ? `${stateNameHi || 'राज्य'} की फसल सलाह` : level === 'state' ? 'पूरे भारत की फसल सलाह' : 'मंडी भाव'}</Link>
    </div></header>
    <main className="sb-detail-main" id="main-content">
      <nav className="sb-detail-breadcrumb" aria-label="पृष्ठ पथ">
        <Link to="/">सही भाव</Link>
        {breadcrumbs.map((crumb, i) => <span key={crumb.path} className="sb-salah-crumb"><span aria-hidden="true">/</span>{i === breadcrumbs.length - 1 ? <span aria-current="page">{crumb.name}</span> : <Link to={crumb.path}>{crumb.name}</Link>}</span>)}
      </nav>

      <section className="sb-salah-hero">
        <div>
          <span className="sb-detail-kicker"><Sprout size={15} aria-hidden="true" /> फसल सलाह · किसान कॉल सेंटर के सवालों से</span>
          <h1>{placeName ? <>{placeName} में <span>{MONTHS_HI[month - 1]}</span> की आम फसल समस्याएँ</> : 'फसल सलाह'}</h1>
          <p>पिछले सालों में इसी महीने किसानों ने किसान कॉल सेंटर (KCC) से क्या पूछा — और विशेषज्ञों ने क्या जवाब दिया। समस्या आने से पहले तैयारी करें।</p>
        </div>
        {level !== 'district' && places && <PlaceFinder states={level === 'state' ? places.filter(state => state.id === stateId) : places} />}
      </section>

      <MonthPicker month={month} onChange={setMonth} />

      {loading && <div className="sb-detail-status" role="status"><Sprout size={24} aria-hidden="true" /><h2>सवालों का सार लोड हो रहा है</h2></div>}
      {error && <div className="sb-detail-notice" role="alert"><AlertTriangle size={20} aria-hidden="true" /><div><strong>{notFound && level === 'india' ? 'फसल सलाह का डेटा तैयार हो रहा है' : notFound ? 'इस जगह के सवाल उपलब्ध नहीं हैं' : 'फसल सलाह अभी लोड नहीं हो पाई'}</strong><p>{notFound && level === 'india' ? 'किसान कॉल सेंटर के सवाल जोड़े जा रहे हैं। कुछ घंटों बाद फिर देखें। तब तक मंडी भाव देखें।' : notFound ? 'जिन ज़िलों से कम सवाल आए हैं, उनके लिए राज्य की सलाह देखें।' : 'थोड़ी देर बाद पृष्ठ दोबारा खोलें।'}</p></div><Link to={level === 'india' ? '/' : stateId && level === 'district' ? salahPath(stateId) : '/fasal-salah'}>{level === 'india' ? 'मंडी भाव' : stateId && level === 'district' ? 'राज्य की सलाह' : 'सभी राज्य'}</Link></div>}

      {data && <>
        <SourceNote meta={meta} placeName={level === 'india' ? null : placeName} calls={level === 'india' ? null : data.calls} />
        <Alerts alerts={data.alerts} topics={data.topics || {}} />
        <div className="sb-salah-grid">
          <section className="sb-salah-list" aria-labelledby="salah-top-title">
            <div className="sb-salah-section-head">
              <span className="sb-detail-kicker"><Bug size={15} aria-hidden="true" /> {MONTHS_HI[month - 1]} में सबसे ज़्यादा पूछी गई</span>
              <h2 id="salah-top-title">इस महीने की आम समस्याएँ</h2>
            </div>
            {top.length ? <ol>{top.map((item, i) => <ProblemCard key={item.key} rank={i + 1} item={item} topic={data.topics?.[item.key]} qa={data.qa?.[item.key]} stateId={level === 'india' ? null : stateId} scopeHi={level === 'india' ? null : stateNameHi} />)}</ol>
              : <p className="sb-salah-muted">{monthData && monthData.covered === false ? `${MONTHS_HI[month - 1]} के सवाल अभी नहीं जुड़े हैं। दूसरा महीना चुनें।` : `इस महीने के लिए पर्याप्त सवाल दर्ज नहीं हैं। दूसरा महीना चुनें${level === 'district' ? ' या राज्य की सलाह देखें' : ''}।`}</p>}
          </section>
          <aside className="sb-salah-side">
            {upcoming.length > 0 && <section className="sb-detail-section sb-salah-next" aria-labelledby="salah-next-title">
              <span className="sb-detail-kicker"><TrendingUp size={15} aria-hidden="true" /> आगे की तैयारी</span>
              <h2 id="salah-next-title">{MONTHS_HI[nextMonth(month) - 1]} में बढ़ने वाली समस्याएँ</h2>
              <ul>{upcoming.map(item => data.topics?.[item.key] && <li key={item.key}>
                <strong>{data.topics[item.key].cropHi} · {data.topics[item.key].problemHi}</strong>
                <span>{item.shareNow ? `${perHundred(item.shareNow)} से बढ़कर ${perHundred(item.share)}` : `${perHundred(item.share)} — इस महीने सूची में नहीं`}</span>
              </li>)}</ul>
              <button type="button" className="sb-detail-text-link" onClick={() => setMonth(nextMonth(month))}>{MONTHS_HI[nextMonth(month) - 1]} की पूरी सूची <ArrowRight size={15} aria-hidden="true" /></button>
            </section>}
            {monthData && <FamilyMix families={monthData.families} month={month} />}
            <section className="sb-detail-section sb-salah-help">
              <span className="sb-detail-kicker"><Phone size={15} aria-hidden="true" /> सीधे विशेषज्ञ से पूछें</span>
              <h2>किसान कॉल सेंटर</h2>
              <p>टोल-फ़्री, सुबह 6 से रात 10 बजे तक, अपनी भाषा में।</p>
              <a className="sb-salah-call" href="tel:18001801551">1800-180-1551</a>
              <p className="sb-salah-muted">दवा का नाम और मात्रा पुराने जवाबों से है। छिड़काव से पहले अपने कृषि विस्तार अधिकारी या कृषि विज्ञान केंद्र से पुष्टि करें और लेबल पढ़ें।</p>
            </section>
          </aside>
        </div>
        <YearPattern series={data.series} topics={data.topics} month={month} />

        {level === 'india' && data.states?.length > 0 && <section className="sb-detail-section sb-salah-places" aria-labelledby="salah-states-title">
          <span className="sb-detail-kicker"><MapPin size={15} aria-hidden="true" /> अपनी जगह चुनें</span>
          <h2 id="salah-states-title">राज्य के अनुसार फसल सलाह</h2>
          <div className="sb-salah-links">{data.states.map(state => <Link key={state.id} to={salahPath(state.id)}>{state.nameHi}<small>{state.districts.length ? `${state.districts.length} ${state.districts.length === 1 ? 'ज़िला' : 'ज़िले'}` : 'राज्य स्तर'}</small></Link>)}</div>
        </section>}
        {level === 'state' && data.districts?.length > 0 && <section className="sb-detail-section sb-salah-places" aria-labelledby="salah-districts-title">
          <span className="sb-detail-kicker"><MapPin size={15} aria-hidden="true" /> ज़िला चुनें</span>
          <h2 id="salah-districts-title">{data.nameHi} के ज़िले</h2>
          <div className="sb-salah-links">{data.districts.filter(d => d.published).map(d => <Link key={d.id} to={salahPath(stateId, d.id)}>{d.name}</Link>)}</div>
          {data.districts.some(d => !d.published) && <p>कम सवालों वाले ज़िले ({data.districts.filter(d => !d.published).length}) अलग से नहीं दिखाए गए; उनके लिए ऊपर की राज्य स्तर की सलाह देखें।</p>}
        </section>}
        {level === 'district' && <section className="sb-detail-section sb-salah-places" aria-labelledby="salah-more-title">
          <span className="sb-detail-kicker"><MapPin size={15} aria-hidden="true" /> आस-पास</span>
          <h2 id="salah-more-title">{stateNameHi} के दूसरे ज़िले</h2>
          <div className="sb-salah-links">{(data.neighbours || []).map(d => <Link key={d.id} to={salahPath(stateId, d.id)}>{d.name}</Link>)}<Link to={salahPath(stateId)}>पूरा {stateNameHi} <ArrowRight size={14} aria-hidden="true" /></Link></div>
          {data.crops?.length > 0 && <p>मंडी भाव भी देखें: <Link to={`/mandi-bhav/${stateId}`}>{stateNameHi} के मंडी भाव</Link></p>}
        </section>}
      </>}
      <footer className="sb-detail-footer"><Brand compact /><p>सही भाव। समझकर फ़ैसला।</p><Link to="/">मंडी भाव देखें <ArrowRight size={15} aria-hidden="true" /></Link></footer>
    </main>
  </div>;
}
