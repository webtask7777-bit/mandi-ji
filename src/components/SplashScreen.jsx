import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="w-[72px] h-[72px] rounded-2xl bg-green-500 flex items-center justify-center"
      >
        <Leaf size={40} className="text-green-950" strokeWidth={2.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-4 text-center"
      >
        <div className="text-3xl font-extrabold text-foreground">
          मंडी<span className="text-amber-500">जी</span>
        </div>
        <div className="text-[11px] text-green-500 tracking-[2px] mt-1">
          ALL INDIA MANDI DASHBOARD
        </div>
      </motion.div>

      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 2, ease: "linear" }}
        onAnimationComplete={onComplete}
        className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 origin-left"
      />
    </motion.div>
  );
}
