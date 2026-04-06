import { motion } from 'framer-motion';
import { Truck, ShoppingCart } from 'lucide-react';

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function AnimatedBuySellButton({ onSell, onBuy }) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Sell Button */}
      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSell}
        className="h-12 flex items-center justify-center gap-2 rounded-xl bg-green-500 text-green-950 font-bold text-sm shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
      >
        <Truck size={18} strokeWidth={2.5} />
        <span>बेचें</span>
      </motion.button>

      {/* Buy Button */}
      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBuy}
        className="h-12 flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-amber-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
      >
        <ShoppingCart size={18} strokeWidth={2.5} />
        <span>खरीदें</span>
      </motion.button>
    </motion.div>
  );
}
