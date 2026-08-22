import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../data/language';
import {
  Coffee,
  User,
  Shield,
  Users,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const { state, actions } = useApp();
  const { users, language } = state;
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const handleLanguageChange = (lang) => {
    actions.setLanguage(lang);
    setShowLangMenu(false);
  };
  
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setPin('');
    setError('');
  };
  
  const handlePinSubmit = () => {
    if (pin === selectedUser.pin) {
      actions.login(selectedUser);
      actions.addToast(t('success', language), 'success');
    } else {
      setError(t('invalidPin', language));
      setPin('');
    }
  };
  
  const handlePinChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };
  
  // One section per role, in order of responsibility.
  const roleSections = [
    { role: 'admin', icon: Shield, iconWrap: 'bg-espresso/10 text-espresso', avatar: 'bg-espresso', users: users.filter(u => u.role === 'admin') },
    { role: 'manager', icon: Briefcase, iconWrap: 'bg-accent/10 text-accent', avatar: 'bg-accent', users: users.filter(u => u.role === 'manager') },
    { role: 'server', icon: Users, iconWrap: 'bg-success/10 text-success', avatar: 'bg-success', users: users.filter(u => u.role === 'server') },
  ].filter(section => section.users.length > 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-espresso via-espresso to-dark-roast flex items-center justify-center p-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
          >
            <Globe className="w-5 h-5" />
            <span className="font-medium">{language === 'en' ? 'English' : 'বাংলা'}</span>
          </button>
          
          {showLangMenu && (
            <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden z-50">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`w-full px-6 py-3 text-left hover:bg-cream transition-colors ${
                  language === 'en' ? 'bg-accent/10 text-accent font-medium' : 'text-dark-roast'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => handleLanguageChange('bn')}
                className={`w-full px-6 py-3 text-left hover:bg-cream transition-colors ${
                  language === 'bn' ? 'bg-accent/10 text-accent font-medium' : 'text-dark-roast'
                }`}
              >
                🇧🇩 বাংলা
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-2xl mb-4"
          >
            <Coffee className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-display font-bold text-white mb-2"
          >
            {t('appName', language)}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-latte text-lg"
          >
            {t('selectRole', language)}
          </motion.p>
        </div>
        
        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {!selectedUser ? (
            <div className="p-8 space-y-8">
              {roleSections.map(({ role, icon: RoleIcon, iconWrap, avatar, users: roleUsers }) => (
                <div key={role}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconWrap}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-dark-roast">{t(role, language)}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {roleUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="flex items-center gap-3 p-4 bg-cream rounded-xl hover:bg-latte/20 transition-colors text-left group"
                      >
                        <div className={`w-12 h-12 ${avatar} rounded-xl flex items-center justify-center`}>
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-dark-roast group-hover:text-accent transition-colors">
                            {user.name}
                          </p>
                          <p className="text-sm text-medium-roast">{t(user.role, language)}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-latte group-hover:text-accent transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* PIN Entry */
            <div className="p-8">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex items-center gap-2 text-medium-roast hover:text-dark-roast mb-6 transition-colors"
              >
                ← {t('back', language)}
              </button>
              
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-espresso rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold text-dark-roast mb-1">
                  {selectedUser.name}
                </h2>
                <p className="text-medium-roast">{t(selectedUser.role, language)}</p>
              </div>
              
              <div className="max-w-xs mx-auto">
                <label className="block text-center text-sm font-medium text-medium-roast mb-3">
                  {t('enterPin', language)}
                </label>
                
                <div className="flex justify-center gap-3 mb-4">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                        error
                          ? 'border-error bg-error/5'
                          : pin.length > i
                          ? 'border-accent bg-accent/5'
                          : 'border-latte/30 bg-cream'
                      }`}
                    >
                      {pin.length > i ? '•' : ''}
                    </div>
                  ))}
                </div>
                
                {error && (
                  <div className="flex items-center justify-center gap-2 text-error mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                
                {/* PIN Pad */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((key, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (key === 'del') {
                          setPin(pin.slice(0, -1));
                        } else if (key !== '' && pin.length < 4) {
                          const newPin = pin + key;
                          setPin(newPin);
                          if (newPin.length === 4) {
                            setTimeout(() => {
                              if (newPin === selectedUser.pin) {
                                actions.login(selectedUser);
                              } else {
                                setError(t('invalidPin', language));
                                setPin('');
                              }
                            }, 100);
                          }
                        }
                      }}
                      disabled={key === ''}
                      className={`h-14 rounded-xl font-semibold text-lg transition-colors ${
                        key === ''
                          ? 'bg-transparent'
                          : key === 'del'
                          ? 'bg-latte/10 text-medium-roast hover:bg-latte/20'
                          : 'bg-cream text-dark-roast hover:bg-latte/20 active:bg-latte/30'
                      }`}
                    >
                      {key === 'del' ? '⌫' : key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Footer */}
        <p className="text-center text-latte/60 text-sm mt-6">
          © 2024 Café POS System
        </p>
      </div>
    </div>
  );
}
