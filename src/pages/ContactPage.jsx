import '@/styles/secondary.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, MessageCircle, Send } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';
import { Card } from '@/components/ui/card';

export default function ContactPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // For now, compose mailto link
    const subject = encodeURIComponent(`सही भाव संपर्क — ${form.name}`);
    const body = encodeURIComponent(`नाम: ${form.name}\nफ़ोन: ${form.phone}\n\n${form.message}`);
    window.open(`mailto:contact@mandiji.in?subject=${subject}&body=${body}`);
    setSent(true);
  }

  return (
    <div className="sb-secondary-page sb-contact-page min-h-screen bg-zinc-950 text-foreground mx-auto flex flex-col">
      <SEO title="संपर्क करें" description="सही भाव से संपर्क करें — सवाल, सुझाव, या शिकायत।" path="/contact" />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="वापस जाएं" className="sb-back-button p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <MessageCircle size={18} className="text-green-500" />
          <h1 className="text-base font-bold">संपर्क करें</h1>
        </div>
      </header>

      <Motion.div {...fadeInUp} className="sb-page-content flex-1 px-4 py-6 space-y-6">
        {/* Contact Info Cards */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-zinc-900 border-zinc-800 p-3">
            <Mail size={16} className="text-green-500 mb-2" />
            <div className="text-[10px] text-zinc-500 mb-0.5">ईमेल</div>
            <div className="text-xs font-semibold text-foreground break-all">contact@mandiji.in</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-3">
            <Phone size={16} className="text-green-500 mb-2" />
            <div className="text-[10px] text-zinc-500 mb-0.5">फ़ोन / WhatsApp</div>
            <div className="text-xs font-semibold text-foreground">+91 XXXXX XXXXX</div>
          </Card>
        </div>

        {/* Contact Form */}
        {!sent ? (
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">संदेश भेजें</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="contact-name" className="text-[10px] text-zinc-500 block mb-1">आपका नाम</label>
                <input
                  type="text" autoComplete="name" required id="contact-name" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500 transition-colors"
                  placeholder="नाम लिखें"
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="text-[10px] text-zinc-500 block mb-1">फ़ोन नंबर</label>
                <input
                  type="tel" id="contact-phone" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500 transition-colors"
                  placeholder="वैकल्पिक"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="text-[10px] text-zinc-500 block mb-1">संदेश</label>
                <textarea
                  required rows={4} id="contact-message" value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500 transition-colors resize-none"
                  placeholder="अपना सवाल या सुझाव लिखें..."
                />
              </div>
              <button type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-green-950 font-bold text-sm active:scale-[0.98] transition-transform">
                <Send size={14} /> भेजें
              </button>
            </form>
          </Card>
        ) : (
          <Card className="bg-green-500/10 border-green-500/30 p-6 text-center">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="text-sm font-bold text-green-500 mb-1">धन्यवाद!</h3>
            <p className="text-xs text-zinc-400">आपका ईमेल क्लाइंट खुला होगा। संदेश भेजें और हम जल्द जवाब देंगे।</p>
            <button onClick={() => setSent(false)}
              className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 text-foreground text-xs font-semibold">
              दोबारा भेजें
            </button>
          </Card>
        )}

        {/* FAQ */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">अक्सर पूछे जाने वाले सवाल</h3>
          <FAQ q="मंडी भाव कहां से आते हैं?" a="सरकारी स्रोतों से — data.gov.in (AgMarkNet) और राज्य कृषि विभाग की वेबसाइटों से।" />
          <FAQ q="क्या ऐप फ्री है?" a="हां, सही भाव की सभी सुविधाएं मुफ्त हैं। ऐप इस्तेमाल करने के लिए कोई सब्सक्रिप्शन या भुगतान नहीं चाहिए।" />
          <FAQ q="भाव कितनी बार अपडेट होते हैं?" a="भाव उपलब्ध स्रोत रिकॉर्ड के अनुसार दिखते हैं। हर मंडी और फसल के रिकॉर्ड की तारीख अलग हो सकती है। दिखाए गए भाव की तारीख देखें और सौदे से पहले मंडी से पुष्टि करें।" />
        </div>
      </Motion.div>
    </div>
  );
}

function FAQ({ q, a }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 p-3">
      <div className="text-xs font-semibold text-foreground mb-1">{q}</div>
      <div className="text-[10px] text-zinc-400">{a}</div>
    </Card>
  );
}
