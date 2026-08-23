import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  menuItems as initialMenuItems,
  categories as initialCategories,
  initialTables,
  discountPresets,
  defaultDeliveryChannels,
  TAX_RATE,
  MENU_DATA_VERSION
} from '../data/menuData';
import {
  generateOrderId,
  calculateSubtotal,
  calculateTax,
  calculateDiscount,
  calculateTotal,
  generateItemId,
  saveToStorage,
  loadFromStorage
} from '../utils/helpers';
import { cloudAuth, cloudOrders, buildAppUser, isCloudEnabled } from '../services/cloud';
import {
  loadStoreSettings,
  saveStoreSettings,
  STORE_SETTINGS_STORAGE_KEY,
} from '../data/storeSettings';

const AppContext = createContext(null);

// Action types
const ACTIONS = {
  // Auth
  LOGIN: 'LOGIN',
  CLOUD_LOGIN: 'CLOUD_LOGIN',
  LOGOUT: 'LOGOUT',
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_TAX_SETTINGS: 'SET_TAX_SETTINGS',
  SET_SERVER_ORDER_VISIBILITY: 'SET_SERVER_ORDER_VISIBILITY',
  SET_SERVER_PRICE_ACCESS: 'SET_SERVER_PRICE_ACCESS',
  
  // Views
  SET_VIEW: 'SET_VIEW',
  
  // Menu & Categories
  SELECT_CATEGORY: 'SELECT_CATEGORY',
  ADD_CATEGORY: 'ADD_CATEGORY',
  UPDATE_CATEGORY: 'UPDATE_CATEGORY',
  DELETE_CATEGORY: 'DELETE_CATEGORY',
  ADD_MENU_ITEM: 'ADD_MENU_ITEM',
  UPDATE_MENU_ITEM: 'UPDATE_MENU_ITEM',
  DELETE_MENU_ITEM: 'DELETE_MENU_ITEM',
  TOGGLE_ITEM_AVAILABILITY: 'TOGGLE_ITEM_AVAILABILITY',
  
  // Tables
  SELECT_TABLE: 'SELECT_TABLE',
  ADD_TABLE: 'ADD_TABLE',
  UPDATE_TABLE: 'UPDATE_TABLE',
  DELETE_TABLE: 'DELETE_TABLE',
  UPDATE_TABLE_STATUS: 'UPDATE_TABLE_STATUS',
  TRANSFER_TABLE: 'TRANSFER_TABLE',

  // Food-delivery services (Grab / foodpanda / Shopee Food / …)
  SELECT_DELIVERY_CHANNEL: 'SELECT_DELIVERY_CHANNEL',
  ADD_DELIVERY_CHANNEL: 'ADD_DELIVERY_CHANNEL',
  UPDATE_DELIVERY_CHANNEL: 'UPDATE_DELIVERY_CHANNEL',
  DELETE_DELIVERY_CHANNEL: 'DELETE_DELIVERY_CHANNEL',
  
  // Users (Admin)
  ADD_USER: 'ADD_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  
  // Expenses (Admin & Manager)
  ADD_EXPENSE_CATEGORY: 'ADD_EXPENSE_CATEGORY',
  UPDATE_EXPENSE_CATEGORY: 'UPDATE_EXPENSE_CATEGORY',
  DELETE_EXPENSE_CATEGORY: 'DELETE_EXPENSE_CATEGORY',
  ADD_EXPENSE: 'ADD_EXPENSE',
  UPDATE_EXPENSE: 'UPDATE_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
  
  // Orders
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_ORDER: 'CLEAR_ORDER',
  APPLY_DISCOUNT: 'APPLY_DISCOUNT',
  REMOVE_DISCOUNT: 'REMOVE_DISCOUNT',
  UPDATE_ORDER_NOTES: 'UPDATE_ORDER_NOTES',
  HOLD_ORDER: 'HOLD_ORDER',
  RECALL_ORDER: 'RECALL_ORDER',
  SET_OPEN_ORDERS: 'SET_OPEN_ORDERS',
  SUBMIT_ORDER: 'SUBMIT_ORDER',
  EDIT_OPEN_ORDER: 'EDIT_OPEN_ORDER',
  CANCEL_OPEN_ORDER: 'CANCEL_OPEN_ORDER',
  PROCESS_PAYMENT: 'PROCESS_PAYMENT',
  VOID_ORDER: 'VOID_ORDER',
  
  // Modals
  SET_PAYMENT_MODAL: 'SET_PAYMENT_MODAL',
  SET_MODIFIER_MODAL: 'SET_MODIFIER_MODAL',
  
  // UI
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  SET_NETWORK_STATUS: 'SET_NETWORK_STATUS',
  
  // Data
  LOAD_SAVED_STATE: 'LOAD_SAVED_STATE',
  IMPORT_BACKUP: 'IMPORT_BACKUP',
};

// localStorage key holding the signed-in user. Only the user id is stored; the full
// user record is always re-resolved against the persisted users list.
export const SESSION_STORAGE_KEY = 'cafe-pos-session';

// localStorage key holding the signed-in cloud (Supabase) session: the auth user
// id + the selected store id. Re-validated against the backend on load.
export const CLOUD_SESSION_STORAGE_KEY = 'cafe-pos-session-cloud';

// Initial users (staff). One account per role so every permission path can be
// tried on a fresh install; the owner renames these and adds their real staff
// in Admin > Users. Keep the admin account here or a new store cannot log in.
const defaultUsers = [
  { id: 'admin-1', name: 'Admin User', role: 'admin', pin: '1234', active: true },
  { id: 'manager-1', name: 'Manager', role: 'manager', pin: '5555', active: true },
  { id: 'server-1', name: 'Server', role: 'server', pin: '1111', active: true },
];

// Initial expense categories (business costs, separate from menu categories).
// A short starter set; the owner adds their own in Admin > Expenses.
const defaultExpenseCategories = [
  { id: 'exp-cat-rent', name: 'Rent' },
  { id: 'exp-cat-salaries', name: 'Salaries' },
  { id: 'exp-cat-ingredients', name: 'Ingredients & Supplies' },
  { id: 'exp-cat-utilities', name: 'Utilities' },
  { id: 'exp-cat-other', name: 'Other' },
];

// Initial state
// Store settings live in their own localStorage key (see data/storeSettings.js);
// read them once at boot so order math starts with the admin's tax configuration.
const initialStoreSettings = loadStoreSettings();

