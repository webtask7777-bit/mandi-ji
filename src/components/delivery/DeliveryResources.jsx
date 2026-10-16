import EditorialImage from '../EditorialImage';
import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ClipboardCheck, Copy, ExternalLink, FileText, Leaf, MapPin, Package, RotateCcw, Scale, ShieldCheck, Truck } from 'lucide-react';
import VehicleIllustration from '../VehicleIllustration';
import LoadPlanner from './LoadPlanner';
import { DELIVERY_VEHICLE_VISUALS } from '../../data/deliveryVehicleVisuals';
import { CARGO_GUIDES, DELIVERY_FAQS, DELIVERY_SOURCES, DOCUMENT_GUIDE } from '../../data/deliveryResources';
import '../../styles/delivery-resources.css';

const NUMBER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const UNIT_LABELS = { kg: 'किलो', quintal: 'क्विंटल', tonne: 'टन' };
const formatAmount = (value, suffix, empty = '[पुष्टि करें]') => value != null && !(typeof value === 'string' && !value.trim()) && Number.isFinite(Number(value)) && Number(value) >= 0 ? `${NUMBER.format(Number(value))} ${suffix}` : empty;
const cleanText = value => typeof value === 'string' ? value.trim() : '';

const VEHICLE_GUIDANCE = {
  small: { focus: 'कम मात्रा, पास की मंडी', description: 'छोटी खेप के लिए उपलब्ध गाड़ी की तुलना करें। संकरी पहुँच, लोडिंग की जगह और प्रति फेरे के पूरे खर्च से चुनाव करें।', checks: ['खेत या गोदाम तक गाड़ी पहुँच पाएगी?', 'बोरी और क्रेट के बाद कितना माल समाएगा?', 'कम माल पर न्यूनतम भाड़ा कितना लगेगा?'] },
  pickup: { focus: 'खेत से मंडी की नियमित खेप', description: 'पिकअप चुनते समय केवल नाम या बॉडी का आकार पर्याप्त नहीं है। वास्तविक वेरिएंट, अनुमत भार और ढकने की व्यवस्था पूछें।', checks: ['माल के लिए खुली बॉडी या कवर चाहिए?', 'क्रेट सुरक्षित बाँधने की व्यवस्था है?', 'वापसी और टोल कोटेशन में शामिल हैं?'] },
  'mini-truck': { focus: 'थोड़ा बड़ा लोड, पूरा हिसाब', description: 'बोरियों और क्रेट की संख्या के साथ बॉडी की लंबाई, चौड़ाई और उपयोगी ऊँचाई मिलाएँ। जगह भर सकती है, भले वजन कम हो।', checks: ['भरी गाड़ी की तौल कहाँ होगी?', 'लोडिंग और उतराई की टीम उपलब्ध है?', 'मंडी में प्रवेश का समय तय है?'] },
  'medium-truck': { focus: 'थोक खेप की तैयारी', description: 'पूरी खेप तैयार होने, खरीदार के समय और उतराई की जगह की पुष्टि करें। साझा लोड हो तो माल अलग पहचानने की व्यवस्था रखें।', checks: ['प्राप्तकर्ता पूरी खेप लेने के लिए तैयार है?', 'प्रतीक्षा शुल्क कब से गिना जाएगा?', 'बोरियों के बैच और गिनती दर्ज हैं?'] },
  'large-truck': { focus: 'बड़ी खेप, समन्वय पहले', description: 'बड़े लोड के लिए प्रवेश रास्ता, मोड़, पार्किंग और उतराई क्षमता पहले जाँचें। कुल वजन के साथ सही लोड वितरण भी आवश्यक है।', checks: ['रास्ते और गंतव्य पर गाड़ी का प्रवेश संभव है?', 'तौल पर्ची और माल की सूची तैयार हैं?', 'देरी या कम माल मिलने की प्रक्रिया तय है?'] },
};

