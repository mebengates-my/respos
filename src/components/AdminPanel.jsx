import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../data/language';
import { resolveModifierGroups } from '../data/menuData';
import { loadStoreSettings, saveStoreSettings, defaultStoreSettings } from '../data/storeSettings';
import { navigate } from '../utils/router';
import DeleteStoreModal from './DeleteStoreModal';
import { downloadSalesReportPdf } from '../utils/pdfReport';
import { formatElapsedTime } from '../utils/helpers';
import { useConfirm } from './ConfirmDialog';
import { cloudAuth } from '../services/cloud';
import { orderLocationLabel } from '../utils/orderAccess';
import {
  LayoutDashboard,
  Users,
  Coffee,
  Grid3X3,
  FileText,
  Settings,
  Store,
  Plus,
  Edit,
  Trash2,
  Check,
  Download,
  DollarSign,
  TrendingUp,
  BarChart3,
  Globe,
  LogOut,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Printer,
  Save,
  RefreshCw,
  LayoutGrid,
  ClipboardList,
  Pause,
  ShoppingCart,
  Wallet,
  Tags,
  Link2,
  Copy,
  TrendingDown,
  CalendarDays,
  Upload,
  Database,
  AlertTriangle,
  Bike,
  X,
  PlusCircle,
  Star,
  Menu as MenuIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminViews = {
  DASHBOARD: 'dashboard',
  OPEN_ORDERS: 'open_orders',
  USERS: 'users',
  CATEGORIES: 'categories',
  MENU_ITEMS: 'menu_items',
  TABLES: 'tables',
  DELIVERY: 'delivery',
  REPORTS: 'reports',
  EXPENSES: 'expenses',
  EXPENSE_CATEGORIES: 'expense_categories',
  PNL: 'pnl',
  SETTINGS: 'settings'
};

// Managers can maintain operational settings (including server order access),
// but user provisioning remains admin-only.
const MANAGER_HIDDEN_VIEWS = [AdminViews.USERS];

export default function AdminPanel() {
  const { state, actions } = useApp();
  const confirm = useConfirm();
  const { language, users, currentUser } = state;
  const isManager = currentUser?.role === 'manager';
  // Managers run the floor, so their panel opens straight on the live open-orders
  // board — the list they act on all shift. Admins still land on the Dashboard.
  const [currentView, setCurrentView] = useState(
    isManager ? AdminViews.OPEN_ORDERS : AdminViews.DASHBOARD
  );
  // On phones/tablets the nav is an off-canvas drawer; from `lg` up it is a
  // permanent sidebar. Picking a destination auto-closes the drawer so the
  // content gets the whole screen back.
  const [navOpen, setNavOpen] = useState(false);

  // Cloud (Supabase) mode: staff are real auth users, not the local demo list.
  // Fetch the store roster once so Dashboard and User Management show the truth
  // instead of the localStorage seed users. Local mode ignores all of this.
  const isCloudUser = Boolean(currentUser?.cloud);
  const cloudStoreId = currentUser?.storeId || state.cloudSession?.storeId || null;
  const [cloudMembers, setCloudMembers] = useState(null); // null = not loaded yet
  const [cloudMembersLoading, setCloudMembersLoading] = useState(false);
  const [cloudMembersVersion, setCloudMembersVersion] = useState(0);

  useEffect(() => {
    if (!isCloudUser || !cloudStoreId) return;
    let cancelled = false;
    setCloudMembersLoading(true);
    cloudAuth.listStoreMembers(cloudStoreId).then(({ data, error }) => {
      if (cancelled) return;
      setCloudMembers(error ? [] : (data || []));
      setCloudMembersLoading(false);
      if (error) {
        actions.addToast(error.message || t('error', language), 'error');
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCloudUser, cloudStoreId, cloudMembersVersion]);

  const userCount = isCloudUser
    ? (cloudMembers ? cloudMembers.length : '…')
    : users.length;

  const navItems = [
    { id: AdminViews.DASHBOARD, icon: LayoutDashboard, label: t('dashboard', language) },
    { id: AdminViews.OPEN_ORDERS, icon: ClipboardList, label: t('openOrders', language) },
    { id: AdminViews.USERS, icon: Users, label: t('userManagement', language) },
    { id: AdminViews.CATEGORIES, icon: Coffee, label: t('categoryManagement', language) },
    { id: AdminViews.MENU_ITEMS, icon: Coffee, label: t('menuItems', language) },
    { id: AdminViews.TABLES, icon: Grid3X3, label: t('tableManagement', language) },
    { id: AdminViews.DELIVERY, icon: Bike, label: t('deliveryServices', language) },
    { id: AdminViews.REPORTS, icon: FileText, label: t('reportManagement', language) },
    { id: AdminViews.EXPENSES, icon: Wallet, label: t('expenses', language) },
    { id: AdminViews.EXPENSE_CATEGORIES, icon: Tags, label: t('expenseCategories', language) },
    { id: AdminViews.PNL, icon: TrendingDown, label: t('profitAndLoss', language) },
    { id: AdminViews.SETTINGS, icon: Settings, label: t('settings', language) },
  ].filter(item => !(isManager && MANAGER_HIDDEN_VIEWS.includes(item.id)));
  
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  const goToView = (viewId) => {
    setCurrentView(viewId);
    setNavOpen(false);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('logout', language) + '?',
      message: 'You will need to enter your PIN again to sign back in.',
      confirmLabel: t('logout', language),
      danger: true,
    });
    if (ok) {
      actions.logout();
    }
  };
  
  const activeNavLabel =
    navItems.find(item => item.id === currentView)?.label ||
    (isManager ? t('managerPanel', language) : t('adminPanel', language));

  // One nav body, rendered twice: once as the permanent lg+ sidebar, once
  // inside the mobile drawer.
  const navBody = (
    <>
      <div className="p-4 border-b border-latte/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 bg-accent rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold truncate">
              {isManager ? t('managerPanel', language) : t('adminPanel', language)}
            </h1>
            <p className="text-xs text-latte truncate">
              {currentUser?.name} · {t(currentUser?.role, language)}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => goToView(item.id)}
            aria-current={currentView === item.id ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              currentView === item.id
                ? 'bg-accent text-white'
                : 'hover:bg-latte/20 text-latte hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="font-medium truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 sm:p-4 border-t border-latte/30 space-y-2">
        <button
          onClick={() => actions.setView('pos')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          <LayoutGrid className="w-5 h-5 shrink-0" />
          <span className="font-medium truncate">Back to POS</span>
        </button>

        <button
          onClick={() => actions.setLanguage(language === 'en' ? 'bn' : 'en')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-latte/20 text-latte hover:text-white transition-colors"
        >
          <Globe className="w-5 h-5 shrink-0" />
          <span className="font-medium truncate">{language === 'en' ? 'বাংলা' : 'English'}</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error/20 text-error transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium truncate">{t('logout', language)}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      {/* Permanent sidebar from lg up */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-espresso text-white flex-col">
        {navBody}
      </aside>

      {/* Off-canvas nav drawer for phones/tablets */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              key="admin-nav-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setNavOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-dark-roast/50"
            />
            <motion.aside
              key="admin-nav-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] bg-espresso text-white flex flex-col shadow-2xl"
            >
              <button
                onClick={() => setNavOpen(false)}
                aria-label="Close menu"
                className="absolute top-3 right-3 p-2 rounded-lg text-latte hover:bg-latte/20 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              {navBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar with the hamburger handle */}
        <div className="lg:hidden flex items-center gap-3 px-3 py-2.5 bg-espresso text-white shadow-md shrink-0">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            className="p-2 -ml-1 rounded-lg hover:bg-latte/20 transition-colors btn-press"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold leading-tight truncate">{activeNavLabel}</p>
            <p className="text-[11px] text-latte truncate">
              {currentUser?.name} · {t(currentUser?.role, language)}
            </p>
          </div>
          <button
            onClick={() => actions.setView('pos')}
            aria-label="Back to POS"
            className="p-2 rounded-lg bg-accent hover:bg-accent/90 transition-colors btn-press shrink-0"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
        {currentView === AdminViews.DASHBOARD && <DashboardView language={language} state={state} userCount={userCount} />}
        {currentView === AdminViews.OPEN_ORDERS && <OpenOrdersView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.USERS && !isManager && (
          <UsersView
            language={language}
            state={state}
            actions={actions}
            cloudMembers={cloudMembers}
            cloudMembersLoading={cloudMembersLoading}
            reloadCloudMembers={() => setCloudMembersVersion(v => v + 1)}
          />
        )}
        {currentView === AdminViews.CATEGORIES && <CategoriesView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.MENU_ITEMS && <MenuItemsView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.TABLES && <TablesView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.DELIVERY && <DeliveryChannelsView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.REPORTS && <ReportsView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.EXPENSES && <ExpensesView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.EXPENSE_CATEGORIES && <ExpenseCategoriesView language={language} state={state} actions={actions} />}
        {currentView === AdminViews.PNL && <ProfitLossView language={language} state={state} />}
        {currentView === AdminViews.SETTINGS && <StoreSettingsView state={state} actions={actions} />}
        </main>
      </div>
    </div>
  );
}

// Dashboard
function DashboardView({ language, state, userCount }) {
  const { orderHistory } = state;
  const today = new Date().setHours(0, 0, 0, 0);
  const todayOrders = orderHistory.filter(o => o.paidAt >= today);
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekSales = orderHistory.filter(o => o.paidAt >= weekAgo).reduce((sum, o) => sum + o.total, 0);
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const monthSales = orderHistory.filter(o => o.paidAt >= monthAgo).reduce((sum, o) => sum + o.total, 0);
  
  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-2xl font-display font-bold text-dark-roast mb-6">{t('dashboard', language)}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('today', language), value: formatPrice(todaySales), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
          { label: t('thisWeek', language), value: formatPrice(weekSales), icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
          { label: t('thisMonth', language), value: formatPrice(monthSales), icon: BarChart3, color: 'text-espresso', bg: 'bg-espresso/10' },
          { label: t('users', language), value: String(userCount), icon: Users, color: 'text-medium-roast', bg: 'bg-medium-roast/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color} mb-4`}><stat.icon className="w-6 h-6" /></div>
            <p className="text-sm text-medium-roast mb-1">{stat.label}</p>
            <p className="text-2xl font-mono font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Open Orders View — live board of every unpaid order (active + held)
function OpenOrdersView({ language, state, actions }) {
  const { openOrders: submittedOrders, heldOrders, tables, deliveryChannels } = state;
  const [, setTick] = useState(0);

  // Re-render periodically so the "time open" counters stay fresh. Order data itself
  // updates in real time through the shared app state (and cross-tab storage sync).
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const tableLabel = (tableId, order) =>
    orderLocationLabel(order, tables, t('walkIn', language), deliveryChannels);

  // Drafts are intentionally excluded: an order appears here only after the
  // server presses Place Order. Legacy held orders remain available too.
  const openOrders = (submittedOrders || []).map(order => ({ ...order, boardStatus: 'open' }));
  heldOrders.forEach(order => openOrders.push({ ...order, boardStatus: 'held' }));

  // Occupied tables whose order is not otherwise visible on this device
  const coveredTableIds = new Set(openOrders.map(o => o.tableId));
  const orphanOccupiedTables = tables.filter(
    tb => !tb.isCounter && tb.status === 'occupied' && !coveredTableIds.has(tb.id)
  );

  const openValue = openOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const openInPos = (order) => {
    if (order.boardStatus === 'held') {
      actions.recallOrder(order);
      actions.setView('pos');
    } else {
      actions.editOpenOrder(order);
    }
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast flex items-center gap-2 sm:gap-3 min-w-0">
            <ClipboardList className="w-7 h-7" />
            {t('openOrders', language)}
          </h1>
          <p className="text-sm text-medium-roast mt-1 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            {t('liveView', language)}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm text-center">
            <p className="text-xs text-medium-roast mb-1">{t('openOrders', language)}</p>
            <p className="text-2xl font-mono font-bold text-espresso">{openOrders.length + orphanOccupiedTables.length}</p>
          </div>
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm text-center">
            <p className="text-xs text-medium-roast mb-1">{t('total', language)}</p>
            <p className="text-2xl font-mono font-bold text-accent">{formatPrice(openValue)}</p>
          </div>
        </div>
      </div>

      {openOrders.length === 0 && orphanOccupiedTables.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <ShoppingCart className="w-10 h-10 text-latte mx-auto mb-3" />
          <p className="text-medium-roast">{t('noOpenOrders', language)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {openOrders.map(order => {
            const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
            const openedAt = order.boardStatus === 'held' ? order.heldAt : (order.placedAt || order.createdAt);
            const isOpen = order.boardStatus === 'open';
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${
                  isOpen ? 'border-accent' : 'border-warning/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-lg text-dark-roast">{tableLabel(order.tableId, order)}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isOpen ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {isOpen ? 'Open' : t('held', language)}
                  </span>
                </div>
                <p className="text-xs text-medium-roast font-mono mb-3">{order.id}</p>
                <ul className="text-sm text-dark-roast space-y-1 mb-4">
                  {order.items.slice(0, 5).map(item => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span className="truncate">{item.quantity}× {item.name}</span>
                      <span className="font-mono text-medium-roast shrink-0">{formatPrice(item.price * item.quantity)}</span>
                    </li>
                  ))}
                  {order.items.length > 5 && (
                    <li className="text-medium-roast text-xs">+ {order.items.length - 5} more…</li>
                  )}
                </ul>
                <div className="flex items-center justify-between pt-3 border-t border-latte/20 text-sm">
                  <span className="text-medium-roast flex items-center gap-1.5">
                    {isOpen ? <ShoppingCart className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {itemCount} {t('items', language)}
                    {openedAt ? ` · ${formatElapsedTime(openedAt)}` : ''}
                  </span>
                  <span className="font-mono font-bold text-espresso">{formatPrice(order.total)}</span>
                </div>
                {order.serverName && (
                  <p className="text-xs text-medium-roast mt-2">Server: {order.serverName}</p>
                )}
                <button
                  onClick={() => openInPos(order)}
                  className="w-full mt-4 py-2.5 px-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 btn-press"
                >
                  Open in POS
                </button>
              </motion.div>
            );
          })}

          {orphanOccupiedTables.map(table => (
            <div key={table.id} className="bg-white rounded-2xl p-5 shadow-sm border-2 border-latte/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-lg text-dark-roast">{t('table', language)} {table.number}</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning">{t('occupied', language)}</span>
              </div>
              <p className="text-sm text-medium-roast">{t('noOrders', language)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Users View
// Local mode: manages the localStorage staff list (PIN login).
// Cloud mode: lists the real Supabase store members and manages them through
// the serverless provisioning route (auth users + store_members rows).
function UsersView({ language, state, actions, cloudMembers, cloudMembersLoading, reloadCloudMembers }) {
  const { users } = state;
  const isCloud = Boolean(state.currentUser?.cloud);
  const storeId = state.currentUser?.storeId || state.cloudSession?.storeId || null;
  const list = isCloud ? (cloudMembers || []) : users;
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: 'server', pin: '' });
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // The store's public PIN-login link (…/mycafe) — what the team bookmarks.
  const staffLink = isCloud && state.currentUser?.storeSlug
    ? `${window.location.origin}/${state.currentUser.storeSlug}`
    : null;

  const copyStaffLink = async () => {
    if (!staffLink) return;
    try {
      await navigator.clipboard.writeText(staffLink);
    } catch {
      // Clipboard may be blocked — the link text stays selectable below.
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const openAdd = () => {
    setEditingUser(null);
    setFormData({ name: '', role: 'server', pin: '' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    // In cloud mode the PIN is the staff member's password and can only be set
    // at creation; the edit form therefore only sends name + role.
    setFormData({ name: user.name, role: user.role, pin: isCloud ? '' : user.pin });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return;

    // Local mode — unchanged behaviour.
    if (!isCloud) {
      if (!formData.pin || formData.pin.length !== 4) return;
      if (editingUser) { actions.updateUser(editingUser.id, formData); }
      else { actions.addUser(formData); }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', role: 'server', pin: '' });
      return;
    }

    // Cloud mode — provision through the service-role route.
    if (!storeId) return;
    if (!editingUser && (!formData.pin || formData.pin.length !== 4)) return;
    setSaving(true);
    const result = editingUser
      ? await cloudAuth.updateStoreMember({
          storeId,
          profileId: editingUser.id,
          displayName: formData.name,
          role: formData.role,
        })
      : await cloudAuth.provisionStaff({
          storeId,
          name: formData.name,
          role: formData.role,
          pin: formData.pin,
        });
    setSaving(false);
    if (result.error) {
      actions.addToast(result.error.message || t('error', language), 'error');
      return;
    }
    actions.addToast(
      editingUser ? t('userUpdated', language) : t('userAdded', language),
      'success'
    );
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', role: 'server', pin: '' });
    reloadCloudMembers();
  };

  const handleDelete = async (user) => {
    const ok = await confirm({
      title: t('deleteUser', language),
      message: t('confirmDelete', language),
      confirmLabel: t('delete', language),
      danger: true,
    });
    if (!ok) return;
    if (!isCloud) { actions.deleteUser(user.id); return; }
    if (!storeId) return;
    const result = await cloudAuth.removeStoreMember({ storeId, profileId: user.id });
    if (result.error) {
      actions.addToast(result.error.message || t('error', language), 'error');
      return;
    }
    actions.addToast(t('userDeleted', language), 'success');
    reloadCloudMembers();
  };

  const canSave = isCloud
    ? Boolean(formData.name) && (editingUser ? true : formData.pin.length === 4)
    : Boolean(formData.name) && formData.pin.length === 4;

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast">{t('userManagement', language)}</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl"><Plus className="w-5 h-5" /> {t('addUser', language)}</button>
      </div>

      {staffLink && (
        <div className="mb-6 bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start sm:items-center gap-3 flex-col sm:flex-row">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-dark-roast">{t('staffSignInLink', language)}</p>
            <p className="text-sm text-medium-roast mb-2">{t('staffSignInLinkHint', language)}</p>
            <code className="inline-block px-3 py-1.5 bg-white border border-latte/30 rounded-lg text-sm text-dark-roast select-all">{staffLink}</code>
          </div>
          <button onClick={copyStaffLink} className="flex items-center gap-2 px-4 py-2 bg-espresso text-white rounded-xl text-sm font-medium hover:bg-espresso/90 transition-colors shrink-0">
            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {linkCopied ? t('copied', language) : t('copy', language)}
          </button>
        </div>
      )}
      {/* Mobile: one card per staff member. From sm up the real table returns. */}
      <div className="sm:hidden space-y-3">
        {isCloud && cloudMembersLoading && list.length === 0 ? (
          <p className="bg-white rounded-2xl shadow-sm py-8 text-center text-medium-roast">{t('loadingMembers', language)}</p>
        ) : list.length === 0 ? (
          <p className="bg-white rounded-2xl shadow-sm py-8 text-center text-medium-roast">{isCloud ? t('staffEmpty', language) : t('noData', language)}</p>
        ) : list.map(user => (
          <div key={user.id} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${user.role === 'admin' ? 'bg-espresso' : user.role === 'manager' ? 'bg-accent' : 'bg-success'}`}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-dark-roast break-words">{user.name}</div>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-espresso/10 text-espresso' : user.role === 'manager' ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success'}`}>
                  {t(user.role, language)}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`} className="p-2 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4 text-medium-roast" /></button>
                <button onClick={() => handleDelete(user)} aria-label={`Delete ${user.name}`} className="p-2 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-latte/10 flex items-baseline justify-between gap-3">
              <span className="text-xs text-medium-roast shrink-0">{isCloud ? t('email', language) : t('userPin', language)}</span>
              <span className="font-mono text-sm text-dark-roast break-all text-right">{isCloud ? (user.email || '—') : '••••'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cream"><tr><th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold">{t('userName', language)}</th><th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold">{t('userRole', language)}</th><th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold">{isCloud ? t('email', language) : t('userPin', language)}</th><th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold">Actions</th></tr></thead>
          <tbody>
            {isCloud && cloudMembersLoading && list.length === 0 ? (
              <tr><td colSpan="4" className="px-4 lg:px-6 py-8 text-center text-medium-roast">{t('loadingMembers', language)}</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan="4" className="px-4 lg:px-6 py-8 text-center text-medium-roast">{isCloud ? t('staffEmpty', language) : t('noData', language)}</td></tr>
            ) : list.map(user => (
              <tr key={user.id} className="border-t border-latte/10 hover:bg-cream/50">
                <td className="px-4 lg:px-6 py-4"><div className="flex items-center gap-3"><div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${user.role === 'admin' ? 'bg-espresso' : user.role === 'manager' ? 'bg-accent' : 'bg-success'}`}><Users className="w-5 h-5 text-white" /></div><div className="min-w-0"><div className="font-medium">{user.name}</div>{isCloud && user.email ? <div className="text-xs text-medium-roast break-all">{user.email}</div> : null}</div></div></td>
                <td className="px-4 lg:px-6 py-4"><span className={`inline-block px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${user.role === 'admin' ? 'bg-espresso/10 text-espresso' : user.role === 'manager' ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success'}`}>{t(user.role, language)}</span></td>
                <td className="px-4 lg:px-6 py-4 font-mono text-medium-roast break-all">{isCloud ? (user.email || '—') : '••••'}</td>
                <td className="px-4 lg:px-6 py-4"><div className="flex justify-end gap-2">
                  <button onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`} className="p-2 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4 text-medium-roast" /></button>
                  <button onClick={() => handleDelete(user)} aria-label={`Delete ${user.name}`} className="p-2 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      
      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-display font-bold mb-6">{editingUser ? t('editUser', language) : t('addUser', language)}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('userName', language)}</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" /></div>
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('userRole', language)}</label><div className="grid grid-cols-3 gap-3">{['admin', 'manager', 'server'].map(role => (<button key={role} onClick={() => setFormData({ ...formData, role })} className={`px-4 py-3 rounded-xl font-medium ${formData.role === role ? 'bg-accent text-white' : 'bg-cream'}`}>{t(role, language)}</button>))}</div></div>
              {!(isCloud && editingUser) ? (
                <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('userPin', language)} (4 digits)</label><input type="text" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent font-mono" maxLength={4} /></div>
              ) : (
                <p className="text-sm text-medium-roast bg-cream rounded-xl px-4 py-3">{t('pinOptionalHint', language)}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-latte/10 rounded-xl font-medium">{t('cancel', language)}</button><button onClick={handleSubmit} disabled={!canSave || saving} className="flex-1 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50">{saving ? t('loading', language) : t('save', language)}</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// Categories View
function CategoriesView({ language, state, actions }) {
  const { categories, menuItems } = state;
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Coffee' });
  
  const handleSubmit = () => {
    if (!formData.name) return;
    if (editingCategory) { actions.updateCategory(editingCategory.id, formData); }
    else { actions.addCategory(formData); }
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', icon: 'Coffee' });
  };

  // Star/unstar a category as a *default*. The POS opens with the first
  // default category selected and shows its items right away.
  const toggleDefault = (cat) => {
    actions.updateCategory(cat.id, { isDefault: !cat.isDefault });
  };
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast">{t('categoryManagement', language)}</h1>
        <button onClick={() => { setEditingCategory(null); setFormData({ name: '', icon: 'Coffee' }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl"><Plus className="w-5 h-5" /> {t('addCategory', language)}</button>
      </div>

      {/* Default categories explanation */}
      <div className="mb-6 flex items-start gap-3 p-4 bg-accent/10 border border-accent/20 rounded-2xl">
        <Star className="w-5 h-5 text-accent shrink-0 mt-0.5" fill="currentColor" strokeWidth={0} />
        <p className="text-sm text-medium-roast leading-relaxed">{t('defaultCategoryHint', language)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${cat.isDefault ? 'border-accent/40' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-espresso/10 rounded-xl flex items-center justify-center"><Coffee className="w-6 h-6 text-espresso" /></div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleDefault(cat)}
                  aria-pressed={Boolean(cat.isDefault)}
                  title={t('defaultLabel', language)}
                  className={`p-1.5 rounded-lg transition-colors ${cat.isDefault ? 'bg-accent/10 text-accent' : 'hover:bg-latte/20 text-medium-roast'}`}
                >
                  <Star className="w-4 h-4" fill={cat.isDefault ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => { setEditingCategory(cat); setFormData({ name: cat.name, icon: cat.icon }); setShowModal(true); }} className="p-1.5 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={async () => { if (await confirm({ title: t('categoryName', language), message: t('confirmDelete', language), confirmLabel: t('delete', language), danger: true })) { actions.deleteCategory(cat.id); } }} className="p-1.5 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-dark-roast">{cat.name}</h3>
            <p className="text-sm text-medium-roast">{menuItems.filter(m => m.categoryId === cat.id).length} items</p>
            {cat.isDefault && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full">
                <Star className="w-3 h-3" fill="currentColor" strokeWidth={0} />
                {t('defaultLabel', language)}
              </span>
            )}
          </div>
        ))}
      </div>
      
      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-display font-bold mb-6">{editingCategory ? t('edit', language) : t('addCategory', language)}</h2>
            <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('categoryName', language)}</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" /></div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-latte/10 rounded-xl font-medium">{t('cancel', language)}</button><button onClick={handleSubmit} disabled={!formData.name} className="flex-1 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50">{t('save', language)}</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// Menu Items View — including per-item customization (modifier) management.
// Each item can be marked customizable and given any number of option groups
// (Spice Level, Size, Add-ons…) with priced options. What is configured here
// is exactly what the POS shows when the item is tapped.
function MenuItemsView({ language, state, actions }) {
  const { categories, menuItems } = state;
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [formData, setFormData] = useState(emptyItemForm(categories));

  const filteredItems = menuItems.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });
  
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.categoryId]) acc[item.categoryId] = [];
    acc[item.categoryId].push(item);
    return acc;
  }, {});

  const openAdd = () => {
    setEditingItem(null);
    setFormData(emptyItemForm(categories));
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData(itemToForm(item, categories));
    setShowModal(true);
  };
  
  const handleSubmit = () => {
    if (!formData.name || !formData.price || !formData.categoryId) return;
    const priceInCents = Math.round(parseFloat(formData.price) * 100);
    const record = {
      name: formData.name,
      categoryId: formData.categoryId,
      price: priceInCents,
      description: formData.description,
      available: formData.available,
      // Persist the admin-configured groups and drop the legacy seed flag so
      // resolveModifierGroups() only ever sees one source of truth.
      modifiers: [],
      modifierGroups: formData.customizable
        ? formData.modifierGroups
            .filter(group => group.name.trim())
            .map(group => ({
              id: group.id,
              name: group.name.trim(),
              options: group.options
                .filter(option => option.name.trim())
                .map(option => ({
                  id: option.id,
                  name: option.name.trim(),
                  price: Math.round((parseFloat(option.price) || 0) * 100),
                })),
            }))
            .filter(group => group.options.length > 0)
        : [],
    };
    if (editingItem) { actions.updateMenuItem(editingItem.id, record); }
    else { actions.addMenuItem(record); }
    setShowModal(false);
    setEditingItem(null);
    setFormData(emptyItemForm(categories));
  };
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast">{t('menuItems', language)}</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl"><Plus className="w-5 h-5" /> {t('addItem', language)}</button>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-medium-roast" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('search', language) + '...'} className="w-full pl-10 pr-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" />
          </div>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent">
            <option value="all">All Categories</option>
            {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
        </div>
      </div>
      
      <div className="space-y-4">
        {selectedCategory === 'all' ? categories.map(cat => {
          const items = itemsByCategory[cat.id] || [];
          const isExpanded = expandedCategory === cat.id || expandedCategory === null;
          return (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => setExpandedCategory(isExpanded ? cat.id : null)} className="w-full flex items-center justify-between p-4 hover:bg-cream/50">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-espresso/10 rounded-xl flex items-center justify-center"><Coffee className="w-5 h-5 text-espresso" /></div><div className="text-left"><h3 className="font-semibold">{cat.name}</h3><p className="text-sm text-medium-roast">{items.length} items</p></div></div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-medium-roast" /> : <ChevronDown className="w-5 h-5 text-medium-roast" />}
              </button>
              <AnimatePresence>{isExpanded && items.length > 0 && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden"><div className="border-t border-latte/10">{items.map(item => (
                  <ItemRow key={item.id} item={item} language={language} onToggle={() => actions.toggleItemAvailability(item.id)} onEdit={() => openEdit(item)} onDelete={async () => { if (await confirm({ title: t('menuItems', language), message: t('confirmDelete', language), confirmLabel: t('delete', language), danger: true })) actions.deleteMenuItem(item.id); }} />
                ))}</div></motion.div>
              )}</AnimatePresence>
            </div>
          );
        }) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden"><div className="border-b border-latte/10">{filteredItems.map(item => (
            <ItemRow key={item.id} item={item} language={language} onToggle={() => actions.toggleItemAvailability(item.id)} onEdit={() => openEdit(item)} onDelete={async () => { if (await confirm({ title: t('menuItems', language), message: t('confirmDelete', language), confirmLabel: t('delete', language), danger: true })) actions.deleteMenuItem(item.id); }} />
          ))}</div></div>
        )}
      </div>
      
      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-display font-bold mb-6">{editingItem ? 'Edit Item' : t('addItem', language)}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('itemName', language)} *</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" /></div>
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('categories', language)} *</label><select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent">{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div>
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('itemPrice', language)} (RM) *</label><input type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent font-mono" /></div>
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('itemDescription', language)}</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent resize-none" rows={3} /></div>
              <div className="flex items-center justify-between p-4 bg-cream rounded-xl"><div><p className="font-medium">{t('itemAvailable', language)}</p><p className="text-sm text-medium-roast">Toggle availability</p></div><button onClick={() => setFormData({ ...formData, available: !formData.available })} className={`relative w-14 h-8 rounded-full transition-colors ${formData.available ? 'bg-success' : 'bg-latte/30'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${formData.available ? 'left-7' : 'left-1'}`} /></button></div>

              <ModifierGroupsEditor formData={formData} setFormData={setFormData} language={language} />
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-latte/10 rounded-xl font-medium">{t('cancel', language)}</button><button onClick={handleSubmit} disabled={!formData.name || !formData.price || !formData.categoryId} className="flex-1 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50">{t('save', language)}</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// Row in the menu items list — shows the Customizable badge when the item has
// option groups configured.
function ItemRow({ item, language, onToggle, onEdit, onDelete }) {
  const groups = resolveModifierGroups(item);
  const optionCount = groups.reduce((sum, group) => sum + group.options.length, 0);
  return (
    <div className={`flex items-center justify-between p-4 hover:bg-cream/50 ${!item.available ? 'bg-error/5' : ''}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className={`font-medium ${!item.available ? 'text-medium-roast line-through' : ''}`}>{item.name}</h4>
          {!item.available && <span className="px-2 py-0.5 bg-error/10 text-error text-xs rounded-full">{t('itemUnavailable', language)}</span>}
          {groups.length > 0 && (
            <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full" title={groups.map(group => group.name).join(', ')}>
              {t('customizable', language)} · {groups.length} group{groups.length === 1 ? '' : 's'} · {optionCount} options
            </span>
          )}
        </div>
        <p className="text-sm text-medium-roast">{item.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono font-semibold text-espresso">RM {(item.price / 100).toFixed(2)}</span>
        <button onClick={onToggle} className={`p-2 rounded-lg ${item.available ? 'hover:bg-success/10 text-success' : 'hover:bg-error/10 text-error'}`}>{item.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
        <button onClick={onEdit} className="p-2 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4" /></button>
        <button onClick={onDelete} className="p-2 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
      </div>
    </div>
  );
}

// --- Customization form state helpers -------------------------------------
// The form keeps group/option prices in RM strings (what the manager types);
// handleSubmit converts them to cents for storage.
function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyItemForm(categories) {
  return {
    name: '',
    categoryId: categories[0]?.id || '',
    price: '',
    description: '',
    available: true,
    customizable: false,
    modifierGroups: [],
  };
}

function itemToForm(item, categories) {
  const groups = resolveModifierGroups(item);
  return {
    name: item.name,
    categoryId: item.categoryId || categories[0]?.id || '',
    price: (item.price / 100).toString(),
    description: item.description || '',
    available: item.available,
    customizable: groups.length > 0,
    modifierGroups: groups.map(group => ({
      id: group.id || uid('grp'),
      name: group.name,
      options: group.options.map(option => ({
        id: option.id || uid('opt'),
        name: option.name,
        price: ((option.price || 0) / 100).toString(),
      })),
    })),
  };
}

// Editor for the item's customization groups (Spice Level, Size, …), each with
// any number of priced options. Off = plain item added straight to the cart.
function ModifierGroupsEditor({ formData, setFormData, language }) {
  const customizable = formData.customizable;
  const groups = formData.modifierGroups;

  const setGroups = (modifierGroups) => setFormData({ ...formData, modifierGroups });

  const addGroup = () => setGroups([...groups, { id: uid('grp'), name: '', options: [{ id: uid('opt'), name: '', price: '' }] }]);
  const updateGroup = (groupId, updates) => setGroups(groups.map(group => group.id === groupId ? { ...group, ...updates } : group));
  const removeGroup = (groupId) => setGroups(groups.filter(group => group.id !== groupId));

  const addOption = (groupId) => setGroups(groups.map(group =>
    group.id === groupId ? { ...group, options: [...group.options, { id: uid('opt'), name: '', price: '' }] } : group
  ));
  const updateOption = (groupId, optionId, updates) => setGroups(groups.map(group =>
    group.id === groupId
      ? { ...group, options: group.options.map(option => option.id === optionId ? { ...option, ...updates } : option) }
      : group
  ));
  const removeOption = (groupId, optionId) => setGroups(groups.map(group =>
    group.id === groupId
      ? { ...group, options: group.options.filter(option => option.id !== optionId) }
      : group
  ));

  return (
    <div className="border border-latte/20 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-cream">
        <div>
          <p className="font-medium">{t('customizationOptions', language)}</p>
          <p className="text-sm text-medium-roast">{t('customizationOptionsHint', language)}</p>
        </div>
        <button
          onClick={() => setFormData({ ...formData, customizable: !customizable })}
          className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${customizable ? 'bg-success' : 'bg-latte/30'}`}
        >
          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${customizable ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {customizable && (
        <div className="p-4 space-y-4">
          {groups.length === 0 && (
            <p className="text-sm text-medium-roast text-center py-2">{t('noCustomizationGroups', language)}</p>
          )}
          {groups.map(group => (
            <div key={group.id} className="border border-latte/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={group.name}
                  onChange={e => updateGroup(group.id, { name: e.target.value })}
                  placeholder={t('groupNamePlaceholder', language)}
                  className="flex-1 px-3 py-2 bg-cream border border-latte/30 rounded-lg font-medium focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => removeGroup(group.id)}
                  className="p-2 hover:bg-error/10 rounded-lg shrink-0"
                  title={t('delete', language)}
                >
                  <Trash2 className="w-4 h-4 text-error" />
                </button>
              </div>

              {group.options.map(option => (
                <div key={option.id} className="flex items-center gap-2 pl-2">
                  <input
                    type="text"
                    value={option.name}
                    onChange={e => updateOption(group.id, option.id, { name: e.target.value })}
                    placeholder={t('optionNamePlaceholder', language)}
                    className="flex-1 px-3 py-1.5 bg-white border border-latte/30 rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                  <div className="relative w-24 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-medium-roast">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={option.price}
                      onChange={e => updateOption(group.id, option.id, { price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-2 py-1.5 bg-white border border-latte/30 rounded-lg text-sm font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <button
                    onClick={() => removeOption(group.id, option.id)}
                    className="p-1.5 hover:bg-error/10 rounded-lg shrink-0"
                    title={t('delete', language)}
                  >
                    <X className="w-4 h-4 text-error" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addOption(group.id)}
                className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 pl-2"
              >
                <PlusCircle className="w-4 h-4" />
                {t('addOption', language)}
              </button>
            </div>
          ))}

          <button
            onClick={addGroup}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-latte/40 rounded-xl text-sm font-medium text-medium-roast hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('addGroup', language)}
          </button>
        </div>
      )}
    </div>
  );
}
// Tables View
function TablesView({ language, state, actions }) {
  const { tables } = state;
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ number: '', capacity: 4 });
  
  const handleSubmit = () => {
    if (!formData.number) return;
    if (editingTable) { actions.updateTable(editingTable.id, formData); }
    else { actions.addTable(formData); }
    setShowModal(false);
    setEditingTable(null);
    setFormData({ number: '', capacity: 4 });
  };
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast">{t('tableManagement', language)}</h1>
        <button onClick={() => { setEditingTable(null); setFormData({ number: '', capacity: 4 }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl"><Plus className="w-5 h-5" /> {t('addTable', language)}</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.filter(t => !t.isCounter).map(table => (
          <div key={table.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3"><span className="text-3xl font-display font-bold text-espresso">{table.number}</span><div className="flex gap-1"><button onClick={() => { setEditingTable(table); setFormData({ number: table.number.toString(), capacity: table.capacity }); setShowModal(true); }} className="p-1.5 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4" /></button><button onClick={async () => { if (await confirm({ title: t('deleteTable', language), message: t('confirmDelete', language), confirmLabel: t('delete', language), danger: true })) actions.deleteTable(table.id); }} className="p-1.5 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button></div></div>
            <p className="text-sm text-medium-roast">{table.capacity} {t('seats', language)}</p>
            <div className="mt-2 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${table.status === 'available' ? 'bg-success' : table.status === 'occupied' ? 'bg-warning' : table.status === 'reserved' ? 'bg-medium-roast' : 'bg-latte'}`} /><span className="text-xs text-medium-roast capitalize">{t(table.status, language)}</span></div>
          </div>
        ))}
      </div>
      
      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-display font-bold mb-6">{editingTable ? t('editTable', language) : t('addTable', language)}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('tableNumber', language)}</label><input type="number" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" /></div>
              <div><label className="block text-sm font-medium text-medium-roast mb-2">{t('tableCapacity', language)}</label><div className="grid grid-cols-4 gap-2">{[2, 4, 6, 8].map(cap => (<button key={cap} onClick={() => setFormData({ ...formData, capacity: cap })} className={`py-3 rounded-xl font-medium ${formData.capacity === cap ? 'bg-accent text-white' : 'bg-cream'}`}>{cap}</button>))}</div></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-latte/10 rounded-xl font-medium">{t('cancel', language)}</button><button onClick={handleSubmit} disabled={!formData.number} className="flex-1 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50">{t('save', language)}</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// Delivery Services View — the food-delivery companies this store accepts
// (GrabFood, foodpanda, Shopee Food, …). Everything configured here appears as
// a tappable icon in the POS order panel next to walk-in and the tables.
// Managers and admins both maintain the list, exactly like table management.
function DeliveryChannelsView({ language, state, actions }) {
  const { deliveryChannels } = state;
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({ name: '', emoji: '🛵', color: '#00B14F', active: true });

  const emojiChoices = ['🛵', '🏍️', '🚴', '🐼', '🛍️', '🍔', '🥡', '📦', '🚗', '🧋'];
  const colorChoices = ['#00B14F', '#D70F64', '#EE4D2D', '#F8AD1F', '#2F80ED', '#7048E8', '#E8590C', '#4C4C4C'];

  const openAdd = () => {
    setEditingChannel(null);
    setFormData({ name: '', emoji: '🛵', color: '#00B14F', active: true });
    setShowModal(true);
  };

  const openEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      emoji: channel.emoji || '🛵',
      color: channel.color || '#00B14F',
      active: channel.active !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    const payload = {
      name: formData.name.trim(),
      emoji: formData.emoji,
      color: formData.color,
      active: formData.active !== false,
    };
    if (editingChannel) { actions.updateDeliveryChannel(editingChannel.id, payload); }
    else { actions.addDeliveryChannel(payload); }
    setShowModal(false);
    setEditingChannel(null);
  };

  const handleDelete = async (channel) => {
    const ok = await confirm({
      title: t('deleteDeliveryService', language),
      message: `Remove ${channel.name} from the POS order screen? Open orders already placed through it are not affected.`,
      confirmLabel: t('delete', language),
      danger: true,
    });
    if (ok) actions.deleteDeliveryChannel(channel.id);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast flex items-center gap-2 sm:gap-3 min-w-0">
          <Bike className="w-7 h-7" />
          {t('deliveryServices', language)}
        </h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90">
          <Plus className="w-5 h-5" /> {t('addDeliveryService', language)}
        </button>
      </div>
      <p className="text-sm text-medium-roast mb-6 max-w-2xl">
        {t('deliveryServicesHint', language)}
      </p>

      {deliveryChannels.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <Bike className="w-10 h-10 text-latte mx-auto mb-3" />
          <p className="text-medium-roast">{t('noDeliveryServices', language)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {deliveryChannels.map(channel => (
            <div key={channel.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${channel.color || '#4C4C4C'}1F` }}
                >
                  <span aria-hidden="true">{channel.emoji || '🛵'}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(channel)} className="p-1.5 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(channel)} className="p-1.5 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-dark-roast truncate">{channel.name}</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${channel.active !== false ? 'bg-success' : 'bg-latte'}`} />
                <span className="text-xs text-medium-roast">{channel.active !== false ? t('active', language) : t('inactive', language)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-display font-bold mb-6">{editingChannel ? t('editDeliveryService', language) : t('addDeliveryService', language)}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">{t('deliveryServiceName', language)}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. GrabFood, foodpanda, Shopee Food…"
                  className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">{t('deliveryServiceIcon', language)}</label>
                <div className="flex flex-wrap gap-2">
                  {emojiChoices.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`w-11 h-11 rounded-xl text-xl transition-colors ${formData.emoji === emoji ? 'bg-accent/10 ring-2 ring-accent' : 'bg-cream hover:bg-latte/20'}`}
                    >
                      <span aria-hidden="true">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">{t('deliveryServiceColor', language)}</label>
                <div className="flex flex-wrap gap-2">
                  {colorChoices.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      aria-label={color}
                      className={`w-9 h-9 rounded-full transition-transform ${formData.color === color ? 'ring-2 ring-espresso ring-offset-2' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-cream rounded-xl">
                <div>
                  <p className="font-medium">{t('deliveryServiceActive', language)}</p>
                  <p className="text-sm text-medium-roast">{t('deliveryServiceActiveHint', language)}</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, active: !formData.active })}
                  className={`relative w-14 h-8 rounded-full transition-colors ${formData.active ? 'bg-success' : 'bg-latte/30'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${formData.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-latte/10 rounded-xl font-medium">{t('cancel', language)}</button>
              <button onClick={handleSubmit} disabled={!formData.name.trim()} className="flex-1 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50">{t('save', language)}</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// Reports View
function ReportsView({ language, state, actions }) {
  const { orderHistory } = state;
  const [dateRange, setDateRange] = useState('today');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  
  const getFilteredOrders = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return orderHistory.filter(order => {
      if (order.status !== 'paid') return false;
      const orderDate = new Date(order.paidAt).getTime();
      if (dateRange === 'today') return orderDate >= today;
      if (dateRange === 'week') return orderDate >= today - 7 * 24 * 60 * 60 * 1000;
      if (dateRange === 'month') return orderDate >= today - 30 * 24 * 60 * 60 * 1000;
      if (dateRange === 'custom' && customRange.from && customRange.to) {
        const from = new Date(customRange.from).getTime();
        const to = new Date(customRange.to + 'T23:59:59').getTime();
        return orderDate >= from && orderDate <= to;
      }
      return true;
    });
  };
  
  const filteredOrders = getFilteredOrders();
  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const totalItems = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  
  const itemCounts = {};
  filteredOrders.forEach(order => { order.items.forEach(item => { if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, quantity: 0, revenue: 0 }; itemCounts[item.name].quantity += item.quantity; itemCounts[item.name].revenue += item.price * item.quantity; }); });
  const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  
  const handleExportPdf = () => {
    if (filteredOrders.length === 0) {
      actions.addToast(t('noData', language), 'info');
      return;
    }
    const rangeLabel = dateRange === 'custom'
      ? `${customRange.from} → ${customRange.to}`
      : dateRange === 'today' ? t('today', language)
      : dateRange === 'week' ? t('thisWeek', language)
      : t('thisMonth', language);
    downloadSalesReportPdf({ rangeLabel, orders: filteredOrders });
    actions.addToast(t('downloadPdf', language) + ' ✓', 'success');
  };
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast">{t('salesReport', language)}</h1>
        <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-xl"><Download className="w-5 h-5" /> {t('downloadPdf', language)}</button>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap gap-2">
          {[{ id: 'today', label: t('today', language) }, { id: 'week', label: t('thisWeek', language) }, { id: 'month', label: t('thisMonth', language) }, { id: 'custom', label: t('customRange', language) }].map(opt => (<button key={opt.id} onClick={() => setDateRange(opt.id)} className={`px-4 py-2 rounded-xl font-medium ${dateRange === opt.id ? 'bg-accent text-white' : 'bg-cream'}`}>{opt.label}</button>))}
          {dateRange === 'custom' && (<div className="flex items-center gap-2 ml-4"><input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} className="px-3 py-2 bg-cream border rounded-lg" /><span>to</span><input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} className="px-3 py-2 bg-cream border rounded-lg" /></div>)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{ label: t('totalSales', language), value: formatPrice(totalSales), color: 'text-success' }, { label: t('totalOrders', language), value: totalOrders.toString(), color: 'text-espresso' }, { label: t('avgOrderValue', language), value: formatPrice(avgOrderValue), color: 'text-accent' }, { label: t('itemsSold', language), value: totalItems.toString(), color: 'text-medium-roast' }].map(stat => (<div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm"><p className="text-sm text-medium-roast mb-1">{stat.label}</p><p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p></div>))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm"><h2 className="font-semibold mb-4">{t('topItems', language)}</h2>
          {topItems.length === 0 ? <p className="text-medium-roast text-center py-8">{t('noData', language)}</p> : <div className="space-y-3">{topItems.map((item, i) => (<div key={item.name} className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-accent text-white' : i === 1 ? 'bg-latte text-white' : 'bg-cream'}`}>{i + 1}</span><div className="flex-1"><p className="font-medium">{item.name}</p><p className="text-xs text-medium-roast">{item.quantity} sold</p></div><span className="font-mono font-semibold text-espresso">{formatPrice(item.revenue)}</span></div>))}</div>}
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm"><h2 className="font-semibold mb-4">{t('recentTransactions', language)}</h2>
          {filteredOrders.length === 0 ? <p className="text-medium-roast text-center py-8">{t('noData', language)}</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-latte/20"><th className="py-2 text-left">Order</th><th className="py-2 text-left">Payment</th><th className="py-2 text-right">Total</th></tr></thead><tbody>{filteredOrders.slice(0, 10).map(order => (<tr key={order.id} className="border-b border-latte/10"><td className="py-2 font-mono">{order.id.slice(-8)}</td><td className="py-2 capitalize">{order.paymentMethod}</td><td className="py-2 text-right font-mono font-semibold">{formatPrice(order.total)}</td></tr>))}</tbody></table></div>}
        </div>
      </div>
    </div>
  );
}

// ==================== STORE SETTINGS VIEW (NEW!) ====================
// Supabase answers "could not find the function …" when the deployed database
// was created from an older schema.sql and is missing a newer settings RPC.
// Turn that into an actionable hint instead of raw PostgREST jargon.
function describeSettingsError(error) {
  if (/could not find the function/i.test(error?.message || '')) {
    return 'This store\'s database is missing a newer settings function. Re-run the idempotent supabase/schema.sql in the Supabase SQL Editor, then save again.';
  }
  return error?.message || 'Could not save shared settings';
}

function StoreSettingsView({ state, actions }) {
  const [settings, setSettings] = useState(loadStoreSettings);
  const confirm = useConfirm();
  const [saved, setSaved] = useState(false);
  const [showDeleteStore, setShowDeleteStore] = useState(false);
  const isManager = state.currentUser?.role === 'manager';

  // Tax master switch (default on for settings saved before it existed).
  const taxEnabled = settings.taxEnabled !== false;
  const previewRate = taxEnabled ? (settings.taxRate || 0) : 0;
  const previewSubtotal = 1400; // cents — the sample receipt's two items
  const previewTax = Math.round(previewSubtotal * previewRate);
  const previewMoney = (cents) =>
    `${settings.currencySymbol || settings.currency || 'RM'} ${(cents / 100).toFixed(2)}`;

  // Store deletion is a cloud-only, owner (admin) action.
  const cloudAdmin = Boolean(state.currentUser?.cloud && state.currentUser?.role === 'admin');
  const storeId = state.currentUser?.storeId || state.cloudSession?.storeId || null;
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

  const handleSave = async () => {
    let settingsToSave = settings;

    if (state.currentUser?.cloud && storeId && cloudAuth.isEnabled) {
      // Managers only control the server-order switch. Merge it into the latest
      // cloud value so they cannot overwrite Admin-only business/receipt data.
      if (isManager) {
        const { data, error: loadError } = await cloudAuth.getStoreSettings(storeId);
        if (loadError) {
          actions.addToast(loadError.message || 'Could not load shared settings', 'error');
          return;
        }
        settingsToSave = {
          ...data,
          serverCanViewAllOrders: settings.serverCanViewAllOrders !== false,
          serverCanEditPrice: settings.serverCanEditPrice === true,
        };
        const { error } = await cloudAuth.updateServerOrderVisibility(
          storeId,
          settingsToSave.serverCanViewAllOrders
        );
        if (error) {
          actions.addToast(describeSettingsError(error), 'error');
          return;
        }
        const { error: priceError } = await cloudAuth.updateServerPriceAccess(
          storeId,
          settingsToSave.serverCanEditPrice
        );
        if (priceError) {
          actions.addToast(describeSettingsError(priceError), 'error');
          return;
        }
      } else {
        const { error } = await cloudAuth.updateStoreSettings(storeId, settingsToSave);
        if (error) {
          actions.addToast(describeSettingsError(error), 'error');
          return;
        }
      }
    }

    saveStoreSettings(settingsToSave);
    setSettings(settingsToSave);
    // Push operational settings into this device immediately.
    actions.setTaxSettings({
      taxRate: settingsToSave.taxRate,
      taxEnabled: settingsToSave.taxEnabled,
    });
    actions.setServerOrderVisibility(settingsToSave.serverCanViewAllOrders !== false);
    actions.setServerPriceAccess(settingsToSave.serverCanEditPrice === true);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    actions.addToast('Settings saved!', 'success');
  };
  
  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset settings?',
      message: 'Reset to default settings? Your current customizations will be lost.',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (ok) {
      saveStoreSettings(defaultStoreSettings);
      setSettings(loadStoreSettings());
      actions.setTaxSettings({
        taxRate: defaultStoreSettings.taxRate,
        taxEnabled: defaultStoreSettings.taxEnabled,
      });
      actions.setServerOrderVisibility(defaultStoreSettings.serverCanViewAllOrders);
      actions.setServerPriceAccess(defaultStoreSettings.serverCanEditPrice);
      if (state.currentUser?.cloud && storeId && cloudAuth.isEnabled) {
        const { error } = await cloudAuth.updateStoreSettings(storeId, defaultStoreSettings);
        if (error) {
          actions.addToast(error.message || 'Could not reset shared settings', 'error');
          return;
        }
      }
      actions.addToast('Settings reset to default', 'info');
    }
  };
  
  // Download every piece of shared data as one JSON file so it can be restored on
  // another device if this machine is lost, broken, or its browser data is cleared.
  const handleBackupExport = () => {
    const payload = {
      app: 'cafe-pos',
      exportedAt: new Date().toISOString(),
      menuDataVersion: state.menuDataVersion,
      tables: state.tables,
      deliveryChannels: state.deliveryChannels,
      orderHistory: state.orderHistory,
      openOrders: state.openOrders,
      heldOrders: state.heldOrders,
      categories: state.categories,
      menuItems: state.menuItems,
      selectedCategory: state.selectedCategory,
      users: state.users,
      language: state.language,
      expenseCategories: state.expenseCategories,
      expenses: state.expenses,
      storeSettings: settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafe-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    actions.addToast('Backup downloaded', 'success');
  };
  
  const handleBackupImport = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try {
        data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
      } catch {
        actions.addToast('Invalid backup file', 'error');
        return;
      }
      const ok = await confirm({
        title: 'Restore from backup?',
        message: 'This will REPLACE all data on this device (orders, menu, tables, staff, expenses, settings) with the backup contents. You may need to sign in again afterwards.',
        confirmLabel: 'Restore',
        danger: true,
      });
      if (!ok) return;
      actions.importBackup(data);
      if (data.storeSettings && typeof data.storeSettings === 'object') {
        saveStoreSettings(data.storeSettings);
        const restored = loadStoreSettings();
        setSettings(restored);
        actions.setTaxSettings({ taxRate: restored.taxRate, taxEnabled: restored.taxEnabled });
        actions.setServerOrderVisibility(restored.serverCanViewAllOrders);
        actions.setServerPriceAccess(restored.serverCanEditPrice);
      }
      actions.addToast('Backup restored', 'success');
    };
    reader.readAsText(file);
  };

  // Managers get only the operational permissions requested here; Admin-only
  // business, backup and danger-zone settings remain hidden.
  if (isManager) {
    return (
      <div className="p-3 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast flex items-center gap-2 sm:gap-3 min-w-0">
            <Settings className="w-7 h-7" />
            Settings
          </h1>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2 text-white rounded-xl ${
              saved ? 'bg-success' : 'bg-accent hover:bg-accent/90'
            }`}
          >
            {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
        <div className="max-w-3xl">
          <ServerOrderAccessCard settings={settings} setSettings={setSettings} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast flex items-center gap-2 sm:gap-3 min-w-0">
          <Store className="w-7 h-7" />
          Store Settings
        </h1>
        <div className="flex gap-3">
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-latte/10 text-espresso rounded-xl hover:bg-latte/20">
            <RefreshCw className="w-5 h-5" />
            Reset
          </button>
          <button onClick={handleSave} className={`flex items-center gap-2 px-6 py-2 text-white rounded-xl ${saved ? 'bg-success' : 'bg-accent hover:bg-accent/90'}`}>
            {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      <div className="max-w-3xl space-y-6">
        <ServerOrderAccessCard settings={settings} setSettings={setSettings} />

        {/* Business Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-espresso text-white">
            <h2 className="font-semibold flex items-center gap-2"><Store className="w-5 h-5" /> Business Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-medium-roast mb-2">Business Name *</label>
              <input type="text" value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent text-lg font-semibold" placeholder="Your Business Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-medium-roast mb-2">Tagline</label>
              <input type="text" value={settings.tagline} onChange={e => setSettings({ ...settings, tagline: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" placeholder="Your catchy tagline" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">Address</label>
                <input type="text" value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" placeholder="Street address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">City</label>
                <input type="text" value={settings.city} onChange={e => setSettings({ ...settings, city: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" placeholder="City" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">Phone</label>
                <input type="text" value={settings.phone} onChange={e => setSettings({ ...settings, phone: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" placeholder="+60 3-1234 5678" />
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">Email</label>
                <input type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" placeholder="email@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-medium-roast mb-2">Tax ID / GST Number</label>
              <input type="text" value={settings.taxId} onChange={e => setSettings({ ...settings, taxId: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent font-mono" placeholder="GST-0000000" />
            </div>
          </div>
        </div>
        
        {/* Tax & Currency */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-latte/20">
            <h2 className="font-semibold">Tax & Currency Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Master tax switch. Off = no tax on orders and no tax line on receipts. */}
            <div className="flex items-center justify-between p-4 bg-cream rounded-xl">
              <div>
                <p className="font-medium">Apply Tax</p>
                <p className="text-sm text-medium-roast">
                  {taxEnabled
                    ? 'Tax is added to every order and shown on receipts'
                    : 'No tax is charged and no tax line appears on receipts'}
                </p>
              </div>
              <button
                aria-label="Toggle tax"
                aria-pressed={taxEnabled}
                onClick={() => setSettings({ ...settings, taxEnabled: !taxEnabled })}
                className={`relative w-14 h-8 rounded-full transition-colors ${taxEnabled ? 'bg-success' : 'bg-latte/30'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${taxEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">Tax Rate (%)</label>
                <input type="number" step="0.1" min="0" max="100" disabled={!taxEnabled} value={Number.isFinite(settings.taxRate) ? settings.taxRate * 100 : 0} onChange={e => setSettings({ ...settings, taxRate: (parseFloat(e.target.value) || 0) / 100 })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent font-mono disabled:opacity-50 disabled:cursor-not-allowed" />
                {!taxEnabled && <p className="text-xs text-medium-roast mt-2">Tax is switched off — orders are charged without tax.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">Currency Code</label>
                <select value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent">
                  <option value="RM">RM - Malaysian Ringgit</option>
                  <option value="$">$ - US Dollar</option>
                  <option value="€">€ - Euro</option>
                  <option value="£">£ - British Pound</option>
                  <option value="৳">৳ - Bangladeshi Taka</option>
                  <option value="₹">₹ - Indian Rupee</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Receipt Settings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-latte/20">
            <h2 className="font-semibold flex items-center gap-2"><Printer className="w-5 h-5" /> Receipt & Printer Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-medium-roast mb-2">Receipt Footer Message</label>
              <input type="text" value={settings.receiptFooter} onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" placeholder="Thank you message" />
            </div>
            <div>
              <label className="block text-sm font-medium text-medium-roast mb-2">Receipt Header Message</label>
              <input type="text" value={settings.receiptHeader} onChange={e => setSettings({ ...settings, receiptHeader: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" placeholder="Welcome message" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">Printer Paper Width</label>
                <select value={settings.printerType} onChange={e => setSettings({ ...settings, printerType: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent">
                  <option value="80mm">80mm (Standard Thermal)</option>
                  <option value="58mm">58mm (Narrow Thermal)</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 bg-cream rounded-xl">
                <div>
                  <p className="font-medium">Auto-print Receipt</p>
                  <p className="text-sm text-medium-roast">Automatically print after payment</p>
                </div>
                <button onClick={() => setSettings({ ...settings, autoPrintReceipt: !settings.autoPrintReceipt })} className={`relative w-14 h-8 rounded-full transition-colors ${settings.autoPrintReceipt ? 'bg-success' : 'bg-latte/30'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.autoPrintReceipt ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
            
            {/* Receipt Preview */}
            <div className="border-t border-latte/20 pt-4">
              <p className="text-sm font-medium text-medium-roast mb-3">Receipt Preview</p>
              <div className="bg-gray-100 p-4 rounded-xl">
                <div className="bg-white mx-auto shadow-lg p-4" style={{ width: '200px', fontFamily: 'Courier New, monospace', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
                  <div className="text-center font-bold">{settings.name.toUpperCase() || 'YOUR BUSINESS'}</div>
                  {settings.tagline && <div className="text-center text-[9px]">{settings.tagline}</div>}
                  <div className="text-center text-[9px] my-2 border-y border-dashed border-gray-400 py-1">{settings.address || 'Address'}\n{settings.city || 'City'}</div>
                  <div className="text-[9px]">Date : {new Date().toLocaleDateString()}</div>
                  <div className="text-[9px]">Order: #ABC12345</div>
                  <div className="text-[9px] border-b border-dashed border-gray-400 pb-2 mb-2">────────────────────────────────</div>
                  <div className="text-[9px] space-y-1">
                    <div className="flex justify-between"><span>1x Latte</span><span>{previewMoney(800)}</span></div>
                    <div className="flex justify-between"><span>1x Croissant</span><span>{previewMoney(600)}</span></div>
                  </div>
                  <div className="border-t border-dashed border-gray-400 mt-2 pt-2 text-[9px]">
                    <div className="flex justify-between"><span>SUBTOTAL</span><span>{previewMoney(previewSubtotal)}</span></div>
                    {taxEnabled && (
                      <div className="flex justify-between"><span>TAX ({(previewRate * 100).toFixed(0)}%)</span><span>{previewMoney(previewTax)}</span></div>
                    )}
                    <div className="flex justify-between font-bold border-t border-dashed border-gray-400 mt-1 pt-1"><span>TOTAL</span><span>{previewMoney(previewSubtotal + previewTax)}</span></div>
                  </div>
                  <div className="text-center text-[9px] mt-4 border-t border-dashed border-gray-400 pt-2">{settings.receiptFooter || 'Thank you!'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Language */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-latte/20">
            <h2 className="font-semibold">Language Settings</h2>
          </div>
          <div className="p-3 sm:p-6">
            <div className="flex gap-4">
              <button onClick={() => actions.setLanguage('en')} className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 ${state.language === 'en' ? 'bg-accent text-white' : 'bg-cream hover:bg-latte/20'}`}>🇬🇧 English</button>
              <button onClick={() => actions.setLanguage('bn')} className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 ${state.language === 'bn' ? 'bg-accent text-white' : 'bg-cream hover:bg-latte/20'}`}>🇧🇩 বাংলা</button>
            </div>
          </div>
        </div>
        
        {/* Backup & Restore */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-latte/20">
            <h2 className="font-semibold flex items-center gap-2"><Database className="w-5 h-5" /> Backup & Restore</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-medium-roast">
              All data (orders, menu, tables, staff, expenses, settings) lives in this
              device's browser storage. Download a backup regularly and keep it somewhere
              safe (cloud drive, email, USB) — if this device is lost, broken, or its
              browser data is cleared, you can restore everything onto a new device.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleBackupExport} className="flex items-center gap-2 px-4 py-3 bg-espresso text-white rounded-xl font-medium hover:bg-espresso/90 transition-colors">
                <Download className="w-5 h-5" />
                Download backup (.json)
              </button>
              <label className="flex items-center gap-2 px-4 py-3 bg-cream border border-latte/30 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors cursor-pointer">
                <Upload className="w-5 h-5" />
                Restore from backup
                <input type="file" accept=".json,application/json" onChange={handleBackupImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone — deleting the whole store (owner/admin, cloud stores only) */}
        {cloudAdmin && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-error/30">
            <div className="p-4 bg-error/10">
              <h2 className="font-semibold flex items-center gap-2 text-error">
                <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-medium text-dark-roast">Delete this store</p>
                <p className="text-sm text-medium-roast mt-1">
                  Permanently removes this store and everything in it — menu, tables, orders,
                  expenses and staff accounts that belong only to this store. The store link
                  {storeSlug ? <span className="font-mono"> /{storeSlug}</span> : null} will stop working.
                  This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteStore(true)}
                className="flex items-center gap-2 px-4 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete store…
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteStore && (
        <DeleteStoreModal
          storeId={storeId}
          storeSlug={storeSlug}
          onClose={() => setShowDeleteStore(false)}
          onDeleted={handleStoreDeleted}
        />
      )}
    </div>
  );
}

// One row inside the permissions card: label, explanation and a switch.
function PermissionToggle({ label, description, enabled, onToggle, ariaLabel }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="font-medium text-dark-roast">{label}</p>
        <p className="text-sm text-medium-roast mt-1">{description}</p>
      </div>
      <button
        aria-label={ariaLabel}
        aria-pressed={enabled}
        onClick={onToggle}
        className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${
          enabled ? 'bg-success' : 'bg-latte/30'
        }`}
      >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
          enabled ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  );
}

function ServerOrderAccessCard({ settings, setSettings }) {
  const canViewAll = settings.serverCanViewAllOrders !== false;
  // Price overrides are opt-in: a server changing a price is effectively an
  // unlogged discount, so the store has to grant it deliberately.
  const canEditPrice = settings.serverCanEditPrice === true;
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-accent/20">
      <div className="p-4 bg-accent/10">
        <h2 className="font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-accent" /> Server Permissions
        </h2>
      </div>
      <div className="p-6 space-y-6">
        <PermissionToggle
          label="Servers can see all open orders"
          description="On: servers can view and edit every table and walk-in order. Off: each server only sees orders placed by their own account."
          enabled={canViewAll}
          ariaLabel="Toggle server access to all open orders"
          onToggle={() => setSettings({ ...settings, serverCanViewAllOrders: !canViewAll })}
        />

        <div className="border-t border-latte/20" />

        <PermissionToggle
          label="Servers can change item prices"
          description="On: servers can override the price of a line in the cart. Off: they charge the menu price. Admins and Managers can always change prices."
          enabled={canEditPrice}
          ariaLabel="Toggle server permission to change item prices"
          onToggle={() => setSettings({ ...settings, serverCanEditPrice: !canEditPrice })}
        />

        <p className="text-xs text-medium-roast">
          Press Save Changes to apply. These settings are shared by every device in the store.
        </p>
      </div>
    </div>
  );
}

// ==================== EXPENSE CATEGORIES VIEW ====================
function ExpenseCategoriesView({ language, state, actions }) {
  const { expenseCategories, expenses } = state;
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  
  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingCategory) { actions.updateExpenseCategory(editingCategory.id, { name: formData.name.trim() }); }
    else { actions.addExpenseCategory({ name: formData.name.trim() }); }
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '' });
  };
  
  const handleDelete = async (cat) => {
    const count = expenses.filter(e => e.categoryId === cat.id).length;
    const ok = await confirm({
      title: t('deleteExpenseCategory', language),
      message: count > 0
        ? `${t('confirmDelete', language)} ${t('deleteExpenseCategoryWarning', language)} (${count} ${t('expensesInCategory', language)})`
        : t('confirmDelete', language),
      confirmLabel: t('delete', language),
      danger: true,
    });
    if (ok) actions.deleteExpenseCategory(cat.id);
  };
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast flex items-center gap-2 sm:gap-3 min-w-0">
          <Tags className="w-7 h-7" />
          {t('expenseCategories', language)}
        </h1>
        <button onClick={() => { setEditingCategory(null); setFormData({ name: '' }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90">
          <Plus className="w-5 h-5" /> {t('addExpenseCategory', language)}
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {expenseCategories.map(cat => {
          const catExpenses = expenses.filter(e => e.categoryId === cat.id);
          const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);
          return (
            <div key={cat.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-error" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingCategory(cat); setFormData({ name: cat.name }); setShowModal(true); }} className="p-1.5 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(cat)} className="p-1.5 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-dark-roast">{cat.name}</h3>
              <p className="text-sm text-medium-roast">{catExpenses.length} {t('expensesInCategory', language)}</p>
              <p className="text-sm font-mono font-semibold text-error mt-1">{formatPrice(catTotal)}</p>
            </div>
          );
        })}
      </div>
      
      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-display font-bold mb-6">{editingCategory ? t('editExpenseCategory', language) : t('addExpenseCategory', language)}</h2>
            <div>
              <label className="block text-sm font-medium text-medium-roast mb-2">{t('categoryName', language)}</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" autoFocus />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-latte/10 rounded-xl font-medium">{t('cancel', language)}</button>
              <button onClick={handleSubmit} disabled={!formData.name.trim()} className="flex-1 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50">{t('save', language)}</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// Helper: timestamp -> value usable by <input type="datetime-local">
function toDatetimeLocal(timestamp) {
  const d = new Date(timestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ==================== EXPENSES VIEW ====================
function ExpensesView({ language, state, actions }) {
  const { expenses, expenseCategories } = state;
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRange, setFilterRange] = useState('month');
  const [formData, setFormData] = useState({ description: '', categoryId: '', amount: '', date: toDatetimeLocal(Date.now()) });
  
  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({ description: '', categoryId: expenseCategories[0]?.id || '', amount: '', date: toDatetimeLocal(Date.now()) });
    setShowModal(true);
  };
  
  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description || '',
      categoryId: expense.categoryId,
      amount: (expense.amount / 100).toString(),
      date: toDatetimeLocal(expense.date),
    });
    setShowModal(true);
  };
  
  const handleSubmit = () => {
    const amountInCents = Math.round(parseFloat(formData.amount) * 100);
    if (!formData.categoryId || !amountInCents || amountInCents <= 0 || !formData.date) return;
    const payload = {
      description: formData.description.trim(),
      categoryId: formData.categoryId,
      amount: amountInCents,
      date: new Date(formData.date).getTime(),
    };
    if (editingExpense) { actions.updateExpense(editingExpense.id, payload); }
    else { actions.addExpense(payload); }
    setShowModal(false);
    setEditingExpense(null);
  };
  
  const handleDelete = async (expense) => {
    const ok = await confirm({
      title: t('deleteExpense', language),
      message: t('confirmDelete', language),
      confirmLabel: t('delete', language),
      danger: true,
    });
    if (ok) actions.deleteExpense(expense.id);
  };
  
  const getRangeStart = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = 24 * 60 * 60 * 1000;
    if (filterRange === 'today') return startOfToday;
    if (filterRange === 'week') return startOfToday - 6 * day;
    if (filterRange === 'month') return startOfToday - 29 * day;
    return 0; // all
  };
  
  const rangeStart = getRangeStart();
  const categoryName = (id) => expenseCategories.find(c => c.id === id)?.name || '—';
  
  const filteredExpenses = expenses
    .filter(e => (filterCategory === 'all' || e.categoryId === filterCategory) && e.date >= rangeStart)
    .sort((a, b) => b.date - a.date);
  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast flex items-center gap-2 sm:gap-3 min-w-0">
          <Wallet className="w-7 h-7" />
          {t('expenses', language)}
        </h1>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90">
          <Plus className="w-5 h-5" /> {t('addExpense', language)}
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent">
            <option value="all">All Categories</option>
            {expenseCategories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'today', label: t('today', language) },
              { id: 'week', label: t('last7Days', language) },
              { id: 'month', label: t('last30Days', language) },
              { id: 'all', label: 'All' },
            ].map(opt => (
              <button key={opt.id} onClick={() => setFilterRange(opt.id)} className={`px-4 py-2 rounded-xl font-medium ${filterRange === opt.id ? 'bg-espresso text-white' : 'bg-cream'}`}>{opt.label}</button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-medium-roast mb-1">{t('totalExpenses', language)}</p>
          <p className="text-2xl font-mono font-bold text-error">{formatPrice(filteredTotal)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-medium-roast mb-1">{t('expenses', language)}</p>
          <p className="text-2xl font-mono font-bold text-espresso">{filteredExpenses.length}</p>
        </div>
      </div>
      
      {/* Expense list — cards on phones, table from sm up */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm">
          <p className="text-medium-roast text-center py-12">{t('noExpenses', language)}</p>
        </div>
      ) : (
        <>
          <div className="sm:hidden space-y-3">
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error">
                      {categoryName(expense.categoryId)}
                    </span>
                    <p className="mt-1.5 font-medium text-dark-roast break-words">{expense.description || '—'}</p>
                    {expense.createdBy && <p className="text-xs text-latte break-words">{expense.createdBy}</p>}
                  </div>
                  <span className="font-mono font-semibold text-error shrink-0 text-right">{formatPrice(expense.amount)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-latte/10 flex items-center justify-between gap-2">
                  <span className="text-xs text-medium-roast">
                    {new Date(expense.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <span className="text-latte"> · </span>
                    {new Date(expense.date).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditModal(expense)} aria-label="Edit expense" className="p-2 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4 text-medium-roast" /></button>
                    <button onClick={() => handleDelete(expense)} aria-label="Delete expense" className="p-2 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream">
                  <tr>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold">{t('expenseDate', language)}</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold">{t('expenseCategory', language)}</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold">{t('expenseDescription', language)}</th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold">{t('expenseAmount', language)}</th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(expense => (
                    <tr key={expense.id} className="border-t border-latte/10 hover:bg-cream/50">
                      <td className="px-4 lg:px-6 py-4 text-sm text-medium-roast whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="text-latte"> · </span>
                        {new Date(expense.date).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 lg:px-6 py-4"><span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-error/10 text-error whitespace-nowrap">{categoryName(expense.categoryId)}</span></td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className="font-medium break-words">{expense.description || '—'}</span>
                        {expense.createdBy && <span className="text-xs text-latte block break-words">{expense.createdBy}</span>}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right font-mono font-semibold text-error whitespace-nowrap">{formatPrice(expense.amount)}</td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(expense)} aria-label="Edit expense" className="p-2 hover:bg-latte/20 rounded-lg"><Edit className="w-4 h-4 text-medium-roast" /></button>
                          <button onClick={() => handleDelete(expense)} aria-label="Delete expense" className="p-2 hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4 text-error" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {/* Add/Edit Expense Modal */}
      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-display font-bold mb-6">{editingExpense ? t('editExpense', language) : t('addExpense', language)}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">{t('expenseCategory', language)} *</label>
                <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent">
                  {expenseCategories.length === 0 && <option value="">{t('noData', language)}</option>}
                  {expenseCategories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">{t('expenseDescription', language)}</label>
                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. Rice & cooking oil" className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2">{t('expenseAmount', language)} (RM) *</label>
                <input type="number" step="0.01" min="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-medium-roast mb-2 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> {t('expenseDate', language)} *
                </label>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-latte/10 rounded-xl font-medium">{t('cancel', language)}</button>
              <button
                onClick={handleSubmit}
                disabled={!formData.categoryId || !(parseFloat(formData.amount) > 0) || !formData.date}
                className="flex-1 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50"
              >
                {t('save', language)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ==================== PROFIT & LOSS VIEW ====================
function ProfitLossView({ language, state }) {
  const { orderHistory, expenses } = state;
  const [dateRange, setDateRange] = useState('30d');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  
  const DAY = 24 * 60 * 60 * 1000;
  const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  };
  
  // Inclusive [start, end) range in ms for the selected period
  const getRange = () => {
    const today = startOfToday();
    if (dateRange === 'today') return [today, Date.now() + 1];
    if (dateRange === 'yesterday') return [today - DAY, today];
    if (dateRange === '7d') return [today - 6 * DAY, Date.now() + 1];
    if (dateRange === '30d') return [today - 29 * DAY, Date.now() + 1];
    if (dateRange === 'custom' && customRange.from && customRange.to) {
      const from = new Date(customRange.from + 'T00:00:00').getTime();
      const to = new Date(customRange.to + 'T23:59:59').getTime() + 1;
      return [from, to];
    }
    return [today, Date.now() + 1];
  };
  
  const [rangeStart, rangeEnd] = getRange();
  
  const paidOrders = orderHistory.filter(o => o.status === 'paid' && o.paidAt >= rangeStart && o.paidAt < rangeEnd);
  const rangeExpenses = expenses.filter(e => e.date >= rangeStart && e.date < rangeEnd);
  
  const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalExpenses = rangeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const net = totalSales - totalExpenses;
  const margin = totalSales > 0 ? (net / totalSales) * 100 : null;
  
  // Daily buckets across the range (capped so huge custom ranges stay readable)
  const dayKeys = [];
  const firstDay = new Date(rangeStart);
  firstDay.setHours(0, 0, 0, 0);
  for (let ts = firstDay.getTime(); ts < rangeEnd && dayKeys.length < 92; ts += DAY) {
    dayKeys.push(ts);
  }
  
  const daily = dayKeys.map(dayStart => {
    const dayEnd = dayStart + DAY;
    const sales = paidOrders.filter(o => o.paidAt >= dayStart && o.paidAt < dayEnd).reduce((s, o) => s + o.total, 0);
    const dayExpenses = rangeExpenses.filter(e => e.date >= dayStart && e.date < dayEnd).reduce((s, e) => s + e.amount, 0);
    return { dayStart, sales, expenses: dayExpenses };
  });
  
  const maxDaily = Math.max(...daily.map(d => Math.max(d.sales, d.expenses)), 1);
  
  // Expenses grouped by category
  const byCategory = state.expenseCategories
    .map(cat => ({
      name: cat.name,
      total: rangeExpenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCategory = Math.max(...byCategory.map(c => c.total), 1);
  
  // Insights
  const bestSalesDay = daily.reduce((best, d) => (d.sales > (best?.sales || 0) ? d : best), null);
  const worstExpenseDay = daily.reduce((worst, d) => (d.expenses > (worst?.expenses || 0) ? d : worst), null);
  
  const formatDay = (ts) => new Date(ts).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
  
  const ranges = [
    { id: 'today', label: t('today', language) },
    { id: 'yesterday', label: t('yesterday', language) },
    { id: '7d', label: t('last7Days', language) },
    { id: '30d', label: t('last30Days', language) },
    { id: 'custom', label: t('customRange', language) },
  ];
  
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-dark-roast flex items-center gap-2 sm:gap-3 min-w-0">
          <TrendingDown className="w-7 h-7" />
          {t('profitAndLoss', language)}
        </h1>
      </div>
      
      {/* Date range selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {ranges.map(opt => (
            <button key={opt.id} onClick={() => setDateRange(opt.id)} className={`px-4 py-2 rounded-xl font-medium ${dateRange === opt.id ? 'bg-accent text-white' : 'bg-cream'}`}>{opt.label}</button>
          ))}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} className="px-3 py-2 bg-cream border border-latte/30 rounded-lg" />
              <span className="text-medium-roast text-sm">to</span>
              <input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} className="px-3 py-2 bg-cream border border-latte/30 rounded-lg" />
            </div>
          )}
        </div>
      </div>
      
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-medium-roast mb-1">{t('totalSales', language)}</p>
          <p className="text-2xl font-mono font-bold text-success">{formatPrice(totalSales)}</p>
          <p className="text-xs text-medium-roast mt-1">{paidOrders.length} {t('totalOrders', language).toLowerCase()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-medium-roast mb-1">{t('totalExpenses', language)}</p>
          <p className="text-2xl font-mono font-bold text-error">{formatPrice(totalExpenses)}</p>
          <p className="text-xs text-medium-roast mt-1">{rangeExpenses.length} {t('expensesInCategory', language)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-medium-roast mb-1">{net >= 0 ? t('netProfit', language) : t('netLoss', language)}</p>
          <p className={`text-2xl font-mono font-bold ${net >= 0 ? 'text-success' : 'text-error'}`}>
            {net >= 0 ? '+' : '−'}{formatPrice(Math.abs(net))}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-medium-roast mb-1">{t('profitMargin', language)}</p>
          <p className="text-2xl font-mono font-bold text-espresso">{margin === null ? '—' : `${margin.toFixed(1)}%`}</p>
        </div>
      </div>
      
      {/* Insights */}
      {(bestSalesDay?.sales > 0 || worstExpenseDay?.expenses > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {bestSalesDay?.sales > 0 && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-success shrink-0" />
              <p className="text-sm text-dark-roast">
                <span className="font-semibold">{t('bestSalesDay', language)}:</span>{' '}
                {formatDay(bestSalesDay.dayStart)} · <span className="font-mono font-semibold">{formatPrice(bestSalesDay.sales)}</span>
              </p>
            </div>
          )}
          {worstExpenseDay?.expenses > 0 && (
            <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-error shrink-0" />
              <p className="text-sm text-dark-roast">
                <span className="font-semibold">{t('highestExpenseDay', language)}:</span>{' '}
                {formatDay(worstExpenseDay.dayStart)} · <span className="font-mono font-semibold">{formatPrice(worstExpenseDay.expenses)}</span>
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales vs Expenses per day */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-dark-roast">{t('salesVsExpenses', language)}</h2>
            <div className="flex items-center gap-3 text-xs text-medium-roast">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" /> {t('salesLegend', language)}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-error inline-block" /> {t('expensesLegend', language)}</span>
            </div>
          </div>
          {totalSales === 0 && totalExpenses === 0 ? (
            <p className="text-medium-roast text-center py-12">{t('noData', language)}</p>
          ) : (
            <>
            <div className="h-52 flex items-end gap-1 overflow-x-auto scroll-smooth">
              {daily.map((d, index) => (
                <div key={d.dayStart} className="flex-1 min-w-[14px] flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-0.5 h-40">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.sales / maxDaily) * 100}%` }}
                      transition={{ delay: index * 0.02 }}
                      className="w-1/2 max-w-[14px] bg-accent rounded-t-sm min-h-[2px]"
                      title={`${formatDay(d.dayStart)} — ${t('salesLegend', language)}: ${formatPrice(d.sales)}`}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.expenses / maxDaily) * 100}%` }}
                      transition={{ delay: index * 0.02 }}
                      className="w-1/2 max-w-[14px] bg-error rounded-t-sm min-h-[2px]"
                      title={`${formatDay(d.dayStart)} — ${t('expensesLegend', language)}: ${formatPrice(d.expenses)}`}
                    />
                  </div>
                  {daily.length <= 15 && (
                    <span className="text-[9px] text-medium-roast whitespace-nowrap">{formatDay(d.dayStart)}</span>
                  )}
                </div>
              ))}
            </div>
            {daily.length > 15 && (
              <p className="sm:hidden mt-2 text-[11px] text-medium-roast text-center">
                Swipe the chart sideways to see all {daily.length} days →
              </p>
            )}
            </>
          )}
        </div>
        
        {/* Expenses by category */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
          <h2 className="font-semibold text-dark-roast mb-4">{t('expensesByCategory', language)}</h2>
          {byCategory.length === 0 ? (
            <p className="text-medium-roast text-center py-12">{t('noData', language)}</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map(cat => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-dark-roast">{cat.name}</span>
                    <span className="font-mono font-semibold text-error">{formatPrice(cat.total)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-cream rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(cat.total / maxCategory) * 100}%` }}
                      className="h-full bg-error/80 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-medium-roast mt-0.5">{totalExpenses > 0 ? ((cat.total / totalExpenses) * 100).toFixed(1) : 0}% of {t('totalExpenses', language).toLowerCase()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatPrice(cents) {
  return `RM ${(cents / 100).toFixed(2)}`;
}
