import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Calculator, Copy, Info, Plus, RotateCcw, Scale, Trash2, Wallet } from 'lucide-react';
import SEO from '../components/SEO';
import Brand from '../components/Brand';
import Footer from '../components/Footer';
import { getDataFreshness } from '../utils/dataFreshness';
import { compareSaleOptions, saleComparisonSummary } from '../utils/saleComparison';
import '../styles/dashboard.css';
import '../styles/delivery.css';
import '../styles/sell-compare.css';

const STORAGE_KEY = 'sahibhav-sell-compare-v1';
const MAX_OPTIONS = 4;
const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
const UNIT_LABEL = { kg: 'किलो', quintal: 'क्विंटल', tonne: 'टन' };

const farmgate = () => ({ kind: 'farmgate', label: 'खेत/गाँव पर व्यापारी', pricePerQuintal: '', freightTotal: '', lossPercent: '', handlingTotal: '', otherTotal: '', commissionPercent: '', marketFeePercent: '' });
const mandi = (label = '') => ({ kind: 'mandi', label, pricePerQuintal: '', freightTotal: '', lossPercent: '', handlingTotal: '', otherTotal: '', commissionPercent: '', marketFeePercent: '' });
const emptyForm = () => ({ cropName: '', quantity: '', quantityUnit: 'quintal', options: [farmgate(), mandi('मंडी 1')] });

function readDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.options) && saved.options.length && saved.options.length <= MAX_OPTIONS && UNIT_LABEL[saved.quantityUnit]) return saved;
  } catch { /* the page works without browser storage */ }
  return emptyForm();
}

/** Prefill from a price card: dated mandi quotes become options; freight is never inherited. */
function fromScenario(scenario) {
  const form = emptyForm();
  form.cropName = scenario.cropName || '';
  const quotes = (scenario.options || []).slice(0, MAX_OPTIONS - 1);
  if (quotes.length) form.options = [farmgate(), ...quotes.map(q => ({ ...mandi(q.label || ''), pricePerQuintal: Number(q.pricePerQuintal) > 0 ? String(q.pricePerQuintal) : '', quoteDate: q.quoteDate || null, variety: q.variety || '', grade: q.grade || '' }))];
  return form;
}

