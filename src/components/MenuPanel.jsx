import { useCallback, useEffect, useRef, useState } from 'react';
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
  Star,
  ChevronRight,
  ChevronLeft,
  X
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

// How long the drawer stays open after a category is picked, so the tap
// registers visually before the panel slides away again.
const AUTO_HIDE_DELAY = 180;
// Idle timeout: if the drawer is pulled out but nothing is chosen, it slides
// back on its own instead of eating screen space.
const IDLE_HIDE_DELAY = 6000;

export default function MenuPanel() {
  const { state, actions } = useApp();
  const { categories, menuItems, selectedCategory } = state;

  // Categories live in a click-to-expand drawer: a slim handle on the left
  // edge pulls out a panel of every category, and the panel auto-hides once a
  // choice is made (or after a few idle seconds) to give the item grid the
  // full width. Categories starred as "default" by an Admin/Manager are marked
  // with a small star, and the POS always opens with the first default
  // category selected (see AppContext).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hideTimer = useRef(null);
  const idleTimer = useRef(null);
  const handleRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    hideTimer.current = null;
    idleTimer.current = null;
  }, []);

  const closeDrawer = useCallback(({ focusHandle = false } = {}) => {
    clearTimers();
    setDrawerOpen(false);
    if (focusHandle) handleRef.current?.focus();
  }, [clearTimers]);

  const openDrawer = useCallback(() => {
    clearTimers();
    setDrawerOpen(true);
  }, [clearTimers]);

  // Restart the idle countdown whenever the drawer opens or is interacted with.
  const armIdleHide = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setDrawerOpen(false), IDLE_HIDE_DELAY);
  }, []);

  useEffect(() => {
    if (drawerOpen) armIdleHide();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [drawerOpen, armIdleHide]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeDrawer({ focusHandle: true });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const activeCategory =
    categories.find(category => category.id === selectedCategory) ||
    categories[0] ||
    null;
  const activeItems = activeCategory
    ? menuItems.filter(item => item.categoryId === activeCategory.id)
    : [];
  const ActiveIcon = (activeCategory && categoryIcons[activeCategory.icon]) || Coffee;

  // Pick a category, then let the panel slide away by itself.
  const chooseCategory = (categoryId) => {
    actions.selectCategory(categoryId);
    clearTimers();
    hideTimer.current = setTimeout(() => setDrawerOpen(false), AUTO_HIDE_DELAY);
  };

  return (
    <div className="flex flex-col h-full bg-cream">
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Collapsed handle — click to pull the category panel out */}
        <div className="w-12 shrink-0 bg-white border-r border-latte/20 flex flex-col items-center py-2 gap-2">
          <button
            ref={handleRef}
            onClick={() => (drawerOpen ? closeDrawer() : openDrawer())}
            aria-expanded={drawerOpen}
            aria-controls="category-drawer"
            aria-label={drawerOpen ? 'Hide categories' : 'Show categories'}
            title={drawerOpen ? 'Hide categories' : 'Show categories'}
            className="group relative w-9 flex-1 min-h-0 rounded-xl bg-espresso text-white flex flex-col items-center justify-center gap-2 shadow-sm hover:bg-espresso/90 transition-colors touch-persist btn-press"
          >
            <ActiveIcon className="w-5 h-5 shrink-0" />
            <span
              className="text-[11px] font-semibold tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-h-[9rem]"
              style={{ writingMode: 'vertical-rl' }}
            >
              {activeCategory ? activeCategory.name : 'Categories'}
            </span>
            <motion.span
              animate={{ rotate: drawerOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.span>
          </button>
        </div>

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

        {/* Pull-out category drawer (overlays the grid, so no layout shift) */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="category-drawer-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => closeDrawer()}
                className="absolute inset-0 z-20 bg-dark-roast/25"
              />

              <motion.nav
                key="category-drawer"
                id="category-drawer"
                aria-label="Menu categories"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
                onMouseMove={armIdleHide}
                onTouchStart={armIdleHide}
                className="absolute inset-y-0 left-0 z-30 w-60 max-w-[80%] bg-white border-r border-latte/20 shadow-xl flex flex-col"
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-latte/20">
                  <span className="text-sm font-display font-semibold text-dark-roast">
                    Categories
                  </span>
                  <button
                    onClick={() => closeDrawer({ focusHandle: true })}
                    aria-label="Hide categories"
                    className="p-1.5 rounded-lg text-medium-roast hover:bg-latte/15 transition-colors btn-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {categories.length === 0 && (
                    <p className="py-8 px-2 text-xs text-medium-roast text-center">
                      No categories yet. Add one in Category Management.
                    </p>
                  )}

                  {categories.map(category => {
                    const Icon = categoryIcons[category.icon] || Coffee;
                    const isActive = activeCategory?.id === category.id;
                    const items = menuItems.filter(item => item.categoryId === category.id);
                    const availableCount = items.filter(item => item.available).length;

                    return (
                      <button
                        key={category.id}
                        onClick={() => chooseCategory(category.id)}
                        aria-pressed={isActive}
                        className={`relative w-full flex items-center gap-2.5 rounded-xl pl-3 pr-2 py-2.5 text-left transition-colors touch-persist btn-press ${
                          isActive
                            ? 'bg-espresso text-white shadow-sm'
                            : 'bg-cream/70 text-dark-roast hover:bg-latte/15'
                        }`}
                      >
                        {/* Accent bar on the active row */}
                        {isActive && (
                          <motion.span
                            layoutId="category-tab-indicator"
                            className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-accent"
                          />
                        )}

                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="flex-1 min-w-0 text-sm font-medium leading-tight truncate">
                          {category.name}
                        </span>

                        {/* Default-category marker (starred in Category Management) */}
                        {category.isDefault && (
                          <Star
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-amber-300' : 'text-accent'
                            }`}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                        )}

                        <span
                          className={`text-[11px] tabular-nums shrink-0 ${
                            isActive ? 'text-white/70' : 'text-medium-roast'
                          }`}
                        >
                          {availableCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 py-2 border-t border-latte/20 flex items-center gap-1.5 text-[11px] text-medium-roast">
                  <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Panel hides itself after you pick a category.</span>
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>
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
