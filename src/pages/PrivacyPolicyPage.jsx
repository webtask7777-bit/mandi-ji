import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      <SEO title="गोपनीयता नीति" description="मंडीजी की गोपनीयता नीति — आपका डेटा कैसे सुरक्षित रखा जाता है।" path="/privacy" />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <Shield size={18} className="text-green-500" />
          <h1 className="text-base font-bold">गोपनीयता नीति</h1>
        </div>
      </header>

      <motion.div {...fadeInUp} className="flex-1 px-4 py-6 space-y-6">
        <p className="text-xs text-zinc-500">अंतिम अपडेट: मार्च 2026</p>

        <Section title="1. हम कौन हैं">
          मंडीजी (MandiJi) एक कृषि मंडी भाव डैशबोर्ड है जो भारतीय किसानों को ताज़ा मंडी भाव, फसल तुलना, और बाज़ार जानकारी प्रदान करता है।
        </Section>

        <Section title="2. हम कौन सा डेटा एकत्र करते हैं">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>खाता जानकारी: नाम, फ़ोन नंबर, ईमेल (रजिस्ट्रेशन पर)</li>
            <li>उपयोग डेटा: देखी गई फसलें, मंडियां, और पेज</li>
            <li>डिवाइस जानकारी: ब्राउज़र टाइप, स्क्रीन साइज़</li>
            <li>स्थान: चुना गया राज्य (GPS नहीं लिया जाता)</li>
          </ul>
        </Section>

        <Section title="3. डेटा का उपयोग">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>आपके राज्य के अनुसार मंडी भाव दिखाना</li>
            <li>फसल बेचने/खरीदने की लिस्टिंग प्रबंधन</li>
            <li>ऐप अनुभव को बेहतर बनाना</li>
            <li>ज़रूरी सूचनाएं भेजना (भाव अलर्ट आदि)</li>
          </ul>
        </Section>

        <Section title="4. डेटा शेयरिंग">
          हम आपका व्यक्तिगत डेटा किसी तीसरे पक्ष को नहीं बेचते। केवल निम्न स्थितियों में डेटा शेयर हो सकता है:
          <ul className="list-disc list-inside space-y-1 text-zinc-400 mt-2">
            <li>भुगतान प्रक्रिया के लिए Razorpay को</li>
            <li>कानूनी आवश्यकता पर सरकारी अधिकारियों को</li>
            <li>Analytics के लिए (बिना पहचान वाला डेटा)</li>
          </ul>
        </Section>

        <Section title="5. कुकीज़ और ट्रैकिंग">
          हम सीमित कुकीज़ का उपयोग करते हैं — लॉगिन सेशन और आपकी पसंद (जैसे चुना हुआ राज्य) याद रखने के लिए। विज्ञापन कुकीज़ तीसरे पक्ष (Google AdSense) द्वारा प्रबंधित होती हैं।
        </Section>

        <Section title="6. डेटा सुरक्षा">
          आपका डेटा एन्क्रिप्टेड कनेक्शन (HTTPS) के माध्यम से ट्रांसफर होता है। पासवर्ड हैश करके स्टोर किए जाते हैं। हम उचित सुरक्षा उपाय अपनाते हैं।
        </Section>

        <Section title="7. आपके अधिकार">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>अपना डेटा देखने का अधिकार</li>
            <li>डेटा सुधारने का अधिकार</li>
            <li>खाता हटाने का अधिकार</li>
            <li>विज्ञापन वरीयता बदलने का अधिकार</li>
          </ul>
        </Section>

        <Section title="8. संपर्क">
          गोपनीयता से जुड़े किसी भी प्रश्न के लिए हमसे संपर्क करें:
          <div className="mt-2 text-green-500 font-semibold">privacy@mandiji.in</div>
        </Section>
      </motion.div>
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
