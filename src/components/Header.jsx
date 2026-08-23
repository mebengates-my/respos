import React from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../data/language';
import { useConfirm } from './ConfirmDialog';
import { navigate } from '../utils/router';
import { visibleOpenOrders } from '../utils/orderAccess';
import {
  Coffee,
  Wifi,
  WifiOff,
  User,
  BarChart3,
  LayoutGrid,
  Users,
  ClipboardList,
  Shield,
  Globe,
  LogOut
} from 'lucide-react';

export default function Header() {
  const { state, actions } = useApp();
  const confirm = useConfirm();
  const { currentUser, view, language, isOffline } = state;

  // Only count the orders this user is actually allowed to see, so the badge
  // always matches the list behind it.
  const openOrderCount = visibleOpenOrders(state).length;

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isServer = currentUser?.role === 'server';
  const canManage = isAdmin || isManager;
  
  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Logout?',
      message: 'You will need to enter your PIN again to sign back in.',
      confirmLabel: 'Logout',
      danger: true,
    });
    if (ok) {
      // Cloud sessions land back on the store's PIN screen (…/mycafe) so the
      // next staff member can sign in immediately; local mode stays at home.
      const slug = currentUser?.cloud ? currentUser.storeSlug : null;
      actions.logout();
      if (slug) {
        navigate(`/${slug}`);
      } else if (window.location.pathname !== '/') {
        navigate('/');
      }
    }
  };
  
  return (
    <header className="bg-espresso text-white px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-3 shadow-lg">
      {/* Brand: icon always, wordmark only once there is room for it */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="bg-accent p-1.5 sm:p-2 rounded-lg shrink-0">
          <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="hidden sm:block min-w-0">
          <h1 className="font-display text-lg font-semibold tracking-wide truncate">{t('appName', language)}</h1>
          <p className="text-xs text-latte truncate">{t(currentUser?.role, language)}</p>
        </div>
      </div>
      
      <nav className="flex items-center gap-0.5 sm:gap-2 min-w-0">
        <NavButton
          icon={<LayoutGrid className="w-4 h-4" />}
          label={t('pos', language)}
          active={view === 'pos'}
          onClick={() => actions.setView('pos')}
        />
        <NavButton
          icon={<Users className="w-4 h-4" />}
          label={t('tables', language)}
          active={view === 'tables'}
          onClick={() => actions.setView('tables')}
        />
        {/* Open orders sits next to POS and Tables for every role: servers see
            their tickets, managers/admins open one and collect payment. */}
        <NavButton
          icon={<ClipboardList className="w-4 h-4" />}
          label={t('openOrders', language)}
          active={view === 'orders'}
          onClick={() => actions.setView('orders')}
          badge={openOrderCount}
        />
        {/* Reports are for admins and managers. */}
        {!isServer && (
          <NavButton
            icon={<BarChart3 className="w-4 h-4" />}
            label={t('reports', language)}
            active={view === 'reports'}
            onClick={() => actions.setView('reports')}
          />
        )}
        {canManage && (
          <NavButton
            icon={<Shield className="w-4 h-4" />}
            label={isAdmin ? t('adminPanel', language) : t('managerPanel', language)}
            active={view === 'admin'}
            onClick={() => actions.setView('admin')}
          />
        )}
      </nav>
      
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Offline indicator */}
        <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full text-sm ${
          isOffline ? 'bg-error/20 text-error' : 'bg-success/20 text-success'
        }`}>
          {isOffline ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="hidden md:inline">Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span className="hidden md:inline">Online</span>
            </>
          )}
        </div>
        
        {/* Language Toggle */}
        <button
          onClick={() => actions.setLanguage(language === 'en' ? 'bn' : 'en')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-latte/30 rounded-lg hover:bg-latte/50 transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'en' ? 'EN' : 'বাং'}</span>
        </button>
        
        {/* User indicator */}
        <div className="flex items-center gap-2 px-1.5 sm:px-3 py-1.5 bg-latte/30 rounded-lg">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 ${isAdmin ? 'bg-accent' : isManager ? 'bg-medium-roast' : 'bg-success'} rounded-lg flex items-center justify-center`} title={`${currentUser?.name} · ${t(currentUser?.role, language)}`}>
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block">
            <p className="font-medium text-sm">{currentUser?.name}</p>
            <p className="text-xs text-latte">{t(currentUser?.role, language)}</p>
          </div>
        </div>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-error/20 rounded-lg transition-colors"
          title={t('logout', language)}
        >
          <LogOut className="w-5 h-5 text-error" />
        </button>
      </div>
    </header>
  );
}

function NavButton({ icon, label, active, onClick, badge }) {
  const showBadge = Number(badge) > 0;
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg font-medium transition-all touch-persist btn-press shrink-0 ${
        active
          ? 'bg-accent text-white shadow-lg'
          : 'bg-transparent hover:bg-latte/30 text-latte hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      {/* Live count of waiting orders. On narrow screens the label is hidden,
          so the badge floats over the icon instead of sitting beside it. */}
      {showBadge && (
        <span
          className={`min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold tabular-nums
            absolute -top-1 -right-1 lg:static lg:top-auto lg:right-auto ${
              active ? 'bg-white text-accent' : 'bg-accent text-white'
            }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
