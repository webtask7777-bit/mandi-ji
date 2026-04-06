import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToasts } from '@/context/ToastContext';

const icons = {
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  error: <AlertCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-amber-400 shrink-0" />,
};

const borders = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-amber-500/30',
};

export default function Toast() {
  const { toasts, removeToast } = useToasts();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 border ${borders[t.variant]} shadow-lg`}
          >
            {icons[t.variant]}
            <span className="flex-1 text-xs text-foreground">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-0.5 rounded hover:bg-zinc-800 transition-colors"
            >
              <X size={14} className="text-zinc-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
