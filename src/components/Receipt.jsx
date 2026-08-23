import React, { useRef } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadStoreSettings } from '../data/storeSettings';
import { useApp } from '../context/AppContext';

// Currency-aware price formatter
const formatPriceFromCents = (cents, settings) => {
  const sym = settings?.currencySymbol || 'RM';
  return `${sym} ${(cents / 100).toFixed(2)}`;
};

// Generate receipt text for thermal printer (ESC/POS format simulation)
export const generateThermalReceiptText = (order, settings, isReprint = false) => {
  const lines = [];
  const width = settings.printerType === '80mm' ? 48 : 40;
  
  const center = (text) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  const divider = () => lines.push('─'.repeat(width));
  
  // Header
  lines.push('');
  lines.push(center('★ ' + (settings.name || 'YOUR BUSINESS').toUpperCase() + ' ★'));
  if (settings.tagline) lines.push(center(settings.tagline));
  divider();
  if (settings.address) lines.push(center(settings.address));
  if (settings.city) lines.push(center(settings.city));
  if (settings.phone) lines.push(center('Tel: ' + settings.phone));
  divider();
  
  // Receipt info
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  
  if (isReprint) lines.push(center('[REPRINT]'));
  lines.push('');
  lines.push(`Date  : ${dateStr}`);
  lines.push(`Time  : ${timeStr}`);
  lines.push(`Order : #${order.id.slice(-8)}`);
  if (order.serverId || order.serverName) {
    lines.push(`Server: ${order.serverName || order.serverId}`);
  }
  if (order.tableId && order.tableId !== 'COUNTER') {
    lines.push(`Table : ${order.tableId.replace('T', '')}`);
  } else {
    lines.push(`Table : COUNTER`);
  }
  divider();
  
  // Items
  lines.push('');
  lines.push('ITEMS');
  order.items.forEach(item => {
    const modifierTotal = (item.modifiers || []).reduce((s, m) => s + (m.price || 0), 0);
    const itemLine = `${item.quantity}x ${item.name}`;
    const priceStr = formatPriceFromCents((item.price + modifierTotal) * item.quantity, settings);
    const dots = width - itemLine.length - priceStr.length;
    lines.push(itemLine + ' '.repeat(Math.max(1, dots)) + priceStr);
    
    // Modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        const modLine = `   + ${mod.name}`;
        const modPrice = formatPriceFromCents(mod.price || 0, settings);
        const dots2 = width - modLine.length - modPrice.length;
        lines.push(modLine + ' '.repeat(Math.max(1, dots2)) + modPrice);
      });
    }
    
    // Special instructions
    if (item.specialInstructions) {
      lines.push(`   * ${item.specialInstructions}`);
    }
  });
  
  divider();
  
  // Totals
  lines.push('');
  const totalLabel = 'SUBTOTAL';
  const totalVal = formatPriceFromCents(order.subtotal, settings);
  const dots3 = width - totalLabel.length - totalVal.length;
  lines.push(totalLabel + ' '.repeat(Math.max(1, dots3)) + totalVal);
  
  if (order.discount && order.discountAmount > 0) {
    const discLabel = `${order.discount.name} (-)`;
    const discVal = formatPriceFromCents(order.discountAmount, settings);
    const dots4 = width - discLabel.length - discVal.length;
    lines.push(discLabel + ' '.repeat(Math.max(1, dots4)) + discVal);
  }
  
  // Tax is omitted from the receipt entirely when the order carries none —
  // which is what happens for every order once tax is switched off in Store
  // Settings. Historic taxed orders still print their tax line so the receipt
  // keeps adding up.
  if (order.tax > 0) {
    const taxLabel = `TAX (${(settings.taxRate * 100).toFixed(0)}%)`;
    const taxVal = formatPriceFromCents(order.tax, settings);
    const dots5 = width - taxLabel.length - taxVal.length;
    lines.push(taxLabel + ' '.repeat(Math.max(1, dots5)) + taxVal);
  }
  
  divider();
  
  const grandLabel = 'TOTAL';
  const grandVal = formatPriceFromCents(order.total, settings);
  const dots6 = width - grandLabel.length - grandVal.length;
  lines.push(grandLabel + ' '.repeat(Math.max(1, dots6)) + grandVal);
  
  lines.push('');
  const payLabel = (order.paymentMethod || 'PAYMENT').toUpperCase();
  const payVal = formatPriceFromCents(order.amountPaid ?? order.total, settings);
  const dots7 = width - payLabel.length - payVal.length;
  lines.push(payLabel + ' '.repeat(Math.max(1, dots7)) + payVal);
  
  if (order.change > 0) {
    const changeLabel = 'CHANGE';
    const changeVal = formatPriceFromCents(order.change, settings);
    const dots8 = width - changeLabel.length - changeVal.length;
    lines.push(changeLabel + ' '.repeat(Math.max(1, dots8)) + changeVal);
  }
  
  divider();
  lines.push('');
  lines.push(center(settings.receiptFooter || 'Thank you!'));
  if (settings.taxId) lines.push(center('Tax ID: ' + settings.taxId));
  lines.push(center('----------------------------'));
  lines.push(center('Goods sold are not returnable'));
  lines.push(center('Please come again!'));
  lines.push('');
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
};

