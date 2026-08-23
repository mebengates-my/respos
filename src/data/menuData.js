// Menu schema version. Bump this when the starter menu/category relationship changes.
// It lets older browser caches safely move to the current Bangladesh menu.
export const MENU_DATA_VERSION = 2;

// Bangladesh-focused menu categories. IDs are stable because menu items reference them.
export const categories = [
  { id: 'rice', name: 'Biryani & Rice', icon: 'Utensils' },
  { id: 'beef-mutton', name: 'Beef, Mutton & Bhuna', icon: 'Beef' },
  { id: 'chicken', name: 'Chicken & Kabab', icon: 'Drumstick' },
  { id: 'fish', name: 'Fish & Seafood', icon: 'Fish' },
  { id: 'vegetarian', name: 'Bhorta, Dal & Vegetables', icon: 'Leaf' },
  { id: 'bread', name: 'Roti, Paratha & Naan', icon: 'Croissant' },
  { id: 'snacks', name: 'Street Food & Snacks', icon: 'Candy' },
  { id: 'desserts', name: 'Mishti & Desserts', icon: 'Cake' },
  { id: 'drinks', name: 'Tea, Lassi & Drinks', icon: 'Coffee' },
];

// Modifier options available for items
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
    { id: 'extra-paratha', name: 'Extra Paratha', price: 300 },
    { id: 'butter', name: 'Butter', price: 50 },
  ],
  'snack': [
    { id: 'extra-chutney', name: 'Extra Chutney', price: 50 },
    { id: 'extra-sauce', name: 'Extra Sauce', price: 50 },
    { id: 'extra-spicy', name: 'Extra Spicy', price: 0 },
  ],
  'drink': [
    { id: 'extra-sugar', name: 'Extra Sugar', price: 20 },
    { id: 'less-sugar', name: 'Less Sugar', price: 0 },
    { id: 'extra-ice', name: 'Extra Ice', price: 0 },
  ],
};

