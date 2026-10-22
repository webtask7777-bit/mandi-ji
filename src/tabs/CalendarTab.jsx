import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CloudSun, Info, ListChecks, MapPin, Search, Sprout, Wheat, X } from 'lucide-react';
import CropImage from '@/components/CropImage';
import CalendarActivityIcon from '@/components/CalendarActivityIcon';
import { CALENDAR_PHASES, MONTH_NAMES, getCalendarCrops, getCalendarPhases, getIndiaMonth, getNextCalendarActivity } from '@/utils/cropCalendar';
import '@/styles/secondary.css';
import '@/styles/calendar.css';

const PHASE_COPY = { sowing: 'बुवाई की तैयारी', growing: 'फसल की देखभाल', harvest: 'कटाई का समय', arrival: 'मंडी की मुख्य आवक' };
const SHORT_MONTHS = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];
const SEASONS = [
  { name: 'खरीफ', range: 'जून–दिसंबर', icon: CloudSun, months: [5, 6, 7, 8, 9, 10, 11] },
  { name: 'रबी', range: 'अक्टूबर–अप्रैल', icon: Wheat, months: [9, 10, 11, 0, 1, 2, 3] },
  { name: 'ज़ायद', range: 'मार्च–जून', icon: Sprout, months: [2, 3, 4, 5] },
];
const PREPARATION = [
  { id: 'weather', title: 'मौसम की सलाह देखी', note: 'अपने जिले का ताज़ा पूर्वानुमान जाँचें।' },
  { id: 'local', title: 'स्थानीय समय की पुष्टि की', note: 'फसल और किस्म के लिए कृषि केंद्र से सलाह लें।' },
  { id: 'inputs', title: 'खेत और साधनों की तैयारी', note: 'बीज, पानी, औज़ार और मज़दूरी की सूची बनाएँ।' },
  { id: 'market', title: 'बिक्री का हिसाब देखा', note: 'भाव की तारीख, ढुलाई और बाकी खर्च जोड़ें।' },
];

function PhasePills({ phases }) {
  return <span className="kc-phase-pills">{phases.map(phase => <span key={phase.key} className="kc-phase-pill" data-phase={phase.key}>{phase.name}</span>)}</span>;
}

function PreparationList({ storageKey, month }) {
  const [checked, setChecked] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(saved) ? saved.filter(id => PREPARATION.some(item => item.id === id)) : []; } catch { return []; }
  });
  const [saveFailed, setSaveFailed] = useState(false);
  function toggle(id) {
    const next = checked.includes(id) ? checked.filter(item => item !== id) : [...checked, id];
    setChecked(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaveFailed(false); } catch { setSaveFailed(true); }
  }
  return <section className="kc-preparation" aria-labelledby="kc-checklist-heading">
    <div className="kc-side-label"><ListChecks size={18} aria-hidden="true" /><span>मेरी तैयारी</span><span>{checked.length}/{PREPARATION.length}</span></div>
    <h3 id="kc-checklist-heading">{MONTH_NAMES[month]} की छोटी सूची</h3>
    <p>जो काम हो जाए, उस पर निशान लगाएँ।</p>
    <div className="kc-progress" role="progressbar" aria-label="तैयारी पूरी" aria-valuenow={checked.length} aria-valuemin={0} aria-valuemax={PREPARATION.length}><span style={{ width: `${checked.length / PREPARATION.length * 100}%` }} /></div>
    <div className="kc-checks">{PREPARATION.map(item => <label key={item.id} data-checked={checked.includes(item.id)}><input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggle(item.id)} /><span className="kc-check-icon" aria-hidden="true">{checked.includes(item.id) && <Check size={14} />}</span><span><strong>{item.title}</strong><small>{item.note}</small></span></label>)}</div>
    <small className="kc-save-note" role="status">{saveFailed ? 'अभी सेव नहीं हो सका; पेज बंद करने पर निशान मिट सकते हैं।' : 'निशान इसी ब्राउज़र में सेव होते हैं। कोई रिमाइंडर नहीं भेजा जाता।'}</small>
  </section>;
}

