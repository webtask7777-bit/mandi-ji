import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, Info, Sprout } from 'lucide-react';
import CropImage from '@/components/CropImage';
import { MONTHS, FALLBACK_SEASONS } from '../data/constants';
import { getMonthPhase } from '../utils/helpers';
import '@/styles/secondary.css';

const MONTH_NAMES = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const PHASES = {
  Buvai: { name: 'बुवाई', color: '#8b6143' },
  Ugna: { name: 'बढ़वार', color: '#597d53' },
  Katai: { name: 'कटाई', color: '#ba753e' },
  'Peak Arrival': { name: 'मुख्य आवक', color: '#7d7134' },
};

export default function CalendarTab({ selectedMonth, crops = [], seasons }) {
  const [month, setMonth] = useState(selectedMonth);
  const [selectedCrop, setSelectedCrop] = useState(null);
  useEffect(() => { setMonth(selectedMonth); }, [selectedMonth]);
  const calendarCrops = crops.filter(crop => MONTHS.some((_, index) => getMonthPhase(crop, index)));
  const activeCrops = calendarCrops.filter(crop => getMonthPhase(crop, month));
  const displaySeasons = Array.isArray(seasons) && seasons.length ? seasons : FALLBACK_SEASONS;

  return (
    <div className="sb-secondary-tab sb-calendar-tab flex flex-col">
      <div className="sb-secondary-heading">
        <div><span className="sb-secondary-eyebrow">फसल योजना</span><h2>हर मौसम की तैयारी</h2><p>महीना चुनें। बुवाई, कटाई और मुख्य आवक का उपलब्ध कैलेंडर देखें।</p></div>
        <img src="/visuals/crop-paddy.webp" alt="" width="96" height="96" />
      </div>

      <section className="sb-calendar-controls" aria-label="कैलेंडर का महीना चुनें">
        <div className="sb-section-title"><CalendarDays size={20} /><h3>{MONTH_NAMES[month]} की गतिविधियाँ</h3><span>{activeCrops.length} फसलें</span></div>
        <div className="sb-month-picker">
          {MONTH_NAMES.map((name, index) => <button key={name} type="button" aria-pressed={month === index} onClick={() => { setMonth(index); setSelectedCrop(null); }}>{name}</button>)}
        </div>
      </section>

      <div className="sb-context-note"><Info size={17} aria-hidden="true" /><p>यह मौसमी मार्गदर्शिका है। वास्तविक समय क्षेत्र, किस्म, बारिश और सिंचाई के अनुसार बदल सकता है। खाली महीना “जानकारी उपलब्ध नहीं” दर्शाता है।</p></div>

      <section aria-label={`${MONTH_NAMES[month]} में सक्रिय फसलें`}>
        {activeCrops.length ? <div className="sb-active-crops">
          {activeCrops.map(crop => {
            const phase = PHASES[getMonthPhase(crop, month)?.label];
            const expanded = selectedCrop === crop.id;
            return <article key={crop.id} className="sb-calendar-crop" data-expanded={expanded}>
              <button type="button" className="sb-calendar-crop-trigger" aria-expanded={expanded} onClick={() => setSelectedCrop(expanded ? null : crop.id)}>
                <CropImage id={crop.id} name={crop.nameHi || crop.name} size="md" />
                <span className="sb-calendar-crop-name"><strong>{crop.nameHi || crop.name}</strong><small>{crop.region || 'क्षेत्र की जानकारी उपलब्ध नहीं'}</small></span>
                <span className="sb-phase-badge" style={{ backgroundColor: phase?.color }}>{phase?.name}</span>
                <ChevronDown size={16} className={expanded ? 'sb-rotate' : ''} aria-hidden="true" />
              </button>
              {expanded && <div className="sb-calendar-crop-detail">
                {crop.desc && <p>{crop.desc}</p>}
                <h4>इस फसल का वर्ष</h4>
                <div className="sb-crop-year">{MONTHS.map((name, index) => {
                  const p = PHASES[getMonthPhase(crop, index)?.label];
                  return <div key={name} title={`${MONTH_NAMES[index]}: ${p?.name || 'जानकारी उपलब्ध नहीं'}`}><span style={{ backgroundColor: p?.color || '#edf0e6' }} data-current={month === index} /><small>{name}</small></div>;
                })}</div>
              </div>}
            </article>;
          })}
        </div> : <div className="sb-secondary-empty"><Sprout size={28} /><h3>{MONTH_NAMES[month]} की गतिविधि उपलब्ध नहीं</h3><p>किसी दूसरे महीने का कैलेंडर देखें। इसका अर्थ खेती या आवक बंद होना नहीं है।</p></div>}
      </section>

      <section>
        <div className="sb-section-title"><h3>पूरे वर्ष का कैलेंडर</h3><span>{calendarCrops.length} फसलों की जानकारी</span></div>
        <div className="sb-phase-legend" aria-label="कैलेंडर रंगों का अर्थ">{Object.entries(PHASES).map(([key, p]) => <span key={key}><i style={{ background: p.color }} />{p.name}</span>)}<span><i style={{ background: '#edf0e6' }} />जानकारी नहीं</span></div>
        {calendarCrops.length ? <div className="sb-calendar-table-scroll" role="region" aria-label="वार्षिक कैलेंडर; सभी महीने देखने के लिए दाएँ स्क्रॉल करें" tabIndex={0}>
          <table className="sb-calendar-table">
            <caption className="sr-only">फसल और महीने के अनुसार प्रमुख मौसमी गतिविधि</caption>
            <thead><tr><th scope="col">फसल</th>{MONTHS.map((name, index) => <th scope="col" key={name} data-current={month === index} title={MONTH_NAMES[index]}>{name}</th>)}</tr></thead>
            <tbody>{calendarCrops.map(crop => <tr key={crop.id}><th scope="row"><span><CropImage id={crop.id} name={crop.nameHi || crop.name} size="xs" />{crop.nameHi || crop.name}</span></th>{MONTHS.map((name, index) => {
              const phase = PHASES[getMonthPhase(crop, index)?.label];
              return <td key={name} data-current={month === index}><span className="sb-calendar-cell" style={{ background: phase?.color || '#edf0e6' }} title={`${MONTH_NAMES[index]}: ${phase?.name || 'जानकारी उपलब्ध नहीं'}`}><span className="sr-only">{phase?.name || 'जानकारी उपलब्ध नहीं'}</span></span></td>;
            })}</tr>)}</tbody>
          </table>
        </div> : <div className="sb-secondary-empty"><p>चुने हुए क्षेत्र के लिए फसल कैलेंडर उपलब्ध नहीं है।</p></div>}
        {crops.length > calendarCrops.length && <p className="sb-data-caption">{crops.length - calendarCrops.length} अन्य फसलों का मौसम कैलेंडर उपलब्ध नहीं है; उन्हें तालिका में शामिल नहीं किया गया है।</p>}
      </section>

      <section><div className="sb-section-title"><h3>ऋतुओं का एक नज़र में परिचय</h3></div><div className="sb-season-grid">{displaySeasons.map(season => <article key={season.id || season.name}><h4>{season.nameHi || season.name}</h4><p>{(season.months || []).map(index => MONTH_NAMES[index]).join(' · ')}</p></article>)}</div></section>
    </div>
  );
}
