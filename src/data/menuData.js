// Menu schema version. Bump this when the starter menu/category relationship changes.
// It lets older browser caches safely move to the current Bangladesh menu.
export const MENU_DATA_VERSION = 2;

// Starter menu categories. This is deliberately a small sample, not a full
// menu: a new store's owner builds out their real menu in Admin > Menu, and
// anything left here first has to be deleted by hand. IDs are stable because
// menu items reference them.
//
// Note for future edits: do NOT bump MENU_DATA_VERSION just to change these.
// The version gate in AppContext treats a mismatch as "discard the saved menu
// and re-seed", so bumping it would wipe the menu of every store already
// running. Trimming the starter set only needs to affect fresh installs, which
// have no saved menu to keep.
// A category flagged `isDefault: true` is a *default category*: the POS opens
// with the first default category selected and its items on screen. Admins and
// managers star/unstar categories in Category Management.
export const categories = [
  { id: 'rice', name: 'Biryani & Rice', icon: 'Utensils', isDefault: true },
  { id: 'chicken', name: 'Chicken & Kabab', icon: 'Drumstick' },
  { id: 'bread', name: 'Roti, Paratha & Naan', icon: 'Croissant' },
  { id: 'drinks', name: 'Tea, Lassi & Drinks', icon: 'Coffee' },
];

// Modifier options available for items. Kept as worked examples of how a
// customization group looks; managers edit these per item in the admin panel.
export const modifiers = {
  'spice': [
    { id: 'mild', name: 'Mild', price: 0 },
    { id: 'medium', name: 'Medium', price: 0 },
    { id: 'spicy', name: 'Spicy', price: 0 },
    { id: 'extra-spicy', name: 'Extra Spicy', price: 50 },
  ],
  'size': [
    { id: 'regular', name: 'Regular', price: 0 },
    { id: 'large', name: 'Large', price: 200 },
  ],
  'curry': [
    { id: 'extra-curry', name: 'Extra Curry', price: 150 },
    { id: 'extra-rice', name: 'Extra Rice', price: 200 },
    { id: 'raita', name: 'Raita', price: 150 },
    { id: 'salad', name: 'Side Salad', price: 150 },
  ],
  'bread': [
    { id: 'extra-ghee', name: 'Extra Ghee', price: 100 },
    { id: 'butter', name: 'Butter', price: 50 },
  ],
  'drink': [
    { id: 'extra-sugar', name: 'Extra Sugar', price: 20 },
    { id: 'less-sugar', name: 'Less Sugar', price: 0 },
    { id: 'extra-ice', name: 'Extra Ice', price: 0 },
  ],
};

// Starter menu items — a few per category, enough to show how pricing,
// descriptions and modifier groups work without leaving a long list to clear.
export const menuItems = [
  // Biryani & Rice
  { id: 'rice-1', categoryId: 'rice', name: 'Beef Biryani', price: 1500, description: 'Fragrant basmati rice layered with tender beef and spices', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-2', categoryId: 'rice', name: 'Chicken Biryani', price: 1300, description: 'Aromatic basmati rice with spiced chicken', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-3', categoryId: 'rice', name: 'Plain Rice', price: 400, description: 'Steamed white rice', modifiers: [], available: true },

  // Chicken & Kabab
  { id: 'ch-1', categoryId: 'chicken', name: 'Chicken Curry', price: 1000, description: 'Classic chicken curry in spicy gravy', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-2', categoryId: 'chicken', name: 'Chicken Roast', price: 1200, description: 'Tandoor-style roasted chicken, mildly spiced', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-3', categoryId: 'chicken', name: 'Chicken Tikka', price: 1400, description: 'Char-grilled spiced chicken cubes', modifiers: ['spice', 'size'], available: true },

  // Roti, Paratha & Naan
  { id: 'br-1', categoryId: 'bread', name: 'Plain Paratha', price: 300, description: 'Flaky layered flatbread', modifiers: ['bread'], available: true },
  { id: 'br-2', categoryId: 'bread', name: 'Ruti (Roti)', price: 200, description: 'Whole wheat flatbread', modifiers: ['bread'], available: true },
  { id: 'br-3', categoryId: 'bread', name: 'Naan', price: 400, description: 'Soft tandoor-baked bread', modifiers: ['bread'], available: true },

  // Tea, Lassi & Drinks
  { id: 'dr-1', categoryId: 'drinks', name: 'Masala Chai', price: 400, description: 'Spiced milk tea', modifiers: ['drink'], available: true },
  { id: 'dr-2', categoryId: 'drinks', name: 'Lassi', price: 500, description: 'Blended yogurt drink', modifiers: ['drink'], available: true },
  { id: 'dr-3', categoryId: 'drinks', name: 'Borhani', price: 600, description: 'Spiced yogurt drink', modifiers: ['drink'], available: true },
];

