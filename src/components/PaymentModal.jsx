import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatPrice, calculateChange } from '../utils/helpers';
import {
  X,
  Banknote,
  CreditCard,
  Smartphone,
  Check,
  Loader2,
  Receipt,
  Printer,
  PartyPopper,
  ArrowLeft,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_CASH_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function PaymentModal() {
  const { state, actions } = useApp();
  const { isPaymentModalOpen, currentOrder, paymentMethod, selectedTable } = state;
  const [step, setStep] = useState('select'); // 'select' | 'enter' | 'processing' | 'success'
  const [customAmount, setCustomAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isPaymentModalOpen) {
      setStep(paymentMethod ? 'enter' : 'select');
      setCustomAmount('');
      setAmountPaid(0);
    }
  }, [isPaymentModalOpen, paymentMethod]);
  
  useEffect(() => {
    if (step === 'enter' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);
  
  if (!isPaymentModalOpen || !currentOrder) return null;
  
  const total = currentOrder.total;
  const change = calculateChange(amountPaid, total);
  const exactAmount = amountPaid >= total;
  
  const handlePayment = () => {
    setStep('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      setStep('success');
      actions.processPayment(paymentMethod, amountPaid, change);
      actions.addToast('Payment successful!', 'success');
    }, 1500);
  };
  
  const handleClose = () => {
    actions.closePaymentModal();
    setStep('select');
  };
  
  const handleSelectMethod = (method) => {
    actions.openPaymentModal(method);
    setStep('enter');
  };
  
  const handleQuickCash = (amount) => {
    setAmountPaid(amount);
    setCustomAmount(amount.toString());
  };
  
  const handleCustomInput = (value) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setAmountPaid(parseInt(numericValue) || 0);
  };
  
  const handleExact = () => {
    setAmountPaid(total);
    setCustomAmount(total.toString());
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'select' && (
            <SelectMethodStep
              onSelect={handleSelectMethod}
              onClose={handleClose}
              total={total}
            />
          )}
          
          {step === 'enter' && paymentMethod === 'cash' && (
            <CashPaymentStep
              total={total}
              amountPaid={amountPaid}
              customAmount={customAmount}
              onQuickCash={handleQuickCash}
              onCustomInput={handleCustomInput}
              onExact={handleExact}
              onBack={() => setStep('select')}
              onPay={handlePayment}
              onClose={handleClose}
              inputRef={inputRef}
            />
          )}
          
          {step === 'enter' && paymentMethod === 'card' && (
            <CardPaymentStep
              total={total}
              onBack={() => setStep('select')}
              onPay={handlePayment}
              onClose={handleClose}
            />
          )}
          
          {step === 'enter' && paymentMethod === 'ewallet' && (
            <EWalletPaymentStep
              total={total}
              onBack={() => setStep('select')}
              onPay={handlePayment}
              onClose={handleClose}
            />
          )}
          
          {step === 'processing' && (
            <ProcessingStep />
          )}
          
          {step === 'success' && (
            <SuccessStep
              amountPaid={amountPaid}
              change={change}
              onClose={handleClose}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SelectMethodStep({ onSelect, onClose, total }) {
  return (
    <>
      <div className="p-6 border-b border-latte/20 bg-cream">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-dark-roast">
            Payment
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-latte/20 transition-colors"
          >
            <X className="w-5 h-5 text-medium-roast" />
          </button>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-medium-roast mb-1">Total Amount</p>
          <p className="text-4xl font-mono font-bold text-accent">
            {formatPrice(total)}
          </p>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <h3 className="font-semibold text-dark-roast text-center mb-4">
          Select Payment Method
        </h3>
        
        <button
          onClick={() => onSelect('cash')}
          className="w-full flex items-center gap-4 p-4 bg-success/10 hover:bg-success/20 border-2 border-success/30 rounded-xl transition-all btn-press"
        >
          <div className="w-14 h-14 bg-success rounded-xl flex items-center justify-center">
            <Banknote className="w-7 h-7 text-white" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold text-dark-roast">Cash</h4>
            <p className="text-sm text-medium-roast">Pay with cash, receive change</p>
          </div>
        </button>
        
        <button
          onClick={() => onSelect('card')}
          className="w-full flex items-center gap-4 p-4 bg-espresso/10 hover:bg-espresso/20 border-2 border-espresso/30 rounded-xl transition-all btn-press"
        >
          <div className="w-14 h-14 bg-espresso rounded-xl flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold text-dark-roast">Credit/Debit Card</h4>
            <p className="text-sm text-medium-roast">Tap, insert, or swipe card</p>
          </div>
        </button>
        
        <button
          onClick={() => onSelect('ewallet')}
          className="w-full flex items-center gap-4 p-4 bg-medium-roast/10 hover:bg-medium-roast/20 border-2 border-medium-roast/30 rounded-xl transition-all btn-press"
        >
          <div className="w-14 h-14 bg-medium-roast rounded-xl flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold text-dark-roast">E-Wallet</h4>
            <p className="text-sm text-medium-roast">Touch ID, QR code, or NFC</p>
          </div>
        </button>
      </div>
    </>
  );
}

function CashPaymentStep({
  total,
  amountPaid,
  customAmount,
  onQuickCash,
  onCustomInput,
  onExact,
  onBack,
  onPay,
  onClose,
  inputRef
}) {
  const change = calculateChange(amountPaid, total);
  const exactAmount = amountPaid >= total;
  
  return (
    <>
      <div className="p-4 border-b border-latte/20 bg-cream">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-medium-roast hover:text-dark-roast transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-latte/20 transition-colors"
          >
            <X className="w-5 h-5 text-medium-roast" />
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-medium-roast mb-1">Amount Due</p>
          <p className="text-3xl font-mono font-bold text-dark-roast">
            {formatPrice(total)}
          </p>
        </div>
      </div>
      
      <div className="p-6">
        {/* Quick cash buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {QUICK_CASH_AMOUNTS.map(amount => (
            <button
              key={amount}
              onClick={() => onQuickCash(amount)}
              className={`p-3 rounded-xl font-semibold transition-all btn-press ${
                amountPaid === amount
                  ? 'bg-accent text-white shadow-lg'
                  : 'bg-cream text-dark-roast hover:bg-latte/30'
              }`}
            >
              {formatPrice(amount)}
            </button>
          ))}
        </div>
        
        <button
          onClick={onExact}
          className={`w-full mb-4 p-3 rounded-xl font-semibold transition-all btn-press ${
            amountPaid === total
              ? 'bg-success text-white shadow-lg'
              : 'bg-success/10 text-success hover:bg-success/20'
          }`}
        >
          Exact Amount - {formatPrice(total)}
        </button>
        
        {/* Custom amount input */}
        <div className="relative mb-6">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={customAmount ? parseInt(customAmount).toLocaleString() : ''}
            onChange={(e) => onCustomInput(e.target.value.replace(/,/g, ''))}
            placeholder="Enter custom amount..."
            className="w-full p-4 bg-cream border-2 border-latte/30 rounded-xl text-center text-2xl font-mono font-bold focus:outline-none focus:border-accent"
          />
          <Calculator className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-medium-roast" />
        </div>
        
        {/* Change calculation */}
        <div className="bg-cream rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-medium-roast">Amount Tendered</span>
            <span className="font-mono font-semibold text-dark-roast">
              {formatPrice(amountPaid)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-latte/30">
            <span className="font-semibold text-dark-roast">Change</span>
            <span className={`font-mono text-xl font-bold ${exactAmount ? 'text-success' : 'text-accent'}`}>
              {formatPrice(change)}
            </span>
          </div>
        </div>
        
        {/* Pay button */}
        <button
          onClick={onPay}
          disabled={!exactAmount}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all btn-press flex items-center justify-center gap-2 ${
            exactAmount
              ? 'bg-success text-white shadow-lg shadow-success/30 hover:bg-success/90'
              : 'bg-latte/30 text-latte cursor-not-allowed'
          }`}
        >
          <Check className="w-6 h-6" />
          Complete Payment
        </button>
        
        {!exactAmount && amountPaid > 0 && (
          <p className="text-center text-sm text-error mt-2">
            Amount tendered is less than total
          </p>
        )}
      </div>
    </>
  );
}

function CardPaymentStep({ total, onBack, onPay, onClose }) {
  const [status, setStatus] = useState('ready'); // 'ready' | 'processing' | 'success' | 'failed'
  
  const handleProcess = () => {
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
      setTimeout(onPay, 1000);
    }, 2000);
  };
  
  return (
    <>
      <div className="p-4 border-b border-latte/20 bg-cream">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-medium-roast hover:text-dark-roast transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-latte/20 transition-colors"
          >
            <X className="w-5 h-5 text-medium-roast" />
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-medium-roast mb-1">Total Amount</p>
          <p className="text-3xl font-mono font-bold text-accent">
            {formatPrice(total)}
          </p>
        </div>
      </div>
      
      <div className="p-6 flex flex-col items-center">
        <div className={`w-32 h-32 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
          status === 'processing' ? 'bg-warning/20' :
          status === 'success' ? 'bg-success/20' :
          'bg-espresso/10'
        }`}>
          {status === 'processing' ? (
            <Loader2 className="w-16 h-16 text-warning spinner" />
          ) : status === 'success' ? (
            <Check className="w-16 h-16 text-success" />
          ) : (
            <CreditCard className="w-16 h-16 text-espresso" />
          )}
        </div>
        
        {status === 'ready' && (
          <>
            <h3 className="font-semibold text-dark-roast text-lg mb-2">
              Ready to Accept Card
            </h3>
            <p className="text-medium-roast text-center mb-6">
              Tap, insert, or swipe card on the terminal
            </p>
            <button
              onClick={handleProcess}
              className="w-full py-4 bg-espresso text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-espresso/90 transition-all btn-press"
            >
              Simulate Card Tap
            </button>
          </>
        )}
        
        {status === 'processing' && (
          <h3 className="font-semibold text-warning text-lg">
            Processing Payment...
          </h3>
        )}
        
        {status === 'success' && (
          <h3 className="font-semibold text-success text-lg">
            Payment Approved!
          </h3>
        )}
      </div>
    </>
  );
}

function EWalletPaymentStep({ total, onBack, onPay, onClose }) {
  const [scanning, setScanning] = useState(false);
  
  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      onPay();
    }, 2000);
  };
  
  return (
    <>
      <div className="p-4 border-b border-latte/20 bg-cream">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-medium-roast hover:text-dark-roast transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-latte/20 transition-colors"
          >
            <X className="w-5 h-5 text-medium-roast" />
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-medium-roast mb-1">Total Amount</p>
          <p className="text-3xl font-mono font-bold text-accent">
            {formatPrice(total)}
          </p>
        </div>
      </div>
      
      <div className="p-6 flex flex-col items-center">
        <div className={`w-32 h-32 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
          scanning ? 'bg-success/20' : 'bg-medium-roast/10'
        }`}>
          {scanning ? (
            <Check className="w-16 h-16 text-success" />
          ) : (
            <Smartphone className="w-16 h-16 text-medium-roast" />
          )}
        </div>
        
        {!scanning ? (
          <>
            <h3 className="font-semibold text-dark-roast text-lg mb-2">
              Scan QR Code
            </h3>
            <p className="text-medium-roast text-center mb-6">
              Show the QR code to your customer to scan with their e-wallet
            </p>
            <button
              onClick={handleScan}
              className="w-full py-4 bg-medium-roast text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-medium-roast/90 transition-all btn-press"
            >
              Simulate QR Scan
            </button>
          </>
        ) : (
          <h3 className="font-semibold text-success text-lg">
            Payment Received!
          </h3>
        )}
      </div>
    </>
  );
}

function ProcessingStep() {
  return (
    <div className="p-12 flex flex-col items-center justify-center">
      <Loader2 className="w-16 h-16 text-accent spinner mb-6" />
      <h3 className="font-semibold text-dark-roast text-lg">
        Processing Payment...
      </h3>
      <p className="text-medium-roast mt-2">
        Please wait
      </p>
    </div>
  );
}

function SuccessStep({ amountPaid, change, onClose }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="p-8 flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="w-24 h-24 bg-success rounded-full flex items-center justify-center mb-6"
      >
        <Check className="w-12 h-12 text-white" />
      </motion.div>
      
      <h2 className="font-display text-2xl font-semibold text-dark-roast mb-2">
        Payment Successful!
      </h2>
      <p className="text-medium-roast mb-6">
        Thank you for your purchase
      </p>
      
      {change > 0 && (
        <div className="bg-cream rounded-xl p-4 mb-6 w-full">
          <p className="text-sm text-medium-roast">Change Due</p>
          <p className="text-2xl font-mono font-bold text-accent">
            {formatPrice(change)}
          </p>
        </div>
      )}
      
      <div className="flex gap-3 w-full mb-4">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press">
          <Receipt className="w-5 h-5" />
          Receipt
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press">
          <Printer className="w-5 h-5" />
          Print
        </button>
      </div>
      
      <button
        onClick={onClose}
        className="w-full py-4 bg-accent text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-accent/90 transition-all btn-press"
      >
        New Order
      </button>
    </motion.div>
  );
}
