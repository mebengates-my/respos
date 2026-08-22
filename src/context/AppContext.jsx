import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  menuItems as initialMenuItems,
  categories as initialCategories,
  initialTables,
  discountPresets,
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

const AppContext = createContext(null);

// Action types
const ACTIONS = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SET_LANGUAGE: 'SET_LANGUAGE',
  
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
};

// localStorage key holding the signed-in user. Only the user id is stored; the full
// user record is always re-resolved against the persisted users list.
export const SESSION_STORAGE_KEY = 'cafe-pos-session';

// Initial users (staff)
const defaultUsers = [
  { id: 'admin-1', name: 'Admin User', role: 'admin', pin: '1234', active: true },
  { id: 'manager-1', name: 'Nadia Rahman', role: 'manager', pin: '5555', active: true },
  { id: 'server-1', name: 'Maria Santos', role: 'server', pin: '1111', active: true },
  { id: 'server-2', name: 'Ahmad Khan', role: 'server', pin: '2222', active: true },
  { id: 'server-3', name: 'Sarah Lee', role: 'server', pin: '3333', active: true },
];

// Initial expense categories (business costs, separate from menu categories)
const defaultExpenseCategories = [
  { id: 'exp-cat-rent', name: 'Rent' },
  { id: 'exp-cat-salaries', name: 'Salaries' },
  { id: 'exp-cat-ingredients', name: 'Ingredients & Supplies' },
  { id: 'exp-cat-utilities', name: 'Utilities' },
  { id: 'exp-cat-marketing', name: 'Marketing' },
  { id: 'exp-cat-maintenance', name: 'Maintenance' },
  { id: 'exp-cat-other', name: 'Other' },
];

// Initial state
const initialState = {
  // Auth
  currentUser: null,
  isLoggedIn: false,
  language: 'en',
  
  // View
  view: 'pos', // 'pos' | 'tables' | 'reports' | 'admin'
  
  // Menu
  menuDataVersion: MENU_DATA_VERSION,
  selectedCategory: initialCategories[0]?.id || 'rice',
  categories: initialCategories,
  menuItems: initialMenuItems,
  discountPresets,
  taxRate: TAX_RATE,
  
  // Tables
  selectedTable: null,
  tables: initialTables,
  
  // Users
  users: defaultUsers,
  
  // Expenses
  expenseCategories: defaultExpenseCategories,
  expenses: [],
  
  // Orders
  currentOrder: null,
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
  const selectedCategory = categoryIds.has(savedState?.selectedCategory)
    ? savedState.selectedCategory
    : categories[0]?.id || null;

  return {
    tables: savedState?.tables || initialTables,
    orderHistory: savedState?.orderHistory || [],
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
      };
    
    case ACTIONS.LOGOUT:
      return { ...state, currentUser: null, isLoggedIn: false, view: 'pos', currentOrder: null };
    
    case ACTIONS.SET_LANGUAGE:
      return { ...state, language: action.payload };
    
    // Views
    case ACTIONS.SET_VIEW:
      return { ...state, view: action.payload };
    
    // Menu & Categories
    case ACTIONS.SELECT_CATEGORY:
      return { ...state, selectedCategory: action.payload };
    
    case ACTIONS.ADD_CATEGORY: {
      const newCategory = {
        id: `cat-${Date.now()}`,
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
      return {
        ...state,
        categories,
        menuItems: state.menuItems.filter(item => item.categoryId !== action.payload),
        selectedCategory: state.selectedCategory === action.payload
          ? categories[0]?.id || null
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
    case ACTIONS.SELECT_TABLE:
      return { ...state, selectedTable: action.payload };
    
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
        item.specialInstructions === specialInstructions
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
      const tax = calculateTax(subtotal - discountAmount);
      const total = calculateTotal(subtotal, tax, discountAmount);
      
      return {
        ...state,
        currentOrder: {
          ...(state.currentOrder || { 
            id: generateOrderId(), 
            items: [], 
            status: 'open',
            createdAt: Date.now(),
            tableId: state.selectedTable?.id || 'COUNTER',
            serverId: state.currentUser?.id,
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
      const tax = calculateTax(subtotal - discountAmount);
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
      const tax = calculateTax(subtotal - discountAmount);
      const total = calculateTotal(subtotal, tax, discountAmount);
      
      return {
        ...state,
        currentOrder: newItems.length > 0
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
      const tax = calculateTax(subtotal - discountAmount);
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
      const tax = calculateTax(subtotal);
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
        selectedTable: null,
      };
    }
    
    case ACTIONS.RECALL_ORDER: {
      const orderToRecall = action.payload;
      const newHeldOrders = state.heldOrders.filter(o => o.id !== orderToRecall.id);
      
      return {
        ...state,
        heldOrders: newHeldOrders,
        currentOrder: { ...orderToRecall, status: 'open' },
        selectedTable: state.tables.find(t => t.id === orderToRecall.tableId) || null,
        tables: state.tables.map(table =>
          table.id === orderToRecall.tableId
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
        table.id === state.selectedTable?.id
          ? { ...table, status: 'cleaning', currentOrderId: null }
          : table
      );
      
      return {
        ...state,
        currentOrder: null,
        selectedTable: null,
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
        table.id === state.selectedTable?.id
          ? { ...table, status: 'available', currentOrderId: null }
          : table
      );
      
      return {
        ...state,
        currentOrder: null,
        selectedTable: null,
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
    
    // Data persistence
    case ACTIONS.LOAD_SAVED_STATE: {
      const next = { ...state, ...action.payload };
      // Keep the signed-in user in step with the (possibly newer) users list coming
      // from storage: pick up renames/role changes, and sign out if the user was
      // deleted or deactivated on another tab.
      if (next.currentUser && Array.isArray(next.users)) {
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
        orderHistory: state.orderHistory,
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
    state.orderHistory,
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
  
  // Action creators
  const actions = {
    // Auth
    login: useCallback((user) => {
      // Persist the session so a browser refresh keeps the user signed in.
      saveToStorage(SESSION_STORAGE_KEY, { userId: user.id, signedInAt: Date.now() });
      dispatch({ type: ACTIONS.LOGIN, payload: user });
    }, []),
    
    logout: useCallback(() => {
      saveToStorage(SESSION_STORAGE_KEY, null);
      dispatch({ type: ACTIONS.LOGOUT });
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
    
    // Users
    addUser: useCallback((data) => {
      dispatch({ type: ACTIONS.ADD_USER, payload: data });
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
    
    clearOrder: useCallback(() => {
      dispatch({ type: ACTIONS.CLEAR_ORDER });
    }, []),
    
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
    
    processPayment: useCallback((method, amountPaid, change) => {
      dispatch({ type: ACTIONS.PROCESS_PAYMENT, payload: { method, amountPaid, change } });
    }, []),
    
    voidOrder: useCallback(() => {
      if (state.currentOrder) {
        dispatch({ type: ACTIONS.VOID_ORDER });
        return true;
      }
      return false;
    }, [state.currentOrder]),
    
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
