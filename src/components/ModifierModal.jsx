import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { resolveModifierGroups } from '../data/menuData';
import { formatPrice } from '../utils/helpers';
import { X, Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModifierModal() {
  const { state, actions } = useApp();
  const { isModifierModalOpen, selectedMenuItem } = state;
  
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  if (!isModifierModalOpen || !selectedMenuItem) return null;
  
  // Groups come from the item itself — either the admin-configured
  // `modifierGroups` or the built-in starter sets for legacy seed items.
  const availableModifierGroups = resolveModifierGroups(selectedMenuItem);
  
  const toggleModifier = (modifier) => {
    setSelectedModifiers(prev => {
      const exists = prev.find(m => m.id === modifier.id);
      if (exists) {
        return prev.filter(m => m.id !== modifier.id);
      }
      return [...prev, modifier];
    });
  };
  
  const handleAddToOrder = () => {
    actions.addItem(selectedMenuItem, selectedModifiers, quantity, specialInstructions);
    actions.closeModifierModal();
    // The cart itself gives immediate feedback; avoid a popup on every item.
    // Reset state
    setSelectedModifiers([]);
    setQuantity(1);
    setSpecialInstructions('');
  };
  
  const basePrice = selectedMenuItem.price;
  const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
  const totalPrice = (basePrice + modifierTotal) * quantity;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => actions.closeModifierModal()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-latte/20 flex items-center justify-between bg-cream">
            <div>
              <h2 className="font-display text-xl font-semibold text-dark-roast">
                {selectedMenuItem.name}
              </h2>
              <p className="text-sm text-medium-roast">
                {selectedMenuItem.description}
              </p>
            </div>
            <button
              onClick={() => actions.closeModifierModal()}
              className="p-2 rounded-lg hover:bg-latte/20 transition-colors"
            >
              <X className="w-5 h-5 text-medium-roast" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Modifier groups */}
            {availableModifierGroups.map(group => (
              <div key={group.id}>
                <h3 className="font-semibold text-dark-roast mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  {group.name}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map(option => {
                    const isSelected = selectedModifiers.find(m => m.id === option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleModifier(option)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all btn-press text-left ${
                          isSelected
                            ? 'border-accent bg-accent/5'
                            : 'border-latte/30 hover:border-latte/50'
                        }`}
                      >
                        <span className="font-medium text-dark-roast">{option.name}</span>
                        <div className="flex items-center gap-2">
                          {option.price > 0 && (
                            <span className="text-sm text-medium-roast font-mono">
                              +{formatPrice(option.price)}
                            </span>
                          )}
                          {isSelected ? (
                            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-latte/30 rounded-full"></div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Special instructions */}
            <div>
              <h3 className="font-semibold text-dark-roast mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-accent rounded-full"></span>
                Special Instructions
              </h3>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any allergies or special requests..."
                className="w-full p-3 bg-cream border border-latte/30 rounded-xl resize-none focus:outline-none focus:border-accent text-dark-roast placeholder:text-medium-roast/50"
                rows={2}
              />
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-latte/20 bg-cream">
            {/* Quantity */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-dark-roast">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-latte/30 flex items-center justify-center hover:bg-latte/10 transition-colors"
                >
                  <Minus className="w-5 h-5 text-medium-roast" />
                </button>
                <span className="w-12 text-center text-xl font-bold text-dark-roast">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl bg-white border border-latte/30 flex items-center justify-center hover:bg-latte/10 transition-colors"
                >
                  <Plus className="w-5 h-5 text-medium-roast" />
                </button>
              </div>
            </div>
            
            {/* Price summary */}
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-medium-roast">Base price</span>
              <span className="font-mono text-dark-roast">{formatPrice(basePrice)}</span>
            </div>
            {modifierTotal > 0 && (
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-medium-roast">Modifiers</span>
                <span className="font-mono text-dark-roast">+{formatPrice(modifierTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4 pt-2 border-t border-latte/20">
              <span className="font-semibold text-dark-roast">Total</span>
              <span className="font-mono text-2xl font-bold text-accent">
                {formatPrice(totalPrice)}
              </span>
            </div>
            
            {/* Add button */}
            <button
              onClick={handleAddToOrder}
              className="w-full py-4 bg-accent text-white rounded-xl font-semibold text-lg shadow-lg shadow-accent/30 hover:bg-accent/90 transition-all btn-press flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Add to Order
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
