// Menu categories with icons
export const categories = [
  { id: 'hot-drinks', name: 'Hot Drinks', icon: 'Coffee' },
  { id: 'tea', name: 'Tea', icon: 'CupSoda' },
  { id: 'cold-drinks', name: 'Cold Drinks', icon: 'GlassWater' },
  { id: 'pastries', name: 'Pastries', icon: 'Croissant' },
  { id: 'sandwiches', name: 'Sandwiches', icon: 'Sandwich' },
  { id: 'combos', name: 'Combos', icon: 'Gift' },
];

// Modifier options available for items
export const modifiers = {
  'milk': [
    { id: 'oat', name: 'Oat Milk', price: 150 },
    { id: 'almond', name: 'Almond Milk', price: 150 },
    { id: 'soy', name: 'Soy Milk', price: 100 },
    { id: 'lactose-free', name: 'Lactose-Free Milk', price: 150 },
  ],
  'size': [
    { id: 'small', name: 'Small', price: 0 },
    { id: 'medium', name: 'Medium', price: 100 },
    { id: 'large', name: 'Large', price: 200 },
  ],
  'extras': [
    { id: 'extra-shot', name: 'Extra Shot', price: 200 },
    { id: 'whipped-cream', name: 'Whipped Cream', price: 100 },
    { id: 'caramel', name: 'Caramel Syrup', price: 80 },
    { id: 'vanilla', name: 'Vanilla Syrup', price: 80 },
    { id: 'hazelnut', name: 'Hazelnut Syrup', price: 80 },
    { id: 'chocolate', name: 'Chocolate Drizzle', price: 80 },
  ],
  'pastry-extras': [
    { id: 'toast', name: 'Toast', price: 100 },
    { id: 'warm', name: 'Warm Up', price: 50 },
    { id: 'extra-cream-cheese', name: 'Extra Cream Cheese', price: 150 },
  ],
  'sandwich-extras': [
    { id: 'extra-cheese', name: 'Extra Cheese', price: 150 },
    { id: 'bacon', name: 'Add Bacon', price: 300 },
    { id: 'avocado', name: 'Add Avocado', price: 250 },
    { id: 'toasted', name: 'Extra Toasted', price: 0 },
  ],
};

