import { useApp } from '../context/AppContext';
import { resolveModifierGroups } from '../data/menuData';
import {
  Coffee,
  Utensils,
  Beef,
  Drumstick,
  Fish,
  Leaf,
  Croissant,
  Candy,
  Cake,
  Plus,
  Flame,
  Grid3X3,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categoryIcons = {
  Utensils,
  Beef,
  Drumstick,
  Fish,
  Leaf,
  Croissant,
  Candy,
  Cake,
  Coffee,
};

export default function MenuPanel() {
  const { state, actions } = useApp();
  const { categories, menuItems, selectedCategory } = state;

  // The category list is a vertical tabbed side menu: one tab per category on
  // the left, the selected category's items on the right. Categories starred
  // as "default" by an Admin/Manager are marked with a small star, and the POS
  // always opens with the first default category selected (see AppContext).
  const activeCategory =
    categories.find(category => category.id === selectedCategory) ||
    categories[0] ||
    null;
  const activeItems = activeCategory
    ? menuItems.filter(item => item.categoryId === activeCategory.id)
    : [];

  return (
    <div className="flex flex-col h-full bg-cream">
      <div className="flex flex-1 min-h-0">
        {/* Vertical category tabs */}
        <nav
          aria-label="Menu categories"
          className="w-24 md:w-28 shrink-0 bg-white border-r border-latte/20 overflow-y-auto"
        >
          <div className="p-2 space-y-1.5">
            {categories.map(category => {
              const Icon = categoryIcons[category.icon] || Coffee;
              const isActive = activeCategory?.id === category.id;
              const items = menuItems.filter(item => item.categoryId === category.id);
              const availableCount = items.filter(item => item.available).length;

              return (
                <button
                  key={category.id}
                  onClick={() => actions.selectCategory(category.id)}
                  aria-pressed={isActive}
                  title={category.name}
                  className={`relative w-full flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 transition-colors touch-persist btn-press ${
                    isActive
                      ? 'bg-espresso text-white shadow-sm'
                      : 'bg-cream/70 text-dark-roast hover:bg-latte/15'
                  }`}
                >
                  {/* Accent bar on the active tab */}
                  {isActive && (
                    <motion.span
                      layoutId="category-tab-indicator"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-accent"
                    />
                  )}

                  {/* Default-category marker (starred in Category Management) */}
                  {category.isDefault && (
                    <Star
                      className={`absolute top-1 right-1 w-3 h-3 ${
                        isActive ? 'text-amber-300' : 'text-accent'
                      }`}
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  )}

                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[11px] leading-tight font-medium text-center line-clamp-2 w-full">
                    {category.name}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums ${
                      isActive ? 'text-white/70' : 'text-medium-roast'
                    }`}
                  >
                    {availableCount}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Items of the selected category */}
        <div className="flex-1 min-w-0 flex flex-col">
          {activeCategory ? (
            <>
              <div className="px-3 pt-3 pb-1 flex items-center justify-between gap-2">
                <h2 className="font-display font-semibold text-dark-roast truncate">
                  {activeCategory.name}
                </h2>
                <span className="text-xs text-medium-roast shrink-0 tabular-nums">
                  {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 pt-2">
                {activeItems.length === 0 ? (
                  <p className="py-10 text-sm text-medium-roast text-center">
                    No items in this category yet.
                  </p>
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeCategory.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="grid grid-cols-2 xl:grid-cols-3 gap-2"
                    >
                      {activeItems.map(item => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          onAdd={() => {
                            if (resolveModifierGroups(item).length > 0) {
                              actions.openModifierModal(item);
                            } else {
                              actions.addItem(item, [], 1, '');
                            }
                          }}
                          disabled={!item.available}
                        />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-sm text-medium-roast text-center">
                No categories yet. Add one in Category Management.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions — one shortcut to the floor view (it covers both
          picking a table and general table management). */}
      <div className="p-3 border-t border-latte/20 bg-white">
        <button
          onClick={() => actions.setView('tables')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press"
        >
          <Grid3X3 className="w-5 h-5" />
          <span>Tables &amp; Floor</span>
        </button>
      </div>
    </div>
  );
}

function MenuItemCard({ item, onAdd, disabled }) {
  const customizable = resolveModifierGroups(item).length > 0;

  const handleAdd = (event) => {
    event.stopPropagation();
    if (!disabled) onAdd();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => {
        // Tapping anywhere on the card adds the item (the + button still works too).
        if (!disabled) onAdd();
      }}
      className={`relative bg-white rounded-xl shadow-sm border border-latte/20 overflow-hidden card-hover select-none ${
        disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Unavailable badge */}
      {disabled && (
        <div className="absolute top-2 right-2 bg-error text-white text-xs px-2 py-1 rounded-full z-10">
          Unavailable
        </div>
      )}

      {/* Item content */}
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-dark-roast text-sm leading-tight">
            {item.name}
          </h3>
          <button
            onClick={handleAdd}
            disabled={disabled}
            aria-label={`Add ${item.name}`}
            className={`p-1.5 rounded-lg transition-all btn-press shrink-0 ${
              disabled
                ? 'bg-latte/20 text-latte cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-medium-roast mb-2 line-clamp-2">
          {item.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-espresso">
            RM {(item.price / 100).toFixed(2)}
          </span>

          {customizable && (
            <span className="text-xs text-latte flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Customizable
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
