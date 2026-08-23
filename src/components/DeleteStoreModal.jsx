import React, { useState, useEffect } from 'react';
import { cloudAuth } from '../services/cloud';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Confirmation modal for deleting the whole store. The admin must type the
// store's link slug (or its exact name) — the same guard the database
// function delete_store() enforces server-side.
export default function DeleteStoreModal({ storeId, storeSlug, onClose, onDeleted }) {
  const [store, setStore] = useState(null); // { name, slug } once loaded
  const [loaded, setLoaded] = useState(!storeSlug); // nothing to fetch without a slug
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeSlug) return;
    let cancelled = false;
    cloudAuth.getStoreBySlug(storeSlug).then(({ data }) => {
      if (!cancelled) {
        setStore(data || null);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  const token = store?.slug || '';
  const name = store?.name || '';
  const matches = confirmText && ((token && confirmText === token) || (name && confirmText === name));

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    const { data, error: err } = await cloudAuth.deleteStore({
      storeId,
      confirmName: confirmText,
    });
    setBusy(false);
    if (err) {
      setError(err.message || 'Delete failed');
      return;
    }
    if (!data?.deleted) {
      setError('Store not found — it may already be deleted.');
      return;
    }
    onDeleted(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-error" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-roast">Delete this store?</h3>
            <p className="text-sm text-medium-roast">This action cannot be undone</p>
          </div>
        </div>

        {loaded ? (
          <>
            <p className="text-sm text-medium-roast mb-4 leading-relaxed">
              {store
                ? `“${store.name}” and all of its data will be permanently deleted, along with the accounts of staff who belong only to this store.`
                : 'The store and all of its data will be permanently deleted, along with the accounts of staff who belong only to this store.'}
            </p>
            <label className="block text-sm font-medium text-medium-roast mb-2">
              Type the store link to confirm
              {token ? (
                <span className="font-mono text-dark-roast"> ({token})</span>
              ) : name ? (
                <span className="font-semibold text-dark-roast"> ({name})</span>
              ) : null}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={token || name || 'store name'}
              disabled={busy}
              autoComplete="off"
              className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-error/40 text-dark-roast mb-4"
            />
            {error && (
              <p className="text-sm text-error bg-error/5 rounded-xl px-3 py-2 mb-4">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!matches || busy}
                className="flex-1 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors btn-press disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete Store'
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-error animate-spin" />
            <p className="text-sm text-medium-roast">Loading store…</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
