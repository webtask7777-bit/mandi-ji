import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "#0a1a0a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg, #4CAF50, #FFB300)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Leaf size={40} color="#0a1a0a" strokeWidth={2.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        style={{ marginTop: 16, textAlign: "center" }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: "#e8f5e9",
          fontFamily: "'Noto Sans Devanagari', 'Mukta', sans-serif" }}>
          मंडी<span style={{ color: "#FFB300" }}>जी</span>
        </div>
        <div style={{ fontSize: 11, color: "#66BB6A", letterSpacing: 2, marginTop: 4 }}>
          CHHATTISGARH MANDI DASHBOARD
        </div>
      </motion.div>

      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 2, ease: "linear" }}
        onAnimationComplete={onComplete}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 3, background: "linear-gradient(90deg, #4CAF50, #FFB300)",
          transformOrigin: "left",
        }}
      />
    </motion.div>
  );
}
