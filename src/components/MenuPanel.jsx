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
  ChevronDown
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

  // The category list is an accordion: exactly one section is open at a time
  // and its items sit directly underneath it. That keeps every category
  // reachable in one tap without the old always-on grid of buttons eating
  // the top third of the screen.
  const toggleCategory = (categoryId) => {
    actions.selectCategory(selectedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="flex flex-col h-full bg-cream">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {categories.map(category => {
          const Icon = categoryIcons[category.icon] || Coffee;
          const isOpen = selectedCategory === category.id;
          const items = menuItems.filter(item => item.categoryId === category.id);
          const availableCount = items.filter(item => item.available).length;

          return (
            <div
              key={category.id}
              className={`rounded-xl overflow-hidden border transition-colors ${
                isOpen ? 'border-espresso/30 shadow-sm' : 'border-latte/20'
              }`}
            >
              <button
                onClick={() => toggleCategory(category.id)}
                aria-expanded={isOpen}
                className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-colors touch-persist ${
                  isOpen
                    ? 'bg-espresso text-white'
                    : 'bg-white text-dark-roast hover:bg-latte/10'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left truncate">{category.name}</span>
                <span className={`text-xs tabular-nums shrink-0 ${isOpen ? 'text-white/70' : 'text-medium-roast'}`}>
                  {availableCount}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden bg-white"
                  >
                    {items.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-medium-roast text-center">
                        No items in this category yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                        {items.map(item => (
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
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
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
