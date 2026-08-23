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
  Footprints,
  Pencil
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
    serverCanEditPrice,
  } = state;
  const confirm = useConfirm();
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Servers only take orders — collecting money is reserved for Admin/Manager.
  const isServer = currentUser?.role === 'server';
  // Admins and Managers can always adjust a line price; servers only when the
  // store has switched the permission on in Manager/Admin → Settings.
  const canEditItemPrice = !isServer || serverCanEditPrice === true;
  
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
  
  // Once an order has been placed it lives on the open-orders board, so
  // clearing it is a removal that everybody sees — say so in the prompt.
  const isPlacedOrder = Boolean(currentOrder && openOrders.some(order => order.id === currentOrder.id));

  const handleClearOrder = async () => {
    if (currentOrder && currentOrder.items.length > 0) {
      const ok = await confirm({
        title: isPlacedOrder ? 'Remove placed order?' : 'Clear order?',
        message: isPlacedOrder
          ? 'This order has already been placed. Removing it takes it off the open orders list for everyone. This cannot be undone.'
          : 'Clear all items from this order? This cannot be undone.',
        confirmLabel: isPlacedOrder ? 'Remove order' : 'Clear',
        danger: true,
      });
      if (!ok) return;
      const result = await actions.clearOrder();
      if (result?.ok === false) {
        actions.addToast(result.error?.message || 'Could not clear order', 'error');
        return;
      }
      actions.addToast(result?.removed ? 'Order removed from open orders' : 'Order cleared', 'info');
    }
  };
  
  const handleVoidOrder = async () => {
    if (currentOrder && currentOrder.items.length > 0) {
      const ok = await confirm({
        title: 'Void order?',
        message: isPlacedOrder
          ? 'Void this order and remove it from the open orders list?'
          : 'Void this entire order?',
        confirmLabel: 'Void',
        danger: true,
      });
      if (!ok) return;
      const result = await actions.voidOrder();
      if (result?.ok === false) {
        actions.addToast(result.error?.message || 'Could not void order', 'error');
        return;
      }
      actions.addToast('Order voided', 'error');
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
              {/* Removing an order that is already on the board is an
                  Admin/Manager authority; servers may only clear their draft. */}
              {(!isPlacedOrder || !isServer) && (
                <button
                  onClick={handleClearOrder}
                  className="p-2 rounded-lg hover:bg-error/10 text-medium-roast hover:text-error transition-colors"
                  title={isPlacedOrder ? 'Remove placed order' : 'Clear order'}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
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
      <div className="flex-1 overflow-y-auto p-3">
        {isEmpty ? (
          <EmptyOrderState />
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {currentOrder.items.map(item => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  canEditPrice={canEditItemPrice}
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
      
      {/* Summary. Padding and gaps tighten on short/small screens so the
          Place Order and payment buttons stay visible without scrolling. */}
      <div className="p-3 lg:p-4 border-t border-latte/20 bg-cream">
        <div className="space-y-1 lg:space-y-2 mb-3">
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
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => setShowDiscounts(!showDiscounts)}
              disabled={isEmpty}
              className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl font-medium transition-colors btn-press ${
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
              className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl font-medium transition-colors btn-press ${
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
              className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl font-medium transition-colors btn-press ${
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
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-lg transition-all btn-press ${
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
              className={`flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2 py-3 rounded-xl font-semibold transition-all btn-press ${
                isEmpty
                  ? 'bg-latte/20 text-latte cursor-not-allowed'
                  : 'bg-success text-white hover:bg-success/90 shadow-lg shadow-success/30'
              }`}
            >
              <Banknote className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
              <span className="text-sm lg:text-base whitespace-nowrap">Cash</span>
            </button>
            
            <button
              onClick={() => actions.openPaymentModal('card')}
              disabled={isEmpty}
              className={`flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2 py-3 rounded-xl font-semibold transition-all btn-press ${
                isEmpty
                  ? 'bg-latte/20 text-latte cursor-not-allowed'
                  : 'bg-espresso text-white hover:bg-espresso/90 shadow-lg shadow-espresso/30'
              }`}
            >
              <CreditCard className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
              <span className="text-sm lg:text-base whitespace-nowrap">Card</span>
            </button>
            
            <button
              onClick={() => actions.openPaymentModal('ewallet')}
              disabled={isEmpty}
              className={`flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2 py-3 rounded-xl font-semibold transition-all btn-press ${
                isEmpty
                  ? 'bg-latte/20 text-latte cursor-not-allowed'
                  : 'bg-medium-roast text-white hover:bg-medium-roast/90 shadow-lg shadow-medium-roast/30'
              }`}
            >
              <Smartphone className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
              <span className="text-sm lg:text-base whitespace-nowrap">E-Wallet</span>
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

// A single cart line, kept to one row so the payment buttons stay reachable
// without scrolling on phones and tablets. The stepper doubles as the delete
// control (minus at quantity 1 becomes a bin), which removes the redundant
// second row and the separate X button the old layout needed.
function OrderItemRow({ item, onUpdate, onRemove, canEditPrice }) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState('');
  const modifierTotal = (item.modifiers || []).reduce((sum, m) => sum + m.price, 0);
  const itemTotal = (item.price + modifierTotal) * item.quantity;
  // Remember what the menu said the first time a price is overridden so the
  // change stays visible and reversible for the rest of the order's life.
  const menuPrice = item.originalPrice ?? item.price;
  const isOverridden = item.originalPrice != null && item.originalPrice !== item.price;

  const openPriceEditor = () => {
    if (!canEditPrice) return;
    setPriceDraft((item.price / 100).toFixed(2));
    setEditingPrice(true);
  };

  const commitPrice = () => {
    const parsed = Number.parseFloat(priceDraft);
    setEditingPrice(false);
    // Ignore anything that is not a usable amount and keep the current price.
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const cents = Math.round(parsed * 100);
    if (cents === item.price) return;
    onUpdate({
      price: cents,
      // Restoring the menu price clears the override marker entirely.
      originalPrice: cents === menuPrice ? null : menuPrice,
    });
  };

  const resetPrice = () => {
    setEditingPrice(false);
    onUpdate({ price: menuPrice, originalPrice: null });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-cream rounded-xl px-2.5 py-2 border border-latte/20"
    >
      <div className="flex items-center gap-2">
        {/* Compact stepper */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => {
              if (item.quantity > 1) onUpdate({ quantity: item.quantity - 1 });
              else onRemove();
            }}
            aria-label={item.quantity > 1 ? `Reduce ${item.name}` : `Remove ${item.name}`}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-latte/30 hover:bg-latte/10 transition-colors"
          >
            {item.quantity > 1 ? (
              <Minus className="w-3.5 h-3.5 text-medium-roast" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-error" />
            )}
          </button>
          <span className="w-6 text-center text-sm font-semibold text-dark-roast tabular-nums">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdate({ quantity: item.quantity + 1 })}
            aria-label={`Add another ${item.name}`}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-latte/30 hover:bg-latte/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-medium-roast" />
          </button>
        </div>

        {/* Name and, only when they exist, modifiers / notes */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-dark-roast truncate leading-tight">
            {item.name}
          </h4>
          {(item.modifiers?.length > 0 || item.specialInstructions || isOverridden) && (
            <p className="text-xs text-medium-roast truncate leading-tight mt-0.5">
              {isOverridden && (
                <span className="text-accent font-medium">
                  {formatPrice(item.price)} each ·{' '}
                </span>
              )}
              {(item.modifiers || []).map(mod => mod.name).join(', ')}
              {item.modifiers?.length > 0 && item.specialInstructions ? ' · ' : ''}
              {item.specialInstructions && (
                <span className="italic text-accent">{item.specialInstructions}</span>
              )}
            </p>
          )}
        </div>

        {/* Line total doubles as the price-edit affordance where permitted */}
        {canEditPrice ? (
          <button
            onClick={openPriceEditor}
            aria-label={`Change price of ${item.name}`}
            className="shrink-0 flex items-center gap-1 px-1.5 py-1 -mr-1 rounded-lg hover:bg-latte/20 transition-colors group"
          >
            <span className={`font-mono font-semibold text-sm ${isOverridden ? 'text-accent' : 'text-espresso'}`}>
              {formatPrice(itemTotal)}
            </span>
            <Pencil className="w-3 h-3 text-latte group-hover:text-accent transition-colors" />
          </button>
        ) : (
          <span className="shrink-0 font-mono font-semibold text-sm text-espresso">
            {formatPrice(itemTotal)}
          </span>
        )}
      </div>

      {/* Inline price editor — opens in place so nothing jumps around */}
      <AnimatePresence>
        {editingPrice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-latte/20">
              <span className="text-xs text-medium-roast shrink-0">Unit price</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                autoFocus
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitPrice();
                  if (e.key === 'Escape') setEditingPrice(false);
                }}
                onBlur={commitPrice}
                className="w-24 px-2 py-1 bg-white border border-accent/40 rounded-lg text-sm font-mono focus:outline-none focus:border-accent"
              />
              {isOverridden && (
                <button
                  // Mouse down fires before the input's blur, so the reset is
                  // not swallowed by commitPrice closing the editor first.
                  onMouseDown={(e) => { e.preventDefault(); resetPrice(); }}
                  className="text-xs text-medium-roast hover:text-accent underline shrink-0"
                >
                  Reset to {formatPrice(menuPrice)}
                </button>
              )}
              <button
                onMouseDown={(e) => { e.preventDefault(); commitPrice(); }}
                className="ml-auto px-3 py-1 bg-espresso text-white rounded-lg text-xs font-medium hover:bg-espresso/90 shrink-0"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
