import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadStoreSettings } from '../data/storeSettings';

const ESPRESSO = [62, 39, 35];
const MEDIUM_ROAST = [110, 84, 62];
const ACCENT = [193, 125, 62];
const LIGHT = [245, 240, 232];

function money(cents, currency) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  ewallet: 'E-Wallet',
};

function tableLabel(tableId) {
  if (!tableId || tableId === 'COUNTER') return 'Counter';
  return `Table ${String(tableId).replace('T', '')}`;
}

/**
 * Build and download a real PDF for a sales report.
 *
 * @param {Object} options
 * @param {string} options.rangeLabel  Human readable date range (e.g. "Today").
 * @param {Array}  options.orders      Paid orders included in the range.
 */
export function downloadSalesReportPdf({ rangeLabel, orders }) {
  const settings = loadStoreSettings();
  const currency = settings.currencySymbol || settings.currency || 'RM';

  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const totalTax = orders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const totalItems = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const salesByPayment = orders.reduce((acc, o) => {
    const key = o.paymentMethod || 'other';
    acc[key] = (acc[key] || 0) + o.total;
    return acc;
  }, {});

  const itemCounts = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!itemCounts[item.name]) {
        itemCounts[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      }
      itemCounts[item.name].quantity += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    });
  });
  const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header band
  doc.setFillColor(...ESPRESSO);
  doc.rect(0, 0, pageWidth, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.name || 'Café POS', margin, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sales Report', margin, 58);
  doc.setFontSize(9);
  doc.text(`Range: ${rangeLabel}`, pageWidth - margin, 40, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 54, { align: 'right' });

  // Summary cards
  const summary = [
    ['Total Sales', money(totalSales, currency)],
    ['Total Orders', String(totalOrders)],
    ['Avg Order', money(Math.round(avgOrderValue), currency)],
    ['Items Sold', String(totalItems)],
  ];
  // Only report tax when some was actually collected in the range — a store
  // running with tax switched off should not see an empty "Tax Collected" cell.
  if (totalTax > 0) {
    summary.push(['Tax Collected', money(totalTax, currency)]);
  }

  autoTable(doc, {
    startY: 110,
    margin: { left: margin, right: margin },
    head: [summary.map(s => s[0])],
    body: [summary.map(s => s[1])],
    theme: 'grid',
    styles: { halign: 'center', fontSize: 10, cellPadding: 8 },
    headStyles: { fillColor: LIGHT, textColor: MEDIUM_ROAST, fontStyle: 'normal', fontSize: 8 },
    bodyStyles: { textColor: ESPRESSO, fontStyle: 'bold', fontSize: 12 },
  });

  // Sales by payment method
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 24,
    margin: { left: margin, right: margin },
    head: [['Sales by Payment Method', 'Transactions', 'Amount']],
    body: Object.keys(PAYMENT_LABELS).map(method => [
      PAYMENT_LABELS[method],
      String(orders.filter(o => o.paymentMethod === method).length),
      money(salesByPayment[method] || 0, currency),
    ]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: ESPRESSO, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: LIGHT },
  });

  // Top selling items
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 24,
    margin: { left: margin, right: margin },
    head: [['#', 'Top Selling Items', 'Qty Sold', 'Revenue']],
    body: topItems.map((item, i) => [
      String(i + 1),
      item.name,
      String(item.quantity),
      money(item.revenue, currency),
    ]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: ESPRESSO, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 90, halign: 'right' },
    },
  });

  // Transactions
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 24,
    margin: { left: margin, right: margin },
    head: [['Order', 'Table', 'Payment', 'Items', 'Time', 'Total']],
    body: orders.map(order => [
      order.id.slice(-8),
      tableLabel(order.tableId),
      PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || '-',
      String(order.items.reduce((s, i) => s + i.quantity, 0)),
      order.paidAt ? new Date(order.paidAt).toLocaleString() : '-',
      money(order.total, currency),
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: ACCENT, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 5: { halign: 'right' } },
  });

  // Page footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MEDIUM_ROAST);
    doc.text(
      `${settings.name || 'Café POS'} — page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  doc.save(`sales-report-${stamp}.pdf`);
}
