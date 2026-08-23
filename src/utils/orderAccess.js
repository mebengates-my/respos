// Client-side mirror of the Supabase order RLS rule. The database remains the
// security boundary in cloud mode; this helper keeps local/demo UI consistent.
export function visibleOpenOrders(state) {
  const orders = Array.isArray(state.openOrders) ? state.openOrders : [];
  if (state.currentUser?.role !== 'server' || state.serverCanViewAllOrders !== false) {
    return orders;
  }
  return orders.filter(order =>
    order.serverId === state.currentUser?.id ||
    order.createdBy === state.currentUser?.id
  );
}

export function orderLocationLabel(order, tables, walkInLabel = 'Walk-in') {
  if (!order?.tableId || order.tableId === 'COUNTER') return walkInLabel;
  const table = (tables || []).find(item => item.id === order.tableId);
  return table ? `Table ${table.number}` : order.tableId;
}
