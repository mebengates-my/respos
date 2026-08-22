import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

// Promise-based confirmation dialog provider.
export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig({
        title: 'Are you sure?',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        danger: false,
        ...opts,
      });
    });
  }, []);

  const handleClose = (result) => {
    setConfig(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {config && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => handleClose(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    config.danger ? 'bg-error/10 text-error' : 'bg-accent/10 text-accent'
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg font-semibold text-dark-roast mb-1">
                      {config.title}
                    </h2>
                    {config.message && (
                      <p className="text-sm text-medium-roast leading-relaxed">
                        {config.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-latte/20 flex gap-3">
                <button
                  onClick={() => handleClose(false)}
                  className="flex-1 py-3 bg-latte/10 rounded-xl font-medium text-dark-roast hover:bg-latte/20 transition-colors btn-press"
                >
                  {config.cancelLabel}
                </button>
                <button
                  onClick={() => handleClose(true)}
                  className={`flex-1 py-3 rounded-xl font-medium text-white transition-colors btn-press ${
                    config.danger
                      ? 'bg-error hover:bg-error/90'
                      : 'bg-accent hover:bg-accent/90'
                  }`}
                >
                  {config.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

// Hook to trigger the confirmation dialog
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