// Menu items database
export const menuItems = [
  // Hot Drinks
  { id: 'hd-1', categoryId: 'hot-drinks', name: 'Latte', price: 800, description: 'Espresso with steamed milk', modifiers: ['milk', 'size', 'extras'], available: true },
  { id: 'hd-2', categoryId: 'hot-drinks', name: 'Cappuccino', price: 700, description: 'Espresso with foamed milk', modifiers: ['milk', 'size', 'extras'], available: true },
  { id: 'hd-3', categoryId: 'hot-drinks', name: 'Espresso', price: 500, description: 'Pure espresso shot', modifiers: ['extras'], available: true },
  { id: 'hd-4', categoryId: 'hot-drinks', name: 'Americano', price: 600, description: 'Espresso with hot water', modifiers: ['size', 'extras'], available: true },
  { id: 'hd-5', categoryId: 'hot-drinks', name: 'Mocha', price: 900, description: 'Espresso with chocolate and milk', modifiers: ['milk', 'size', 'extras'], available: true },
  { id: 'hd-6', categoryId: 'hot-drinks', name: 'Macchiato', price: 600, description: 'Espresso marked with foam', modifiers: ['milk', 'extras'], available: true },
  { id: 'hd-7', categoryId: 'hot-drinks', name: 'Flat White', price: 800, description: 'Velvety microfoam milk', modifiers: ['milk', 'extras'], available: true },
  { id: 'hd-8', categoryId: 'hot-drinks', name: 'Hot Chocolate', price: 700, description: 'Rich chocolate with steamed milk', modifiers: ['milk', 'extras'], available: true },
  { id: 'hd-9', categoryId: 'hot-drinks', name: 'Caramel Latte', price: 950, description: 'Latte with caramel syrup', modifiers: ['milk', 'size', 'extras'], available: true },
  { id: 'hd-10', categoryId: 'hot-drinks', name: 'Vienna', price: 800, description: 'Double espresso with whipped cream', modifiers: ['extras'], available: true },

  // Tea
  { id: 'tea-1', categoryId: 'tea', name: 'Earl Grey', price: 600, description: 'Classic bergamot tea', modifiers: ['size'], available: true },
  { id: 'tea-2', categoryId: 'tea', name: 'Chamomile', price: 600, description: 'Soothing floral herbal tea', modifiers: ['size'], available: true },
  { id: 'tea-3', categoryId: 'tea', name: 'Green Tea', price: 600, description: 'Fresh Japanese green tea', modifiers: ['size'], available: true },
  { id: 'tea-4', categoryId: 'tea', name: 'Masala Chai', price: 700, description: 'Spiced Indian tea', modifiers: ['milk', 'size'], available: true },
  { id: 'tea-5', categoryId: 'tea', name: 'Matcha Latte', price: 1000, description: 'Japanese green tea latte', modifiers: ['milk', 'size'], available: true },
  { id: 'tea-6', categoryId: 'tea', name: 'English Breakfast', price: 600, description: 'Robust black tea blend', modifiers: ['milk', 'size'], available: true },
  { id: 'tea-7', categoryId: 'tea', name: 'Peppermint', price: 600, description: 'Refreshing mint tea', modifiers: ['size'], available: true },

  // Cold Drinks
  { id: 'cd-1', categoryId: 'cold-drinks', name: 'Iced Latte', price: 900, description: 'Espresso with cold milk over ice', modifiers: ['milk', 'extras'], available: true },
  { id: 'cd-2', categoryId: 'cold-drinks', name: 'Iced Americano', price: 700, description: 'Espresso with cold water over ice', modifiers: ['extras'], available: true },
  { id: 'cd-3', categoryId: 'cold-drinks', name: 'Cold Brew', price: 800, description: 'Smooth 12-hour cold brewed coffee', modifiers: ['milk', 'extras'], available: true },
  { id: 'cd-4', categoryId: 'cold-drinks', name: 'Lemon Tea', price: 700, description: 'Refreshing iced lemon tea', modifiers: [], available: true },
  { id: 'cd-5', categoryId: 'cold-drinks', name: 'Iced Matcha', price: 1100, description: 'Iced matcha green tea latte', modifiers: ['milk'], available: true },
  { id: 'cd-6', categoryId: 'cold-drinks', name: 'Mango Smoothie', price: 1200, description: 'Fresh mango and yogurt blend', modifiers: [], available: true },
  { id: 'cd-7', categoryId: 'cold-drinks', name: 'Berry Blast', price: 1200, description: 'Mixed berries smoothie', modifiers: [], available: true },
  { id: 'cd-8', categoryId: 'cold-drinks', name: 'Iced Mocha', price: 1000, description: 'Chocolate coffee cooler', modifiers: ['milk', 'extras'], available: true },
  { id: 'cd-9', categoryId: 'cold-drinks', name: 'Sparkling Water', price: 500, description: 'Chilled sparkling water', modifiers: [], available: true },
  { id: 'cd-10', categoryId: 'cold-drinks', name: 'Fresh Juice', price: 800, description: 'Orange or apple juice', modifiers: [], available: true },

  // Pastries
  { id: 'p-1', categoryId: 'pastries', name: 'Croissant', price: 600, description: 'Buttery flaky croissant', modifiers: ['pastry-extras'], available: true },
  { id: 'p-2', categoryId: 'pastries', name: 'Almond Croissant', price: 800, description: 'Croissant filled with almond cream', modifiers: ['pastry-extras'], available: true },
  { id: 'p-3', categoryId: 'pastries', name: 'Blueberry Muffin', price: 700, description: 'Fresh blueberry muffin', modifiers: ['pastry-extras'], available: true },
  { id: 'p-4', categoryId: 'pastries', name: 'Chocolate Muffin', price: 700, description: 'Rich chocolate chip muffin', modifiers: ['pastry-extras'], available: true },
  { id: 'p-5', categoryId: 'pastries', name: 'Chocolate Cake', price: 900, description: 'Dark chocolate layer cake', modifiers: [], available: true },
  { id: 'p-6', categoryId: 'pastries', name: 'Cheesecake', price: 1000, description: 'New York style cheesecake', modifiers: [], available: true },
  { id: 'p-7', categoryId: 'pastries', name: 'Cinnamon Roll', price: 750, description: 'Warm cinnamon swirl', modifiers: ['pastry-extras'], available: true },
  { id: 'p-8', categoryId: 'pastries', name: 'Banana Bread', price: 650, description: 'Moist homemade banana bread', modifiers: ['pastry-extras'], available: true },
  { id: 'p-9', categoryId: 'pastries', name: 'Apple Turnover', price: 700, description: 'Crispy apple-filled pastry', modifiers: ['pastry-extras'], available: true },
  { id: 'p-10', categoryId: 'pastries', name: 'Bagel', price: 500, description: 'Fresh baked bagel', modifiers: ['pastry-extras'], available: true },

  // Sandwiches
  { id: 's-1', categoryId: 'sandwiches', name: 'Grilled Cheese', price: 1200, description: 'Classic cheese toastie', modifiers: ['sandwich-extras'], available: true },
  { id: 's-2', categoryId: 'sandwiches', name: 'Ham & Cheese', price: 1300, description: 'Ham with melted cheese', modifiers: ['sandwich-extras'], available: true },
  { id: 's-3', categoryId: 'sandwiches', name: 'Tuna Melt', price: 1400, description: 'Tuna salad with melted cheese', modifiers: ['sandwich-extras'], available: true },
  { id: 's-4', categoryId: 'sandwiches', name: 'Veggie Wrap', price: 1200, description: 'Fresh vegetables in tortilla', modifiers: ['sandwich-extras'], available: true },
  { id: 's-5', categoryId: 'sandwiches', name: 'Club Sandwich', price: 1500, description: 'Triple-decker with bacon', modifiers: ['sandwich-extras'], available: true },
  { id: 's-6', categoryId: 'sandwiches', name: 'Chicken Panini', price: 1400, description: 'Grilled chicken sandwich', modifiers: ['sandwich-extras'], available: true },
  { id: 's-7', categoryId: 'sandwiches', name: 'BLT', price: 1300, description: 'Bacon, lettuce, tomato', modifiers: ['sandwich-extras'], available: true },
  { id: 's-8', categoryId: 'sandwiches', name: 'Egg Sandwich', price: 1100, description: 'Scrambled eggs and cheese', modifiers: ['sandwich-extras'], available: true },

  // Combos
  { id: 'c-1', categoryId: 'combos', name: 'Coffee + Croissant', price: 1200, description: 'Any hot coffee with croissant', modifiers: [], available: true },
  { id: 'c-2', categoryId: 'combos', name: 'Coffee + Muffin', price: 1300, description: 'Any hot coffee with muffin', modifiers: [], available: true },
  { id: 'c-3', categoryId: 'combos', name: 'Any 2 Pastries', price: 1000, description: 'Choose any two pastries', modifiers: [], available: true },
  { id: 'c-4', categoryId: 'combos', name: 'Breakfast Set', price: 1800, description: 'Coffee, croissant, and egg sandwich', modifiers: [], available: true },
  { id: 'c-5', categoryId: 'combos', name: 'Lunch Combo', price: 2200, description: 'Coffee, sandwich, and side salad', modifiers: [], available: true },
  { id: 'c-6', categoryId: 'combos', name: 'Afternoon Tea', price: 2000, description: 'Tea, scone, and slice of cake', modifiers: [], available: true },
];

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
