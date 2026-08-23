import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { navigate } from '../utils/router';
import DeleteStoreModal from './DeleteStoreModal';
import {
  ArrowLeft,
  Coffee,
  Building,
  Printer,
  Wifi,
  Bell,
  Trash2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const { state, actions } = useApp();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteStore, setShowDeleteStore] = useState(false);

  // Store deletion (Danger Zone) is a cloud-only, admin-only action.
  const cloudAdmin = Boolean(state.currentUser?.cloud && state.currentUser?.role === 'admin');
  const storeId = state.currentUser?.storeId || null;
  const storeSlug = state.currentUser?.storeSlug || null;

  const handleStoreDeleted = (result) => {
    setShowDeleteStore(false);
    actions.addToast(
      `Store deleted (${result?.removedAccounts ?? 0} staff account(s) removed)`,
      'success'
    );
    // The store — and possibly this very account — no longer exists.
    actions.logout();
    navigate('/');
  };

  const handleClearData = () => {
    localStorage.clear();
    window.location.reload();
  };
  
  return (
    <div className="flex-1 flex flex-col h-full bg-cream">
      {/* Header */}
      <div className="p-4 bg-white border-b border-latte/20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => actions.setView('pos')}
            className="flex items-center gap-2 text-medium-roast hover:text-dark-roast transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to POS
          </button>
          <h1 className="font-display text-xl font-semibold text-dark-roast">
            Settings
          </h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Store Information */}
          <SettingsSection title="Store Information" icon={<Building className="w-5 h-5" />}>
            <SettingRow label="Restaurant Name" value="Café POS Demo" />
            <SettingRow label="Address" value="123 Coffee Street, Kuala Lumpur" />
            <SettingRow label="Phone" value="+60 3-1234 5678" />
            <SettingRow label="Tax Rate" value="6% (SST)" />
          </SettingsSection>
          
          {/* Receipt Settings */}
          <SettingsSection title="Receipt Settings" icon={<Printer className="w-5 h-5" />}>
            <SettingToggle
              label="Auto-print receipts"
              description="Automatically print receipt after payment"
              enabled={true}
              onChange={() => {}}
            />
            <SettingToggle
              label="Show QR code on receipt"
              description="Include feedback QR code for customers"
              enabled={true}
              onChange={() => {}}
            />
            <SettingRow label="Receipt Footer Message" value="Thank you for visiting!" />
          </SettingsSection>
          
          {/* System Status */}
          <SettingsSection title="System Status" icon={<Wifi className="w-5 h-5" />}>
            <SettingRow
              label="Connection Status"
              value={state.isOffline ? 'Offline' : 'Online'}
              valueColor={state.isOffline ? 'text-error' : 'text-success'}
            />
            <SettingRow label="Data Storage" value="Saved on this device" valueColor="text-medium-roast" />
            <SettingRow label="Cloud Sync" value="Not configured" valueColor="text-warning" />
          </SettingsSection>
          
          {/* Notifications */}
          <SettingsSection title="Notifications" icon={<Bell className="w-5 h-5" />}>
            <SettingToggle
              label="Low stock alerts"
              description="Get notified when items are running low"
              enabled={true}
              onChange={() => {}}
            />
            <SettingToggle
              label="Sound effects"
              description="Play sounds for actions and alerts"
              enabled={false}
              onChange={() => {}}
            />
          </SettingsSection>
          
          {/* Data Management */}
          <SettingsSection title="Data Management" icon={<Trash2 className="w-5 h-5" />}>
            <div className="space-y-3">
              <button
                onClick={() => {
                  localStorage.removeItem('cafe-pos-state');
                  actions.addToast('Cache cleared', 'info');
                }}
                className="w-full flex items-center justify-between p-3 bg-latte/10 rounded-xl hover:bg-latte/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-medium-roast" />
                  <div className="text-left">
                    <p className="font-medium text-dark-roast">Clear Cache</p>
                    <p className="text-sm text-medium-roast">Remove temporary data</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center justify-between p-3 bg-error/10 rounded-xl hover:bg-error/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-error" />
                  <div className="text-left">
                    <p className="font-medium text-dark-roast">Clear All Data</p>
                    <p className="text-sm text-medium-roast">Delete all orders and reset</p>
                  </div>
                </div>
              </button>
            </div>
          </SettingsSection>
          
          {/* Danger Zone — delete the whole store (cloud admin only) */}
          {cloudAdmin && storeId && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-error/20">
              <div className="bg-error/10 px-6 py-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-error" />
                <h2 className="font-semibold text-dark-roast">Danger Zone</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-medium-roast mb-4 leading-relaxed">
                  Permanently delete this store: menu, tables, orders, expenses, the staff
                  sign-in link, and the accounts of staff who belong only to this store.
                  Everyone else keeps their account. This cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteStore(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete this store…
                </button>
              </div>
            </div>
          )}

          {/* About */}
          <SettingsSection title="About" icon={<Coffee className="w-5 h-5" />}>
            <SettingRow label="App Version" value="1.0.0" />
            <SettingRow label="Build" value="2024.01" />
          </SettingsSection>
        </div>
      </div>

      {/* Delete Store Modal (cloud admin only) */}
      {showDeleteStore && (
        <DeleteStoreModal
          storeId={storeId}
          storeSlug={storeSlug}
          onClose={() => setShowDeleteStore(false)}
          onDeleted={handleStoreDeleted}
        />
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-roast">Clear All Data?</h3>
                <p className="text-sm text-medium-roast">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-medium-roast mb-6">
              This will permanently delete all orders, held orders, and reset the system to its initial state.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors btn-press"
              >
                Clear Data
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function SettingsSection({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-latte/20 flex items-center gap-3 bg-cream">
        <div className="text-medium-roast">{icon}</div>
        <h2 className="font-semibold text-dark-roast">{title}</h2>
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, value, valueColor = 'text-dark-roast' }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-medium-roast">{label}</span>
      <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

function SettingToggle({ label, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-dark-roast">{label}</p>
        <p className="text-xs text-medium-roast">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          enabled ? 'bg-success' : 'bg-latte/30'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
