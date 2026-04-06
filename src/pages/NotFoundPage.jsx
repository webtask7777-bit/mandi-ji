import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <h1 className="text-base font-bold">पेज नहीं मिला</h1>
        </div>
      </header>
      <motion.div {...fadeInUp} className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-7xl">🚜</span>
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