const CHECKLIST = [
  { title: 'खरीदार और समय तय', text: 'मंडी / प्राप्तकर्ता, पूरा पता, फोन और उतराई का समय मिलाएँ।' },
  { title: 'माल, ग्रेड और तौल दर्ज', text: 'किस्म, गुणवत्ता, बोरी / क्रेट की गिनती और खाली पैकिंग का वजन लिखें।' },
  { title: 'गाड़ी और क्षमता की पुष्टि', text: 'RC, वेरिएंट, अनुमत भार, बॉडी की जगह और लोड बाँधने की व्यवस्था देखें।' },
  { title: 'पूरा भाड़ा लिखित में', text: 'टोल, आने-जाने, चढ़ाने-उतारने और प्रतीक्षा के खर्च स्पष्ट करें।' },
  { title: 'मौसम और रास्ता जाँचा', text: 'बारिश, रास्ते की स्थिति, मंडी प्रवेश और कवर / वेंटिलेशन देखें।' },
  { title: 'कागज़ साथ रखे', text: 'सौदे और माल के लागू दस्तावेज़, चालक का संपर्क और तौल पर्ची रखें।' },
  { title: 'लोड की फोटो और गिनती', text: 'रवाना होने से पहले पैकिंग, लोड और संख्या का रिकॉर्ड रखें।' },
  { title: 'प्राप्ति और भुगतान मिलान', text: 'पहुँचने पर वजन, गुणवत्ता, कमी और भुगतान की पुष्टि लें।' },
];

const READ_MORE = [
  { slug: 'tamatar-mandi-dhulai-ke-baad-bachat', title: 'दूर की मंडी में भाव ज़्यादा—क्या बचत भी ज़्यादा?', text: 'टमाटर की खेप में भाड़े और खराबे के बाद बची रकम समझें।', image: '/editorial/tamatar-mandi-kharch.webp', label: 'मंडी का चुनाव' },
  { slug: 'bheega-dhan-sukhana-nami-bhandaran', title: 'भीगा धान भेजने से पहले क्या जाँचें?', text: 'सुखाने, नमी जाँचने और खरीद केंद्र की तैयारी पर गाइड।', image: '/editorial/bheega-dhan.webp', label: 'फसल की देखभाल' },
  { slug: 'raipur-krishi-mausam-forecast-kaise-padhen', title: 'मौसम की सूचना से डिलीवरी की तैयारी', text: 'पूर्वानुमान का समय, स्थान और चेतावनी पढ़ना सीखें।', image: '/editorial/raipur-krishi-mausam.webp', label: 'मौसम की समझ' },
];

function SourceLinks({ ids = [] }) {
  const sources = ids.map(id => DELIVERY_SOURCES[id]).filter(Boolean);
  if (!sources.length) return null;
  return <div className="sb-resource-source-links"><span>स्रोत</span>{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={12} aria-hidden="true" /></a>)}</div>;
}

function ResourceHeading({ step, title, description, icon }) {
  const Icon = icon;
  return <div className="sb-resource-section-heading"><div className="sb-resource-heading-icon"><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></div><div><span className="sb-resource-eyebrow">{step}</span><h3>{title}</h3>{description && <p>{description}</p>}</div></div>;
}

function TripChecklist() {
  const uid = useId();
  const [completed, setCompleted] = useState([]);
  const progress = Math.round(completed.length / CHECKLIST.length * 100);
  return <section id="delivery-checklist" className="sb-resource-section sb-resource-checklist-section" aria-labelledby={`${uid}-title`}>
    <div className="sb-resource-checklist-top"><div><span className="sb-resource-eyebrow">हर खेप का अपना रिकॉर्ड</span><h3 id={`${uid}-title`}>रवाना होने से प्राप्ति तक</h3><p>जो काम पूरा हो, उसे स्वयं टिक करें। यह सूची इस पृष्ठ पर आपकी तैयारी के लिए है।</p></div><div className="sb-resource-completion"><strong>{completed.length}<span> / {CHECKLIST.length}</span></strong><span>जाँच पूरी</span></div></div>
    <div className="sb-resource-progress" role="progressbar" aria-label="डिलीवरी चेकलिस्ट की प्रगति" aria-valuemin={0} aria-valuemax={CHECKLIST.length} aria-valuenow={completed.length}><span style={{ width: `${progress}%` }} /></div>
    <div className="sb-resource-checklist-grid">{CHECKLIST.map((item, index) => <label key={item.title} className={`sb-resource-checklist-item${completed.includes(index) ? ' is-checked' : ''}`} htmlFor={`${uid}-check-${index}`}><input id={`${uid}-check-${index}`} type="checkbox" checked={completed.includes(index)} onChange={event => setCompleted(previous => event.target.checked ? [...previous, index] : previous.filter(value => value !== index))} /><span className="sb-resource-checkbox" aria-hidden="true">{completed.includes(index) && <Check size={14} />}</span><span><strong>{item.title}</strong><small>{item.text}</small></span></label>)}</div>
    <div className="sb-resource-checklist-bottom"><span>{completed.length === CHECKLIST.length ? 'आपने सभी बिंदु जाँच लिए हैं। अगली खेप के लिए सूची फिर शुरू करें।' : 'रास्ता, फसल या गाड़ी बदलने पर सूची नई शुरू होगी। अंतिम बिंदु माल मिलने के बाद पूरा करें।'}</span><button type="button" onClick={() => setCompleted([])} disabled={!completed.length}><RotateCcw size={14} aria-hidden="true" />सूची साफ करें</button></div>
  </section>;
}

