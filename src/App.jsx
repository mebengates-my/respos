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
  const { state } = useApp();
  const { isLoggedIn, currentUser, view } = state;
  
  // Not logged in - show login screen
  if (!isLoggedIn) {
    return <Login />;
  }
  
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  // Management panel (Admin gets the full panel; Manager gets it without
  // User Management and Settings — enforced inside AdminPanel).
  if (canManage && view === 'admin') {
    return (
      <>
        <AdminPanel />
        <ToastContainer />
      </>
    );
  }
  
  // POS main view. Servers never get a reports view.
  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <main className="flex-1 flex overflow-hidden bg-cream">
        {view === 'pos' && <POSView />}
        {view === 'tables' && <TableView />}
        {view === 'reports' && canManage && <Reports />}
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

export default function App() {
  return (
    <AppProvider>
      <ConfirmProvider>
        <MainContent />
      </ConfirmProvider>
    </AppProvider>
  );
}
