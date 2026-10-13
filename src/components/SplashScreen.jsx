import { motion as Motion, useReducedMotion } from 'framer-motion';
import Brand from './Brand';

export default function SplashScreen({ onComplete }) {
  const reducedMotion = useReducedMotion();
  return (
    <Motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
      className="sb-splash"
      role="status"
      aria-label="सही भाव खुल रहा है"
    >
      <Motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="sb-splash-identity"
      >
        <img src="/brand/app-icon.svg" width="72" height="72" alt="" className="sb-splash-icon" />
        <Brand />
        <p>फसल आपकी। फैसला आपका।</p>
      </Motion.div>
      <Motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.85, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
        className="sb-splash-progress"
        aria-hidden="true"
      />
    </Motion.div>
  );
}
