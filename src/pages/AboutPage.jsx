import '@/styles/secondary.css';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Leaf, BarChart3, MapPin, Truck, TrendingUp } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';
import { Card } from '@/components/ui/card';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="sb-secondary-page sb-about-page min-h-screen bg-zinc-950 text-foreground mx-auto flex flex-col">
      <SEO title="हमारे बारे में" description="सही भाव — किसानों के लिए दर्ज मंडी भाव, फसलों की तुलना और ढुलाई की योजना की जानकारी।" path="/about" />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="वापस जाएं" className="sb-back-button p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <Leaf size={18} className="text-green-500" />
          <h1 className="text-base font-bold">हमारे बारे में</h1>
        </div>
      </header>

      <motion.div {...fadeInUp} className="sb-page-content flex-1 px-4 py-6 space-y-6">
        {/* Hero */}
        <section className="sb-editorial-hero">
          <div className="sb-editorial-copy">
            <img className="sb-editorial-logo" src="/brand/logo.svg" alt="सही भाव" width="190" height="58" />
            <h2>हर फसल की मेहनत।<br />हर फैसले में सही जानकारी।</h2>
            <p>भारत का किसान-पहले मंडी भाव प्लेटफ़ॉर्म। भाव देखें, मंडियों की तुलना करें और अपने कारोबार की योजना बनाएं।</p>
          </div>
          <img className="sb-editorial-photo" src="/visuals/guide-understand-prices.webp" alt="धान के दानों को परखते किसान के हाथ" width="1280" height="853" />
        </section>

        {/* Mission */}
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <h3 className="text-sm font-bold text-green-500 mb-2">हमारा मिशन</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            भारतीय किसानों को सरकारी स्रोतों से दर्ज मंडी भाव, उनकी तारीख के साथ, साफ़-साफ़ दिखाना, ताकि वे अपनी फसल का सही दाम पा सकें।
            बिचौलियों पर निर्भरता कम करना और किसानों को डेटा-आधारित फ़ैसले लेने में मदद करना।
          </p>
        </Card>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">हम क्या देते हैं</h3>
          <Feature icon={<TrendingUp size={14} className="text-green-500" />} title="दर्ज मंडी भाव" desc="उपलब्ध भाव के साथ उसकी तारीख और पुराने रिकॉर्ड की पहचान" />
          <Feature icon={<BarChart3 size={14} className="text-amber-500" />} title="मंडी तुलना" desc="समान किस्म और ग्रेड के उपलब्ध रिकॉर्ड में भाव का अंतर देखें" />
          <Feature icon={<Truck size={14} className="text-blue-500" />} title="बिक्री का अनुमान" desc="अपने खर्च और माल की कमी दर्ज करके संभावित बचत की गणना करें" />
          <Feature icon={<MapPin size={14} className="text-purple-500" />} title="नक्शा व्यू" desc="राज्य और ज़िले के अनुसार उपलब्ध मंडी रिकॉर्ड खोजें" />
        </div>

        {/* Data Sources */}
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <h3 className="text-sm font-bold text-foreground mb-2">डेटा स्रोत</h3>
          <ul className="text-xs text-zinc-400 space-y-1.5">
            <li>- data.gov.in (AgMarkNet) — अखिल भारतीय मंडी भाव</li>
            <li>- agriportal.cg.nic.in — छत्तीसगढ़ मंडी भाव</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">डेटा की उपलब्धता क्षेत्र और फसल के अनुसार बदलती है। लेनदेन से पहले रिकॉर्ड की तारीख देखें और संबंधित मंडी में भाव की पुष्टि करें।</p>
        </Card>

        {/* Contact CTA */}
        <div className="text-center space-y-2 pb-4">
          <p className="text-xs text-zinc-500">कोई सवाल या सुझाव?</p>
          <button onClick={() => navigate('/contact')}
            className="px-6 py-2.5 rounded-xl bg-green-500 text-green-950 font-bold text-sm active:scale-[0.98] transition-transform">
            संपर्क करें
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-foreground">{title}</div>
        <div className="text-[10px] text-zinc-500">{desc}</div>
      </div>
    </div>
  );
}
