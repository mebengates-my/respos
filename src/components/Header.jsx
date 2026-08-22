import React from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../data/language';
import { useConfirm } from './ConfirmDialog';
import {
  Coffee,
  Wifi,
  WifiOff,
  User,
  Settings,
  BarChart3,
  LayoutGrid,
  Users,
  Shield,
  Globe,
  LogOut
} from 'lucide-react';

export default function Header() {
  const { state, actions } = useApp();
  const confirm = useConfirm();
  const { currentUser, view, language, isOffline } = state;
  
  const isAdmin = currentUser?.role === 'admin';
  
  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Logout?',
      message: 'You will need to enter your PIN again to sign back in.',
      confirmLabel: 'Logout',
      danger: true,
    });
    if (ok) {
      actions.logout();
    }
  };
  
  return (
    <header className="bg-espresso text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-accent p-2 rounded-lg">
          <Coffee className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold tracking-wide">{t('appName', language)}</h1>
          <p className="text-xs text-latte">{t(currentUser?.role, language)}</p>
        </div>
      </div>
      
      <nav className="flex items-center gap-2">
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
        <NavButton
          icon={<BarChart3 className="w-4 h-4" />}
          label={t('reports', language)}
          active={view === 'reports'}
          onClick={() => actions.setView('reports')}
        />
        {isAdmin && (
          <NavButton
            icon={<Shield className="w-4 h-4" />}
            label={t('adminPanel', language)}
            active={view === 'admin'}
            onClick={() => actions.setView('admin')}
          />
        )}
      </nav>
      
      <div className="flex items-center gap-3">
        {/* Offline indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
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
          className="flex items-center gap-2 px-3 py-1.5 bg-latte/30 rounded-lg hover:bg-latte/50 transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'en' ? 'EN' : 'বাং'}</span>
        </button>
        
        {/* User indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-latte/30 rounded-lg">
          <div className={`w-8 h-8 ${isAdmin ? 'bg-accent' : 'bg-success'} rounded-lg flex items-center justify-center`}>
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block">
            <p className="font-medium text-sm">{currentUser?.name}</p>
            <p className="text-xs text-latte capitalize">{currentUser?.role}</p>
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

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all touch-persist btn-press ${
        active
          ? 'bg-accent text-white shadow-lg'
          : 'bg-transparent hover:bg-latte/30 text-latte hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
