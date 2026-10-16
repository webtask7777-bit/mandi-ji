import '@/styles/secondary.css';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="sb-secondary-page sb-notfound-page min-h-screen bg-zinc-950 text-foreground mx-auto flex flex-col">
      <SEO title="पेज नहीं मिला" description="यह पृष्ठ मौजूद नहीं है। सही भाव के मुख्य पृष्ठ पर उपलब्ध मंडी भाव और डिलीवरी कैलकुलेटर देखें।" noIndex />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            aria-label="वापस जाएं" className="sb-back-button p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <h1 className="text-base font-bold">पेज नहीं मिला</h1>
        </div>
      </header>
      <motion.div {...fadeInUp} className="sb-notfound-content flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <img src="/visuals/empty-saved.webp" alt="" width="220" height="220" className="sb-empty-image" />
        <h2 className="text-xl font-bold text-foreground">404</h2>
        <p className="text-sm text-zinc-400 text-center">
          यह पेज मौजूद नहीं है या हटा दिया गया है
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-green-500 text-green-950 font-bold text-sm active:scale-[0.98] transition-transform"
        >
          होम पर जाएं
        </button>
      </motion.div>
    </div>
  );
}
