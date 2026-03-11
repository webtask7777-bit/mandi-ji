import { motion } from 'framer-motion';

export default function AnimatedCard({ children, delay = 0, style, className, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay }}
      whileTap={{ scale: 0.98 }}
      style={style}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