function CropCard({ crop, month, expanded, onExpand, onCropClick }) {
  const phases = getCalendarPhases(crop, month);
  const next = getNextCalendarActivity(crop, month);
  const name = crop.nameHi || crop.name;
  return <article className="kc-crop-card" data-expanded={expanded}>
    <div className="kc-crop-top"><div className="kc-crop-art"><CropImage id={crop.id} name={name} size="lg" /></div><div><h4>{name}</h4><PhasePills phases={phases} /></div></div>
    <div className="kc-crop-next"><span>अगला महीना जिसमें जानकारी है</span><strong>{next ? `${MONTH_NAMES[next.month]} · ${next.phases.map(phase => phase.name).join(' / ')}` : 'आगे की जानकारी उपलब्ध नहीं'}</strong></div>
    <div className="kc-crop-actions"><button type="button" onClick={onExpand} aria-expanded={expanded} aria-controls={`kc-year-${crop.id}`}>साल का क्रम <ChevronDown size={15} className={expanded ? 'kc-rotated' : ''} aria-hidden="true" /></button><button type="button" onClick={() => onCropClick(crop.id)} aria-label={`${name} का भाव देखें`}>भाव देखें <ArrowUpRight size={15} aria-hidden="true" /></button></div>
    {expanded && <div id={`kc-year-${crop.id}`} className="kc-crop-details"><div className="kc-mini-year">{MONTH_NAMES.map((label, index) => { const values = getCalendarPhases(crop, index); return <div key={label} data-current={month === index}><span>{SHORT_MONTHS[index]}</span><div>{values.length ? values.map(phase => <span key={phase.key} data-phase={phase.key} className="kc-mini-phase" title={`${label}: ${phase.name}`} aria-label={`${label}: ${phase.name}`}>{phase.shortName}</span>) : <span className="kc-no-phase" aria-label={`${label}: जानकारी उपलब्ध नहीं`}>—</span>}</div></div>; })}</div><p>एक महीने में एक से अधिक चरण हो सकते हैं। “—” का मतलब जानकारी उपलब्ध नहीं है।</p></div>}
  </article>;
}

