// Store settings - editable by admin
export const STORE_SETTINGS_STORAGE_KEY = 'cafe-pos-store-settings';

export const defaultStoreSettings = {
  name: 'Café POS',
  tagline: 'Fresh Coffee, Great Moments',
  address: '123 Coffee Street',
  city: 'Kuala Lumpur',
  phone: '+60 3-1234 5678',
  email: 'hello@cafepos.com',
  taxId: 'GST-0000000',
  // Master switch for tax. When false no tax is added to orders and the tax
  // line disappears from the cart summary and every receipt.
  taxEnabled: true,
  taxRate: 0.06, // 6% SST
  currency: 'RM',
  currencySymbol: 'RM',
  receiptFooter: 'Thank you for visiting! See you again.',
  receiptHeader: 'Your Daily Dose of Happiness',
  printerType: '80mm', // 80mm or 58mm thermal printer
  autoPrintReceipt: false,
  // Default on: servers can view and maintain every table/walk-in order.
  // Turn off to restrict each server to orders created by their own account.
  serverCanViewAllOrders: true,
};

// Load settings from localStorage
export const loadStoreSettings = () => {
  try {
    const stored = localStorage.getItem(STORE_SETTINGS_STORAGE_KEY);
    return stored ? { ...defaultStoreSettings, ...JSON.parse(stored) } : defaultStoreSettings;
  } catch {
    return defaultStoreSettings;
  }
};

// Save settings to localStorage
export const saveStoreSettings = (settings) => {
  try {
    localStorage.setItem(STORE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
};
