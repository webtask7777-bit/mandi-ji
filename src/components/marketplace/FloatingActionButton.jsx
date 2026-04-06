import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Truck, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FloatingActionButton({ showFAB }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  if (!showFAB) return null;

  function handleAction(type) {
    setExpanded(false);
    navigate(`/listing/new?type=${type}`);
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-3">
      <AnimatePresence>
        {expanded && (
          <>
            {/* Buy mini button */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.5 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              onClick={() => handleAction('buy')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 text-amber-950 font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              <ShoppingCart size={16} strokeWidth={2.5} />
              <span>खरीदें</span>
            </motion.button>

            {/* Sell mini button */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleAction('sell')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-500 text-green-950 font-bold text-xs shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              <Truck size={16} strokeWidth={2.5} />
              <span>बेचें</span>
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setExpanded(prev => !prev)}
        className="w-14 h-14 rounded-full bg-green-500 text-green-950 flex items-center justify-center shadow-lg shadow-green-500/30"
      >
        <motion.div
          animate={{ rotate: expanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {expanded ? <X size={24} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
        </motion.div>
      </motion.button>
    </div>
  );
}