function QuoteRequest({ form, selectedVehicle, onNotice }) {
  const uid = useId();
  const textAreaRef = useRef(null);
  const [pickupDate, setPickupDate] = useState('');
  const [notes, setNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const quantity = formatAmount(form.quantity, UNIT_LABELS[form.quantityUnit] || 'इकाई');
  const direction = Number(form.journeyFactor) === 2 ? 'जाना + वापसी' : Number(form.journeyFactor) === 1 ? 'एक तरफ' : '[एक तरफ / वापसी सहित पूछें]';
  const quoteText = [
    'नमस्ते, कृषि माल की डिलीवरी का लिखित कोटेशन चाहिए।',
    '',
    `कहाँ से: ${cleanText(form.from) || '[लोडिंग का पता / मंडी]'}`,
    `कहाँ तक: ${cleanText(form.to) || '[उतराई का पता / मंडी]'}`,
    `तारीख / समय: ${pickupDate || '[आपस में तय करें]'}`,
    `फसल / माल: ${cleanText(form.cropName) || '[फसल और किस्म]'}`,
    `माल की मात्रा: ${quantity}`,
    `खाली बोरी / क्रेट का कुल वजन: ${formatAmount(form.packagingWeightKg, 'किलो')}`,
    `गाड़ी की श्रेणी: ${selectedVehicle?.label || '[गाड़ी तय करें]'}`,
    `योजना में माल की क्षमता: ${formatAmount(form.capacityKg, 'किलो')} — वास्तविक गाड़ी से पुष्टि बाकी`,
    `दर्ज एक तरफ की दूरी: ${formatAmount(form.distanceKm, 'किमी')} — सड़क दूरी की पुष्टि करें`,
    `भाड़े का आधार: ${direction}`,
    ...(notes.trim() ? [`खास ज़रूरत: ${notes.trim()}`] : []),
    '',
    'कृपया यह स्पष्ट करें:',
    '1. प्रति फेरे का कुल भाड़ा और ज़रूरी फेरों की संख्या।',
    '2. टोल, वापसी / खाली वापसी और ईंधन किसमें शामिल हैं?',
    '3. चढ़ाने-उतारने का खर्च और मजदूर कौन देगा?',
    '4. मुफ्त प्रतीक्षा समय; उसके बाद प्रति घंटे / दिन का शुल्क।',
    '5. गाड़ी का वेरिएंट, RC के अनुसार स्वीकार्य माल और बॉडी की जगह।',
    '6. तिरपाल / वेंटिलेशन / ठंडक, क्रेट वापसी और रास्ते में माल बदलने की शर्त।',
    '7. भुगतान, रद्द करने और माल में कमी / नुकसान की शर्तें।',
    '',
    'यह भाड़ा पूछने का ड्राफ्ट है; बुकिंग या भुगतान की पुष्टि नहीं है।',
  ].join('\n');
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(quoteText);
      setCopyStatus('ड्राफ्ट कॉपी हो गया। अब आप अपनी पसंद से साझा कर सकते हैं।');
      onNotice?.('भाड़ा पूछने का ड्राफ्ट कॉपी हो गया।');
    } catch {
      textAreaRef.current?.focus();
      textAreaRef.current?.select();
      setCopyStatus('नीचे ड्राफ्ट चुना गया है। अपने फ़ोन या कीबोर्ड से कॉपी करें।');
    }
  };
  return <section className="sb-resource-section" id="delivery-quote" aria-labelledby={`${uid}-title`}>
    <ResourceHeading step="बात साफ, हिसाब साफ" icon={FileText} title="चालक से पूरा भाड़ा पूछें" description="आपके कैलकुलेटर से बना ड्राफ्ट। तारीख और खास ज़रूरत जोड़कर कॉपी करें।" />
    <div className="sb-resource-quote-layout"><div className="sb-resource-quote-controls"><h4 id={`${uid}-title`}>कोटेशन की तैयारी</h4><label htmlFor={`${uid}-date`}>कब भेजना है? <span>वैकल्पिक</span></label><input id={`${uid}-date`} type="text" value={pickupDate} onChange={event => setPickupDate(event.target.value)} placeholder="जैसे, 18 अक्टूबर · सुबह 6 बजे" maxLength={120} /><label htmlFor={`${uid}-notes`}>पैकिंग या रास्ते की खास ज़रूरत <span>वैकल्पिक</span></label><textarea id={`${uid}-notes`} value={notes} onChange={event => setNotes(event.target.value)} placeholder="जैसे, 40 क्रेट टमाटर; वापसी में खाली क्रेट लाने हैं" rows={3} maxLength={700} /><div className="sb-resource-quote-confirm"><ClipboardCheck size={20} aria-hidden="true" /><div><strong>इन चार खर्चों की पुष्टि ज़रूर लें</strong><p>टोल · लोडिंग / उतराई · प्रतीक्षा · वापसी</p><small>कोटेशन में पहले से शामिल रकम कैलकुलेटर में दोबारा न जोड़ें।</small></div></div><button type="button" className="sb-resource-primary-button" onClick={copy}><Copy size={17} aria-hidden="true" />भाड़े का ड्राफ्ट कॉपी करें</button><p className="sb-resource-quote-note">इस बटन से कोई संदेश, बुकिंग या भुगतान नहीं भेजा जाता।</p><p className="sb-resource-copy-status" role="status">{copyStatus}</p></div><div className="sb-resource-quote-preview"><div><span className="sb-resource-draft-dot" /><label htmlFor={`${uid}-preview`}>तैयार ड्राफ्ट</label><span>अपनी जानकारी जाँचें</span></div><textarea id={`${uid}-preview`} ref={textAreaRef} value={quoteText} readOnly spellCheck={false} aria-label="चालक से भाड़ा पूछने का तैयार ड्राफ्ट" /></div></div>
  </section>;
}

