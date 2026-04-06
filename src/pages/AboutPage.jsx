import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Leaf, BarChart3, Users, MapPin, Truck, TrendingUp } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';
import { Card } from '@/components/ui/card';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      <SEO title="हमारे बारे में" description="मंडीजी — भारत का किसान-पहले मंडी भाव प्लेटफ़ॉर्म। 120+ फसलें, 16,000+ मंडी।" path="/about" />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <Leaf size={18} className="text-green-500" />
          <h1 className="text-base font-bold">हमारे बारे में</h1>
        </div>
      </header>

      <motion.div {...fadeInUp} className="flex-1 px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/30">
            <Leaf size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-extrabold">
            मंडी<span className="text-green-500">जी</span>
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
            भारत का किसान-पहले मंडी भाव प्लेटफ़ॉर्म। सही भाव, सही फ़ैसला।
          </p>
        </div>

        {/* Mission */}
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <h3 className="text-sm font-bold text-green-500 mb-2">हमारा मिशन</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            भारतीय किसानों को ताज़ा और सटीक मंडी भाव की जानकारी देना, ताकि वे अपनी फसल का सही दाम पा सकें।
            बिचौलियों पर निर्भरता कम करना और किसानों को डेटा-आधारित फ़ैसले लेने में मदद करना।
          </p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={<BarChart3 size={16} className="text-green-500" />} value="120+" label="फसलें" />
          <StatCard icon={<MapPin size={16} className="text-amber-500" />} value="16,000+" label="मंडियां" />
          <StatCard icon={<Users size={16} className="text-blue-500" />} value="29" label="राज्य" />
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">हम क्या देते हैं</h3>
          <Feature icon={<TrendingUp size={14} className="text-green-500" />} title="ताज़ा मंडी भाव" desc="रोज़ाना अपडेट, सरकारी डेटा से सीधे" />
          <Feature icon={<BarChart3 size={14} className="text-amber-500" />} title="मंडी तुलना" desc="कौन सी मंडी में सबसे अच्छा भाव? तुरंत देखें" />
          <Feature icon={<Truck size={14} className="text-blue-500" />} title="मुनाफ़ा कैलकुलेटर" desc="ट्रांसपोर्ट खर्च निकालकर असली मुनाफ़ा जानें" />
          <Feature icon={<MapPin size={14} className="text-purple-500" />} title="नक्शा व्यू" desc="ज़िला-वार भाव नक्शे पर देखें" />
        </div>

        {/* Data Sources */}
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <h3 className="text-sm font-bold text-foreground mb-2">डेटा स्रोत</h3>
          <ul className="text-xs text-zinc-400 space-y-1.5">
            <li>- data.gov.in (AgMarkNet) — अखिल भारतीय मंडी भाव</li>
            <li>- agriportal.cg.nic.in — छत्तीसगढ़ मंडी भाव</li>
            <li>- Government APMC APIs</li>
          </ul>
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

function StatCard({ icon, value, label }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-base font-extrabold text-foreground">{value}</div>
      <div className="text-[9px] text-zinc-500">{label}</div>
    </Card>
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
