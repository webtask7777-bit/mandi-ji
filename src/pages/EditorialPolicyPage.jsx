import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Info } from 'lucide-react';
import SEO from '../components/SEO';
import Brand from '../components/Brand';
import Footer from '../components/Footer';
import { hasContact } from '../data/contact';
import '../styles/dashboard.css';
import '../styles/delivery.css';
import '../styles/sell-compare.css';
import '../styles/editorial-policy.css';

// What this page says must stay true of how SahiBhav actually works (docs/editorial-publishing.md).
// Do not add reviewers, credentials or review dates here until such a review really exists.
export default function EditorialPolicyPage() {
  return (
    <div className="sb-dashboard sb-delivery-page sb-policy-page">
      <SEO title="संपादकीय नीति और सुधार" description="सही भाव पर खेती की गाइड, मंडी भाव और फसल सलाह कैसे तैयार होती है, किन स्रोतों से, उनकी सीमाएँ क्या हैं और गलती दिखे तो सुधार कैसे होता है।" path="/editorial-policy" />
      <a href="#policy-main" className="sb-skip-link">जानकारी पर जाएँ</a>
      <header className="sb-header sb-calculator-header">
        <Link to="/" aria-label="सही भाव होम"><Brand /></Link>
        <Link to="/blog" className="sb-text-button"><ArrowLeft size={17} aria-hidden="true" /> खेती गाइड</Link>
      </header>
      <main id="policy-main" className="sb-main">
        <div className="sb-calculator-page-heading"><span className="sb-eyebrow"><BookOpen size={16} aria-hidden="true" />सही भाव · संपादकीय नीति</span><h1>हमारी जानकारी कैसे बनती है</h1></div>
        <article className="sb-delivery-card sb-policy">
          <section>
            <h2>कौन लिखता है</h2>
            <p>खेती की गाइड "सही भाव संपादकीय" के नाम से प्रकाशित होती हैं। लेख AI की सहायता से तैयार किए जाते हैं और हर लेख के अंत में उसकी यह स्थिति लिखी होती है।</p>
            <p>अभी कोई नामित कृषि वैज्ञानिक या विशेषज्ञ लेखों की समीक्षा नहीं करता। अगर आगे ऐसी समीक्षा होगी, तो उस लेख पर समीक्षक का नाम, भूमिका और समीक्षा की तारीख़ लिखी जाएगी। बिना असली समीक्षा के हम "विशेषज्ञ द्वारा जाँचा गया" जैसा दावा नहीं करते।</p>
          </section>
          <section>
            <h2>स्रोत और जाँच</h2>
            <ul>
              <li>हर लेख प्राथमिक स्रोतों पर आधारित होता है, जैसे भारत मौसम विज्ञान विभाग (IMD), ICAR और राज्य कृषि विभागों की सलाह और अंतरराष्ट्रीय शोध संस्थान। लेख के अंत में स्रोतों की सूची और उन्हें देखने की तारीख़ दी जाती है।</li>
              <li>प्रकाशन से पहले लेख की फसल, क्षेत्र, स्रोत, तारीख़ें और अंदरूनी लिंक जाँचे जाते हैं। जो लेख इन जाँचों में अधूरा हो, वह प्रकाशित नहीं होता।</li>
              <li>कोई लेख किसी एक क्षेत्र के बारे में है, तो यह लेख में लिखा होता है। एक जगह का उदाहरण पूरे देश के लिए सलाह नहीं माना जाता।</li>
            </ul>
          </section>
          <section>
            <h2>अनुवाद और चित्र</h2>
            <p>दूसरी भाषाओं के लेख AI की सहायता से अनुवादित हैं। जहाँ किसी मूल-भाषी व्यक्ति ने स्वतंत्र समीक्षा नहीं की है, वहाँ लेख में यह लिखा है।</p>
            <p>लेखों के चित्र AI से बने सांकेतिक चित्र हैं। ये किसी असली खेत, फसल, बीमारी या घटना की तस्वीर या सबूत नहीं हैं।</p>
          </section>
          <section>
            <h2>तारीख़ें</h2>
            <p>प्रकाशन की तारीख़ नहीं बदली जाती। "अपडेट" की तारीख़ तभी बदलती है जब लेख की सामग्री या जानकारी में असली बदलाव हो, ताकि पुराना लेख नया न दिखे।</p>
          </section>
          <section>
            <h2>मंडी भाव और फसल सलाह का डेटा</h2>
            <ul>
              <li><strong>मंडी भाव</strong> कृषि मंत्रालय के Agmarknet डेटा (data.gov.in) से आते हैं। हर भाव के साथ उसकी दर्ज तारीख़ दिखाई जाती है; पुराने रिकॉर्ड को आज का भाव नहीं बताया जाता। <Link to="/data-status">भाव कितने ताज़ा हैं</Link> पेज पर हर राज्य की आख़िरी तारीख़ देखें।</li>
              <li><strong>फसल सलाह</strong> किसान कॉल सेंटर (KCC) के सवाल-जवाब से बनी है (data.gov.in)। ये पिछले सालों के सवालों का मौसमी पैटर्न है, इस साल की चेतावनी नहीं। जवाब KCC के ही हैं; सही भाव उनमें दवा या मात्रा नहीं बदलता।</li>
            </ul>
          </section>
          <section className="sb-policy-limit">
            <h2><Info size={18} aria-hidden="true" /> सलाह की सीमा</h2>
            <p>यहाँ की जानकारी तैयारी और समझ के लिए है। किसी बीमारी या कीट की पक्की पहचान, दवा का नाम, मात्रा और छिड़काव का समय अपने कृषि विस्तार अधिकारी, कृषि विज्ञान केंद्र (KVK) या किसान कॉल सेंटर <a href="tel:18001801551">1800-180-1551</a> से पुष्टि करके ही तय करें, और दवा का लेबल पढ़ें।</p>
          </section>
          <section>
            <h2>गलती दिखे तो</h2>
            {hasContact()
              ? <p>किसी लेख, भाव या सलाह में गलती दिखे तो <Link to="/contact">संपर्क पेज</Link> से पेज का लिंक और गलती बताएँ। पुष्टि होने पर लेख सुधारा जाता है, उसकी अपडेट तारीख़ बदलती है और बड़े सुधार का उल्लेख लेख में किया जाता है।</p>
              : <p>सुधार भेजने के लिए ईमेल और WhatsApp अभी जोड़ा जा रहा है। जब तक यह शुरू नहीं होता, भाव के लिए मूल स्रोत की तारीख़ <Link to="/data-status">डेटा की स्थिति</Link> पेज पर देखें। पुष्टि हुई गलती ठीक होने पर लेख की अपडेट तारीख़ बदलती है और बड़े सुधार का उल्लेख लेख में किया जाता है।</p>}
          </section>
        </article>
        <Footer />
      </main>
    </div>
  );
}
