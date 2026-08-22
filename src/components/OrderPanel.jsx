import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatPrice } from '../utils/helpers';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Tag,
  StickyNote,
  CreditCard,
  Banknote,
  Smartphone,
  Pause,
  Play,
  X,
  Percent,
  AlertCircle,
  Gift,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { discountPresets } from '../data/menuData';
import { useConfirm } from './ConfirmDialog';
import HeldOrdersModal from './HeldOrdersModal';

export default function OrderPanel() {
  const { state, actions } = useApp();
  const { currentOrder, selectedTable, taxRate, discountPresets: presets, heldOrders } = state;
  const confirm = useConfirm();
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  
  const isEmpty = !currentOrder || currentOrder.items.length === 0;
  
  const handleClearOrder = async () => {
    if (currentOrder && currentOrder.items.length > 0) {
      const ok = await confirm({
        title: 'Clear order?',
        message: 'Clear all items from this order? This cannot be undone.',
        confirmLabel: 'Clear',
        danger: true,
      });
      if (ok) {
        actions.clearOrder();
        actions.addToast('Order cleared', 'info');
      }
    }
  };
  
  const handleVoidOrder = async () => {
    if (currentOrder && currentOrder.items.length > 0) {
      const ok = await confirm({
        title: 'Void order?',
        message: 'Void this entire order?',
        confirmLabel: 'Void',
        danger: true,
      });
      if (ok) {
        actions.voidOrder();
        actions.addToast('Order voided', 'error');
      }
    }
  };
  
  const handleHoldOrder = () => {
    if (actions.holdOrder()) {
      actions.addToast('Order held', 'info');
    }
  };
  
  const handleNotesSubmit = () => {
    actions.updateOrderNotes(noteText);
    setShowNotes(false);
    actions.addToast('Notes added', 'info');
  };
  
  return (
    <div className="flex flex-col h-full bg-white border-l border-latte/20">
      {/* Header */}
      <div className="p-4 border-b border-latte/20 bg-cream">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-espresso p-2 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-dark-roast">
                {selectedTable?.isCounter ? 'Counter Order' : `Table ${selectedTable?.number || ''}`}
              </h2>
              <p className="text-xs text-medium-roast">
                {currentOrder?.id || 'No active order'}
              </p>
            </div>
          </div>
          
          {heldOrders.length > 0 && (
            <button
              onClick={() => setShowHeldOrders(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-warning/10 text-warning rounded-lg text-sm font-medium hover:bg-warning/20 transition-colors btn-press"
              title="Held orders"
            >
              <Pause className="w-4 h-4" />
              <span>Held ({heldOrders.length})</span>
            </button>
          )}
          
          {currentOrder && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className={`p-2 rounded-lg transition-colors ${
                  showNotes ? 'bg-latte/20 text-espresso' : 'hover:bg-latte/10 text-medium-roast'
                }`}
                title="Add notes"
              >
                <StickyNote className="w-5 h-5" />
              </button>
              <button
                onClick={handleClearOrder}
                className="p-2 rounded-lg hover:bg-error/10 text-medium-roast hover:text-error transition-colors"
                title="Clear order"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        
        {/* Notes input */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add special instructions..."
                  className="flex-1 px-3 py-2 bg-white border border-latte/30 rounded-lg text-sm focus:outline-none focus:border-accent"
                  onKeyDown={(e) => e.key === 'Enter' && handleNotesSubmit()}
                />
                <button
                  onClick={handleNotesSubmit}
                  className="px-4 py-2 bg-espresso text-white rounded-lg text-sm font-medium hover:bg-espresso/90 btn-press"
                >
                  Add
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {currentOrder?.notes && (
          <div className="mt-2 px-3 py-2 bg-latte/10 rounded-lg text-sm text-medium-roast flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            {currentOrder.notes}
          </div>
        )}
      </div>
      
      {/* Order items */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <EmptyOrderState />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {currentOrder.items.map((item, index) => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdate={(updates) => actions.updateItem(item.id, updates)}
                  onRemove={() => actions.removeItem(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Discounts */}
      <AnimatePresence>
        {showDiscounts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-latte/20"
          >
            <div className="p-4 bg-cream">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-dark-roast">Apply Discount</h3>
                {currentOrder?.discount && (
                  <button
                    onClick={() => {
                      actions.removeDiscount();
                      actions.addToast('Discount removed', 'info');
                    }}
                    className="text-sm text-error flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      actions.applyDiscount(preset);
                      setShowDiscounts(false);
                      actions.addToast(`${preset.name} applied`, 'success');
                    }}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors btn-press ${
                      currentOrder?.discount?.id === preset.id
                        ? 'bg-success text-white'
                        : 'bg-white border border-latte/30 text-dark-roast hover:bg-latte/10'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Summary */}
      <div className="p-4 border-t border-latte/20 bg-cream">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-medium-roast">
            <span>Subtotal</span>
            <span className="font-mono">
              {currentOrder ? formatPrice(currentOrder.subtotal) : 'RM 0.00'}
            </span>
          </div>
          
          {currentOrder?.discount && (
            <div className="flex justify-between text-sm text-success">
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {currentOrder.discount.name}
              </span>
              <span className="font-mono">
                -{formatPrice(currentOrder.discountAmount)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between text-sm text-medium-roast">
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="font-mono">
              {currentOrder ? formatPrice(currentOrder.tax) : 'RM 0.00'}
            </span>
          </div>
          
          <div className="flex justify-between text-lg font-bold text-dark-roast pt-2 border-t border-latte/30">
            <span>Total</span>
            <span className="font-mono text-accent">
              {currentOrder ? formatPrice(currentOrder.total) : 'RM 0.00'}
            </span>
          </div>
          
          {currentOrder?.items.length > 0 && (
            <div className="text-xs text-medium-roast text-right">
              {currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items
            </div>
          )}
        </div>
        
        {/* Quick discount button */}
        {!currentOrder?.discount && currentOrder?.items.length > 0 && (
          <button
            onClick={() => setShowDiscounts(!showDiscounts)}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-latte/10 text-espresso rounded-lg text-sm font-medium hover:bg-latte/20 transition-colors btn-press"
          >
            <Percent className="w-4 h-4" />
            Apply Discount
          </button>
        )}
        
        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setShowDiscounts(!showDiscounts)}
            disabled={isEmpty}
            className={`flex items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium transition-colors btn-press ${
              isEmpty
                ? 'bg-latte/20 text-latte cursor-not-allowed'
                : 'bg-latte/10 text-espresso hover:bg-latte/20'
            }`}
          >
            <Percent className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleHoldOrder}
            disabled={isEmpty}
            className={`flex items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium transition-colors btn-press ${
              isEmpty
                ? 'bg-latte/20 text-latte cursor-not-allowed'
                : 'bg-warning/10 text-warning hover:bg-warning/20'
            }`}
          >
            <Pause className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleVoidOrder}
            disabled={isEmpty}
            className={`flex items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium transition-colors btn-press ${
              isEmpty
                ? 'bg-latte/20 text-latte cursor-not-allowed'
                : 'bg-error/10 text-error hover:bg-error/20'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Payment buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => actions.openPaymentModal('cash')}
            disabled={isEmpty}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-xl font-semibold transition-all btn-press ${
              isEmpty
                ? 'bg-latte/20 text-latte cursor-not-allowed'
                : 'bg-success text-white hover:bg-success/90 shadow-lg shadow-success/30'
            }`}
          >
            <Banknote className="w-6 h-6" />
            <span>Cash</span>
          </button>
          
          <button
            onClick={() => actions.openPaymentModal('card')}
            disabled={isEmpty}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-xl font-semibold transition-all btn-press ${
              isEmpty
                ? 'bg-latte/20 text-latte cursor-not-allowed'
                : 'bg-espresso text-white hover:bg-espresso/90 shadow-lg shadow-espresso/30'
            }`}
          >
            <CreditCard className="w-6 h-6" />
            <span>Card</span>
          </button>
          
          <button
            onClick={() => actions.openPaymentModal('ewallet')}
            disabled={isEmpty}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-xl font-semibold transition-all btn-press ${
              isEmpty
                ? 'bg-latte/20 text-latte cursor-not-allowed'
                : 'bg-medium-roast text-white hover:bg-medium-roast/90 shadow-lg shadow-medium-roast/30'
            }`}
          >
            <Smartphone className="w-6 h-6" />
            <span>E-Wallet</span>
          </button>
        </div>
      </div>
      
      {/* Held Orders Modal */}
      <HeldOrdersModal
        open={showHeldOrders}
        onClose={() => setShowHeldOrders(false)}
      />
    </div>
  );
}

function EmptyOrderState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="text-6xl mb-4">☕</div>
      <h3 className="font-semibold text-dark-roast mb-2">No items yet</h3>
      <p className="text-sm text-medium-roast max-w-[200px]">
        Select items from the menu to start building your order
      </p>
    </div>
  );
}

function OrderItemRow({ item, index, onUpdate, onRemove }) {
  const modifierTotal = (item.modifiers || []).reduce((sum, m) => sum + m.price, 0);
  const itemTotal = (item.price + modifierTotal) * item.quantity;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-cream rounded-xl p-3 border border-latte/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-espresso text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {item.quantity}x
            </span>
            <h4 className="font-semibold text-dark-roast truncate">{item.name}</h4>
          </div>
          
          {/* Modifiers */}
          {item.modifiers && item.modifiers.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {item.modifiers.map((mod, i) => (
                <span
                  key={i}
                  className="text-xs bg-latte/20 text-medium-roast px-2 py-0.5 rounded-full"
                >
                  {mod.name}
                  {mod.price > 0 && ` (+${formatPrice(mod.price)})`}
                </span>
              ))}
            </div>
          )}
          
          {/* Special instructions */}
          {item.specialInstructions && (
            <p className="text-xs text-accent italic">
              Note: {item.specialInstructions}
            </p>
          )}
        </div>
        
        <div className="text-right">
          <span className="font-mono font-semibold text-espresso">
            {formatPrice(itemTotal)}
          </span>
        </div>
      </div>
      
      {/* Quantity controls */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-latte/10">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (item.quantity > 1) {
                onUpdate({ quantity: item.quantity - 1 });
              } else {
                onRemove();
              }
            }}
            className="p-1.5 rounded-lg bg-white border border-latte/30 hover:bg-latte/10 transition-colors"
          >
            {item.quantity > 1 ? (
              <Minus className="w-4 h-4 text-medium-roast" />
            ) : (
              <Trash2 className="w-4 h-4 text-error" />
            )}
          </button>
          
          <span className="w-8 text-center font-medium text-dark-roast">
            {item.quantity}
          </span>
          
          <button
            onClick={() => onUpdate({ quantity: item.quantity + 1 })}
            className="p-1.5 rounded-lg bg-white border border-latte/30 hover:bg-latte/10 transition-colors"
          >
            <Plus className="w-4 h-4 text-medium-roast" />
          </button>
        </div>
        
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