function Field({ id, label, value, onChange, suffix, hint, error, required = false, max, type = 'number', placeholder = '0' }) {
  return <div className="sb-delivery-field">
    <label htmlFor={id}>{label}{required && <span className="sb-delivery-required">ज़रूरी</span>}</label>
    <div className={`sb-delivery-input${error ? ' has-error' : ''}`}>
      <input id={id} type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={value ?? ''} onChange={e => onChange(e.target.value)} min={type === 'number' ? 0 : undefined} max={max} step="any" placeholder={placeholder} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-hint` : undefined} autoComplete="off" />
      {suffix && <span>{suffix}</span>}
    </div>
    {(error || hint) && <small id={`${id}-hint`} className={error ? 'sb-delivery-error' : ''}>{error || hint}</small>}
  </div>;
}

function OptionCard({ option, index, uid, row, onChange, onRemove, canRemove }) {
  const id = key => `${uid}-${index}-${key}`;
  const set = key => value => onChange({ ...option, [key]: value });
  const isMandi = option.kind === 'mandi';
  const freshness = option.quoteDate ? getDataFreshness(option.quoteDate) : null;
  const err = key => (option[key] !== '' && option[key] != null ? row?.errors?.[key] : undefined);
  return <section className="sb-delivery-card sb-sell-option" aria-labelledby={id('title')}>
    <div className="sb-sell-option-head">
      <span className="sb-delivery-step-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="sb-delivery-field sb-sell-option-name">
        <label htmlFor={id('title')}>{isMandi ? 'कौन सी मंडी?' : 'पास का खरीदार'}</label>
        <input id={id('title')} className="sb-delivery-plain-input" value={option.label} onChange={e => set('label')(e.target.value)} placeholder={isMandi ? 'मंडी का नाम' : 'व्यापारी / गाँव'} />
      </div>
      {canRemove && <button type="button" className="sb-delivery-delete" onClick={onRemove} aria-label={`${option.label || 'विकल्प'} हटाएँ`}><Trash2 size={16} aria-hidden="true" /></button>}
    </div>
    {freshness && <p className="sb-delivery-small-note"><Info size={14} aria-hidden="true" /> दर्ज मंडी भाव भरा गया · {freshness.label}{option.variety ? ` · ${option.variety}` : ''}{option.grade ? ` · ${option.grade}` : ''}. व्यापारी का असली भाव पूछकर बदलें।</p>}
    <div className="sb-delivery-two-fields">
      <Field id={id('price')} label={isMandi ? 'मंडी में मिलने वाला भाव' : 'खरीदार का दिया भाव'} value={option.pricePerQuintal} onChange={set('pricePerQuintal')} suffix="₹ / क्विंटल" required error={err('pricePerQuintal')} />
      <Field id={id('loss')} label="वज़न / खराबे की कमी" value={option.lossPercent} onChange={set('lossPercent')} suffix="%" max={100} required={isMandi} hint={isMandi ? 'तौल में कटौती, सूखना, खराबा' : 'खाली = 0 माना जाएगा'} error={err('lossPercent')} />
    </div>
    <div className="sb-delivery-two-fields">
      <Field id={id('freight')} label="गाड़ी भाड़ा (कुल, आना-जाना)" value={option.freightTotal} onChange={set('freightTotal')} suffix="₹" required={isMandi} hint={isMandi ? 'नहीं लगता हो तो 0 भरें' : 'खरीदार ले जाए तो खाली छोड़ें'} error={err('freightTotal')} />
      <Field id={id('handling')} label="लदाई-उतराई / हम्माली" value={option.handlingTotal} onChange={set('handlingTotal')} suffix="₹" error={err('handlingTotal')} />
    </div>
    <details className="sb-delivery-extra-costs">
      <summary><span><strong>आढ़त, मंडी शुल्क और दूसरे खर्च</strong></span></summary>
      <div className="sb-delivery-two-fields">
        <Field id={id('commission')} label="आढ़त / कमीशन" value={option.commissionPercent} onChange={set('commissionPercent')} suffix="% बिक्री का" max={100} error={err('commissionPercent')} />
        <Field id={id('fee')} label="मंडी शुल्क (अगर विक्रेता से कटे)" value={option.marketFeePercent} onChange={set('marketFeePercent')} suffix="%" max={100} error={err('marketFeePercent')} />
      </div>
      <Field id={id('other')} label="अन्य खर्च (खाना, बोरी, इंतज़ार)" value={option.otherTotal} onChange={set('otherTotal')} suffix="₹" error={err('otherTotal')} />
    </details>
  </section>;
}

export default function SellComparePage() {
  const uid = useId();
  const location = useLocation();
  const [form, setForm] = useState(() => (location.state?.saleScenario ? fromScenario(location.state.saleScenario) : readDraft()));
  const [notice, setNotice] = useState(location.state?.saleScenario ? 'दर्ज मंडी भाव भर दिए हैं। भाड़ा, कमी और खेत पर मिलने वाला भाव खुद भरें।' : '');

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* optional */ } }, [form]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(t); }, [notice]);

  const result = useMemo(() => compareSaleOptions(form), [form]);
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const changeOption = (index, option) => setForm(f => ({ ...f, options: f.options.map((o, i) => (i === index ? option : o)) }));
  const removeOption = index => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== index) }));
  const addMandi = () => setForm(f => (f.options.length >= MAX_OPTIONS ? f : { ...f, options: [...f.options, mandi(`मंडी ${f.options.filter(o => o.kind === 'mandi').length + 1}`)] }));
  const reset = () => { setForm(emptyForm()); setNotice('नया हिसाब शुरू किया।'); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(saleComparisonSummary({ ...form, result })); setNotice('हिसाब कॉपी हो गया। किसी को भेजने से पहले भाव की तारीख देख लें।'); }
    catch { setNotice('कॉपी नहीं हो पाया।'); }
  };
  const best = result.best;

  return (
    <div className="sb-dashboard sb-delivery-page">
      <SEO title="मेरी फसल कहाँ बेचूँ? — भाड़ा और खर्च काटकर हाथ में कितना बचेगा" description="खेत पर व्यापारी और अलग-अलग मंडियों के भाव से भाड़ा, आढ़त, मंडी शुल्क और वज़न की कमी घटाकर देखें कि किस विकल्प में हाथ में ज़्यादा पैसा बचेगा।" path="/bechne-ka-hisab" />
      <a href="#sell-main" className="sb-skip-link">हिसाब पर जाएँ</a>
      <header className="sb-header sb-calculator-header">
        <Link to="/" aria-label="सही भाव होम"><Brand /></Link>
        <Link to="/" className="sb-text-button"><ArrowLeft size={17} aria-hidden="true" /> मंडी भाव देखें</Link>
      </header>
      <main id="sell-main" className="sb-main">
        <div className="sb-calculator-page-heading"><span className="sb-eyebrow"><Wallet size={16} aria-hidden="true" />सही भाव · बेचने का हिसाब</span><h1>मेरी फसल कहाँ बेचूँ?</h1></div>
        <section className="sb-delivery" aria-label="बेचने का हिसाब">
          <header className="sb-delivery-heading">
            <div><span className="sb-delivery-eyebrow"><Scale size={15} aria-hidden="true" /> सबसे ऊँचा भाव पूरा जवाब नहीं</span><h2>भाड़ा और खर्च काटकर<br className="sb-delivery-mobile-break" /> हाथ में कितना बचेगा?</h2><p>एक ही माल, एक ही ग्रेड। खेत पर मिलने वाला भाव और 1–3 मंडियाँ भरें।</p></div>
            <div className="sb-delivery-heading-actions"><button type="button" className="sb-delivery-button is-quiet" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> नया हिसाब</button></div>
          </header>
          {notice && <div className="sb-delivery-notice" role="status">{notice}</div>}
          <div className="sb-delivery-layout">
            <div className="sb-delivery-form">
              <section className="sb-delivery-card">
                <div className="sb-delivery-two-fields">
                  <Field id={`${uid}-crop`} label="फसल" type="text" value={form.cropName} onChange={v => change('cropName', v)} placeholder="जैसे टमाटर" />
                  <Field id={`${uid}-qty`} label="कितना माल बेचना है?" value={form.quantity} onChange={v => change('quantity', v)} suffix={UNIT_LABEL[form.quantityUnit]} required />
                </div>
                <div className="sb-delivery-price-unit"><span>मात्रा की इकाई</span><div>{Object.entries(UNIT_LABEL).map(([unit, label]) => <button type="button" key={unit} aria-pressed={form.quantityUnit === unit} onClick={() => change('quantityUnit', unit)}>{label}</button>)}</div></div>
              </section>
              {form.options.map((option, index) => <OptionCard key={index} option={option} index={index} uid={uid} row={result.rows[index]} onChange={o => changeOption(index, o)} onRemove={() => removeOption(index)} canRemove={form.options.length > 2} />)}
              {form.options.length < MAX_OPTIONS && <button type="button" className="sb-delivery-button" onClick={addMandi}><Plus size={16} aria-hidden="true" /> एक और मंडी जोड़ें</button>}
            </div>

            <aside className="sb-delivery-results" aria-label="बेचने के हिसाब का परिणाम" aria-live="polite">
              <div className="sb-delivery-result-card">
                <div className="sb-delivery-result-top"><span><Calculator size={17} aria-hidden="true" /> हाथ में कितना बचेगा</span><span className="sb-delivery-estimate-tag">अनुमान</span></div>
                {result.comparable ? <>
                  {result.tie
                    ? <p className="sb-sell-verdict"><strong>{best.label}</strong> और <strong>{result.runnerUp.label}</strong> में लगभग बराबर, {money(best.net)} बचने का अनुमान।</p>
                    : <p className="sb-sell-verdict"><strong>{best.label}</strong> में {money(best.net)} बचने का अनुमान{result.runnerUp ? <>, जो {result.runnerUp.label} से {money(result.margin)} ज़्यादा है</> : null}।</p>}
                  {result.closeCall && !result.tie && <p className="sb-delivery-small-note"><Info size={14} aria-hidden="true" /> फ़र्क बहुत कम है। ग्रेड, तौल या छूटा हुआ खर्च नतीजा पलट सकता है।</p>}
                </> : <p className="sb-delivery-empty-summary">कम से कम दो विकल्पों के ज़रूरी खाने भरें। खाली भाड़ा 0 नहीं माना जाता।</p>}
                <div className="sb-delivery-table-scroll">
                  <table className="sb-sell-table">
                    <caption className="sr-only">हर विकल्प की कुल बिक्री, कटौती और हाथ में बचत</caption>
                    <thead><tr><th scope="col">विकल्प</th><th scope="col">बिक्री</th><th scope="col">खर्च</th><th scope="col">हाथ में</th></tr></thead>
                    <tbody>{result.rows.map(row => <tr key={row.index} className={row.rank === 1 ? 'is-best' : ''}>
                      <th scope="row">{row.label}{row.status === 'ok' && row.assumedZero.length ? <small>0 माना: {row.assumedZero.join(', ')}</small> : null}</th>
                      {row.status === 'ok'
                        ? <><td>{money(row.gross)}</td><td>−{money(row.deductions)}</td><td><strong>{money(row.net)}</strong>{row.rank > 1 && <small>−{money(row.behindBest)}</small>}</td></>
                        : <td colSpan={3}><small className={row.status === 'invalid' ? 'sb-delivery-error' : ''}>{row.status === 'invalid' ? Object.values(row.errors)[0] : `बाकी: ${row.missing.join(', ')}`}</small></td>}
                    </tr>)}</tbody>
                  </table>
                </div>
                {result.comparable && <div className="sb-delivery-result-actions"><button type="button" className="sb-delivery-button" onClick={copy}><Copy size={15} aria-hidden="true" /> हिसाब कॉपी करें</button></div>}
                <p className="sb-delivery-disclaimer">यह खेती की लागत घटाने के बाद का मुनाफ़ा नहीं, बिक्री के बाद हाथ में आने वाली रकम का अनुमान है। दर्ज मंडी भाव खरीदार का पक्का भाव नहीं होता। जाने से पहले व्यापारी से भाव, तौल और भुगतान की तारीख पूछें।</p>
                <p className="sb-delivery-privacy">आपका हिसाब सिर्फ़ इसी ब्राउज़र में रहता है।</p>
              </div>
            </aside>
          </div>
        </section>
        <Footer />
      </main>
    </div>
  );
}