const initialState = {
  // Auth
  currentUser: null,
  isLoggedIn: false,
  language: 'en',
  // Set when the signed-in user came through the cloud/Supabase path. Holds
  // { userId, storeId } so logout and refresh-restore know which backend to use.
  cloudSession: null,
  
  // View
  view: 'pos', // 'pos' | 'tables' | 'reports' | 'admin'
  
  // Menu
  menuDataVersion: MENU_DATA_VERSION,
  // The POS opens on the first *default* category (starred by an Admin or
  // Manager in Category Management) so its items are on screen right away.
  selectedCategory:
    initialCategories.find(category => category.isDefault)?.id ||
    initialCategories[0]?.id ||
    'rice',
  categories: initialCategories,
  menuItems: initialMenuItems,
  discountPresets,
  // Tax comes from the store settings (Admin → Settings). `taxEnabled: false`
  // switches tax off completely: orders are charged subtotal − discount only
  // and no tax line is shown anywhere.
  taxRate: initialStoreSettings.taxRate ?? TAX_RATE,
  taxEnabled: initialStoreSettings.taxEnabled !== false,
  // Admin/Manager setting. It defaults to showing every open order; when off,
  // servers only receive orders created by their own account.
  serverCanViewAllOrders: initialStoreSettings.serverCanViewAllOrders !== false,
  // Admin/Manager setting. Off by default: servers charge the menu price
  // unless the store explicitly lets them override it. Never restricts
  // Admins or Managers, who can always adjust a line price.
  serverCanEditPrice: initialStoreSettings.serverCanEditPrice === true,
  
  // Tables. The counter represents a walk-in customer and is selected by
  // default, so a server can start a walk-in order immediately.
  selectedTable: initialTables.find(table => table.isCounter) || null,
  tables: initialTables,
  // Food-delivery services (manager/admin configured). Selecting one points the
  // current order at that channel instead of a table; the counter "table" is
  // still used underneath so nothing structural changes for an order.
  deliveryChannels: defaultDeliveryChannels,
  selectedDeliveryChannel: null,
  
  // Users
  users: defaultUsers,
  
  // Expenses
  expenseCategories: defaultExpenseCategories,
  expenses: [],
  
  // Orders
  currentOrder: null,
  // Submitted, unpaid orders. Unlike currentOrder (the draft on this device),
  // these are visible on the management board and to permitted servers.
  openOrders: [],
  heldOrders: [],
  orderHistory: [],
  
  // UI
  isPaymentModalOpen: false,
  paymentMethod: null,
  isModifierModalOpen: false,
  selectedMenuItem: null,
  toasts: [],
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
};

// A previous release persisted categories but not their menu items. That could leave a
// browser with old café categories while showing the new Bangladesh menu. Only reuse a
// saved menu when both sides of the relationship were saved using the current schema.
function getPersistedState(savedState) {
  const hasCurrentMenuSchema =
    savedState?.menuDataVersion === MENU_DATA_VERSION &&
    Array.isArray(savedState.categories) &&
    Array.isArray(savedState.menuItems) &&
    savedState.menuItems.every(item =>
      savedState.categories.some(category => category.id === item.categoryId)
    );

  const categories = hasCurrentMenuSchema ? savedState.categories : initialCategories;
  const menuItems = hasCurrentMenuSchema ? savedState.menuItems : initialMenuItems;
  const categoryIds = new Set(categories.map(category => category.id));
  // Default categories (starred in Admin/Manager → Category Management) decide
  // what the POS opens on: the first starred category is selected so its items
  // are shown. With no starred category, keep the last selection when it still
  // exists, otherwise fall back to the first category.
  const defaultCategory = categories.find(category => category.isDefault);
  const selectedCategory = defaultCategory
    ? defaultCategory.id
    : categoryIds.has(savedState?.selectedCategory)
      ? savedState.selectedCategory
      : categories[0]?.id || null;

  return {
    tables: savedState?.tables || initialTables,
    // Array.isArray keeps an intentionally emptied list empty (a manager who
    // deleted every delivery service should not get the defaults back).
    deliveryChannels: Array.isArray(savedState?.deliveryChannels)
      ? savedState.deliveryChannels
      : defaultDeliveryChannels,
    orderHistory: savedState?.orderHistory || [],
    openOrders: savedState?.openOrders || [],
    heldOrders: savedState?.heldOrders || [],
    categories,
    menuItems,
    menuDataVersion: MENU_DATA_VERSION,
    selectedCategory,
    users: savedState?.users || defaultUsers,
    language: savedState?.language || 'en',
    expenseCategories: Array.isArray(savedState?.expenseCategories) && savedState.expenseCategories.length > 0
      ? savedState.expenseCategories
      : defaultExpenseCategories,
    expenses: savedState?.expenses || [],
  };
}

