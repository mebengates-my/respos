// Store settings - editable by admin
export const defaultStoreSettings = {
  name: 'Café POS',
  tagline: 'Fresh Coffee, Great Moments',
  address: '123 Coffee Street',
  city: 'Kuala Lumpur',
  phone: '+60 3-1234 5678',
  email: 'hello@cafepos.com',
  taxId: 'GST-0000000',
  taxRate: 0.06, // 6% SST
  currency: 'RM',
  currencySymbol: 'RM',
  receiptFooter: 'Thank you for visiting! See you again.',
  receiptHeader: 'Your Daily Dose of Happiness',
  printerType: '80mm', // 80mm or 58mm thermal printer
  autoPrintReceipt: false,
};

// Load settings from localStorage
export const loadStoreSettings = () => {
  try {
    const stored = localStorage.getItem('cafe-pos-store-settings');
    return stored ? { ...defaultStoreSettings, ...JSON.parse(stored) } : defaultStoreSettings;
  } catch {
    return defaultStoreSettings;
  }
};

// Save settings to localStorage
export const saveStoreSettings = (settings) => {
  try {
    localStorage.setItem('cafe-pos-store-settings', JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
};
