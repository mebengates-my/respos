import React from 'react';
import { useApp } from '../context/AppContext';
import { formatPrice, formatElapsedTime } from '../utils/helpers';
import {
  ArrowLeft,
  Users,
  History,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
  SprayCan,
  UserPlus,
  Bookmark,
  X,
  MoveRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TableView() {
  const { state, actions } = useApp();
  const { tables, heldOrders, currentOrder } = state;
  
  const [showHeldOrders, setShowHeldOrders] = React.useState(false);
  // Table transfer mode: id of the source table, or null
  const [transferFrom, setTransferFrom] = React.useState(null);
  
  const transferMode = transferFrom !== null;
  const transferFromTable = tables.find(t => t.id === transferFrom);
  
  const handleCardClick = (table) => {
    // In transfer mode, tapping an available table selects it as the target
    if (transferMode) {
      if (table.id === transferFrom) {
        setTransferFrom(null);
        return;
      }
      if (table.status === 'available' && !table.isCounter) {
        confirmTransfer(table);
      } else {
        actions.addToast('Pick an available dining table', 'error');
      }
      return;
    }
    
    if (table.status === 'available') {
      actions.selectTable(table);
      actions.setView('pos');
      actions.addToast(`${table.isCounter ? 'Counter' : 'Table ' + table.number} selected`, 'info');
    } else if (table.status === 'occupied') {
      // Resume the active order for this table
      actions.selectTable(table);
      actions.setView('pos');
    }
    // cleaning / reserved are handled via their action buttons
  };
  
  const startTransfer = (table) => {
    setTransferFrom(table.id);
    actions.addToast(`Tap a free table to move Table ${table.number} to`, 'info');
  };
  
  const confirmTransfer = (targetTable) => {
    if (!transferFrom) return;
    const fromTable = tables.find(t => t.id === transferFrom);
    setTransferFrom(null);
    if (!fromTable) return;
    if (targetTable.id === fromTable.id) return;
    if (targetTable.status !== 'available' || targetTable.isCounter) {
      actions.addToast('Pick an available dining table', 'error');
      return;
    }
    if (confirm(`Move the order from Table ${fromTable.number} to Table ${targetTable.number}?`)) {
      actions.transferTable(fromTable.id, targetTable.id);
      actions.addToast(`Order moved to Table ${targetTable.number}`, 'success');
    }
  };
  
  const cancelReservation = (table) => {
    if (confirm(`Cancel reservation for Table ${table.number}?`)) {
      actions.updateTableStatus(table.id, 'available');
      actions.addToast(`Table ${table.number} is now available`, 'info');
    }
  };
  
  const seatGuests = (table) => {
    actions.updateTableStatus(table.id, 'available');
    actions.selectTable(table);
    actions.setView('pos');
    actions.addToast(`Seating guests at Table ${table.number}`, 'info');
  };
  
  const markClean = (table) => {
    actions.updateTableStatus(table.id, 'available');
    actions.addToast(`Table ${table.number} marked clean`, 'success');
  };
  
  const clearTable = (table) => {
    if (confirm(`Free up Table ${table.number}? (mark as available)`)) {
      actions.updateTableStatus(table.id, 'available');
      actions.addToast(`Table ${table.number} cleared`, 'info');
    }
  };
  
  const handleAction = (table, action) => {
    switch (action) {
      case 'view':
        actions.selectTable(table);
        actions.setView('pos');
        break;
      case 'transfer':
        startTransfer(table);
        break;
      case 'clear':
        clearTable(table);
        break;
      case 'clean':
        markClean(table);
        break;
      case 'seat':
        seatGuests(table);
        break;
      case 'cancel-reservation':
        cancelReservation(table);
        break;
      case 'reserve':
        actions.updateTableStatus(table.id, 'reserved');
        actions.addToast(`Table ${table.number} reserved`, 'info');
        break;
      case 'transfer-here':
        confirmTransfer(table);
        break;
      default:
        break;
    }
  };
  
  const handleRecallOrder = (order) => {
    actions.recallOrder(order);
    setShowHeldOrders(false);
    actions.setView('pos');
    actions.addToast('Order recalled', 'success');
  };
  
  return (
    <div className="flex-1 flex flex-col h-full bg-cream">
      {/* Header */}
      <div className="p-4 bg-white border-b border-latte/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setTransferFrom(null);
              actions.setView('pos');
            }}
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
      
      {/* Transfer Mode Banner */}
      <AnimatePresence>
        {transferMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-accent/10 border-b border-accent/30 overflow-hidden"
          >
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-dark-roast">
                    Transfer Mode — Table {transferFromTable?.number}
                  </p>
                  <p className="text-sm text-medium-roast">
                    Tap an <span className="font-medium text-success">available</span> table to move the order there
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferFrom(null)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-latte/30 rounded-xl font-medium text-medium-roast hover:bg-latte/10 btn-press"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
                transferMode={transferMode}
                onClick={handleCardClick}
                onAction={handleAction}
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
                  isTransferSource={transferFrom === table.id}
                  transferMode={transferMode}
                  onClick={handleCardClick}
                  onAction={handleAction}
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

function ActionButton({ onClick, icon: Icon, label, variant = 'neutral' }) {
  const variants = {
    neutral: 'bg-latte/10 text-espresso hover:bg-latte/20',
    primary: 'bg-accent text-white hover:bg-accent/90',
    success: 'bg-success text-white hover:bg-success/90',
    warning: 'bg-warning/10 text-warning hover:bg-warning/20',
    danger: 'bg-error/10 text-error hover:bg-error/20',
  };
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors btn-press ${variants[variant]}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function TableCard({ table, isSelected, isTransferSource, transferMode, onClick, onAction }) {
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
  
  const isCounter = table.isCounter;
  const isTransferTarget = transferMode && table.status === 'available' && !isTransferSource && !isCounter;
  const clickable = table.status === 'available' || table.status === 'occupied' || isTransferTarget;
  
  return (
    <motion.div
      whileHover={{ scale: clickable ? 1.02 : 1 }}
      whileTap={{ scale: clickable ? 0.98 : 1 }}
      onClick={() => onClick(table)}
      className={`relative bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
        isSelected
          ? 'border-accent shadow-lg ring-4 ring-accent/20'
          : isTransferSource
          ? 'border-warning shadow-lg ring-4 ring-warning/30'
          : isTransferTarget
          ? 'border-accent shadow-md ring-2 ring-accent/40 cursor-pointer'
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
          {isCounter ? 'COUNTER' : table.number}
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
      
      {/* Contextual actions (dining tables only) */}
      {!isCounter && (
        <div className="mt-3 pt-3 border-t border-latte/20 space-y-2">
          {table.status === 'occupied' && !isTransferSource && (
            <div className="flex gap-2">
              <ActionButton
                onClick={(e) => { e.stopPropagation(); onAction(table, 'view'); }}
                icon={RotateCcw}
                label="Open"
                variant="neutral"
              />
              <ActionButton
                onClick={(e) => { e.stopPropagation(); onAction(table, 'transfer'); }}
                icon={ArrowRightLeft}
                label="Transfer"
                variant="warning"
              />
              <button
                onClick={(e) => { e.stopPropagation(); onAction(table, 'clear'); }}
                className="p-2 bg-error/10 text-error rounded-lg hover:bg-error/20 btn-press"
                title="Free table"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {table.status === 'occupied' && isTransferSource && (
            <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-warning">
              <MoveRight className="w-4 h-4" />
              Pick a free table
            </div>
          )}
          
          {table.status === 'cleaning' && (
            <ActionButton
              onClick={(e) => { e.stopPropagation(); onAction(table, 'clean'); }}
              icon={SprayCan}
              label="Mark Clean"
              variant="success"
            />
          )}
          
          {table.status === 'reserved' && (
            <div className="flex gap-2">
              <ActionButton
                onClick={(e) => { e.stopPropagation(); onAction(table, 'seat'); }}
                icon={UserPlus}
                label="Seat"
                variant="success"
              />
              <ActionButton
                onClick={(e) => { e.stopPropagation(); onAction(table, 'cancel-reservation'); }}
                icon={X}
                label="Cancel"
                variant="danger"
              />
            </div>
          )}
          
          {table.status === 'available' && !transferMode && (
            <ActionButton
              onClick={(e) => { e.stopPropagation(); onAction(table, 'reserve'); }}
              icon={Bookmark}
              label="Reserve"
              variant="neutral"
            />
          )}
          
          {isTransferTarget && (
            <ActionButton
              onClick={(e) => { e.stopPropagation(); onAction(table, 'transfer-here'); }}
              icon={MoveRight}
              label="Move Here"
              variant="primary"
            />
          )}
        </div>
      )}
    </motion.div>
  );
}