// The tax rate actually applied to an order: zero whenever the admin has
// turned tax off in Store Settings.
function effectiveTaxRate(state) {
  return state.taxEnabled === false ? 0 : (state.taxRate ?? TAX_RATE);
}

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    // Auth
    case ACTIONS.LOGIN:
      return {
        ...state,
        currentUser: action.payload,
        isLoggedIn: true,
        // Admins and managers land directly in the management panel; its default tab
        // is Dashboard. Servers go straight to the POS.
        view: action.payload.role === 'admin' || action.payload.role === 'manager' ? 'admin' : 'pos',
        currentOrder: null,
        selectedTable: state.tables.find(table => table.isCounter) || null,
        selectedDeliveryChannel: null,
      };
    
    case ACTIONS.LOGOUT:
      return {
        ...state,
        currentUser: null,
        isLoggedIn: false,
        view: 'pos',
        currentOrder: null,
        openOrders: state.currentUser?.cloud ? [] : state.openOrders,
        selectedTable: state.tables.find(table => table.isCounter) || null,
        selectedDeliveryChannel: null,
        cloudSession: null,
      };

    case ACTIONS.CLOUD_LOGIN:
      return {
        ...state,
        currentUser: action.payload.user,
        isLoggedIn: true,
        cloudSession: action.payload.session,
        // Same landing rule as PIN login: admins/managers go to the panel.
        view: action.payload.user.role === 'admin' || action.payload.user.role === 'manager'
          ? 'admin'
          : 'pos',
        currentOrder: null,
        // Never display orders cached from a different local/cloud store while
        // the tenant-scoped Supabase query is loading.
        openOrders: [],
        selectedTable: state.tables.find(table => table.isCounter) || null,
        selectedDeliveryChannel: null,
      };
    
    case ACTIONS.SET_LANGUAGE:
      return { ...state, language: action.payload };

    case ACTIONS.SET_SERVER_ORDER_VISIBILITY: {
      const canViewAll = action.payload !== false;
      return {
        ...state,
        serverCanViewAllOrders: canViewAll,
        // If access is switched off while a server is signed in, immediately
        // discard other servers' orders already held in client memory.
        openOrders: !canViewAll && state.currentUser?.role === 'server'
          ? state.openOrders.filter(order =>
              order.serverId === state.currentUser.id || order.createdBy === state.currentUser.id
            )
          : state.openOrders,
      };
    }

    case ACTIONS.SET_SERVER_PRICE_ACCESS:
      return { ...state, serverCanEditPrice: action.payload === true };

    // Keep order math in step with Admin → Settings → Tax & Currency.
    case ACTIONS.SET_TAX_SETTINGS: {
      const next = {
        ...state,
        taxRate: Number.isFinite(action.payload?.taxRate) ? action.payload.taxRate : state.taxRate,
        taxEnabled: action.payload?.taxEnabled !== false,
      };
      // Re-price the order in progress so the cart reflects the change at once.
      if (next.currentOrder) {
        const subtotal = next.currentOrder.subtotal || 0;
        const discountAmount = next.currentOrder.discountAmount || 0;
        const tax = calculateTax(subtotal - discountAmount, effectiveTaxRate(next));
        next.currentOrder = {
          ...next.currentOrder,
          tax,
          total: calculateTotal(subtotal, tax, discountAmount),
        };
      }
      return next;
    }
    
    // Views
    case ACTIONS.SET_VIEW:
      return { ...state, view: action.payload };
    
    // Menu & Categories
    case ACTIONS.SELECT_CATEGORY:
      return { ...state, selectedCategory: action.payload };
    
    case ACTIONS.ADD_CATEGORY: {
      const newCategory = {
        id: `cat-${Date.now()}`,
        isDefault: false,
        ...action.payload,
      };
      return { ...state, categories: [...state.categories, newCategory] };
    }
    
    case ACTIONS.UPDATE_CATEGORY: {
      const { id, updates } = action.payload;
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      };
    }
    
    case ACTIONS.DELETE_CATEGORY: {
      const categories = state.categories.filter(cat => cat.id !== action.payload);
      // When the selected tab disappears, reopen the first default category
      // (or the first remaining category when nothing is starred).
      const fallback = categories.find(cat => cat.isDefault) || categories[0];
      return {
        ...state,
        categories,
        menuItems: state.menuItems.filter(item => item.categoryId !== action.payload),
        selectedCategory: state.selectedCategory === action.payload
          ? fallback?.id || null
          : state.selectedCategory,
      };
    }
    
    case ACTIONS.ADD_MENU_ITEM: {
      const newItem = {
        id: `item-${Date.now()}`,
        categoryId: action.payload.categoryId,
        ...action.payload,
      };
      return { ...state, menuItems: [...state.menuItems, newItem] };
    }
    
    case ACTIONS.UPDATE_MENU_ITEM: {
      const { id, updates } = action.payload;
      return {
        ...state,
        menuItems: state.menuItems.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      };
    }
    
    case ACTIONS.DELETE_MENU_ITEM:
      return {
        ...state,
        menuItems: state.menuItems.filter(item => item.id !== action.payload),
      };
    
    case ACTIONS.TOGGLE_ITEM_AVAILABILITY: {
      const item = state.menuItems.find(i => i.id === action.payload);
      if (!item) return state;
      return {
        ...state,
        menuItems: state.menuItems.map(i =>
          i.id === action.payload ? { ...i, available: !i.available } : i
        ),
      };
    }
    
    // Tables
    case ACTIONS.SELECT_TABLE: {
      const table = action.payload || state.tables.find(item => item.isCounter) || null;
      return {
        ...state,
        selectedTable: table,
        // Picking a table (or walk-in) leaves delivery mode — an order is
        // either for a seat in the house or for a delivery channel.
        selectedDeliveryChannel: null,
        // The table is chosen before items are submitted. If a draft already
        // has items, keep its table reference in step with the selector.
        currentOrder: state.currentOrder
          ? { ...state.currentOrder, tableId: table?.id || 'COUNTER', deliveryChannel: null }
          : null,
      };
    }

    // Food-delivery services
    case ACTIONS.SELECT_DELIVERY_CHANNEL: {
      const channel = action.payload || null;
      return {
        ...state,
        selectedDeliveryChannel: channel,
        // A delivery order has no seat: park it on the walk-in counter table.
        selectedTable: channel
          ? state.tables.find(table => table.isCounter) || null
          : state.selectedTable,
        currentOrder: state.currentOrder && channel
          ? { ...state.currentOrder, tableId: 'COUNTER', deliveryChannel: { ...channel } }
          : state.currentOrder,
      };
    }

    case ACTIONS.ADD_DELIVERY_CHANNEL: {
      const newChannel = {
        id: `dl-${Date.now()}`,
        active: true,
        ...action.payload,
      };
      return { ...state, deliveryChannels: [...state.deliveryChannels, newChannel] };
    }

    case ACTIONS.UPDATE_DELIVERY_CHANNEL: {
      const { id, updates } = action.payload;
      // Keep an in-progress selection in step with edits (e.g. rename).
      const selectedStillCurrent = state.selectedDeliveryChannel?.id === id;
      const deliveryChannels = state.deliveryChannels.map(channel =>
        channel.id === id ? { ...channel, ...updates } : channel
      );
      return {
        ...state,
        deliveryChannels,
        selectedDeliveryChannel: selectedStillCurrent
          ? deliveryChannels.find(channel => channel.id === id)
          : state.selectedDeliveryChannel,
      };
    }

    case ACTIONS.DELETE_DELIVERY_CHANNEL:
      return {
        ...state,
        deliveryChannels: state.deliveryChannels.filter(channel => channel.id !== action.payload),
        selectedDeliveryChannel: state.selectedDeliveryChannel?.id === action.payload
          ? null
          : state.selectedDeliveryChannel,
      };
    
    case ACTIONS.ADD_TABLE: {
      const maxNumber = Math.max(...state.tables.filter(t => !t.isCounter).map(t => t.number), 0);
      const newTable = {
        id: `T${Date.now()}`,
        number: parseInt(action.payload.number) || maxNumber + 1,
        capacity: action.payload.capacity || 4,
        status: 'available',
        position: { x: 0, y: 0 },
      };
      return { ...state, tables: [...state.tables, newTable] };
    }
    
    case ACTIONS.UPDATE_TABLE: {
      const { id, updates } = action.payload;
      return {
        ...state,
        tables: state.tables.map(table =>
          table.id === id ? { ...table, ...updates } : table
        ),
      };
    }
    
    case ACTIONS.DELETE_TABLE:
      return {
        ...state,
        tables: state.tables.filter(table => table.id !== action.payload),
      };
    
    case ACTIONS.UPDATE_TABLE_STATUS: {
      const { tableId, status } = action.payload;
      const newTables = state.tables.map(table =>
        table.id === tableId
          ? { ...table, status, currentOrderId: status === 'occupied' ? state.currentOrder?.id : null }
          : table
      );
      return { ...state, tables: newTables };
    }
    
    case ACTIONS.TRANSFER_TABLE: {
      const { fromTableId, toTableId } = action.payload;
      const fromTable = state.tables.find(t => t.id === fromTableId);
      const toTable = state.tables.find(t => t.id === toTableId);
      if (!fromTable || !toTable || fromTableId === toTableId) return state;
      
      // Resolve the order id attached to the source table
      const orderId =
        fromTable.currentOrderId ||
        (state.currentOrder?.tableId === fromTableId ? state.currentOrder.id : null) ||
        state.heldOrders.find(o => o.tableId === fromTableId)?.id ||
        null;
      
      const newTables = state.tables.map(table => {
        if (table.id === fromTableId) return { ...table, status: 'available', currentOrderId: null };
        if (table.id === toTableId) return { ...table, status: 'occupied', currentOrderId: orderId };
        return table;
      });
      
      // If the currently active order belongs to the source table, move it along
      let currentOrder = state.currentOrder;
      let selectedTable = state.selectedTable;
      if (currentOrder && currentOrder.tableId === fromTableId) {
        currentOrder = { ...currentOrder, tableId: toTableId };
        selectedTable = newTables.find(t => t.id === toTableId) || null;
      }
      
      // Move any held orders parked at the source table too
      const heldOrders = state.heldOrders.map(o =>
        o.tableId === fromTableId ? { ...o, tableId: toTableId } : o
      );
      
      return { ...state, tables: newTables, currentOrder, selectedTable, heldOrders };
    }
    
    // Users
    case ACTIONS.ADD_USER: {
      const newUser = {
        id: `user-${Date.now()}`,
        ...action.payload,
        active: true,
      };
      return { ...state, users: [...state.users, newUser] };
    }
    
    case ACTIONS.UPDATE_USER: {
      const { id, updates } = action.payload;
      return {
        ...state,
        users: state.users.map(user =>
          user.id === id ? { ...user, ...updates } : user
        ),
      };
    }
    
    case ACTIONS.DELETE_USER:
      return {
        ...state,
        users: state.users.filter(user => user.id !== action.payload),
      };
    
    // Expenses
    case ACTIONS.ADD_EXPENSE_CATEGORY: {
      const newExpenseCategory = {
        id: `exp-cat-${Date.now()}`,
        ...action.payload,
      };
      return { ...state, expenseCategories: [...state.expenseCategories, newExpenseCategory] };
    }
    
    case ACTIONS.UPDATE_EXPENSE_CATEGORY: {
      const { id, updates } = action.payload;
      return {
        ...state,
        expenseCategories: state.expenseCategories.map(cat =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      };
    }
    
    case ACTIONS.DELETE_EXPENSE_CATEGORY: {
      // Deleting a category also removes every expense recorded inside it
      // (the UI confirms this before dispatching).
      return {
        ...state,
        expenseCategories: state.expenseCategories.filter(cat => cat.id !== action.payload),
        expenses: state.expenses.filter(expense => expense.categoryId !== action.payload),
      };
    }
    
    case ACTIONS.ADD_EXPENSE: {
      const newExpense = {
        id: `exp-${Date.now()}`,
        ...action.payload,
        createdBy: action.payload.createdBy || state.currentUser?.name,
        createdAt: Date.now(),
      };
      return { ...state, expenses: [newExpense, ...state.expenses] };
    }
    
    case ACTIONS.UPDATE_EXPENSE: {
      const { id, updates } = action.payload;
      return {
        ...state,
        expenses: state.expenses.map(expense =>
          expense.id === id ? { ...expense, ...updates } : expense
        ),
      };
    }
    
    case ACTIONS.DELETE_EXPENSE:
      return {
        ...state,
        expenses: state.expenses.filter(expense => expense.id !== action.payload),
      };
    
    // Orders
    case ACTIONS.ADD_ITEM: {
      const { menuItem, selectedModifiers, quantity = 1, specialInstructions = '' } = action.payload;
      
      const existingIndex = state.currentOrder?.items.findIndex(
        item => item.menuItemId === menuItem.id &&
        JSON.stringify(item.modifiers) === JSON.stringify(selectedModifiers || []) &&
        item.specialInstructions === specialInstructions &&
        // A line whose price was overridden must not silently absorb a newly
        // added one at menu price — that would give away the discount twice.
        item.price === menuItem.price
      );
      
      let newItems;
      if (existingIndex !== -1 && existingIndex !== undefined) {
        newItems = state.currentOrder.items.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem = {
          id: generateItemId(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          modifiers: selectedModifiers || [],
          specialInstructions,
        };
        newItems = [...(state.currentOrder?.items || []), newItem];
      }
      
      const subtotal = calculateSubtotal(newItems);
      const discountAmount = calculateDiscount(subtotal, state.currentOrder?.discount);
      const tax = calculateTax(subtotal - discountAmount, effectiveTaxRate(state));
      const total = calculateTotal(subtotal, tax, discountAmount);
      
      return {
        ...state,
        currentOrder: {
          ...(state.currentOrder || { 
            id: generateOrderId(), 
            items: [], 
            status: 'open',
            createdAt: Date.now(),
            // A delivery order (Grab/foodpanda/…) rides on the counter table but
            // carries its channel so boards, receipts and reports can label it.
            tableId: state.selectedDeliveryChannel
              ? 'COUNTER'
              : state.selectedTable?.id || 'COUNTER',
            deliveryChannel: state.selectedDeliveryChannel
              ? { ...state.selectedDeliveryChannel }
              : null,
            serverId: state.currentUser?.id,
            serverName: state.currentUser?.name,
          }),
          items: newItems,
          subtotal,
          tax,
          discount: state.currentOrder?.discount || null,
          discountAmount,
          total,
        },
      };
    }
    
    case ACTIONS.UPDATE_ITEM: {
      const { itemId, updates } = action.payload;
      const newItems = state.currentOrder.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      
      const subtotal = calculateSubtotal(newItems);
      const discountAmount = calculateDiscount(subtotal, state.currentOrder?.discount);
      const tax = calculateTax(subtotal - discountAmount, effectiveTaxRate(state));
      const total = calculateTotal(subtotal, tax, discountAmount);
      
      return {
        ...state,
        currentOrder: {
          ...state.currentOrder,
          items: newItems,
          subtotal,
          tax,
          discountAmount,
          total,
        },
      };
    }
    
    case ACTIONS.REMOVE_ITEM: {
      const newItems = state.currentOrder.items.filter(item => item.id !== action.payload);
      const subtotal = calculateSubtotal(newItems);
      const discountAmount = calculateDiscount(subtotal, state.currentOrder?.discount);
      const tax = calculateTax(subtotal - discountAmount, effectiveTaxRate(state));
      const total = calculateTotal(subtotal, tax, discountAmount);
      
      return {
        ...state,
        currentOrder: newItems.length > 0 || state.currentOrder.isEditing
          ? { ...state.currentOrder, items: newItems, subtotal, tax, discountAmount, total }
          : null,
      };
    }
    
    case ACTIONS.CLEAR_ORDER:
      return {
        ...state,
        currentOrder: null,
      };
    
    case ACTIONS.APPLY_DISCOUNT: {
      const discount = action.payload;
      const subtotal = state.currentOrder.subtotal;
      const discountAmount = calculateDiscount(subtotal, discount);
      const tax = calculateTax(subtotal - discountAmount, effectiveTaxRate(state));
      const total = calculateTotal(subtotal, tax, discountAmount);
      
      return {
        ...state,
        currentOrder: {
          ...state.currentOrder,
          discount: { ...discount, amount: discountAmount },
          discountAmount,
          tax,
          total,
        },
      };
    }
    
    case ACTIONS.REMOVE_DISCOUNT: {
      const subtotal = state.currentOrder.subtotal;
      const tax = calculateTax(subtotal, effectiveTaxRate(state));
      const total = calculateTotal(subtotal, tax, 0);
      
      return {
        ...state,
        currentOrder: {
          ...state.currentOrder,
          discount: null,
          discountAmount: 0,
          tax,
          total,
        },
      };
    }
    
    case ACTIONS.UPDATE_ORDER_NOTES:
      return {
        ...state,
        currentOrder: state.currentOrder
          ? { ...state.currentOrder, notes: action.payload }
          : null,
      };

    case ACTIONS.SET_OPEN_ORDERS: {
      const openOrders = action.payload || [];
      const openByTable = new Map(
        openOrders
          .filter(order => order.tableId && order.tableId !== 'COUNTER')
          .map(order => [order.tableId, order.id])
      );
      return {
        ...state,
        openOrders,
        // Cloud/local order updates also keep the floor view current.
        tables: state.tables.map(table => {
          if (table.isCounter) return table;
          const orderId = openByTable.get(table.id);
          if (orderId) return { ...table, status: 'occupied', currentOrderId: orderId };
          // Only automatically clear tables that were tied to an order. Manual
          // reservations/cleaning states are never overwritten.
          if (table.status === 'occupied' && table.currentOrderId) {
            return { ...table, status: 'available', currentOrderId: null };
          }
          return table;
        }),
      };
    }

    case ACTIONS.SUBMIT_ORDER: {
      const submitted = { ...action.payload, status: 'open', isEditing: false };
      const exists = state.openOrders.some(order => order.id === submitted.id);
      const openOrders = exists
        ? state.openOrders.map(order => order.id === submitted.id ? submitted : order)
        : [...state.openOrders, submitted];
      return {
        ...state,
        openOrders,
        currentOrder: null,
        selectedTable: state.tables.find(table => table.isCounter) || null,
        selectedDeliveryChannel: null,
        tables: state.tables.map(table =>
          table.id === submitted.tableId && !table.isCounter
            ? { ...table, status: 'occupied', currentOrderId: submitted.id }
            : table
        ),
      };
    }

    case ACTIONS.EDIT_OPEN_ORDER: {
      const order = action.payload;
      const channel = order.deliveryChannel || null;
      return {
        ...state,
        currentOrder: { ...order, status: 'open', isEditing: true },
        selectedTable: channel
          ? state.tables.find(table => table.isCounter) || null
          : state.tables.find(table => table.id === order.tableId)
            || state.tables.find(table => table.isCounter)
            || null,
        selectedDeliveryChannel: channel,
        view: 'pos',
      };
    }

    case ACTIONS.CANCEL_OPEN_ORDER: {
      const cancelled = action.payload;
      const remaining = state.openOrders.filter(order => order.id !== cancelled.id);
      const anotherAtTable = remaining.some(order => order.tableId === cancelled.tableId);
      return {
        ...state,
        openOrders: remaining,
        currentOrder: state.currentOrder?.id === cancelled.id ? null : state.currentOrder,
        selectedTable: state.currentOrder?.id === cancelled.id
          ? state.tables.find(table => table.isCounter) || null
          : state.selectedTable,
        orderHistory: [
          { ...cancelled, status: 'voided', voidedAt: cancelled.voidedAt || Date.now() },
          ...state.orderHistory,
        ],
        tables: state.tables.map(table =>
          table.id === cancelled.tableId && !anotherAtTable
            ? { ...table, status: 'available', currentOrderId: null }
            : table
        ),
      };
    }
    
    case ACTIONS.HOLD_ORDER: {
      const heldOrder = {
        ...state.currentOrder,
        status: 'held',
        heldAt: Date.now(),
      };
      return {
        ...state,
        heldOrders: [...state.heldOrders, heldOrder],
        currentOrder: null,
        selectedTable: state.tables.find(table => table.isCounter) || null,
        selectedDeliveryChannel: null,
      };
    }
    
    case ACTIONS.RECALL_ORDER: {
      const orderToRecall = action.payload;
      const newHeldOrders = state.heldOrders.filter(o => o.id !== orderToRecall.id);
      const channel = orderToRecall.deliveryChannel || null;
      
      return {
        ...state,
        heldOrders: newHeldOrders,
        currentOrder: { ...orderToRecall, status: 'open' },
        selectedTable: channel
          ? state.tables.find(t => t.isCounter) || null
          : state.tables.find(t => t.id === orderToRecall.tableId) || null,
        selectedDeliveryChannel: channel,
        tables: state.tables.map(table =>
          table.id === orderToRecall.tableId && !table.isCounter
            ? { ...table, status: 'occupied', currentOrderId: orderToRecall.id }
            : table
        ),
      };
    }
    
    case ACTIONS.PROCESS_PAYMENT: {
      const { method, amountPaid, change } = action.payload;
      const completedOrder = {
        ...state.currentOrder,
        status: 'paid',
        paymentMethod: method,
        amountPaid,
        change,
        paidAt: Date.now(),
      };
      
      const newTables = state.tables.map(table =>
        table.id === state.currentOrder?.tableId && !table.isCounter
          ? { ...table, status: 'cleaning', currentOrderId: null }
          : table
      );
      
      return {
        ...state,
        currentOrder: null,
        openOrders: state.openOrders.filter(order => order.id !== completedOrder.id),
        selectedTable: state.tables.find(table => table.isCounter) || null,
        selectedDeliveryChannel: null,
        orderHistory: [completedOrder, ...state.orderHistory],
        tables: newTables,
        isPaymentModalOpen: false,
      };
    }
    
    case ACTIONS.VOID_ORDER: {
      const voidedOrder = {
        ...state.currentOrder,
        status: 'voided',
        voidedAt: Date.now(),
        voidedBy: state.currentUser?.name,
      };
      
      const newTables = state.tables.map(table =>
        table.id === state.currentOrder?.tableId
          ? { ...table, status: 'available', currentOrderId: null }
          : table
      );
      
      return {
        ...state,
        currentOrder: null,
        openOrders: state.openOrders.filter(order => order.id !== voidedOrder.id),
        selectedTable: state.tables.find(table => table.isCounter) || null,
        selectedDeliveryChannel: null,
        orderHistory: [voidedOrder, ...state.orderHistory],
        tables: newTables,
      };
    }
    
    // Modals
    case ACTIONS.SET_PAYMENT_MODAL:
      return {
        ...state,
        isPaymentModalOpen: action.payload.open,
        paymentMethod: action.payload.method || null,
      };
    
    case ACTIONS.SET_MODIFIER_MODAL: {
      const { open, menuItem } = action.payload;
      return {
        ...state,
        isModifierModalOpen: open,
        selectedMenuItem: menuItem || null,
      };
    }
    
    // UI
    case ACTIONS.ADD_TOAST: {
      const toast = {
        id: Date.now(),
        ...action.payload,
      };
      return { ...state, toasts: [...state.toasts, toast] };
    }
    
    case ACTIONS.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload),
      };

    case ACTIONS.SET_NETWORK_STATUS:
      return { ...state, isOffline: action.payload };
    
    // Data persistence (IMPORT_BACKUP is a full replace using the same shape)
    case ACTIONS.IMPORT_BACKUP:
    case ACTIONS.LOAD_SAVED_STATE: {
      const next = { ...state, ...action.payload };
      // Keep the signed-in user in step with the (possibly newer) users list coming
      // from storage: pick up renames/role changes, and sign out if the user was
      // deleted or deactivated on another tab.
      if (next.currentUser && !next.currentUser.cloud && Array.isArray(next.users)) {
        const fresh = next.users.find(u => u.id === next.currentUser.id);
        if (!fresh || fresh.active === false) {
          return { ...next, currentUser: null, isLoggedIn: false, view: 'pos', currentOrder: null };
        }
        next.currentUser = fresh;
      }
      return next;
    }
    
    default:
      return state;
  }
}

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Restore the on-device data, then restore the signed-in user. The session survives
  // a browser refresh: only the user id is stored, and it is re-checked against the
  // persisted users list (so a deleted/deactivated user cannot be restored).
  useEffect(() => {
    const savedState = loadFromStorage('cafe-pos-state', null);
    let restoredUsers = defaultUsers;
    if (savedState) {
      const persisted = getPersistedState(savedState);
      restoredUsers = Array.isArray(persisted.users) && persisted.users.length > 0
        ? persisted.users
        : defaultUsers;
      dispatch({ type: ACTIONS.LOAD_SAVED_STATE, payload: persisted });
    }

    const session = loadFromStorage(SESSION_STORAGE_KEY, null);
    if (session?.userId) {
      const user = restoredUsers.find(u => u.id === session.userId && u.active !== false);
      if (user) {
        dispatch({ type: ACTIONS.LOGIN, payload: user });
      } else {
        saveToStorage(SESSION_STORAGE_KEY, null);
      }
    }

    // Keep separate tabs on the same device in step. A shared server is still required
    // to synchronise data between different users/devices.
    const syncFromAnotherTab = (event) => {
      if (event.key === 'cafe-pos-state' && event.newValue) {
        try {
          dispatch({
            type: ACTIONS.LOAD_SAVED_STATE,
            payload: getPersistedState(JSON.parse(event.newValue)),
          });
        } catch {
          // Ignore corrupt storage written by an older browser session.
        }
        return;
      }

      // Tax configuration lives in its own key; mirror it too so a settings
      // change on one tab re-prices the cart on the others.
      if (event.key === STORE_SETTINGS_STORAGE_KEY) {
        const fresh = loadStoreSettings();
        dispatch({
          type: ACTIONS.SET_TAX_SETTINGS,
          payload: { taxRate: fresh.taxRate, taxEnabled: fresh.taxEnabled },
        });
        dispatch({
          type: ACTIONS.SET_SERVER_ORDER_VISIBILITY,
          payload: fresh.serverCanViewAllOrders,
        });
        dispatch({
          type: ACTIONS.SET_SERVER_PRICE_ACCESS,
          payload: fresh.serverCanEditPrice,
        });
        return;
      }

      // Mirror login/logout across tabs on this device.
      if (event.key === SESSION_STORAGE_KEY) {
        try {
          const sessionData = event.newValue ? JSON.parse(event.newValue) : null;
          if (!sessionData?.userId) {
            dispatch({ type: ACTIONS.LOGOUT });
            return;
          }
          const latestState = loadFromStorage('cafe-pos-state', null);
          const usersList = Array.isArray(latestState?.users) && latestState.users.length > 0
            ? latestState.users
            : defaultUsers;
          const user = usersList.find(u => u.id === sessionData.userId && u.active !== false);
          if (user) {
            dispatch({ type: ACTIONS.LOGIN, payload: user });
          }
        } catch {
          // Ignore corrupt session writes.
        }
      }
    };
    window.addEventListener('storage', syncFromAnotherTab);
    return () => window.removeEventListener('storage', syncFromAnotherTab);
  }, []);

  // Restore a cloud (Supabase/mock) session across a refresh. Only the auth user id
  // + store id are persisted; the role/display name are re-resolved from the backend
  // so a revoked or moved membership cannot be restored.
  useEffect(() => {
    const cloudSession = loadFromStorage(CLOUD_SESSION_STORAGE_KEY, null);
    if (cloudSession?.userId) {
      restoreCloudSession(cloudSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restoreCloudSession(cloudSession) {
    try {
      const { data } = await cloudAuth.getSession();
      if (!data?.user) {
        saveToStorage(CLOUD_SESSION_STORAGE_KEY, null);
        return;
      }
      const { data: stores, error } = await cloudAuth.listMyStores();
      if (error) {
        saveToStorage(CLOUD_SESSION_STORAGE_KEY, null);
        return;
      }
      const membership = (stores || []).find((s) => s.id === cloudSession.storeId);
      if (!membership) {
        // User signed in but the previously-selected store is gone.
        saveToStorage(CLOUD_SESSION_STORAGE_KEY, null);
        return;
      }
      dispatch({
        type: ACTIONS.CLOUD_LOGIN,
        payload: {
          user: buildAppUser(data.user, membership),
          session: { userId: data.user.id, storeId: membership.id },
        },
      });
    } catch {
      saveToStorage(CLOUD_SESSION_STORAGE_KEY, null);
    }
  }

  // Cloud stores share submitted orders in real time. A draft remains private
  // to the server's screen until Place Order is pressed.
  useEffect(() => {
    const storeId = state.currentUser?.storeId || state.cloudSession?.storeId;
    if (!isCloudEnabled || !state.currentUser?.cloud || !storeId) return;
    let cancelled = false;

    const refresh = async () => {
      const { data, error } = await cloudOrders.listOpen(storeId);
      if (!cancelled && !error) {
        dispatch({ type: ACTIONS.SET_OPEN_ORDERS, payload: data || [] });
      }
    };

    refresh();
    const unsubscribe = cloudOrders.subscribe(storeId, refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [state.currentUser?.id, state.currentUser?.cloud, state.currentUser?.storeId, state.cloudSession?.storeId]);

  // Load and watch shared store settings so the server-order visibility switch
  // takes effect on every signed-in device, not just the manager's browser.
  useEffect(() => {
    const storeId = state.currentUser?.storeId || state.cloudSession?.storeId;
    if (!isCloudEnabled || !state.currentUser?.cloud || !storeId) return;
    let cancelled = false;

    const applySettings = (incoming) => {
      if (cancelled || !incoming || typeof incoming !== 'object') return;
      const merged = { ...loadStoreSettings(), ...incoming };
      saveStoreSettings(merged);
      dispatch({
        type: ACTIONS.SET_TAX_SETTINGS,
        payload: { taxRate: merged.taxRate, taxEnabled: merged.taxEnabled },
      });
      dispatch({
        type: ACTIONS.SET_SERVER_ORDER_VISIBILITY,
        payload: merged.serverCanViewAllOrders,
      });
      dispatch({
        type: ACTIONS.SET_SERVER_PRICE_ACCESS,
        payload: merged.serverCanEditPrice,
      });
      // The RLS result set changes with this switch. Refetch now so turning it
      // on reveals allowed orders and turning it off purges disallowed ones.
      cloudOrders.listOpen(storeId).then(({ data, error }) => {
        if (!cancelled && !error) {
          dispatch({ type: ACTIONS.SET_OPEN_ORDERS, payload: data || [] });
        }
      });
    };

    cloudAuth.getStoreSettings(storeId).then(({ data, error }) => {
      if (!error) applySettings(data);
    });
    const unsubscribe = cloudAuth.subscribeStoreSettings(storeId, applySettings);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [state.currentUser?.id, state.currentUser?.cloud, state.currentUser?.storeId, state.cloudSession?.storeId]);

  // Report the actual browser connection state. All POS actions still work offline
  // because the application shell and operational data are stored on the device.
  useEffect(() => {
    const updateNetworkStatus = () => {
      dispatch({ type: ACTIONS.SET_NETWORK_STATUS, payload: !navigator.onLine });
    };
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);
  
  // Auto-save every shared operational value, including the menu items. Categories and
  // items are persisted together so their IDs can never drift apart after a refresh.
  useEffect(() => {
    const saveState = () => {
      saveToStorage('cafe-pos-state', {
        menuDataVersion: MENU_DATA_VERSION,
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
      });
    };
    
    const timeoutId = setTimeout(saveState, 400);
    return () => clearTimeout(timeoutId);
  }, [
    state.tables,
    state.deliveryChannels,
    state.orderHistory,
    state.openOrders,
    state.heldOrders,
    state.categories,
    state.menuItems,
    state.selectedCategory,
    state.users,
    state.language,
    state.expenseCategories,
    state.expenses,
  ]);
  
  // Toast auto-dismiss
  useEffect(() => {
    if (state.toasts.length > 0) {
      const timeoutId = setTimeout(() => {
        dispatch({ type: ACTIONS.REMOVE_TOAST, payload: state.toasts[0].id });
      }, 4000);
      return () => clearTimeout(timeoutId);
    }
  }, [state.toasts]);

  // Remove a *placed* (submitted, unpaid) order everywhere: the shared cloud
  // row, the open-orders board and the floor plan. Used by every "remove this
  // order" affordance — the board's cancel button, and the POS clear/void
  // buttons while a manager has a placed order open for editing. Voiding is
  // deliberately a soft delete: the order lands in history as `voided` so the
  // reports still show what was thrown away and by whom.
  const removePlacedOrder = useCallback(async (order) => {
    if (!order) return { ok: false, error: { message: 'Order not found' } };
    const stored = state.openOrders.find(item => item.id === order.id) || order;
    const storeId = state.currentUser?.storeId || state.cloudSession?.storeId;
    let cancelled = {
      ...stored,
      cloudId: stored.cloudId || order.cloudId,
      status: 'voided',
      voidedAt: Date.now(),
      voidedBy: state.currentUser?.name,
    };
    if (isCloudEnabled && state.currentUser?.cloud && storeId) {
      const { data, error } = await cloudOrders.void({ storeId, order: cancelled });
      // Without the cloud write the row would reappear on the next realtime
      // refresh, so a failure must stop the local removal too.
      if (error) return { ok: false, error };
      cancelled = {
        ...cancelled,
        ...data,
        serverName: stored.serverName || order.serverName,
        voidedBy: state.currentUser?.name,
      };
    }
    dispatch({ type: ACTIONS.CANCEL_OPEN_ORDER, payload: cancelled });
    return { ok: true };
  }, [state.openOrders, state.currentUser, state.cloudSession]);

  // Action creators
  const actions = {
    // Auth
    login: useCallback((user) => {
      // Persist the session so a browser refresh keeps the user signed in.
      saveToStorage(SESSION_STORAGE_KEY, { userId: user.id, signedInAt: Date.now() });
      dispatch({ type: ACTIONS.LOGIN, payload: user });
    }, []),
    
    logout: useCallback(() => {
      // Clear both session types so a refresh cannot silently restore either.
      saveToStorage(SESSION_STORAGE_KEY, null);
      saveToStorage(CLOUD_SESSION_STORAGE_KEY, null);
      if (isCloudEnabled) {
        cloudAuth.signOut().catch(() => {});
      }
      dispatch({ type: ACTIONS.LOGOUT });
    }, []),

    // Sign in through the cloud/Supabase path. `authUser` is the resolved auth user
    // (from getSession/signUp/signIn), `membership` is the store_members row with its
    // role + display name. We build an app-shaped `currentUser` so every existing role
    // check (Header, AdminPanel, PaymentModal) keeps working unchanged.
    cloudLogin: useCallback((authUser, membership) => {
      const user = buildAppUser(authUser, membership);
      const session = { userId: user.id, storeId: membership?.id || null, signedInAt: Date.now() };
      saveToStorage(CLOUD_SESSION_STORAGE_KEY, session);
      dispatch({ type: ACTIONS.CLOUD_LOGIN, payload: { user, session } });
    }, []),
    
    // Called after Store Settings are saved/restored so the POS immediately uses
    // the new tax rate / on-off switch.
    setTaxSettings: useCallback(({ taxRate, taxEnabled }) => {
      dispatch({ type: ACTIONS.SET_TAX_SETTINGS, payload: { taxRate, taxEnabled } });
    }, []),

    setServerOrderVisibility: useCallback((canViewAll) => {
      dispatch({ type: ACTIONS.SET_SERVER_ORDER_VISIBILITY, payload: canViewAll });
    }, []),

    setServerPriceAccess: useCallback((canEditPrice) => {
      dispatch({ type: ACTIONS.SET_SERVER_PRICE_ACCESS, payload: canEditPrice });
    }, []),

    setLanguage: useCallback((lang) => {
      dispatch({ type: ACTIONS.SET_LANGUAGE, payload: lang });
    }, []),
    
    // Views
    setView: useCallback((view) => {
      dispatch({ type: ACTIONS.SET_VIEW, payload: view });
    }, []),
    
    // Categories
    selectCategory: useCallback((categoryId) => {
      dispatch({ type: ACTIONS.SELECT_CATEGORY, payload: categoryId });
    }, []),
    
    addCategory: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_CATEGORY, payload: data });
    }, []),
    
    updateCategory: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_CATEGORY, payload: { id, updates } });
    }, []),
    
    deleteCategory: useCallback((id) => {
      dispatch({ type: ACTIONS.DELETE_CATEGORY, payload: id });
    }, []),
    
    // Menu Items
    addMenuItem: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_MENU_ITEM, payload: data });
    }, []),
    
    updateMenuItem: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_MENU_ITEM, payload: { id, updates } });
    }, []),
    
    deleteMenuItem: useCallback((id) => {
      dispatch({ type: ACTIONS.DELETE_MENU_ITEM, payload: id });
    }, []),
    
    toggleItemAvailability: useCallback((id) => {
      dispatch({ type: ACTIONS.TOGGLE_ITEM_AVAILABILITY, payload: id });
    }, []),
    
    // Tables
    selectTable: useCallback((table) => {
      dispatch({ type: ACTIONS.SELECT_TABLE, payload: table });
    }, []),
    
    addTable: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_TABLE, payload: data });
    }, []),
    
    updateTable: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_TABLE, payload: { id, updates } });
    }, []),
    
    deleteTable: useCallback((id) => {
      dispatch({ type: ACTIONS.DELETE_TABLE, payload: id });
    }, []),
    
    updateTableStatus: useCallback((tableId, status) => {
      dispatch({ type: ACTIONS.UPDATE_TABLE_STATUS, payload: { tableId, status } });
    }, []),
    
    transferTable: useCallback((fromTableId, toTableId) => {
      dispatch({ type: ACTIONS.TRANSFER_TABLE, payload: { fromTableId, toTableId } });
    }, []),
    
    // Food-delivery services
    selectDeliveryChannel: useCallback((channel) => {
      dispatch({ type: ACTIONS.SELECT_DELIVERY_CHANNEL, payload: channel });
    }, []),
    
    addDeliveryChannel: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_DELIVERY_CHANNEL, payload: data });
    }, []),
    
    updateDeliveryChannel: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_DELIVERY_CHANNEL, payload: { id, updates } });
    }, []),
    
    deleteDeliveryChannel: useCallback((id) => {
      dispatch({ type: ACTIONS.DELETE_DELIVERY_CHANNEL, payload: id });
    }, []),
    
    // Users
    addUser: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_USER, payload: data });
    }, []),
    
    // Backup: replace all shared state with a validated backup file. The normal
    // auto-save effect then persists the imported data to localStorage.
    importBackup: useCallback((savedState) => {
      dispatch({ type: ACTIONS.IMPORT_BACKUP, payload: getPersistedState(savedState || {}) });
    }, []),
    
    updateUser: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_USER, payload: { id, updates } });
    }, []),
    
    deleteUser: useCallback((id) => {
      dispatch({ type: ACTIONS.DELETE_USER, payload: id });
    }, []),
    
    // Expenses
    addExpenseCategory: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_EXPENSE_CATEGORY, payload: data });
    }, []),
    
    updateExpenseCategory: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_EXPENSE_CATEGORY, payload: { id, updates } });
    }, []),
    
    deleteExpenseCategory: useCallback((id) => {
      dispatch({ type: ACTIONS.DELETE_EXPENSE_CATEGORY, payload: id });
    }, []),
    
    addExpense: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_EXPENSE, payload: data });
    }, []),
    
    updateExpense: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_EXPENSE, payload: { id, updates } });
    }, []),
    
    deleteExpense: useCallback((id) => {
      dispatch({ type: ACTIONS.DELETE_EXPENSE, payload: id });
    }, []),
    
    // Orders
    addItem: useCallback((menuItem, selectedModifiers, quantity, specialInstructions) => {
      dispatch({
        type: ACTIONS.ADD_ITEM,
        payload: { menuItem, selectedModifiers, quantity, specialInstructions },
      });
    }, []),
    
    updateItem: useCallback((itemId, updates) => {
      dispatch({ type: ACTIONS.UPDATE_ITEM, payload: { itemId, updates } });
    }, []),
    
    removeItem: useCallback((itemId) => {
      dispatch({ type: ACTIONS.REMOVE_ITEM, payload: itemId } );
    }, []),
    
    // Clearing a *draft* only wipes this screen. Clearing an order that was
    // already placed must also take it off the open-orders board (and out of
    // the shared cloud store) — otherwise the order the manager just cleared
    // keeps sitting there as unpaid work.
    clearOrder: useCallback(async () => {
      const draft = state.currentOrder;
      const placed = draft && state.openOrders.some(order => order.id === draft.id);
      if (!placed) {
        dispatch({ type: ACTIONS.CLEAR_ORDER });
        return { ok: true, removed: false };
      }
      const result = await removePlacedOrder(draft);
      return result.ok ? { ok: true, removed: true } : result;
    }, [state.currentOrder, state.openOrders, removePlacedOrder]),
    
    applyDiscount: useCallback((discount) => {
      dispatch({ type: ACTIONS.APPLY_DISCOUNT, payload: discount });
    }, []),
    
    removeDiscount: useCallback(() => {
      dispatch({ type: ACTIONS.REMOVE_DISCOUNT });
    }, []),
    
    updateOrderNotes: useCallback((notes) => {
      dispatch({ type: ACTIONS.UPDATE_ORDER_NOTES, payload: notes });
    }, []),
    
    holdOrder: useCallback(() => {
      if (state.currentOrder && state.currentOrder.items.length > 0) {
        dispatch({ type: ACTIONS.HOLD_ORDER });
        return true;
      }
      return false;
    }, [state.currentOrder]),
    
    recallOrder: useCallback((order) => {
      dispatch({ type: ACTIONS.RECALL_ORDER, payload: order });
    }, []),

    placeOrder: useCallback(async () => {
      const draft = state.currentOrder;
      if (!draft?.items?.length) {
        return { ok: false, error: { message: 'Add at least one item before placing the order.' } };
      }

      const now = Date.now();
      let submitted = {
        ...draft,
        status: 'open',
        serverId: draft.serverId || state.currentUser?.id,
        serverName: draft.serverName || state.currentUser?.name,
        placedAt: draft.placedAt || now,
        updatedAt: now,
      };
      const storeId = state.currentUser?.storeId || state.cloudSession?.storeId;
      if (isCloudEnabled && state.currentUser?.cloud && storeId) {
        const { data, error } = await cloudOrders.saveOpen({
          storeId,
          userId: state.currentUser.id,
          order: submitted,
        });
        if (error) return { ok: false, error };
        // Supabase supplies the durable UUID. Preserve the attribution while
        // swapping the friendly draft id for the durable database id.
        submitted = {
          ...data,
          serverName: draft.serverName || state.currentUser?.name,
          isEditing: false,
        };
      }

      dispatch({ type: ACTIONS.SUBMIT_ORDER, payload: submitted });
      return { ok: true, order: submitted };
    }, [state.currentOrder, state.currentUser, state.cloudSession]),

    editOpenOrder: useCallback((order) => {
      dispatch({ type: ACTIONS.EDIT_OPEN_ORDER, payload: order });
    }, []),

    // Remove a placed (unpaid) order from the board for good.
    cancelOpenOrder: useCallback((order) => removePlacedOrder(order), [removePlacedOrder]),

    // Open a placed order in the POS and jump straight to the payment screen.
    // Managers/admins use this from the open-orders board to collect money
    // without re-keying the order.
    collectPaymentForOrder: useCallback((order) => {
      if (!order) return;
      dispatch({ type: ACTIONS.EDIT_OPEN_ORDER, payload: order });
      dispatch({ type: ACTIONS.SET_PAYMENT_MODAL, payload: { open: true, method: null } });
    }, []),
    
    processPayment: useCallback((method, amountPaid, change) => {
      const order = state.currentOrder;
      dispatch({ type: ACTIONS.PROCESS_PAYMENT, payload: { method, amountPaid, change } });

      const storeId = state.currentUser?.storeId || state.cloudSession?.storeId;
      if (order?.cloudId && isCloudEnabled && state.currentUser?.cloud && storeId) {
        cloudOrders.complete({ storeId, order, method, amountPaid, change }).then(({ error }) => {
          if (error) {
            dispatch({
              type: ACTIONS.ADD_TOAST,
              payload: { message: `Payment saved locally, but cloud sync failed: ${error.message}`, type: 'error' },
            });
          }
        });
      }
    }, [state.currentOrder, state.currentUser, state.cloudSession]),
    
    // Void the order on screen. A placed order goes through the shared path so
    // the board and the cloud row are cleared as well; an unsubmitted draft
    // only exists on this device and is voided locally.
    voidOrder: useCallback(async () => {
      const draft = state.currentOrder;
      if (!draft) return { ok: false, error: { message: 'No order to void' } };
      if (state.openOrders.some(order => order.id === draft.id)) {
        return removePlacedOrder(draft);
      }
      dispatch({ type: ACTIONS.VOID_ORDER });
      return { ok: true };
    }, [state.currentOrder, state.openOrders, removePlacedOrder]),
    
    // Modals
    openPaymentModal: useCallback((method = null) => {
      dispatch({ type: ACTIONS.SET_PAYMENT_MODAL, payload: { open: true, method } });
    }, []),
    
    closePaymentModal: useCallback(() => {
      dispatch({ type: ACTIONS.SET_PAYMENT_MODAL, payload: { open: false, method: null } });
    }, []),
    
    openModifierModal: useCallback((menuItem) => {
      dispatch({ type: ACTIONS.SET_MODIFIER_MODAL, payload: { open: true, menuItem } });
    }, []),
    
    closeModifierModal: useCallback(() => {
      dispatch({ type: ACTIONS.SET_MODIFIER_MODAL, payload: { open: false, menuItem: null } });
    }, []),
    
    // UI
    addToast: useCallback((message, type = 'info') => {
      dispatch({ type: ACTIONS.ADD_TOAST, payload: { message, type } });
    }, []),
    
    removeToast: useCallback((id) => {
      dispatch({ type: ACTIONS.REMOVE_TOAST, payload: id });
    }, []),
  };
  
  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export { ACTIONS };
