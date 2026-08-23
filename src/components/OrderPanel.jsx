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
  X,
  Percent,
  Send,
  LoaderCircle,
  Footprints
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from './ConfirmDialog';
import HeldOrdersModal from './HeldOrdersModal';
import { visibleOpenOrders } from '../utils/orderAccess';

export default function OrderPanel() {
  const { state, actions } = useApp();
  const {
    currentOrder,
    selectedTable,
    selectedDeliveryChannel,
    taxRate,
    taxEnabled,
    discountPresets: presets,
    heldOrders,
    openOrders,
    tables,
    deliveryChannels,
    currentUser,
  } = state;
  const confirm = useConfirm();
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Servers only take orders — collecting money is reserved for Admin/Manager.
  const isServer = currentUser?.role === 'server';
  
  const isEmpty = !currentOrder || currentOrder.items.length === 0;
  const accessibleOpenOrders = visibleOpenOrders(state);

  React.useEffect(() => {
    setNoteText(currentOrder?.notes || '');
  }, [currentOrder?.id, currentOrder?.notes]);

  const handleTableChange = (tableId) => {
    const table = tables.find(item => item.id === tableId)
      || tables.find(item => item.isCounter)
      || null;
    // Dining tables have one open order. Choosing an occupied table opens that
    // order for editing instead of silently creating a duplicate.
    const existing = tableId === 'COUNTER'
      ? null
      : accessibleOpenOrders.find(order => order.tableId === tableId);
    if (existing && existing.id !== currentOrder?.id) {
      if (currentOrder?.items?.length) {
        actions.addToast('Place or clear the current order before opening another table.', 'error');
        return;
      }
      actions.editOpenOrder(existing);
      return;
    }
    actions.selectTable(table);
  };

  // Delivery chips simply re-aim the (new or in-progress) order at a channel —
  // unlike tables there is no one-open-order rule, several couriers can wait.
  const handleDeliverySelect = (channel) => {
    if (channel.active === false) return;
    actions.selectDeliveryChannel(channel);
  };

  const handlePlaceOrder = async () => {
    if (isEmpty || isSubmitting) return;
    setIsSubmitting(true);
    const wasEditing = Boolean(currentOrder?.isEditing || openOrders.some(order => order.id === currentOrder?.id));
    const result = await actions.placeOrder();
    setIsSubmitting(false);
    if (result.ok) {
      actions.addToast(wasEditing ? 'Order updated' : 'Order placed', 'success');
    } else {
      actions.addToast(result.error?.message || 'Could not place order', 'error');
    }
  };
  
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
                {selectedDeliveryChannel
                  ? `${selectedDeliveryChannel.emoji || '🛵'} ${selectedDeliveryChannel.name}`
                  : selectedTable?.isCounter || !selectedTable
                    ? 'Walk-in customer'
                    : `Table ${selectedTable.number}`}
              </h2>
              <p className="text-xs text-medium-roast">
                {currentOrder?.isEditing ? 'Editing placed order' : (currentOrder?.id || 'New order')}
              </p>
            </div>
          </div>
          
          {!isServer && heldOrders.length > 0 && (
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

        {/* The location is selected before items are placed. Walk-in is the
            default; tables and food-delivery services are one tap away. */}
        <div className="mt-3">
          <span className="block text-xs font-semibold text-medium-roast mb-1.5 uppercase tracking-wider">
            Order for
          </span>
          <OrderTargetSelector
            tables={tables}
            deliveryChannels={deliveryChannels}
            selectedTable={selectedTable}
            selectedDeliveryChannel={selectedDeliveryChannel}
            openOrders={accessibleOpenOrders}
            currentOrder={currentOrder}
            onSelectTable={handleTableChange}
            onSelectDelivery={handleDeliverySelect}
          />
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
              {currentOrder.items.map(item => (
                <OrderItemRow
                  key={item.id}
                  item={item}
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
          
          {/* Tax can be switched off entirely in Admin → Settings. */}
          {taxEnabled !== false && (
            <div className="flex justify-between text-sm text-medium-roast">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span className="font-mono">
                {currentOrder ? formatPrice(currentOrder.tax) : 'RM 0.00'}
              </span>
            </div>
          )}
          
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
        
        {/* Quick discount button — discounts are an Admin/Manager action;
            servers never see discount controls. */}
        {!isServer && !currentOrder?.discount && currentOrder?.items.length > 0 && (
          <button
            onClick={() => setShowDiscounts(!showDiscounts)}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-latte/10 text-espresso rounded-lg text-sm font-medium hover:bg-latte/20 transition-colors btn-press"
          >
            <Percent className="w-4 h-4" />
            Apply Discount
          </button>
        )}
        
        {/* Hold/void tools are for managers. Servers submit with the clear,
            explicit Place Order button below. */}
        {!isServer && (
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
        )}

        {/* Everyone who takes orders — server, manager and admin — sends the
            order to the kitchen with this button. Servers stop here; managers
            and admins can also collect payment right away. */}
        <button
          onClick={handlePlaceOrder}
          disabled={isEmpty || isSubmitting}
          className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold text-lg transition-all btn-press ${
            isEmpty || isSubmitting
              ? 'bg-latte/30 text-latte cursor-not-allowed'
              : 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/30'
          }`}
        >
          {isSubmitting
            ? <LoaderCircle className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />}
          {isSubmitting
            ? 'Placing…'
            : currentOrder?.isEditing || openOrders.some(order => order.id === currentOrder?.id)
              ? 'Update Order'
              : 'Place Order'}
        </button>

        {/* Collecting money stays reserved for Admin/Manager. */}
        {!isServer && (
          <div className="grid grid-cols-3 gap-2 mt-2">
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
        )}
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

// One-tap destination picker shown at the top of the cart: walk-in, every
// dining table (as a numbered tile), and each configured food-delivery
// service. Replaces the old dropdown so a server can switch target with a
// single tap instead of scrolling a list.
function OrderTargetSelector({
  tables,
  deliveryChannels,
  selectedTable,
  selectedDeliveryChannel,
  openOrders,
  currentOrder,
  onSelectTable,
  onSelectDelivery,
}) {
  const diningTables = tables.filter(table => !table.isCounter);
  // Inactive services are configured in the panel but hidden from the POS.
  const activeChannels = (deliveryChannels || []).filter(channel => channel.active !== false);
  const walkInSelected = !selectedDeliveryChannel && (selectedTable?.isCounter || !selectedTable);
  const selectedTableId = selectedDeliveryChannel ? null : selectedTable?.id || 'COUNTER';

  const tableState = (table) => {
    const existing = openOrders.find(order => order.tableId === table.id);
    const unavailable = table.status === 'reserved' || table.status === 'cleaning'
      || (table.status === 'occupied' && !existing && currentOrder?.tableId !== table.id);
    const isEditingThis = currentOrder?.tableId === table.id;
    return { existing, unavailable, isEditingThis };
  };

  return (
    <div className="max-h-40 overflow-y-auto pr-0.5 space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* Walk-in */}
        <button
          type="button"
          onClick={() => onSelectTable('COUNTER')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all btn-press ${
            walkInSelected
              ? 'border-accent bg-accent text-white shadow-md'
              : 'border-latte/30 bg-white text-dark-roast hover:border-latte/60'
          }`}
          title="Walk-in customer"
        >
          <Footprints className="w-4 h-4" />
          Walk-in
        </button>

        {/* Dining tables as numbered tiles */}
        {diningTables.map(table => {
          const { existing, unavailable, isEditingThis } = tableState(table);
          const isSelected = selectedTableId === table.id;
          return (
            <button
              key={table.id}
              type="button"
              disabled={unavailable}
              onClick={() => onSelectTable(table.id)}
              className={`relative w-11 h-11 rounded-xl border-2 font-display font-bold text-base transition-all ${
                unavailable
                  ? 'border-latte/20 bg-latte/10 text-latte cursor-not-allowed'
                  : isSelected
                    ? 'border-accent bg-accent text-white shadow-md btn-press'
                    : 'border-latte/30 bg-white text-dark-roast hover:border-latte/60 btn-press'
              }`}
              title={
                unavailable
                  ? `Table ${table.number} — ${table.status}`
                  : existing
                    ? `Table ${table.number} — open order`
                    : `Table ${table.number}`
              }
            >
              {table.number}
              {/* Live status dot */}
              <span
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  unavailable
                    ? 'bg-error/70'
                    : existing || isEditingThis || table.status === 'occupied'
                      ? 'bg-warning'
                      : 'bg-success'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Food-delivery services configured by the manager/admin */}
      {activeChannels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChannels.map(channel => {
            const isSelected = selectedDeliveryChannel?.id === channel.id;
            const disabled = channel.active === false;
            const color = channel.color || '#6D4C41';
            return (
              <button
                key={channel.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectDelivery(channel)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  disabled ? 'opacity-40 cursor-not-allowed border-latte/20 bg-latte/10' : 'btn-press'
                }`}
                style={
                  isSelected
                    ? { borderColor: color, backgroundColor: color, color: 'white' }
                    : { borderColor: `${color}55`, backgroundColor: `${color}14`, color: '#3E2B22' }
                }
                title={disabled ? `${channel.name} — disabled` : `Delivery via ${channel.name}`}
              >
                <span aria-hidden="true">{channel.emoji || '🛵'}</span>
                {channel.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderItemRow({ item, onUpdate, onRemove }) {
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
