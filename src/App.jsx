import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './index.css';
import SplashScreen from './components/SplashScreen';
import MandiJiDashboard from './MandiJiDashboard';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      <MandiJiDashboard />
    </>
  );
}

export default App;
