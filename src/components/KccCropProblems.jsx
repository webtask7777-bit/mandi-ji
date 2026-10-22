import { Link } from 'react-router-dom';
import { ArrowRight, Sprout } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { KIND_LABEL, MONTHS_HI, currentMonthIST, nextMonth, salahPath } from '../utils/kccAdvice';
import '../styles/fasal-salah.css';

/** On a crop price page: what Kisan Call Centre callers ask about this crop this month. */
export default function KccCropProblems({ cropId, cropName, stateId = 'all' }) {
  const query = stateId && stateId !== 'all' ? `?state=${encodeURIComponent(stateId)}` : '';
  const { data } = useApi(`/kcc/crop/${encodeURIComponent(cropId)}${query}`);
  const month = currentMonthIST();
  const problems = data?.months?.[month - 1] || [];
  const upcoming = (data?.months?.[nextMonth(month) - 1] || []).filter(item => !problems.some(now => now.key === item.key)).slice(0, 2);
  if (!problems.length && !upcoming.length) return null;
  const scopeName = data.scope?.nameHi || 'भारत';
  return <section className="sb-detail-section sb-crop-kcc" aria-labelledby="crop-kcc-title">
    <span className="sb-detail-kicker"><Sprout size={15} aria-hidden="true" /> फसल सलाह · किसान कॉल सेंटर</span>
    <h2 id="crop-kcc-title">{MONTHS_HI[month - 1]} में {cropName} के किसान क्या पूछते हैं</h2>
    <p>{scopeName} में पिछले सालों के इसी महीने {cropName} से जुड़े हर 100 सवालों में से कितने किस समस्या के थे। हर समस्या पर KCC की सलाह फसल सलाह पृष्ठ पर पढ़ें।</p>
    {problems.length > 0 && <ul>{problems.map(item => <li key={item.key}>
      <span>{item.problemHi} <small className="sb-salah-kind">{KIND_LABEL[item.kind]}</small></span>
      <strong>100 में {Math.round(item.share)}</strong>
      <div className="sb-salah-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, item.share)}%` }} /></div>
    </li>)}</ul>}
    {upcoming.length > 0 && <p className="sb-salah-muted">{MONTHS_HI[nextMonth(month) - 1]} में बढ़ सकता है: {upcoming.map(item => item.problemHi).join(', ')}</p>}
    <Link className="sb-detail-text-link" to={salahPath(data.scope?.id !== 'all' ? data.scope?.id : undefined)}>अपने ज़िले की पूरी फसल सलाह देखें <ArrowRight size={15} aria-hidden="true" /></Link>
  </section>;
}
