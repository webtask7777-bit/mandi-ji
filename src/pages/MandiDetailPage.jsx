import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useApiSnapshot } from '../context/ApiSnapshotContext';
import { STATE_NAMES } from '../context/StateContext';
import Brand from '../components/Brand';
import SEO, { SITE_URL } from '../components/SEO';
import WhatsAppShare from '../components/WhatsAppShare';
import { getDataFreshness } from '../utils/dataFreshness';
import { cropDetailPath } from '../utils/cropUrls';
import { normalizeRegionId } from '../../shared/indiaRegions';
import { getMandiIndexability, isRecentMandiCrop, mandiPath } from '../../shared/mandiPages';
import '../styles/detail.css';
import '../styles/comparison.css';

const money = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function MandiDetailPage() {
  const { stateId, mandiSlug } = useParams();
  const stateParam = normalizeRegionId(stateId) || stateId;
  const stateNameHi = STATE_NAMES[stateParam] || stateParam;
  const dashboardPath = `/mandi-bhav/${encodeURIComponent(stateParam)}`;
  const { data: mandi, loading, error } = useApi(`/mandis/detail/${encodeURIComponent(mandiSlug)}?state=${encodeURIComponent(stateParam)}`);
  const { asOf } = useApiSnapshot();
  const unavailable = [400, 404].includes(Number(error?.status)) || /\bAPI (400|404):/.test(error?.message || '');
  const indexability = getMandiIndexability(mandi, { asOf });
  const crops = Array.isArray(mandi?.crops) ? mandi.crops : [];
  // Older records get their own section so they are not read as today's prices.
  const recentCrops = crops.filter(crop => isRecentMandiCrop(crop, asOf));
  const tableCrops = recentCrops.length ? recentCrops : crops;
  const olderCrops = recentCrops.length ? crops.filter(crop => !recentCrops.includes(crop)) : [];
  const name = mandi?.name || mandiSlug;
  const latest = getDataFreshness(indexability.latestDate || mandi?.latestDate);
  const topNames = [...new Map(crops.slice().sort((a, b) => b.records - a.records).map(crop => [crop.id, crop.nameHi])).values()].slice(0, 3);
  const cropCount = rows => new Set(rows.map(crop => crop.id)).size;
  const path = mandiPath(stateParam, mandiSlug);
  const place = [mandi?.district && mandi.district !== name ? mandi.district : null, stateNameHi].filter(Boolean).join(', ');

  const cropRow = crop => <tr key={crop.quoteId || JSON.stringify([crop.id, crop.variety, crop.grade, crop.lastDate])}>
    <td><div className="sb-mandi-name"><Link to={cropDetailPath(crop.id, stateParam)}>{crop.nameHi}</Link></div><span>{[crop.nameHi !== crop.name ? crop.name : null, crop.variety, crop.grade].filter(Boolean).join(' · ')}</span></td>
    <td><strong className="sb-mandi-price">₹{money(crop.price)}</strong>{crop.priceBasis === 'daily-modal' && <small>{crop.quoteRecords > 1 ? 'उसी तारीख के मोडल भावों का औसत' : 'दर्ज मोडल भाव'}</small>}</td>
    <td><span>{crop.minPrice && crop.maxPrice ? `₹${money(crop.minPrice)} – ₹${money(crop.maxPrice)}` : '—'}</span></td>
    <td><small>{getDataFreshness(crop.lastDate).dateLabel}</small></td>
  </tr>;

  return (
    <div className="sb-detail-page">
      <SEO title={`${name} मंडी भाव${topNames.length ? ` — ${topNames.join(', ')} के रेट` : ''}${latest.date ? ` · ${latest.dateLabel}` : ''}`}
        description={`${name} मंडी (${place}) के ताज़ा दर्ज भाव: ${cropCount(recentCrops.length ? recentCrops : crops)} फसलें${topNames.length ? `, जैसे ${topNames.join(', ')}` : ''}। हर फसल का भाव ₹/क्विंटल, किस्म और तारीख के साथ। सौदे से पहले मंडी से भाव की पुष्टि करें।`}
        path={path} noIndex={loading ? false : unavailable || Boolean(error) || indexability.noIndex}
        structuredData={mandi && !unavailable ? { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: `${stateNameHi} के मंडी भाव`, item: `${SITE_URL}${dashboardPath}` },
          { '@type': 'ListItem', position: 2, name: `${name} मंडी`, item: `${SITE_URL}${path}` },
        ] } : undefined} />
      <header className="sb-detail-header"><div className="sb-detail-header__inner">
        <Link to="/" aria-label="सही भाव के मुख्य पृष्ठ पर जाएँ"><Brand /></Link>
        <Link to={dashboardPath} className="sb-detail-back"><ArrowLeft size={16} aria-hidden="true" /><span>{stateNameHi} के मंडी भाव</span></Link>
      </div></header>
      <main className="sb-detail-main" id="main-content">
        <nav className="sb-detail-breadcrumb" aria-label="पृष्ठ पथ"><Link to={dashboardPath}>{stateNameHi} के मंडी भाव</Link><span aria-hidden="true">/</span><span>{name} मंडी</span></nav>
        <section className="sb-crop-detail-heading">
          <div><span className="sb-detail-kicker">मंडी के सभी दर्ज भाव</span><h1>{name} मंडी भाव</h1><p>{recentCrops.length ? `${cropCount(recentCrops)} फसलों के हाल के दर्ज रिकॉर्ड` : 'फसलवार दर्ज रिकॉर्ड'}{latest.date ? ` · अंतिम रिकॉर्ड ${latest.dateLabel}` : ''}</p></div>
          <span className="sb-detail-location"><MapPin size={15} aria-hidden="true" />{place}</span>
        </section>
        {tableCrops.length > 0 && <WhatsAppShare className="sb-detail-share" text={`${name} मंडी के भाव${latest.date ? ` (${latest.dateLabel})` : ''}: ${tableCrops.slice(0, 4).map(crop => `${crop.nameHi}${crop.variety ? ` (${crop.variety}${crop.grade ? `, ${crop.grade}` : ''})` : ''} ₹${money(crop.price)}/क्विंटल · ${getDataFreshness(crop.lastDate).dateLabel}`).join(', ')}। सभी फसलों के भाव देखें:`} path={path} label="ये भाव WhatsApp पर भेजें" />}
        {loading ? <div className="sb-detail-status" role="status"><RefreshCw size={24} aria-hidden="true" /><h2>मंडी के रिकॉर्ड लोड हो रहे हैं</h2><p>फसलवार भाव आ रहे हैं।</p></div>
          : error ? <div className="sb-detail-notice" role="alert"><AlertCircle size={20} aria-hidden="true" /><div><strong>{unavailable ? 'यह मंडी पृष्ठ उपलब्ध नहीं है' : 'मंडी के रिकॉर्ड लोड नहीं हो पाए'}</strong><p>{unavailable ? 'राज्य की मंडियों की सूची से मंडी चुनें।' : 'कनेक्शन की जाँच करें और पृष्ठ दोबारा खोलें।'}</p></div><Link to={dashboardPath}>मंडियाँ देखें</Link></div>
          : <section className="sb-mandi-comparison" aria-label={`${name} मंडी के फसलवार भाव`}>
            <div className="sb-comparison-heading"><div><span className="sb-comparison-eyebrow">फसलवार भाव</span><h2>{name} मंडी के फसलवार दर्ज भाव</h2></div><span className="sb-comparison-count">{cropCount(tableCrops).toLocaleString('en-IN')} फसलें · {tableCrops.length.toLocaleString('en-IN')} किस्म / ग्रेड रिकॉर्ड</span></div>
            <p className="sb-comparison-intro">भाव ₹ / क्विंटल में। हर पंक्ति की अपनी तारीख है; पुरानी तारीख वाले भाव को आज का भाव न मानें।</p>
            <div className="sb-comparison-table-wrap" tabIndex={0} role="region" aria-label="फसलवार भाव तालिका, छोटे पर्दे पर दाएँ-बाएँ स्क्रॉल करें"><table className="sb-comparison-table"><caption className="sr-only">{name} मंडी के फसलवार दर्ज भाव, किस्म और तारीख</caption>
              <thead><tr><th scope="col">फसल / किस्म</th><th scope="col">दर्ज भाव</th><th scope="col">न्यूनतम – अधिकतम</th><th scope="col">तारीख</th></tr></thead>
              <tbody>{tableCrops.map(cropRow)}</tbody>
            </table></div>
            {olderCrops.length > 0 && <details className="sb-comparison-history"><summary>ऐतिहासिक भाव · {olderCrops.length} किस्म / ग्रेड रिकॉर्ड पिछले 30 दिन से पुराने हैं</summary><p>ये पुराने रिकॉर्ड हैं, आज के भाव नहीं।</p><div className="sb-comparison-table-wrap"><table className="sb-comparison-table"><caption className="sr-only">{name} मंडी के पुराने रिकॉर्ड</caption><tbody>{olderCrops.map(cropRow)}</tbody></table></div></details>}
            <p className="sb-comparison-footnote"><Info size={14} aria-hidden="true" />स्रोत: data.gov.in / agriportal के दर्ज रिकॉर्ड। किस्म, गुणवत्ता और आवक के अनुसार बिक्री का भाव अलग हो सकता है।</p>
          </section>}
        {Array.isArray(mandi?.nearby) && mandi.nearby.length > 0 && <section className="sb-detail-section">
          <span className="sb-detail-kicker">आस-पास</span><h2>{mandi.district} ज़िले की दूसरी मंडियाँ</h2>
          <ul className="sb-mandi-links">{mandi.nearby.map(row => <li key={row.slug}><Link to={mandiPath(stateParam, row.slug)}>{row.name} मंडी भाव</Link><small>{row.topCrops.join(', ')}</small></li>)}</ul>
        </section>}
        <footer className="sb-detail-footer"><Brand compact /><p>सही भाव। समझकर फ़ैसला।</p><Link to={dashboardPath}>{stateNameHi} की सभी मंडियाँ <ArrowRight size={15} aria-hidden="true" /></Link></footer>
      </main>
    </div>
  );
}