// Menu items database
export const menuItems = [
  // Rice & Biryani
  { id: 'rice-1', categoryId: 'rice', name: 'Beef Biryani', price: 1500, description: 'Fragrant basmati rice layered with tender beef and spices', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-2', categoryId: 'rice', name: 'Chicken Biryani', price: 1300, description: 'Aromatic basmati rice with spiced chicken', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-3', categoryId: 'rice', name: 'Mutton Biryani', price: 1800, description: 'Basmati rice with slow-cooked mutton', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-4', categoryId: 'rice', name: 'Kacchi Biryani', price: 2000, description: 'Mutton and basmati rice steamed together', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-5', categoryId: 'rice', name: 'Egg Biryani', price: 1200, description: 'Biryani with boiled eggs and potatoes', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-6', categoryId: 'rice', name: 'Beef Polao', price: 1400, description: 'Aromatic rice cooked with beef and ghee', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-7', categoryId: 'rice', name: 'Vegetable Polao', price: 1000, description: 'Aromatic rice with ghee and vegetables', modifiers: ['spice', 'curry'], available: true },
  { id: 'rice-8', categoryId: 'rice', name: 'Plain Rice', price: 400, description: 'Steamed white rice', modifiers: [], available: true },

  // Beef & Mutton
  { id: 'bm-1', categoryId: 'beef-mutton', name: 'Beef Curry', price: 1100, description: 'Slow-cooked beef in rich spicy gravy', modifiers: ['spice', 'size'], available: true },
  { id: 'bm-2', categoryId: 'beef-mutton', name: 'Beef Korma', price: 1300, description: 'Beef in creamy yogurt and cashew sauce', modifiers: ['spice', 'size'], available: true },
  { id: 'bm-3', categoryId: 'beef-mutton', name: 'Beef Bhuna', price: 1200, description: 'Dry-spiced beef in thick gravy', modifiers: ['spice', 'size'], available: true },
  { id: 'bm-4', categoryId: 'beef-mutton', name: 'Beef Rezala', price: 1400, description: 'Beef in white ghee-based sauce', modifiers: ['spice', 'size'], available: true },
  { id: 'bm-5', categoryId: 'beef-mutton', name: 'Beef Tehari', price: 1300, description: 'Beef and spiced rice cooked together', modifiers: ['spice', 'curry'], available: true },
  { id: 'bm-6', categoryId: 'beef-mutton', name: 'Mutton Curry', price: 1500, description: 'Tender mutton in rich gravy', modifiers: ['spice', 'size'], available: true },
  { id: 'bm-7', categoryId: 'beef-mutton', name: 'Mutton Korma', price: 1600, description: 'Mutton in creamy yogurt sauce', modifiers: ['spice', 'size'], available: true },
  { id: 'bm-8', categoryId: 'beef-mutton', name: 'Mutton Bhuna', price: 1400, description: 'Dry-spiced mutton in thick gravy', modifiers: ['spice', 'size'], available: true },

  // Chicken
  { id: 'ch-1', categoryId: 'chicken', name: 'Chicken Curry', price: 1000, description: 'Classic chicken curry in spicy gravy', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-2', categoryId: 'chicken', name: 'Chicken Roast', price: 1200, description: 'Tandoor-style roasted chicken, mildly spiced', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-3', categoryId: 'chicken', name: 'Chicken Korma', price: 1200, description: 'Chicken in creamy cashew sauce', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-4', categoryId: 'chicken', name: 'Chicken Bhuna', price: 1100, description: 'Dry-spiced chicken in thick gravy', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-5', categoryId: 'chicken', name: 'Chicken Rezala', price: 1300, description: 'Chicken in white ghee-based sauce', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-6', categoryId: 'chicken', name: 'Chicken Fry', price: 1000, description: 'Crispy fried chicken pieces', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-7', categoryId: 'chicken', name: 'Tandoori Chicken (Half)', price: 1600, description: 'Half chicken marinated and grilled', modifiers: ['spice', 'size'], available: true },
  { id: 'ch-8', categoryId: 'chicken', name: 'Chicken Tikka', price: 1400, description: 'Char-grilled spiced chicken cubes', modifiers: ['spice', 'size'], available: true },

  // Fish
  { id: 'fi-1', categoryId: 'fish', name: 'Shorshe Ilish', price: 2200, description: 'Hilsa fish in mustard sauce', modifiers: ['spice', 'size'], available: true },
  { id: 'fi-2', categoryId: 'fish', name: 'Ilish Bhapa', price: 2000, description: 'Steamed hilsa with mustard and chili', modifiers: ['spice', 'size'], available: true },
  { id: 'fi-3', categoryId: 'fish', name: 'Fish Curry', price: 1200, description: 'River fish in tomato curry', modifiers: ['spice', 'size'], available: true },
  { id: 'fi-4', categoryId: 'fish', name: 'Fish Fry', price: 900, description: 'Golden fried fish fillet', modifiers: ['spice'], available: true },
  { id: 'fi-5', categoryId: 'fish', name: 'Prawn Curry', price: 1800, description: 'Prawns in coconut curry', modifiers: ['spice', 'size'], available: true },
  { id: 'fi-6', categoryId: 'fish', name: 'Fish Bhuna', price: 1300, description: 'Dry-spiced fish in thick gravy', modifiers: ['spice', 'size'], available: true },
  { id: 'fi-7', categoryId: 'fish', name: 'Fish Chop', price: 800, description: 'Crunchy spiced fish snack', modifiers: ['snack'], available: true },

  // Vegetarian
  { id: 've-1', categoryId: 'vegetarian', name: 'Masoor Dal', price: 700, description: 'Red lentil soup with cumin and garlic', modifiers: ['spice', 'size'], available: true },
  { id: 've-2', categoryId: 'vegetarian', name: 'Dal Tadka', price: 800, description: 'Lentils tempered with spices and ghee', modifiers: ['spice', 'size'], available: true },
  { id: 've-3', categoryId: 'vegetarian', name: 'Mixed Vegetable Curry', price: 800, description: 'Seasonal vegetables in mild gravy', modifiers: ['spice', 'size'], available: true },
  { id: 've-4', categoryId: 'vegetarian', name: 'Aloo Bhorta', price: 600, description: 'Mashed potato with mustard oil and onion', modifiers: ['spice'], available: true },
  { id: 've-5', categoryId: 'vegetarian', name: 'Begun Bhaja', price: 700, description: 'Fried eggplant slices', modifiers: ['spice'], available: true },
  { id: 've-6', categoryId: 'vegetarian', name: 'Aloo Vorta', price: 500, description: 'Smoky mashed potato with chili', modifiers: ['spice'], available: true },
  { id: 've-7', categoryId: 'vegetarian', name: 'Palong Shaak', price: 600, description: 'Stir-fried spinach with garlic', modifiers: ['spice'], available: true },
  { id: 've-8', categoryId: 'vegetarian', name: 'Dal + Vegetable Combo', price: 1200, description: 'Dal with mixed vegetable curry and rice', modifiers: ['spice', 'curry'], available: true },

  // Roti & Paratha
  { id: 'br-1', categoryId: 'bread', name: 'Plain Paratha', price: 300, description: 'Flaky layered flatbread', modifiers: ['bread'], available: true },
  { id: 'br-2', categoryId: 'bread', name: 'Butter Paratha', price: 350, description: 'Paratha brushed with butter', modifiers: ['bread'], available: true },
  { id: 'br-3', categoryId: 'bread', name: 'Ruti (Roti)', price: 200, description: 'Whole wheat flatbread', modifiers: ['bread'], available: true },
  { id: 'br-4', categoryId: 'bread', name: 'Naan', price: 400, description: 'Soft tandoor-baked bread', modifiers: ['bread'], available: true },
  { id: 'br-5', categoryId: 'bread', name: 'Luchi', price: 300, description: 'Deep-fried puffed bread', modifiers: ['bread'], available: true },
  { id: 'br-6', categoryId: 'bread', name: 'Aloo Paratha', price: 500, description: 'Paratha stuffed with spiced potato', modifiers: ['bread'], available: true },
  { id: 'br-7', categoryId: 'bread', name: 'Stuffed Naan', price: 600, description: 'Naan with garlic and herbs', modifiers: ['bread'], available: true },

  // Snacks & Street Food
  { id: 'sn-1', categoryId: 'snacks', name: 'Fuchka (Pani Puri)', price: 500, description: 'Crisp shells with tangy tamarind water', modifiers: ['snack'], available: true },
  { id: 'sn-2', categoryId: 'snacks', name: 'Singara', price: 400, description: 'Crispy pastry with spiced potato and peas', modifiers: ['snack'], available: true },
  { id: 'sn-3', categoryId: 'snacks', name: 'Beef Singara', price: 600, description: 'Crispy pastry with spiced beef filling', modifiers: ['snack'], available: true },
  { id: 'sn-4', categoryId: 'snacks', name: 'Samosa', price: 400, description: 'Crispy triangular pastry with spiced filling', modifiers: ['snack'], available: true },
  { id: 'sn-5', categoryId: 'snacks', name: 'Chotpoti', price: 600, description: 'Spicy chickpea and egg snack', modifiers: ['snack'], available: true },
  { id: 'sn-6', categoryId: 'snacks', name: 'Jhalmuri', price: 500, description: 'Puffed rice with spices and onion', modifiers: ['snack'], available: true },
  { id: 'sn-7', categoryId: 'snacks', name: 'Chicken Roll', price: 700, description: 'Paratha wrap with spiced chicken', modifiers: ['snack'], available: true },

  // Sweets & Desserts
  { id: 'de-1', categoryId: 'desserts', name: 'Roshogolla', price: 400, description: 'Soft cheese balls in sugar syrup', modifiers: [], available: true },
  { id: 'de-2', categoryId: 'desserts', name: 'Sandesh', price: 500, description: 'Sweetened cottage cheese delicacy', modifiers: [], available: true },
  { id: 'de-3', categoryId: 'desserts', name: 'Jilapi (Jalebi)', price: 300, description: 'Crispy spirals in sugar syrup', modifiers: [], available: true },
  { id: 'de-4', categoryId: 'desserts', name: 'Mishti Doi', price: 600, description: 'Caramelized sweet yogurt', modifiers: [], available: true },
  { id: 'de-5', categoryId: 'desserts', name: 'Doi (Sweet Yogurt)', price: 500, description: 'Fresh sweet yogurt', modifiers: [], available: true },
  { id: 'de-6', categoryId: 'desserts', name: 'Chamcham', price: 500, description: 'Syrupy milk-based sweet', modifiers: [], available: true },
  { id: 'de-7', categoryId: 'desserts', name: 'Gurer Payesh', price: 700, description: 'Rice pudding with jaggery', modifiers: [], available: true },
  { id: 'de-8', categoryId: 'desserts', name: 'Gajorer Halwa', price: 600, description: 'Carrot halwa with ghee', modifiers: [], available: true },

  // Drinks & Beverages
  { id: 'dr-1', categoryId: 'drinks', name: 'Masala Chai', price: 400, description: 'Spiced milk tea', modifiers: ['drink'], available: true },
  { id: 'dr-2', categoryId: 'drinks', name: 'Borhani', price: 600, description: 'Spiced yogurt drink', modifiers: ['drink'], available: true },
  { id: 'dr-3', categoryId: 'drinks', name: 'Lassi', price: 500, description: 'Blended yogurt drink', modifiers: ['drink'], available: true },
  { id: 'dr-4', categoryId: 'drinks', name: 'Mango Lassi', price: 700, description: 'Mango yogurt smoothie', modifiers: ['drink'], available: true },
  { id: 'dr-5', categoryId: 'drinks', name: 'Fresh Lemon Juice', price: 500, description: 'Fresh lime and mint', modifiers: ['drink'], available: true },
  { id: 'dr-6', categoryId: 'drinks', name: 'Sugarcane Juice', price: 400, description: 'Freshly pressed sugarcane', modifiers: ['drink'], available: true },
  { id: 'dr-7', categoryId: 'drinks', name: 'Coffee', price: 600, description: 'Hot brewed coffee', modifiers: ['drink'], available: true },
  { id: 'dr-8', categoryId: 'drinks', name: 'Green Coconut', price: 800, description: 'Fresh tender coconut water', modifiers: [], available: true },
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

// Staff members (demo)
export const staffMembers = [
  { id: 'staff-1', name: 'Maria', role: 'server', pin: '1234' },
  { id: 'staff-2', name: 'Ahmad', role: 'server', pin: '2345' },
  { id: 'staff-3', name: 'Sarah', role: 'manager', pin: '9999' },
];

// Initial tables
export const initialTables = [
  { id: 'T1', number: 1, capacity: 2, status: 'available', position: { x: 0, y: 0 } },
  { id: 'T2', number: 2, capacity: 2, status: 'available', position: { x: 1, y: 0 } },
  { id: 'T3', number: 3, capacity: 4, status: 'available', position: { x: 2, y: 0 } },
  { id: 'T4', number: 4, capacity: 4, status: 'available', position: { x: 0, y: 1 } },
  { id: 'T5', number: 5, capacity: 6, status: 'available', position: { x: 1, y: 1 } },
  { id: 'T6', number: 6, capacity: 2, status: 'available', position: { x: 2, y: 1 } },
  { id: 'T7', number: 7, capacity: 4, status: 'available', position: { x: 0, y: 2 } },
  { id: 'T8', number: 8, capacity: 4, status: 'available', position: { x: 1, y: 2 } },
  { id: 'T9', number: 9, capacity: 8, status: 'available', position: { x: 2, y: 2 } },
  { id: 'COUNTER', number: 0, capacity: 99, status: 'available', position: { x: 3, y: 0 }, isCounter: true },
];

// Discount presets
export const discountPresets = [
  { id: 'disc-10', name: '10% Off', type: 'percent', value: 10 },
  { id: 'disc-15', name: '15% Off', type: 'percent', value: 15 },
  { id: 'disc-20', name: '20% Off', type: 'percent', value: 20 },
  { id: 'disc-5rm', name: 'RM 5 Off', type: 'fixed', value: 500 },
  { id: 'disc-10rm', name: 'RM 10 Off', type: 'fixed', value: 1000 },
];
