import React from 'react';
import { useApp } from '../context/AppContext';
import { formatPrice, formatElapsedTime } from '../utils/helpers';
import { History, RotateCcw, X, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeldOrdersModal({ open, onClose }) {
  const { state, actions } = useApp();
  const { heldOrders, tables } = state;

  const tableLabel = (tableId, order) => {
    if (order?.deliveryChannel?.name) return order.deliveryChannel.name;
    if (tableId === 'COUNTER') return 'Counter';
    const table = tables.find(t => t.id === tableId);
    return table ? `Table ${table.number}` : tableId;
  };

  const handleRecall = (order) => {
    actions.recallOrder(order);
    onClose();
    actions.setView('pos');
    actions.addToast('Order recalled', 'success');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-espresso text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h2 className="font-semibold">Held Orders</h2>
                  <p className="text-xs text-latte">
                    {heldOrders.length} held order{heldOrders.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Held orders list */}
            <div className="flex-1 overflow-y-auto p-4">
              {heldOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="text-5xl mb-4">🕘</div>
                  <h3 className="font-semibold text-dark-roast mb-2">No held orders</h3>
                  <p className="text-sm text-medium-roast max-w-[240px]">
                    Orders you hold from the POS or tables view will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heldOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-cream rounded-xl p-4 border border-latte/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Coffee className="w-4 h-4 text-warning" />
                          <span className="font-medium text-dark-roast">
                            {tableLabel(order.tableId, order)}
                          </span>
                        </div>
                        <span className="text-xs text-medium-roast">
                          Held {formatElapsedTime(order.heldAt)} ago
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-medium-roast truncate">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                          <p className="text-xs text-latte mt-0.5 font-mono">
                            #{order.id.slice(-8)} • {order.items.reduce((s, i) => s + i.quantity, 0)} items
                          </p>
                        </div>
                        <span className="font-mono font-bold text-espresso">
                          {formatPrice(order.total)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRecall(order)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-warning text-white rounded-xl text-sm font-medium hover:bg-warning/90 transition-colors btn-press"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Recall
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
