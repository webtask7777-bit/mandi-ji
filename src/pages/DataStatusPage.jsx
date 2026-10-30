import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Database, Info } from 'lucide-react';
import SEO from '../components/SEO';
import Brand from '../components/Brand';
import Footer from '../components/Footer';
import { useApi } from '../hooks/useApi';
import { getDataFreshness } from '../utils/dataFreshness';
import { findDataGaps, sortStatesByFreshness } from '../utils/dataStatus';
import '../styles/dashboard.css';
import '../styles/delivery.css';
import '../styles/sell-compare.css';

const number = n => Number(n || 0).toLocaleString('en-IN');
const label = iso => (iso ? getDataFreshness(iso).dateLabel : 'उपलब्ध नहीं');

export default function DataStatusPage() {
  const { data, loading, error } = useApi('/stats/data-status');
  const states = sortStatesByFreshness(data?.states || []);
  const gaps = findDataGaps(data?.dateRange || [], 0);
  const newest = data?.newestObservation;

  return (
    <div className="sb-dashboard sb-delivery-page">
      <SEO title="भाव कितने ताज़ा हैं? — राज्यवार आख़िरी दर्ज तारीख" description="सही भाव पर हर राज्य के मंडी भाव किस तारीख तक दर्ज हैं, पिछले 7 दिनों में कितनी मंडियों ने भाव भेजे, और हमारे संग्रह में किन तारीखों के रिकॉर्ड उपलब्ध नहीं हैं।" path="/data-status" />
      <a href="#status-main" className="sb-skip-link">जानकारी पर जाएँ</a>
      <header className="sb-header sb-calculator-header">
        <Link to="/" aria-label="सही भाव होम"><Brand /></Link>
        <Link to="/" className="sb-text-button"><ArrowLeft size={17} aria-hidden="true" /> मंडी भाव देखें</Link>
      </header>
      <main id="status-main" className="sb-main">
        <div className="sb-calculator-page-heading"><span className="sb-eyebrow"><Database size={16} aria-hidden="true" />सही भाव · डेटा की स्थिति</span><h1>भाव कितने ताज़ा हैं?</h1></div>
        <section className="sb-delivery" aria-label="डेटा की स्थिति">
          {loading && <p className="sb-delivery-empty-summary">लोड हो रहा है…</p>}
          {error && <p className="sb-delivery-error">स्थिति अभी लोड नहीं हो पाई। थोड़ी देर बाद फिर देखें।</p>}
          {data && <>
            <div className="sb-delivery-card">
              <p className="sb-sell-verdict" style={{ padding: 0 }}><CalendarDays size={18} aria-hidden="true" /> सबसे नई दर्ज तारीख: <strong>{label(newest)}</strong></p>
              <p className="sb-delivery-small-note" style={{ padding: '10px 0 0' }}><Info size={14} aria-hidden="true" /> यह मंडी में भाव दर्ज होने की तारीख है, डेटा डाउनलोड करने का समय नहीं। स्रोत: कृषि एवं किसान कल्याण मंत्रालय का data.gov.in डेटासेट। हर राज्य हर दिन भाव नहीं भेजता।</p>
              {gaps.length > 0 && <>
                <h2 style={{ fontSize: 17, margin: '20px 0 8px' }}>संग्रह में तारीखों का अंतर</h2>
                <p className="sb-delivery-small-note">नीचे की तारीखों के रिकॉर्ड हमारे संग्रह में उपलब्ध नहीं हैं। कारण की पुष्टि नहीं है—स्रोत ने भाव नहीं दिए हों या संग्रह अधूरा रहा हो सकता है।{gaps.length > 8 ? ` कुल ${number(gaps.length)} अवधि में से आख़िरी 8 यहाँ दिखाई गई हैं।` : ''}</p>
                {gaps.slice(0, 8).map(gap => <p key={gap.from} className="sb-delivery-small-note" style={{ padding: '8px 0 0' }}><Info size={14} aria-hidden="true" /> {label(gap.from)}{gap.from !== gap.to ? ` से ${label(gap.to)}` : ''} · {number(gap.days)} दिन के रिकॉर्ड उपलब्ध नहीं।</p>)}
              </>}
            </div>
            <div className="sb-delivery-card" style={{ marginTop: 20 }}>
              <h2 style={{ fontSize: 17, margin: '0 0 12px' }}>राज्यवार आख़िरी दर्ज भाव</h2>
              <div className="sb-delivery-table-scroll">
                <table className="sb-sell-table">
                  <caption className="sr-only">हर राज्य की आख़िरी दर्ज तारीख और पिछले 7 दिनों की रिपोर्टिंग</caption>
                  <thead><tr><th scope="col">राज्य</th><th scope="col">आख़िरी दर्ज तारीख</th><th scope="col">पिछले 7 दिन</th></tr></thead>
                  <tbody>{states.map(state => <tr key={state.id}>
                    <th scope="row"><Link to={`/mandi-bhav/${state.id}`}>{state.nameHi || state.name}</Link></th>
                    <td>{label(state.latestObservation)}<small>आख़िरी उपलब्ध रिकॉर्ड</small></td>
                    <td>{state.recentMandis ? `${number(state.recentMandis)} मंडियाँ` : 'कोई भाव नहीं'}<small>{state.recentRecords ? `${number(state.recentRecords)} रिकॉर्ड` : ''}</small></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <p className="sb-delivery-small-note"><Info size={14} aria-hidden="true" /> "पिछले 7 दिन" में सबसे नई दर्ज तारीख सहित उससे पहले की 6 तारीखें गिनी जाती हैं। जिन राज्यों के भाव पुराने हैं, उनके भाव पर सौदे से पहले मंडी से पुष्टि करें।</p>
            </div>
          </>}
        </section>
        <Footer />
      </main>
    </div>
  );
}