// Default food-delivery services offered on the POS order screen. Managers and
// admins can add, rename, recolour or remove these (Admin → Delivery Services);
// whatever is configured here shows up as a tappable icon next to walk-in and
// the dining tables. Like tables, the list is device-local.
export const defaultDeliveryChannels = [
  { id: 'dl-grab', name: 'GrabFood', emoji: '🛵', color: '#00B14F', active: true },
  { id: 'dl-panda', name: 'foodpanda', emoji: '🐼', color: '#D70F64', active: true },
  { id: 'dl-shopee', name: 'Shopee Food', emoji: '🛍️', color: '#EE4D2D', active: true },
];

// Resolve the customization (modifier) groups of a menu item into one shape:
//   [{ id, name, options: [{ id, name, price }] }]
// Items carry either the editable `modifierGroups` written by the admin panel,
// or (legacy seed data) a list of group keys into the shared dictionary above.
// The POS open-item modal and the "Customizable" badge both use this, so an
// item only ever offers customization when a manager configured it.
export function resolveModifierGroups(item) {
  if (!item) return [];
  if (Array.isArray(item.modifierGroups) && item.modifierGroups.length > 0) {
    return item.modifierGroups
      .filter(group => group && group.name)
      .map(group => ({
        id: group.id,
        name: group.name,
        options: (group.options || []).filter(option => option && option.name),
      }));
  }
  if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
    return item.modifiers
      .map(modId => ({
        id: modId,
        name: modId.charAt(0).toUpperCase() + modId.slice(1).replace(/-/g, ' '),
        options: modifiers[modId] || [],
      }))
      .filter(group => group.options.length > 0);
  }
  return [];
}

// Tax rate (6% SST in Malaysia)
export const TAX_RATE = 0.06;

// Starter dining tables. A small sample: the owner sets up their real floor
// plan in Admin > Tables, so anything seeded here has to be deleted by hand.
export const initialTables = [
  { id: 'T1', number: 1, capacity: 2, status: 'available', position: { x: 0, y: 0 } },
  { id: 'T2', number: 2, capacity: 4, status: 'available', position: { x: 1, y: 0 } },
  { id: 'T3', number: 3, capacity: 4, status: 'available', position: { x: 2, y: 0 } },
  { id: 'T4', number: 4, capacity: 6, status: 'available', position: { x: 0, y: 1 } },
  { id: 'COUNTER', number: 0, capacity: 99, status: 'available', position: { x: 1, y: 1 }, isCounter: true },
];

// Discount presets
export const discountPresets = [
  { id: 'disc-10', name: '10% Off', type: 'percent', value: 10 },
  { id: 'disc-15', name: '15% Off', type: 'percent', value: 15 },
  { id: 'disc-20', name: '20% Off', type: 'percent', value: 20 },
  { id: 'disc-5rm', name: 'RM 5 Off', type: 'fixed', value: 500 },
  { id: 'disc-10rm', name: 'RM 10 Off', type: 'fixed', value: 1000 },
];
