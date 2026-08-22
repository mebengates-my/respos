import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  menuItems as initialMenuItems,
  categories as initialCategories,
  initialTables,
  staffMembers as initialStaff,
  discountPresets,
  TAX_RATE
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
  
  // Data
  LOAD_SAVED_STATE: 'LOAD_SAVED_STATE',
};

// Initial users (staff)
const defaultUsers = [
  { id: 'admin-1', name: 'Admin User', role: 'admin', pin: '1234', active: true },
  { id: 'server-1', name: 'Maria Santos', role: 'server', pin: '1111', active: true },
  { id: 'server-2', name: 'Ahmad Khan', role: 'server', pin: '2222', active: true },
  { id: 'server-3', name: 'Sarah Lee', role: 'server', pin: '3333', active: true },
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
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    // Auth
    case ACTIONS.LOGIN:
      return { ...state, currentUser: action.payload, isLoggedIn: true };
    
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
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== action.payload),
        menuItems: state.menuItems.filter(item => item.categoryId !== action.payload),
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
    
    // Data persistence
    case ACTIONS.LOAD_SAVED_STATE:
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Load saved state on mount
  useEffect(() => {
    const savedState = loadFromStorage('cafe-pos-state', null);
    if (savedState) {
      dispatch({
        type: ACTIONS.LOAD_SAVED_STATE,
        payload: {
          tables: savedState.tables || initialTables,
          orderHistory: savedState.orderHistory || [],
          heldOrders: savedState.heldOrders || [],
          categories: savedState.categories || initialCategories,
          users: savedState.users || defaultUsers,
          language: savedState.language || 'en',
        },
      });
    }
  }, []);
  
  // Auto-save to localStorage
  useEffect(() => {
    const saveState = () => {
      saveToStorage('cafe-pos-state', {
        tables: state.tables,
        orderHistory: state.orderHistory,
        heldOrders: state.heldOrders,
        categories: state.categories,
        users: state.users,
        language: state.language,
      });
    };
    
    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.tables, state.orderHistory, state.heldOrders, state.categories, state.users, state.language]);
  
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
      dispatch({ type: ACTIONS.LOGIN, payload: user });
    }, []),
    
    logout: useCallback(() => {
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
