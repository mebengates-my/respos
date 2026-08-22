import { TAX_RATE } from '../data/menuData.js';

// Format price from cents to display string
export const formatPrice = (cents, currency = 'RM') => {
  return `${currency} ${(cents / 100).toFixed(2)}`;
};

// Parse price string to cents
export const parsePrice = (priceStr) => {
  return Math.round(parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) * 100);
};

// Calculate subtotal from order items
export const calculateSubtotal = (items) => {
  return items.reduce((total, item) => {
    const itemPrice = item.price * item.quantity;
    const modifierPrice = (item.modifiers || []).reduce((modTotal, mod) => modTotal + mod.price, 0) * item.quantity;
    return total + itemPrice + modifierPrice;
  }, 0);
};

// Calculate tax amount
export const calculateTax = (subtotal, rate = TAX_RATE) => {
  return Math.round(subtotal * rate);
};

// Calculate total with tax and discount
export const calculateTotal = (subtotal, tax, discountAmount = 0) => {
  return subtotal + tax - discountAmount;
};

// Calculate discount amount
export const calculateDiscount = (subtotal, discount) => {
  if (!discount) return 0;
  if (discount.type === 'percent') {
    return Math.round(subtotal * (discount.value / 100));
  }
  return discount.value;
};

// Calculate change for cash payment
export const calculateChange = (amountPaid, total) => {
  return Math.max(0, amountPaid - total);
};

// Generate unique order ID
export const generateOrderId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Generate unique item ID
export const generateItemId = () => {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

// Get current date formatted
export const getFormattedDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-MY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Get current time formatted
export const getFormattedTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Format time elapsed since timestamp
export const formatElapsedTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

// Validate PIN
export const validatePin = (input, storedPin) => {
  return input === storedPin;
};

// Generate receipt data structure
export const generateReceipt = (order, tableNumber, serverName) => {
  return {
    header: {
      name: 'Café POS Demo',
      address: '123 Coffee Street, Kuala Lumpur',
      phone: '+60 3-1234 5678',
    },
    info: {
      orderId: order.id,
      date: getFormattedDate(),
      time: getFormattedTime(),
      table: tableNumber === 0 ? 'Counter' : `Table ${tableNumber}`,
      server: serverName,
    },
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers?.map(m => m.name).join(', ') || '',
      price: item.price * item.quantity,
      modifierTotal: (item.modifiers?.reduce((t, m) => t + m.price, 0) || 0) * item.quantity,
    })),
    totals: {
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount?.amount || 0,
      total: order.total,
    },
    footer: {
      message: 'Thank you for visiting! See you again.',
    },
  };
};

// Group items by category for reporting
export const groupByCategory = (items, categories) => {
  const grouped = {};
  categories.forEach(cat => {
    grouped[cat.id] = {
      category: cat.name,
      items: [],
      total: 0,
    };
  });
  
  items.forEach(item => {
    if (grouped[item.categoryId]) {
      grouped[item.categoryId].items.push(item);
      grouped[item.categoryId].total += item.price * item.quantity;
    }
  });
  
  return grouped;
};

// Calculate hourly sales distribution
export const calculateHourlyDistribution = (orders) => {
  const hours = Array(12).fill(0).map((_, i) => ({
    hour: `${(i + 7).toString().padStart(2, '0')}:00`,
    sales: 0,
    orders: 0,
  }));
  
  orders.forEach(order => {
    if (order.paidAt) {
      const hour = new Date(order.paidAt).getHours();
      const index = hour - 7;
      if (index >= 0 && index < 12) {
        hours[index].sales += order.total;
        hours[index].orders += 1;
      }
    }
  });
  
  return hours;
};

// Calculate top selling items
export const calculateTopItems = (orders, limit = 5) => {
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
  
  return Object.values(itemCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
};

// Save to localStorage
export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save to storage:', error);
    return false;
  }
};

// Load from localStorage
export const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return defaultValue;
  }
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
