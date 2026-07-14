import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from './Button';

export function Modal({ open, title, children, onClose, maxWidth = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 20, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-lg border border-white/10 bg-panel/90 p-5 shadow-panel backdrop-blur-xl`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">{title}</h2>
              <Button variant="ghost" onClick={onClose} className="px-2.5" aria-label="Yopish">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
