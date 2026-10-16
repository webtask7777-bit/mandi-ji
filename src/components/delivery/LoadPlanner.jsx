import { useId, useState } from 'react';
import { ArrowUpRight, Package, Scale } from 'lucide-react';
import { calculateLoadPlan } from '../../utils/loadPlanner';

const format = value => new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 12 }).format(value);
const PACK_TYPES = ['बोरी', 'क्रेट', 'पेटी'];

export default function LoadPlanner({ onApply, payloadCapacityKg }) {
  const uid = useId();
  const [packType, setPackType] = useState('बोरी');
  const [form, setForm] = useState({ packageCount: '', produceKgPerPackage: '', emptyPackageKg: '' });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [applied, setApplied] = useState(false);
  const result = calculateLoadPlan({ ...form, payloadCapacityKg });
  const fields = [
    { key: 'packageCount', label: `${packType} की संख्या`, unit: 'पैक', hint: 'सिर्फ पूरी संख्या लिखें।', min: 1, step: 1, inputMode: 'numeric' },
    { key: 'produceKgPerPackage', label: `एक ${packType} में माल का शुद्ध वजन`, unit: 'किलो', hint: 'खाली पैक का वजन इसमें शामिल न करें।', min: 0, step: 'any', inputMode: 'decimal' },
    { key: 'emptyPackageKg', label: `एक खाली ${packType} का वजन`, unit: 'किलो', hint: 'वास्तविक वजन लिखें; वजन नहीं है तो 0।', min: 0, step: 'any', inputMode: 'decimal' },
  ];

  const change = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setApplied(false);
  };
  const apply = event => {
    event.preventDefault();
    setSubmitted(true);
    if (!result.valid || !onApply) return;
    onApply({ quantityKg: result.quantityKg, packagingWeightKg: result.packagingWeightKg });
    setApplied(true);
  };

  return <section className="sb-load-planner" aria-labelledby={`${uid}-title`}>
    <div className="sb-load-heading">
      <span className="sb-load-icon"><Package size={22} aria-hidden="true" /></span>
      <div><h3 id={`${uid}-title`}>पैक गिनें, कुल वजन निकालें</h3><p>माल और खाली पैक का वजन अलग रखें, ताकि फेरे सही गिने जाएँ।</p></div>
    </div>
    <form onSubmit={apply} noValidate>
      <div className="sb-load-fields">
        <div className="sb-load-field">
          <label htmlFor={`${uid}-type`}>पैकिंग का प्रकार</label>
          <select id={`${uid}-type`} value={packType} onChange={event => setPackType(event.target.value)}>
            {PACK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <small>प्रकार चुनने से कोई वजन अपने आप नहीं भरेगा।</small>
        </div>
        {fields.map(field => {
          const id = `${uid}-${field.key}`;
          const error = (touched[field.key] || submitted) ? result.errors?.[field.key] : undefined;
          return <div className="sb-load-field" key={field.key}>
            <label htmlFor={id}>{field.label}</label>
            <div className={`sb-load-input${error ? ' has-error' : ''}`}>
              <input id={id} type="number" inputMode={field.inputMode} value={form[field.key]} min={field.min} step={field.step}
                required autoComplete="off" placeholder="दर्ज करें" aria-invalid={error ? true : undefined} aria-describedby={`${id}-hint`}
                onChange={event => change(field.key, event.target.value)} onBlur={() => setTouched(previous => ({ ...previous, [field.key]: true }))} />
              <span>{field.unit}</span>
            </div>
            <small id={`${id}-hint`} className={error ? 'sb-load-error' : undefined}>{error || field.hint}</small>
          </div>;
        })}
      </div>
      {result.valid ? <div className="sb-load-result">
        <dl className="sb-load-totals">
          <div><dt>माल का शुद्ध वजन</dt><dd>{format(result.quantityKg)} <span>किलो</span></dd><dd className="sb-load-equation">{format(result.packageCount)} × {format(result.produceKgPerPackage)} किलो</dd></div>
          <div><dt>खाली पैक का कुल वजन</dt><dd>{format(result.packagingWeightKg)} <span>किलो</span></dd><dd className="sb-load-equation">{format(result.packageCount)} × {format(result.emptyPackageKg)} किलो</dd></div>
          <div className="sb-load-total"><dt>कुल ढुलाई वजन</dt><dd>{format(result.loadedWeightKg)} <span>किलो</span></dd><dd className="sb-load-equation">माल + खाली पैक</dd></div>
        </dl>
        <p className="sb-load-trips"><Scale size={17} aria-hidden="true" />{result.trips != null
          ? `दर्ज ${format(result.payloadCapacityKg)} किलो क्षमता पर वजन के अनुसार कम से कम ${format(result.trips)} ${result.trips === 1 ? 'फेरा' : 'फेरे'}।`
          : 'फेरों का अनुमान पाने के लिए ऊपर कैलकुलेटर में गाड़ी की सही क्षमता दर्ज करें।'}</p>
      </div> : <p className={`sb-load-placeholder${result.errors?.calculation ? ' sb-load-error' : ''}`}>
        {result.errors?.calculation || 'संख्या, प्रति पैक माल और खाली पैक का वजन भरने पर हिसाब दिखेगा।'}
      </p>}
      <p className="sb-load-note">वजन के अनुसार अनुमान; जगह, ऊँचाई और सुरक्षित stacking अलग जाँचें। सभी पैक का भरा वजन समान मानकर गणना की गई है।</p>
      {onApply && <div className="sb-load-actions">
        <button type="submit" className="sb-load-apply">वजन मुख्य कैलकुलेटर में भरें <ArrowUpRight size={17} aria-hidden="true" /></button>
        <span className="sb-load-feedback" role="status">{applied ? 'माल और पैकिंग का वजन कैलकुलेटर में भर दिया है।' : 'यह सिर्फ मात्रा और पैकिंग का वजन बदलेगा।'}</span>
      </div>}
    </form>
  </section>;
}
