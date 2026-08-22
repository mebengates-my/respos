import React from 'react';
import { useApp } from '../context/AppContext';
import { formatPrice, formatElapsedTime } from '../utils/helpers';
import {
  ArrowLeft,
  Users,
  Clock,
  Plus,
  Trash2,
  History,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TableView() {
  const { state, actions } = useApp();
  const { tables, heldOrders, orderHistory, currentOrder } = state;
  
  const [selectedTable, setSelectedTable] = React.useState(null);
  const [showHeldOrders, setShowHeldOrders] = React.useState(false);
  
  const handleTableClick = (table) => {
    if (table.status === 'occupied' && table.currentOrderId) {
      setSelectedTable(table);
    } else if (table.status === 'available') {
      // Start new order for this table
      actions.selectTable(table);
      actions.setView('pos');
      actions.addToast(`Table ${table.number} selected`, 'info');
    }
  };
  
  const handleRecallOrder = (order) => {
    actions.recallOrder(order);
    setShowHeldOrders(false);
    actions.setView('pos');
    actions.addToast('Order recalled', 'success');
  };
  
  const handleClearTable = (table) => {
    if (confirm(`Clear Table ${table.number}?`)) {
      actions.updateTableStatus(table.id, 'available');
      actions.addToast(`Table ${table.number} cleared`, 'info');
    }
  };
  
  return (
    <div className="flex-1 flex flex-col h-full bg-cream">
      {/* Header */}
      <div className="p-4 bg-white border-b border-latte/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => actions.setView('pos')}
            className="flex items-center gap-2 text-medium-roast hover:text-dark-roast transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to POS
          </button>
          <h1 className="font-display text-xl font-semibold text-dark-roast">
            Table Management
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHeldOrders(!showHeldOrders)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors btn-press ${
              showHeldOrders
                ? 'bg-warning text-white'
                : 'bg-warning/10 text-warning hover:bg-warning/20'
            }`}
          >
            <History className="w-5 h-5" />
            Held Orders ({heldOrders.length})
          </button>
        </div>
      </div>
      
      {/* Held Orders Panel */}
      <AnimatePresence>
        {showHeldOrders && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-warning/10 border-b border-warning/30 overflow-hidden"
          >
            <div className="p-4">
              <h3 className="font-semibold text-dark-roast mb-3">Held Orders</h3>
              {heldOrders.length === 0 ? (
                <p className="text-medium-roast text-sm">No held orders</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {heldOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl p-3 min-w-[200px] shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-dark-roast">
                          {order.tableId === 'COUNTER' ? 'Counter' : `Table ${order.tableId.replace('T', '')}`}
                        </span>
                        <span className="text-xs text-medium-roast">
                          {formatElapsedTime(order.heldAt)} ago
                        </span>
                      </div>
                      <div className="text-sm text-medium-roast mb-2">
                        {order.items.length} items • {formatPrice(order.total)}
                      </div>
                      <button
                        onClick={() => handleRecallOrder(order)}
                        className="w-full py-2 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning/90 btn-press flex items-center justify-center gap-2"
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
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6">
            <LegendItem color="bg-success" label="Available" />
            <LegendItem color="bg-warning" label="Occupied" />
            <LegendItem color="bg-medium-roast" label="Reserved" />
            <LegendItem color="bg-latte" label="Cleaning" />
          </div>
          
          {/* Counter */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-medium-roast mb-3 uppercase tracking-wider">
              Counter
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <TableCard
                table={tables.find(t => t.isCounter)}
                isSelected={currentOrder?.tableId === 'COUNTER'}
                onClick={() => {
                  actions.selectTable(tables.find(t => t.isCounter));
                  actions.setView('pos');
                }}
                onClear={handleClearTable}
              />
            </div>
          </div>
          
          {/* Tables */}
          <div>
            <h2 className="text-sm font-semibold text-medium-roast mb-3 uppercase tracking-wider">
              Dining Area
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tables.filter(t => !t.isCounter).map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  isSelected={currentOrder?.tableId === table.id}
                  onClick={() => handleTableClick(table)}
                  onClear={handleClearTable}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-lg ${color}`} />
      <span className="text-sm text-medium-roast">{label}</span>
    </div>
  );
}

function TableCard({ table, isSelected, onClick, onClear }) {
  if (!table) return null;
  
  const statusColors = {
    available: 'bg-success',
    occupied: 'bg-warning',
    reserved: 'bg-medium-roast',
    cleaning: 'bg-latte',
  };
  
  const statusText = {
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    cleaning: 'Cleaning',
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative bg-white rounded-2xl p-4 shadow-sm border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-accent shadow-lg ring-4 ring-accent/20'
          : 'border-transparent hover:shadow-md'
      }`}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        <div className={`w-3 h-3 rounded-full ${statusColors[table.status]}`} />
      </div>
      
      {/* Table info */}
      <div className="text-center">
        <h3 className="font-display text-2xl font-bold text-dark-roast">
          {table.isCounter ? 'COUNTER' : table.number}
        </h3>
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-medium-roast">
          <Users className="w-4 h-4" />
          <span>{table.capacity} seats</span>
        </div>
        <p className={`mt-2 text-xs font-medium ${
          table.status === 'available' ? 'text-success' :
          table.status === 'occupied' ? 'text-warning' :
          table.status === 'reserved' ? 'text-medium-roast' :
          'text-latte'
        }`}>
          {statusText[table.status]}
        </p>
      </div>
      
      {/* Actions for occupied tables */}
      {table.status === 'occupied' && (
        <div className="mt-3 pt-3 border-t border-latte/20 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex-1 py-2 bg-espresso text-white rounded-lg text-sm font-medium hover:bg-espresso/90 btn-press"
          >
            View Order
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear(table);
            }}
            className="p-2 bg-error/10 text-error rounded-lg hover:bg-error/20 btn-press"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
