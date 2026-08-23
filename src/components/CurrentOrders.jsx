import React, { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, CreditCard, Edit3, ShoppingBag, Trash2, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatElapsedTime, formatPrice } from '../utils/helpers';
import { orderLocationLabel, visibleOpenOrders } from '../utils/orderAccess';
import { useConfirm } from './ConfirmDialog';

export default function CurrentOrders() {
  const { state, actions } = useApp();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState(null);
  const orders = visibleOpenOrders(state);
  const showingAll = state.serverCanViewAllOrders !== false;
  // Collecting money and removing placed orders are Admin/Manager authorities.
  const canManage = state.currentUser?.role === 'admin' || state.currentUser?.role === 'manager';

  // Keep the "time open" labels honest without waiting for another state change.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const openValue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  const editOrder = (order) => {
    actions.editOpenOrder(order);
  };

  // Straight from the board to the cash drawer: opens the order in the POS and
  // pops the payment modal so the manager can settle it in one tap.
  const takePayment = (order) => {
    actions.collectPaymentForOrder(order);
  };

  const cancelOrder = async (order) => {
    const location = orderLocationLabel(order, state.tables, 'Walk-in', state.deliveryChannels);
    const ok = await confirm({
      title: 'Remove open order?',
      message: `Remove the order for ${location}? This takes it off the open orders list for everyone and cannot be undone.`,
      confirmLabel: 'Remove order',
      danger: true,
    });
    if (!ok) return;

    setBusyId(order.id);
    const result = await actions.cancelOpenOrder(order);
    setBusyId(null);
    if (result.ok) {
      actions.addToast('Order removed', 'info');
    } else {
      actions.addToast(result.error?.message || 'Could not remove order', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cream overflow-hidden">
      <div className="p-4 bg-white border-b border-latte/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => actions.setView('pos')}
            className="flex items-center gap-2 text-medium-roast hover:text-dark-roast transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to POS
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold text-dark-roast flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Open Orders
            </h1>
            <p className="text-xs text-medium-roast mt-0.5">
              {canManage
                ? 'Every unpaid order — open one to edit it or take payment'
                : showingAll ? 'All table and walk-in orders' : 'Orders placed by you'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orders.length > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-espresso/10 text-espresso text-sm font-semibold font-mono">
              {formatPrice(openValue)}
            </span>
          )}
          <span className="px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold">
            {orders.length} open
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {orders.length === 0 ? (
          <div className="max-w-lg mx-auto bg-white rounded-2xl p-12 shadow-sm text-center mt-8">
            <ShoppingBag className="w-11 h-11 text-latte mx-auto mb-3" />
            <h2 className="font-semibold text-dark-roast mb-1">No open orders</h2>
            <p className="text-sm text-medium-roast">
              Placed orders will appear here until an Admin or Manager completes payment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {orders.map(order => {
              const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
              return (
                <article key={order.id} className="bg-white rounded-2xl shadow-sm border border-latte/20 overflow-hidden">
                  <div className="p-4 border-b border-latte/20 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display font-bold text-lg text-dark-roast">
                        {orderLocationLabel(order, state.tables, 'Walk-in', state.deliveryChannels)}
                      </h2>
                      <p className="text-xs font-mono text-medium-roast mt-0.5">#{String(order.id).slice(-8)}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success">
                      Open
                    </span>
                  </div>

                  <div className="p-4">
                    <ul className="space-y-2 mb-4">
                      {order.items.map(item => (
                        <li key={item.id} className="flex justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-dark-roast">
                            {item.quantity}× {item.name}
                          </span>
                          <span className="font-mono text-medium-roast shrink-0">
                            {formatPrice((item.price + (item.modifiers || []).reduce((sum, mod) => sum + mod.price, 0)) * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-3 border-t border-latte/20 flex items-center justify-between text-sm">
                      <span className="text-medium-roast">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                      <span className="font-mono font-bold text-espresso">{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-medium-roast mt-2">
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        {order.serverName || (order.serverId === state.currentUser?.id ? state.currentUser?.name : 'Server')}
                      </span>
                      {order.placedAt || order.createdAt ? (
                        <span className="shrink-0">{formatElapsedTime(order.placedAt || order.createdAt)} ago</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Managers get the money button first — it is the action they
                      come to this board for. Servers only edit their tickets. */}
                  <div className="p-3 bg-cream border-t border-latte/20 space-y-2">
                    {canManage && (
                      <button
                        onClick={() => takePayment(order)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-success text-white rounded-xl font-semibold hover:bg-success/90 btn-press"
                      >
                        <CreditCard className="w-4 h-4" />
                        Take payment
                      </button>
                    )}
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <button
                        onClick={() => editOrder(order)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold btn-press ${
                          canManage
                            ? 'bg-white border border-latte/30 text-dark-roast hover:bg-latte/10'
                            : 'bg-accent text-white hover:bg-accent/90'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit order
                      </button>
                      <button
                        onClick={() => cancelOrder(order)}
                        disabled={busyId === order.id}
                        className="p-2.5 bg-error/10 text-error rounded-xl hover:bg-error/20 disabled:opacity-50 btn-press"
                        title="Remove order"
                        aria-label={`Remove ${orderLocationLabel(order, state.tables, 'Walk-in', state.deliveryChannels)} order`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