export default function CalendarTab({ crops = [], loading = false, error = null, stateName = 'भारत', stateParam = 'all', onCropClick }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMonth = getIndiaMonth();
  const requestedMonth = searchParams.get('calendarMonth');
  const month = /^(?:[1-9]|1[0-2])$/.test(requestedMonth || '') ? Number(requestedMonth) - 1 : currentMonth;
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('month');
  const [expandedCrop, setExpandedCrop] = useState(null);
  const calendarCrops = getCalendarCrops(crops);
  const activeCrops = calendarCrops.filter(crop => getCalendarPhases(crop, month).length);
  const q = query.trim().toLocaleLowerCase('hi');
  const searchMatches = crop => !q || `${crop.nameHi || ''} ${crop.name || ''} ${crop.id || ''}`.toLocaleLowerCase('hi').includes(q);
  const phaseMatches = crop => phaseFilter === 'all' || getCalendarPhases(crop, month).some(phase => phase.key === phaseFilter);
  const visibleCrops = (view === 'year' ? calendarCrops : activeCrops).filter(searchMatches).filter(phaseMatches);
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
  const totalWithoutCalendar = Math.max(0, crops.length - calendarCrops.length);
  function chooseMonth(index) {
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('calendarMonth', String(index + 1)); return next; }, { replace: true });
    setExpandedCrop(null);
  }
  function resetFilters() { setQuery(''); setPhaseFilter('all'); }

  return <div className="kc-calendar">
    <section className="kc-hero" aria-labelledby="kc-hero-heading">
      <div className="kc-hero-copy"><span className="kc-eyebrow"><Sprout size={16} aria-hidden="true" /> खेत की योजना, महीने के साथ</span><h2 id="kc-hero-heading">हर मौसम की समझ।<br /><em>हर फसल की तैयारी।</em></h2><p>कब बुवाई, कब कटाई और कब मुख्य आवक—<br className="kc-desktop-break" />अपनी अगली तैयारी यहीं से शुरू करें।</p><a href="#kc-month-plan" className="kc-hero-link">{MONTH_NAMES[month]} का कैलेंडर देखें <ArrowDown size={16} aria-hidden="true" /></a><span className="kc-hero-scope"><MapPin size={13} aria-hidden="true" />{stateName} की सूचीबद्ध फसलें · सामान्य मौसमी मार्गदर्शिका</span></div>
      <div className="kc-hero-visual" aria-hidden="true"><img src="/visuals/hero-harvest.webp" alt="" width="1280" height="853" /><div className="kc-month-sheet"><span>किसान कैलेंडर</span><strong>{MONTH_NAMES[month]}</strong><div className="kc-sheet-lines"><i /><i /><i /><i /><i /><i /><i /></div><small>आज की तैयारी, कल की फसल।</small></div><span className="kc-field-label"><span /> खेत से मंडी तक</span></div>
    </section>

    <section className="kc-month-panel" id="kc-month-plan" aria-label="महीना और मौसमी गतिविधि">
      <div className="kc-month-heading"><div><span className="kc-eyebrow">अपना महीना चुनें</span><h3>{MONTH_NAMES[month]} <span>की फसल योजना</span></h3></div><div className="kc-month-navigation"><button type="button" aria-label="पिछला महीना" onClick={() => chooseMonth((month + 11) % 12)}><ChevronLeft size={19} /></button><button type="button" className="kc-current-button" onClick={() => chooseMonth(currentMonth)} disabled={month === currentMonth}>इस महीने पर जाएँ</button><button type="button" aria-label="अगला महीना" onClick={() => chooseMonth((month + 1) % 12)}><ChevronRight size={19} /></button></div></div>
      <div className="kc-months" aria-label="कैलेंडर के महीने">{MONTH_NAMES.map((name, index) => <button key={name} type="button" aria-pressed={month === index} onClick={() => chooseMonth(index)}><small>{String(index + 1).padStart(2, '0')}</small><span>{name}</span><i data-today={index === currentMonth} aria-label={index === currentMonth ? 'वर्तमान महीना' : undefined} /></button>)}</div>
      <div className="kc-season-strip"><span>सामान्य मौसम चक्र</span>{SEASONS.map(season => { const Icon = season.icon; return <span key={season.name} data-active={season.months.includes(month)}><Icon size={16} aria-hidden="true" /><strong>{season.name}</strong><small>{season.range}</small>{season.months.includes(month) && <Check size={12} aria-label="इस महीने का सामान्य मौसम" />}</span>; })}</div>
    </section>

    <div className="kc-data-note"><Info size={17} aria-hidden="true" /><p><strong>स्थानीय समय की पुष्टि ज़रूरी है।</strong> यहाँ उपलब्ध सामान्य फसल चक्र दिखते हैं; राज्य चुनने से स्थानीय बुवाई की तारीख तय नहीं होती। क्षेत्र, किस्म, बारिश और सिंचाई के अनुसार समय बदल सकता है।</p></div>

    {loading ? <div className="kc-empty" role="status"><CalendarDays size={28} /><h3>फसल कैलेंडर खुल रहा है…</h3><p>चुने हुए क्षेत्र की उपलब्ध जानकारी ला रहे हैं।</p></div> : error ? <div className="kc-empty" role="alert"><Info size={28} /><h3>कैलेंडर की जानकारी नहीं खुल सकी</h3><p>कृपया कुछ देर बाद पेज फिर खोलें।</p></div> : <>
      <div className="kc-phase-summary" aria-label={`${MONTH_NAMES[month]} की गतिविधि के फ़िल्टर`}>{CALENDAR_PHASES.map(phase => { const count = activeCrops.filter(crop => getCalendarPhases(crop, month).some(value => value.key === phase.key)).length; return <button type="button" key={phase.key} data-phase={phase.key} aria-pressed={phaseFilter === phase.key} onClick={() => setPhaseFilter(phaseFilter === phase.key ? 'all' : phase.key)}><span className="kc-summary-icon"><CalendarActivityIcon type={phase.key} size={36} /></span><span><strong>{count}<small> फसलें</small></strong><span>{PHASE_COPY[phase.key]}</span></span><ArrowUpRight size={16} aria-hidden="true" /></button>; })}</div>
      <p className="kc-count-note">एक फसल के कई चरण एक ही महीने में हो सकते हैं; इसलिए ऊपर की गिनतियाँ अलग-अलग हैं।</p>
      <div className="kc-workspace"><div className="kc-main-column">
        <section className="kc-plan" aria-labelledby="kc-results-heading">
          <div className="kc-results-heading"><div><span className="kc-eyebrow">{stateName} · उपलब्ध कैलेंडर</span><h3 id="kc-results-heading">{view === 'year' ? 'पूरे साल का क्रम' : 'इस महीने खेत से मंडी तक'}</h3></div><div className="kc-view-switch" aria-label="कैलेंडर का दृश्य"><button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>महीनेवार</button><button type="button" aria-pressed={view === 'year'} onClick={() => setView('year')}>पूरा साल</button></div></div>
          <div className="kc-filter-row"><label className="kc-search"><Search size={17} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="फसल खोजें, जैसे धान / paddy" aria-label="कैलेंडर में फसल खोजें" />{query && <button type="button" aria-label="खोज साफ़ करें" onClick={() => setQuery('')}><X size={16} /></button>}</label><button type="button" className="kc-all-filter" aria-pressed={phaseFilter === 'all'} onClick={() => setPhaseFilter('all')}>सभी गतिविधियाँ</button></div>
          <div className="kc-results-status" role="status"><span>{visibleCrops.length} फसलें {phaseFilter !== 'all' && `· ${MONTH_NAMES[month]} में ${CALENDAR_PHASES.find(phase => phase.key === phaseFilter)?.name}`}</span>{(q || phaseFilter !== 'all') && <button type="button" onClick={resetFilters}>फ़िल्टर हटाएँ <X size={12} aria-hidden="true" /></button>}</div>
          {!visibleCrops.length ? <div className="kc-empty"><Sprout size={30} aria-hidden="true" /><h4>{q ? 'इस खोज की फसल नहीं मिली' : 'इस चयन की गतिविधि उपलब्ध नहीं'}</h4><p>दूसरा महीना या गतिविधि देखें। जानकारी न होने का मतलब खेती बंद होना नहीं है।</p>{(q || phaseFilter !== 'all') && <button type="button" className="sb-secondary-outline" onClick={resetFilters}>सभी फसलें देखें</button>}</div> : view === 'month' ? <div className="kc-crop-grid">{visibleCrops.map(crop => <CropCard key={crop.id} crop={crop} month={month} expanded={expandedCrop === crop.id} onExpand={() => setExpandedCrop(expandedCrop === crop.id ? null : crop.id)} onCropClick={onCropClick} />)}</div> : <>
            <div className="kc-year-legend">{CALENDAR_PHASES.map(phase => <span key={phase.key}><i data-phase={phase.key} />{phase.name}</span>)}<span>— जानकारी नहीं</span></div>
            <div className="kc-year-scroll" role="region" tabIndex={0} aria-label="फसल का वार्षिक कैलेंडर; अन्य महीने देखने के लिए दाएँ स्क्रॉल करें"><table className="kc-year-table"><caption className="sr-only">महीने के अनुसार उपलब्ध सभी फसल चरण</caption><thead><tr><th scope="col">फसल</th>{MONTH_NAMES.map((name, index) => <th key={name} scope="col" data-current={month === index}><button type="button" onClick={() => chooseMonth(index)} aria-label={`${name} की योजना चुनें`}>{SHORT_MONTHS[index]}</button></th>)}</tr></thead><tbody>{visibleCrops.map(crop => <tr key={crop.id}><th scope="row"><button type="button" onClick={() => onCropClick(crop.id)} title="फसल का भाव देखें"><CropImage id={crop.id} name={crop.nameHi || crop.name} size="xs" /><span>{crop.nameHi || crop.name}</span></button></th>{MONTH_NAMES.map((name, index) => <td key={name} data-current={month === index}>{getCalendarPhases(crop, index).length ? getCalendarPhases(crop, index).map(phase => <span key={phase.key} data-phase={phase.key} title={`${name}: ${phase.name}`} aria-label={`${name}: ${phase.name}`}>{phase.shortName}</span>) : <span className="kc-no-phase" aria-label={`${name}: जानकारी उपलब्ध नहीं`}>—</span>}</td>)}</tr>)}</tbody></table></div>
          </>}
          <div className="kc-coverage"><Info size={15} aria-hidden="true" /><p><strong>{calendarCrops.length} फसलों का सामान्य कैलेंडर उपलब्ध है।</strong>{totalWithoutCalendar > 0 && ` बाकी ${totalWithoutCalendar} उत्पादों के लिए उपयुक्त कृषि कैलेंडर उपलब्ध नहीं है; उन्हें यहाँ नहीं दिखाया गया है।`}</p></div>
        </section>
      </div><aside className="kc-sidebar"><PreparationList key={`${stateParam}-${year}-${month}`} storageKey={`sahibhav:calendar-preparation:v1:${stateParam}:${year}:${month}`} month={month} />
        <section className="kc-weather-card"><CloudSun size={29} aria-hidden="true" /><span className="kc-eyebrow">काम से पहले मौसम</span><h3>आपके जिले की सलाह<br />सबसे ज़रूरी है।</h3><p>बुवाई, सिंचाई या कटाई तय करने से पहले IMD का ताज़ा कृषि मौसम बुलेटिन देखें।</p><a href="https://mausam.imd.gov.in/" target="_blank" rel="noopener noreferrer">IMD मौसम व कृषि सलाह <ArrowUpRight size={17} aria-hidden="true" /></a><small>आधिकारिक वेबसाइट खुलेगी। यहाँ लाइव पूर्वानुमान नहीं दिखाया गया है।</small></section>
        <a className="kc-guide-link" href="/blog"><span><strong>खेती को और समझें</strong><small>फसल, मंडी और बिक्री की जानकारी</small></span><ArrowRight size={20} aria-hidden="true" /></a>
      </aside></div>
    </>}
  </div>;
}
