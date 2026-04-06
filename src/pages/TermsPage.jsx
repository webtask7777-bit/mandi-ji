import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      <SEO title="नियम और शर्तें" description="मंडीजी की सेवा शर्तें और उपयोग के नियम।" path="/terms" />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <FileText size={18} className="text-green-500" />
          <h1 className="text-base font-bold">नियम और शर्तें</h1>
        </div>
      </header>

      <motion.div {...fadeInUp} className="flex-1 px-4 py-6 space-y-6">
        <p className="text-xs text-zinc-500">अंतिम अपडेट: मार्च 2026</p>

        <Section title="1. सेवा का विवरण">
          मंडीजी (MandiJi) एक कृषि मंडी भाव सूचना प्लेटफ़ॉर्म है। हम सरकारी स्रोतों से मंडी भाव एकत्र करके आपको दिखाते हैं।
          इस सेवा का उपयोग करके आप इन नियमों से सहमत होते हैं।
        </Section>

        <Section title="2. उपयोगकर्ता खाता">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>खाता बनाने के लिए सही जानकारी देना ज़रूरी है</li>
            <li>अपने खाते की सुरक्षा आपकी ज़िम्मेदारी है</li>
            <li>एक व्यक्ति एक खाता रख सकता है</li>
            <li>नियम तोड़ने पर खाता बंद किया जा सकता है</li>
          </ul>
        </Section>

        <Section title="3. भाव डेटा — अस्वीकरण">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-xs mt-2">
            मंडी भाव सरकारी स्रोतों से लिए जाते हैं। हम डेटा की 100% सटीकता की गारंटी नहीं देते।
            कृपया कोई भी व्यापारिक निर्णय लेने से पहले स्थानीय मंडी से भाव की पुष्टि करें।
            मंडीजी किसी भी वित्तीय नुकसान के लिए ज़िम्मेदार नहीं है।
          </div>
        </Section>

        <Section title="4. बाज़ार (Marketplace) नियम">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>केवल कृषि उत्पादों की लिस्टिंग करें</li>
            <li>सही भाव और मात्रा लिखें</li>
            <li>गलत या भ्रामक लिस्टिंग पर खाता बंद हो सकता है</li>
            <li>मंडीजी खरीद-बिक्री में मध्यस्थ नहीं है — सौदा दोनों पक्षों की ज़िम्मेदारी है</li>
          </ul>
        </Section>

        <Section title="5. Pro सब्सक्रिप्शन">
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>भुगतान Razorpay के माध्यम से होता है</li>
            <li>सब्सक्रिप्शन अवधि समाप्त होने पर ऑटो-रिन्यू हो सकता है</li>
            <li>रिफंड नीति: 7 दिन के भीतर रिफंड का अनुरोध कर सकते हैं</li>
            <li>Pro फीचर्स बिना पूर्व सूचना के बदल सकते हैं</li>
          </ul>
        </Section>

        <Section title="6. बौद्धिक संपदा">
          मंडीजी का लोगो, डिज़ाइन, और कोड हमारी बौद्धिक संपदा है। बिना अनुमति के कॉपी या पुनर्वितरण वर्जित है।
          मंडी भाव डेटा सार्वजनिक सरकारी डेटा पर आधारित है।
        </Section>

        <Section title="7. सेवा में बदलाव">
          हम किसी भी समय सेवा में बदलाव कर सकते हैं, नई सुविधाएं जोड़ सकते हैं, या पुरानी हटा सकते हैं।
          महत्वपूर्ण बदलावों की सूचना ऐप या ईमेल के माध्यम से दी जाएगी।
        </Section>

        <Section title="8. विवाद समाधान">
          किसी भी विवाद के लिए भारतीय कानून लागू होगा। अधिकार क्षेत्र भारतीय न्यायालय होगा।
        </Section>

        <Section title="9. संपर्क">
          इन शर्तों से जुड़े किसी भी प्रश्न के लिए:
          <div className="mt-2 text-green-500 font-semibold">legal@mandiji.in</div>
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
