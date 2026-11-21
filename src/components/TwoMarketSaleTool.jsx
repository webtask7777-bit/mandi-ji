import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, RotateCcw } from 'lucide-react';
import { breakEvenPerKg, marketResult } from '../utils/twoMarketSale';

// Inline "two markets" worksheet for the tomato guide. The arithmetic is the shared
// calculateSaleOption used by /bechne-ka-hisab; this form only takes the article's units
// (₹ per kg, unsold kg) and converts them (₹ per quintal, loss %).
// Prefilled with the article's own worked example so a reader can check it, then change it.
const EXAMPLE = {
  quantityKg: '1000',
  near: { label: 'पास की मंडी', pricePerKg: '14', unsoldKg: '20', freight: '800', handling: '300', crates: '200', other: '200' },
  far: { label: 'दूर की मंडी', pricePerKg: '17', unsoldKg: '50', freight: '2200', handling: '500', crates: '300', other: '300' },
};
const FIELDS = [
  ['pricePerKg', 'अनुमानित बिक्री भाव', '₹/किलो'],
  ['unsoldKg', 'बिक न पाने वाला माल', 'किलो'],
  ['freight', 'ढुलाई', '₹'],
  ['handling', 'चढ़ाना-उतारना', '₹'],
  ['crates', 'क्रेट का खर्च', '₹'],
  ['other', 'अन्य खर्च', '₹'],
];
// The shared calculator names missing fields in its own words; show this form's labels.
const FORM_NAMES = { 'भाव': 'बिक्री भाव', 'भाड़ा': 'ढुलाई', 'वजन/माल की कमी': 'बिक न पाने वाला माल' };
const rupees = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
export default function TwoMarketSaleTool() {
  const id = useId();
  const [form, setForm] = useState(EXAMPLE);
  const near = useMemo(() => marketResult(form.near, form.quantityKg), [form]);
  const far = useMemo(() => marketResult(form.far, form.quantityKg), [form]);
  const both = near.status === 'ok' && far.status === 'ok';
  const difference = both ? far.net - near.net : null;
  const breakEven = breakEvenPerKg(near, far);
  const set = (market, key) => event => setForm(previous => ({ ...previous, [market]: { ...previous[market], [key]: event.target.value } }));

  return <section className="sb-inline-tool" aria-labelledby={`${id}-title`}>
    <span className="sb-journal-eyebrow"><Calculator size={14} aria-hidden="true" /> यहीं हिसाब करें</span>
    <h2 id={`${id}-title`}>दो मंडियों में बिक्री खर्च के बाद रकम</h2>
    <p>पहले से भरे आँकड़े ऊपर वाला काल्पनिक उदाहरण हैं, आज का भाव या भाड़ा नहीं। अपनी खेप, खरीदार की बात और वाहन के quote से बदलें। खाली खाना शून्य नहीं माना जाता: भाव, बिक न पाने वाला माल और ढुलाई भरना ज़रूरी है।</p>
    <label className="sb-inline-tool__qty" htmlFor={`${id}-qty`}>भेजा जाने वाला कुल माल (किलो)
      <input id={`${id}-qty`} type="number" inputMode="decimal" min="0" step="any" value={form.quantityKg} onChange={event => setForm(previous => ({ ...previous, quantityKg: event.target.value }))} />
    </label>
    <div className="sb-inline-tool__grid">
      {['near', 'far'].map(market => {
        const result = market === 'near' ? near : far;
        return <fieldset key={market}>
          <legend>{form[market].label}</legend>
          {FIELDS.map(([key, label, unit]) => <label key={key} htmlFor={`${id}-${market}-${key}`}>
            <span>{label} <small>({unit})</small></span>
            <input id={`${id}-${market}-${key}`} type="number" inputMode="decimal" min="0" step="any" value={form[market][key]} onChange={set(market, key)} aria-invalid={Boolean(result.errors?.[key === 'pricePerKg' ? 'pricePerQuintal' : key])} />
          </label>)}
          <output htmlFor={FIELDS.map(([key]) => `${id}-${market}-${key}`).join(' ')} aria-live="polite">
            {result.status === 'ok' ? <>
              <span>बिकने वाला माल {Math.round(result.saleableKg).toLocaleString('en-IN')} किलो · सकल {rupees(result.gross)} · खर्च {rupees(result.deductions)}</span>
              <strong>खर्च के बाद {rupees(result.net)}</strong>
            </> : <span className="sb-inline-tool__note">{result.status === 'invalid' ? Object.values(result.errors).join('; ') : `भरें: ${result.missing.map(name => FORM_NAMES[name] || name).join(', ')}`}</span>}
          </output>
        </fieldset>;
      })}
    </div>
    <div className="sb-inline-tool__result" aria-live="polite">
      {both ? <>
        <p><strong>{difference === 0 ? 'दोनों मंडियों में रकम बराबर है।' : `${difference > 0 ? 'दूर' : 'पास'} की मंडी में ${rupees(Math.abs(difference))} ज़्यादा बचते हैं।`}</strong></p>
        {breakEven != null && <p>बाकी आँकड़े यही रहें तो दूर की मंडी को पास के बराबर आने के लिए लगभग ₹{(Math.ceil(breakEven * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} प्रति किलो चाहिए। यह गणित का break-even है, भाव का अनुमान नहीं।</p>}
        <p className="sb-inline-tool__note">यह खेती का शुद्ध मुनाफा नहीं है: उत्पादन लागत और भुगतान में देरी इसमें नहीं जुड़ी।</p>
      </> : <p className="sb-inline-tool__note">दोनों मंडियों के ज़रूरी खाने भरने पर तुलना दिखेगी।</p>}
    </div>
    <div className="sb-inline-tool__actions">
      <button type="button" className="sb-detail-text-link" onClick={() => setForm(EXAMPLE)}><RotateCcw size={15} aria-hidden="true" /> उदाहरण के आँकड़े वापस लाएँ</button>
      <Link className="sb-detail-text-link" to="/bechne-ka-hisab">आढ़त, मंडी शुल्क या खेत पर बिक्री जोड़नी हो तो पूरा बिक्री हिसाब <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  </section>;
}
