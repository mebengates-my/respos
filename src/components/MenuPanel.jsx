import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Coffee,
  CupSoda,
  GlassWater,
  Croissant,
  Sandwich,
  Gift,
  Plus,
  Minus,
  Check,
  X,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modifiers as modifierOptions } from '../data/menuData';

const categoryIcons = {
  'hot-drinks': Coffee,
  'tea': CupSoda,
  'cold-drinks': GlassWater,
  'pastries': Croissant,
  'sandwiches': Sandwich,
  'combos': Gift,
};

export default function MenuPanel() {
  const { state, actions } = useApp();
  const { categories, menuItems, selectedCategory, currentOrder } = state;
  
  const filteredItems = menuItems.filter(item => item.categoryId === selectedCategory);
  
  return (
    <div className="flex flex-col h-full bg-cream">
      {/* Categories */}
      <div className="p-4 border-b border-latte/20">
        <h2 className="text-sm font-semibold text-medium-roast mb-3 uppercase tracking-wider">
          Categories
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => {
            const Icon = categoryIcons[category.icon] || Coffee;
            return (
              <button
                key={category.id}
                onClick={() => actions.selectCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all touch-persist btn-press ${
                  selectedCategory === category.id
                    ? 'bg-espresso text-white shadow-lg'
                    : 'bg-white text-dark-roast hover:bg-latte/20 shadow-sm border border-latte/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Menu Items */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-medium-roast mb-3 uppercase tracking-wider">
          {categories.find(c => c.id === selectedCategory)?.name || 'Items'}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAdd={() => {
                  if (item.modifiers && item.modifiers.length > 0) {
                    actions.openModifierModal(item);
                  } else {
                    actions.addItem(item, [], 1, '');
                    actions.addToast(`Added ${item.name}`, 'success');
                  }
                }}
                disabled={!item.available}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="p-4 border-t border-latte/20 bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => actions.setView('tables')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press"
          >
            <span>📋</span>
            <span>Select Table</span>
          </button>
          <button
            onClick={() => actions.setView('tables')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press"
          >
            <span>🪑</span>
            <span>Table View</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItemCard({ item, onAdd, disabled }) {
  const { state, actions } = useApp();
  const [showQuantity, setShowQuantity] = React.useState(false);
  const [quantity, setQuantity] = React.useState(1);
  
  const handleAdd = (e) => {
    e.stopPropagation();
    if (disabled) return;
    
    if (item.modifiers && item.modifiers.length > 0) {
      actions.openModifierModal(item);
    } else {
      actions.addItem(item, [], 1, '');
      actions.addToast(`Added ${item.name}`, 'success');
    }
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative bg-white rounded-xl shadow-sm border border-latte/20 overflow-hidden card-hover ${
        disabled ? 'opacity-50 grayscale' : ''
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
            className={`p-1.5 rounded-lg transition-all btn-press ${
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
          
          {item.modifiers && item.modifiers.length > 0 && (
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