// Open the browser print dialog for a thermal receipt.
// Returns true on success, false if the popup was blocked.
export const printThermalReceipt = (order, settingsOverride) => {
  const settings = settingsOverride || loadStoreSettings();
  const widthMm = settings.printerType === '80mm' ? '80mm' : '58mm';
  const receiptText = generateThermalReceiptText(order, settings);
  
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    return false; // popup blocked
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${settings.name || 'Receipt'}</title>
      <style>
        @page { margin: 0; size: ${widthMm} auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: ${widthMm};
          padding: 5px;
          background: white;
        }
        .receipt { white-space: pre-wrap; line-height: 1.4; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">${receiptText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
  return true;
};

// Download the thermal receipt as a .txt file
export const downloadReceiptText = (order, settingsOverride) => {
  const settings = settingsOverride || loadStoreSettings();
  const text = generateThermalReceiptText(order, settings);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${order.id.slice(-8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Receipt({ order, onClose, showPrint = true }) {
  const printRef = useRef(null);
  const { actions } = useApp();
  const settings = loadStoreSettings();
  
  if (!order) return null;
  
  const formatPrice = (cents) => formatPriceFromCents(cents, settings);
  
  const handlePrint = () => {
    const ok = printThermalReceipt(order, settings);
    if (!ok) {
      actions.addToast('Please allow pop-ups to print the receipt. You can still download it instead.', 'error');
    }
  };
  
  const handleDownload = () => downloadReceiptText(order, settings);
  
  const now = new Date();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-espresso text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5" />
            <span className="font-semibold">Receipt</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Receipt Preview */}
        <div className="p-4 bg-gray-100 max-h-[60vh] overflow-auto">
          <div ref={printRef} className="bg-white p-4 mx-auto shadow-lg" style={{ width: '240px', fontFamily: 'Courier New, monospace', fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
            <div className="text-center font-bold">{(settings.name || 'YOUR BUSINESS').toUpperCase()}</div>
            {settings.tagline && <div className="text-center text-xs">{settings.tagline}</div>}
            <div className="border-t border-b border-dashed border-gray-400 my-2 py-2 text-center text-xs">
              {settings.address && <>{settings.address}<br/></>}
              {settings.city && <>{settings.city}<br/></>}
              {settings.phone && <>Tel: {settings.phone}</>}
            </div>
            <div className="text-xs">
              <div>Date : {now.toLocaleDateString('en-GB')}</div>
              <div>Time : {now.toLocaleTimeString('en-GB')}</div>
              <div>Order: #{order.id.slice(-8)}</div>
              <div>Table: {order.tableId === 'COUNTER' ? 'COUNTER' : order.tableId?.replace('T', '') || 'N/A'}</div>
            </div>
            <div className="border-t border-b border-dashed border-gray-400 my-2 py-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-mono">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span className="font-mono">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{order.discount?.name}</span>
                  <span className="font-mono">-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span>TAX ({(settings.taxRate * 100).toFixed(0)}%)</span>
                  <span className="font-mono">{formatPrice(order.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-dashed border-gray-400 pt-1">
                <span>TOTAL</span>
                <span className="font-mono">{formatPrice(order.total)}</span>
              </div>
            </div>
            <div className="border-t border-b border-dashed border-gray-400 my-2 py-2 text-xs">
              <div className="flex justify-between">
                <span>{(order.paymentMethod || 'PAYMENT').toUpperCase()}</span>
                <span className="font-mono">{formatPrice(order.amountPaid ?? order.total)}</span>
              </div>
              {order.change > 0 && (
                <div className="flex justify-between">
                  <span>CHANGE</span>
                  <span className="font-mono">{formatPrice(order.change)}</span>
                </div>
              )}
            </div>
            <div className="text-center text-xs mt-4">
              <div>{settings.receiptFooter}</div>
              {settings.taxId && <div>Tax ID: {settings.taxId}</div>}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-latte/20 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download
          </button>
          {showPrint && (
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-espresso text-white rounded-xl font-medium hover:bg-espresso/90 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Hook for printing receipts programmatically
export const useReceipt = () => {
  const printReceipt = (order) => printThermalReceipt(order);
  const downloadReceipt = (order) => downloadReceiptText(order);
  
  return { printReceipt, downloadReceipt };
};
