import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import { CONTACT } from '@/data/contact';
import SEO from '@/components/SEO';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      <SEO title="गोपनीयता नीति" description="सही भाव की गोपनीयता नीति — आपका डेटा कैसे सुरक्षित रखा जाता है।" path="/privacy" />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <Shield size={18} className="text-green-500" />
          <h1 className="text-base font-bold">गोपनीयता नीति</h1>
        </div>
      </header>

      <Motion.div {...fadeInUp} className="flex-1 px-4 py-6 space-y-6">
        <p className="text-xs text-zinc-500">अंतिम अपडेट: 16 अक्टूबर 2026</p>

        <Section title="1. हम कौन हैं">
          सही भाव (SahiBhav) एक कृषि मंडी भाव डैशबोर्ड है जो भारतीय किसानों को ताज़ा मंडी भाव, फसल तुलना, और बाज़ार जानकारी प्रदान करता है।
        </Section>

        <Section title="2. हम कौन सा डेटा एकत्र करते हैं">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>खाता जानकारी (केवल खाता बनाने पर): नाम, फ़ोन नंबर, ईमेल</li>
            <li>आपकी पसंद, जैसे चुना हुआ राज्य, सेव की गई फसलें और कैलकुलेटर के हिसाब: ये केवल आपके ब्राउज़र में रहती हैं, हमारे सर्वर पर नहीं जातीं</li>
            <li>स्थान: डिलीवरी कैलकुलेटर में "मेरी लोकेशन" दबाने पर, आपकी अनुमति से, लोकेशन केवल आपके ब्राउज़र में नज़दीकी ज़िला चुनने के लिए उपयोग होती है; सटीक लोकेशन सहेजी या भेजी नहीं जाती</li>
          </ul>
        </Section>

        <Section title="3. डेटा का उपयोग">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>आपके राज्य के अनुसार मंडी भाव दिखाना</li>
            <li>फसल बेचने/खरीदने की लिस्टिंग प्रबंधन</li>
            <li>ऐप अनुभव को बेहतर बनाना</li>
          </ul>
        </Section>

        <Section title="4. डेटा शेयरिंग">
          हम आपका व्यक्तिगत डेटा किसी तीसरे पक्ष को नहीं बेचते। केवल निम्न स्थितियों में डेटा शेयर हो सकता है:
          <ul className="list-disc list-inside space-y-1 text-zinc-400 mt-2">
            <li>कानूनी आवश्यकता पर सरकारी अधिकारियों को</li>
          </ul>
        </Section>

        <Section title="5. कुकीज़ और ट्रैकिंग">
          हम विज्ञापन नहीं दिखाते और कोई ट्रैकिंग या विज्ञापन कुकीज़ नहीं लगाते। कौन-से पेज उपयोगी हैं, यह जानने के लिए हम Vercel Web Analytics से पेज-व्यू गिनते हैं; यह बिना कुकी के, गुमनाम और कुल संख्या के रूप में होता है और इससे आपकी पहचान नहीं होती। ब्राउज़र स्टोरेज केवल लॉगिन और आपकी पसंद (जैसे चुना हुआ राज्य) याद रखने के लिए उपयोग होता है।
        </Section>

        <Section title="6. डेटा सुरक्षा">
          आपका डेटा एन्क्रिप्टेड कनेक्शन (HTTPS) के माध्यम से ट्रांसफर होता है। पासवर्ड हैश करके स्टोर किए जाते हैं। हम उचित सुरक्षा उपाय अपनाते हैं।
        </Section>

        <Section title="7. आपके अधिकार">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>अपना डेटा देखने का अधिकार</li>
            <li>डेटा सुधारने का अधिकार</li>
            <li>खाता हटाने का अधिकार</li>
          </ul>
        </Section>

        <Section title="8. संपर्क">
          गोपनीयता से जुड़े किसी भी प्रश्न के लिए हमसे संपर्क करें:
          <div className="mt-2 text-green-500 font-semibold">{CONTACT.email || 'संपर्क ईमेल अभी जोड़ा जा रहा है।'}</div>
        </Section>
      </Motion.div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-foreground mb-2">{title}</h2>
      <div className="text-xs text-zinc-400 leading-relaxed">{children}</div>
    </div>
  );
}
