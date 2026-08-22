import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import MenuPanel from './components/MenuPanel';
import OrderPanel from './components/OrderPanel';
import ModifierModal from './components/ModifierModal';
import PaymentModal from './components/PaymentModal';
import TableView from './components/TableView';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import ToastContainer from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { t } from './data/language';

function POSView() {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Menu Panel - Left Side */}
      <div className="w-2/5 min-w-[400px] border-r border-latte/20">
        <MenuPanel />
      </div>
      
      {/* Order Panel - Right Side */}
      <div className="w-3/5 min-w-[400px]">
        <OrderPanel />
      </div>
    </div>
  );
}

function MainContent() {
  const { state, actions } = useApp();
  const { isLoggedIn, currentUser, view, language } = state;
  
  // Not logged in - show login screen
  if (!isLoggedIn) {
    return <Login />;
  }
  
  // Admin view
  if (currentUser?.role === 'admin' && view === 'admin') {
    return (
      <>
        <AdminPanel />
        <ToastContainer />
      </>
    );
  }
  
  // Server's Today's Reports (limited view)
  if (currentUser?.role === 'server' && view === 'reports') {
    return (
      <div className="flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-hidden bg-cream">
          <ServerReports language={language} state={state} />
        </main>
        <ToastContainer />
      </div>
    );
  }
  
  // POS main view
  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <main className="flex-1 flex overflow-hidden bg-cream">
        {view === 'pos' && <POSView />}
        {view === 'tables' && <TableView />}
        {view === 'reports' && (currentUser?.role === 'admin' ? <Reports /> : <ServerReports language={language} state={state} />)}
        {view === 'settings' && <Settings />}
      </main>
      
      {/* Modals */}
      <ModifierModal />
      <PaymentModal />
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

// Server's Limited Reports View (Today's only with PDF export)
function ServerReports({ language, state }) {
  const { orderHistory } = state;
  
  // Filter today's orders only
  const today = new Date().setHours(0, 0, 0, 0);
  const todayOrders = orderHistory.filter(o => o.paidAt >= today && o.status === 'paid');
  
  // Calculate stats
  const totalSales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = todayOrders.length;
  const totalItems = todayOrders.reduce((sum, o) => 
    sum + o.items.reduce((s, i) => s + i.quantity, 0), 0
  );
  
  // Export PDF
  const handleExportPdf = () => {
    const content = `
CAFÉ POS - TODAY'S SALES REPORT
Date: ${new Date().toLocaleDateString()}
Generated: ${new Date().toLocaleTimeString()}
========================

SUMMARY
-------
Total Sales: RM ${(totalSales / 100).toFixed(2)}
Total Orders: ${totalOrders}
Items Sold: ${totalItems}

TRANSACTIONS
------------
${todayOrders.map(o => 
  `${o.id.slice(-8)} | ${o.paymentMethod} | RM ${(o.total / 100).toFixed(2)} | ${new Date(o.paidAt).toLocaleTimeString()}`
).join('\n')}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-dark-roast">
            {t('salesReport', language)} - {t('today', language)}
          </h1>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-xl hover:bg-error/90 transition-colors"
          >
            <span>📄</span>
            {t('downloadPdf', language)}
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: t('totalSales', language), value: `RM ${(totalSales / 100).toFixed(2)}`, color: 'text-success' },
            { label: t('totalOrders', language), value: totalOrders.toString(), color: 'text-espresso' },
            { label: t('itemsSold', language), value: totalItems.toString(), color: 'text-medium-roast' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-medium-roast mb-1">{stat.label}</p>
              <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
        
        {/* Transactions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-dark-roast mb-4">{t('recentTransactions', language)}</h2>
          {todayOrders.length === 0 ? (
            <p className="text-medium-roast text-center py-8">{t('noOrders', language)}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-latte/20">
                    <th className="py-2 text-left text-medium-roast">Order</th>
                    <th className="py-2 text-left text-medium-roast">Payment</th>
                    <th className="py-2 text-right text-medium-roast">Total</th>
                    <th className="py-2 text-right text-medium-roast">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todayOrders.map(order => (
                    <tr key={order.id} className="border-b border-latte/10">
                      <td className="py-2 font-mono text-medium-roast">{order.id.slice(-8)}</td>
                      <td className="py-2 capitalize">{order.paymentMethod}</td>
                      <td className="py-2 text-right font-mono font-semibold">RM {(order.total / 100).toFixed(2)}</td>
                      <td className="py-2 text-right text-medium-roast">{new Date(order.paidAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ConfirmProvider>
        <MainContent />
      </ConfirmProvider>
    </AppProvider>
  );
}