export default function DeliveryResources({ form, selectedVehicle, onApplyLoadPlan, onNotice }) {
  const uid = useId();
  const [cargoId, setCargoId] = useState(CARGO_GUIDES[0]?.id);
  const activeCargo = CARGO_GUIDES.find(item => item.id === cargoId) || CARGO_GUIDES[0];
  const vehicleId = selectedVehicle?.id || 'pickup';
  const vehicleGuide = VEHICLE_GUIDANCE[vehicleId] || VEHICLE_GUIDANCE.pickup;
  const vehicleVisual = DELIVERY_VEHICLE_VISUALS[vehicleId];
  const navigation = [
    { id: 'delivery-load-plan', label: 'लोड और पैकिंग', Icon: Package },
    { id: 'delivery-crop-care', label: 'फसल की देखभाल', Icon: Leaf },
    { id: 'delivery-quote', label: 'भाड़े का ड्राफ्ट', Icon: FileText },
    { id: 'delivery-checklist', label: 'खेप की चेकलिस्ट', Icon: ClipboardCheck },
    { id: 'delivery-documents', label: 'ज़रूरी कागज़', Icon: ShieldCheck },
    { id: 'delivery-faq', label: 'सवाल-जवाब', Icon: BookOpen },
  ];
  return <div className="sb-delivery-resource" id="delivery-guide">
    <header className="sb-resource-intro"><div className="sb-resource-intro-copy"><span className="sb-resource-eyebrow"><BookOpen size={16} aria-hidden="true" /> सही भाव रिसोर्स सेंटर</span><h2>मंडी डिलीवरी गाइड</h2><p>सही गाड़ी चुनने से लेकर सुरक्षित पैकिंग, साफ कोटेशन और माल की प्राप्ति तक—अपनी अगली खेप की पूरी तैयारी करें।</p><div className="sb-resource-intro-meta"><span><CheckCircle2 size={14} aria-hidden="true" />मुफ्त प्लानिंग टूल</span><span>हिंदी में व्यावहारिक जानकारी</span></div></div><div className="sb-resource-intro-note"><span>एक काम की आदत</span><strong>भाव के साथ,<br />पहुँचने का खर्च भी देखें।</strong><p>भाड़ा + पैकिंग + कमी + समय<br />इनका असर अंतिम बचत पर पड़ता है।</p><ArrowDown size={21} aria-hidden="true" /></div></header>
    <nav className="sb-resource-navigation" aria-label="डिलीवरी गाइड के विषय">{navigation.map(item => { const Icon = item.Icon; return <a key={item.id} href={`#${item.id}`}><Icon size={17} aria-hidden="true" /><span>{item.label}</span><ArrowDown size={13} aria-hidden="true" /></a>; })}</nav>

    <section className="sb-resource-vehicle" aria-labelledby={`${uid}-vehicle-title`}><div className="sb-resource-vehicle-art"><span>कैलकुलेटर में चुनी गई श्रेणी</span><VehicleIllustration vehicleId={vehicleId} /><div><strong>{selectedVehicle?.label || 'पिकअप'}</strong><span>{vehicleVisual?.referenceLabel} · सांकेतिक दृश्य</span></div></div><div className="sb-resource-vehicle-copy"><span className="sb-resource-eyebrow"><Truck size={15} aria-hidden="true" /> गाड़ी का चुनाव</span><h3 id={`${uid}-vehicle-title`}>{vehicleGuide.focus}</h3><p>{vehicleGuide.description}</p><ul>{vehicleGuide.checks.map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul><div className="sb-resource-capacity-note"><Scale size={19} aria-hidden="true" /><div><strong>दर्ज योजना क्षमता: {formatAmount(form.capacityKg, 'किलो', 'अभी तय नहीं')}</strong><span>यह निर्माता का स्पेसिफिकेशन नहीं है। गाड़ी के RC, वेरिएंट और चालक से स्वीकार्य भार की पुष्टि करें।</span></div></div></div></section>

    <div className="sb-resource-explainers" aria-label="कैलकुलेटर का हिसाब समझें"><article><span>01 / गाड़ी का वजन</span><h3>Payload और GVW अलग हैं</h3><p>Payload माल ढोने की क्षमता है। GVW में गाड़ी का अपना वजन भी आता है; उसे माल की क्षमता न भरें। माल + खाली पैकिंग का वजन और बॉडी की जगह, दोनों जाँचें।</p></article><article><span>02 / भाड़े का आधार</span><h3>प्रति किमी या प्रति फेरा?</h3><p>प्रति किमी में दूरी और तय वापसी जुड़ती है। प्रति फेरा कोटेशन हर फेरे पर लगता है। टोल भी प्रति फेरा हो तो कुल फेरों से गुणा करें; शामिल खर्च दोबारा न जोड़ें।</p></article><article><span>03 / सही तुलना</span><h3>उतने ही उपयोगी माल से तुलना</h3><p>स्थानीय खरीद में वहीं उतना माल खरीदने का खर्च देखें। आगे बिक्री में उतने माल की बिक्री रकम देखें। दोनों में कमी के बाद बची समान मात्रा और तुलनीय ग्रेड लें।</p></article></div>

    <section className="sb-resource-section" id="delivery-load-plan" aria-labelledby={`${uid}-load-title`}><div id={`${uid}-load-title`}><ResourceHeading step="01 / मात्रा समझें" icon={Package} title="बोरी और क्रेट से लोड की योजना" description="माल के साथ खाली पैकिंग का वजन भी गाड़ी में जाता है। दोनों को अलग गिनें।" /></div><LoadPlanner payloadCapacityKg={form.capacityKg} onApply={onApplyLoadPlan} /></section>

    <section className="sb-resource-section" id="delivery-crop-care" aria-labelledby={`${uid}-crop-title`}><div id={`${uid}-crop-title`}><ResourceHeading step="02 / माल को सही तरह भेजें" icon={Leaf} title="हर फसल की देखभाल अलग" description="अपनी खेप से मिलता समूह चुनें। पैकिंग और यात्रा की तैयारी की शुरुआती जाँच करें।" /></div><div className="sb-resource-cargo-switch" role="group" aria-label="फसल देखभाल का समूह चुनें">{CARGO_GUIDES.map((cargo, index) => <button key={cargo.id} type="button" aria-pressed={activeCargo?.id === cargo.id} onClick={() => setCargoId(cargo.id)}><span>0{index + 1}</span>{cargo.label}</button>)}</div>{activeCargo && <div className="sb-resource-cargo-panel"><div className="sb-resource-cargo-summary"><span className="sb-resource-eyebrow">खेप की देखभाल</span><h4>{activeCargo.label}</h4><p>{activeCargo.description}</p><SourceLinks ids={activeCargo.sourceIds} /></div><ol className="sb-resource-cargo-tips">{activeCargo.tips.map((tip, index) => <li key={tip}><span>{index + 1}</span><p>{tip}</p></li>)}</ol></div>}</section>

    <QuoteRequest form={form} selectedVehicle={selectedVehicle} onNotice={onNotice} />
    <TripChecklist key={`${form.from || ''}\u0000${form.to || ''}\u0000${form.cropId || form.cropName || ''}\u0000${vehicleId}`} />

    <section className="sb-resource-section" id="delivery-documents" aria-labelledby={`${uid}-docs-title`}><div id={`${uid}-docs-title`}><ResourceHeading step="03 / कागज़ और पुष्टि" icon={ShieldCheck} title="खेप के साथ क्या रखें?" description="ज़रूरत माल, सौदे और रास्ते के अनुसार बदलती है। नीचे आधिकारिक स्रोतों से शुरुआत करें।" /></div><div className="sb-resource-document-grid">{DOCUMENT_GUIDE.map((document, index) => <article className="sb-resource-document" key={document.title}><span className="sb-resource-document-number">0{index + 1}</span><h4>{document.title}</h4><p>{document.description}</p><SourceLinks ids={document.sourceIds} /></article>)}</div></section>

    <section className="sb-resource-section sb-resource-faq-section" id="delivery-faq" aria-labelledby={`${uid}-faq-title`}><div id={`${uid}-faq-title`}><ResourceHeading step="सीधे सवाल, उपयोगी जवाब" icon={BookOpen} title="डिलीवरी से जुड़े आम सवाल" description="भाड़े, वजन, गाड़ी और कागज़ के फैसलों को समझें।" /></div><div className="sb-resource-faq-list">{DELIVERY_FAQS.map((faq, index) => <details key={faq.question} className="sb-resource-faq"><summary><span className="sb-resource-faq-number">{String(index + 1).padStart(2, '0')}</span><span>{faq.question}</span><ChevronDown size={18} aria-hidden="true" /></summary><div><p>{faq.answer}</p><SourceLinks ids={faq.sourceIds} /></div></details>)}</div></section>

    <section className="sb-resource-reading" aria-labelledby={`${uid}-reading-title`}><div className="sb-resource-reading-heading"><div><span className="sb-resource-eyebrow">थोड़ा और समझें</span><h3 id={`${uid}-reading-title`}>आपकी अगली खेप के काम के लेख</h3></div><Link to="/blog">सभी गाइड <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="sb-resource-reading-grid">{READ_MORE.map(article => <Link key={article.slug} className="sb-resource-reading-card" to={`/blog/${article.slug}`}><div className="sb-resource-reading-image"><EditorialImage src={article.image} alt="" loading="lazy" decoding="async" width="1672" height="941" /><span>सांकेतिक चित्र</span></div><div className="sb-resource-reading-copy"><span>{article.label}</span><h4>{article.title}</h4><p>{article.text}</p><strong>गाइड पढ़ें <ArrowRight size={15} aria-hidden="true" /></strong></div></Link>)}</div></section>

    <footer className="sb-resource-sources"><div className="sb-resource-sources-heading"><BookOpen size={21} aria-hidden="true" /><div><h3>स्रोत खोलकर भी जाँचें</h3><p>स्रोत समीक्षा: <time dateTime="2026-10-16">16 अक्टूबर 2026</time>। यह गाइड योजना बनाने में मदद करती है; लागू नियम और स्थानीय शर्तें मूल स्रोत व संबंधित पक्ष से मिलाएँ।</p></div></div><div className="sb-resource-source-directory">{Object.entries(DELIVERY_SOURCES).map(([id, source]) => <a key={id} href={source.url} target="_blank" rel="noopener noreferrer"><span>{source.publisher}</span><strong>{source.title}</strong><ExternalLink size={15} aria-hidden="true" /></a>)}</div><div className="sb-resource-footer-note"><MapPin size={15} aria-hidden="true" /><span>दूरी, भाड़ा, वाहन क्षमता और खरीदार का समय—अपनी वास्तविक खेप के लिए पुष्टि करें।</span></div></footer>
  </div>;
}
