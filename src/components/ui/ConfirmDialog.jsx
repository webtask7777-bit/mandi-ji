import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, resolve }

  const confirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setState({ title, message, resolve });
    });
  }, []);

  const handleConfirm = () => { state?.resolve(true); setState(null); };
  const handleCancel = () => { state?.resolve(false); setState(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-foreground mb-1.5">{state.title}</h3>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">{state.message}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 h-10 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 active:scale-[0.98] transition-transform"
                >
                  रद्द करें
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 h-10 rounded-xl bg-red-500 text-xs font-bold text-white active:scale-[0.98] transition-transform"
                >
                  हाँ, हटाएं
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
