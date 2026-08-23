import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../data/language';
import { cloudAuth } from '../services/cloud';
import { navigate, parseStoreSlug } from '../utils/router';
import Onboarding from './Onboarding';
import {
  Coffee,
  User,
  Shield,
  Users,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Globe,
  Store,
  Search,
  Loader2,
  Link2,
  Home,
} from 'lucide-react';
import { motion } from 'framer-motion';

// The per-store login page (…/mycafe). Everyone on the team opens the same
// link; staff tap their name and enter their 4-digit PIN — no emails, and
// never the owner's password. Owners use the email sign-in link at the
// bottom.
export default function StoreLogin({ slug }) {
  const { state, actions } = useApp();
  const { language } = state;

  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready' | 'notfound'
  const [store, setStore] = useState(null);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ownerMode, setOwnerMode] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [retryLink, setRetryLink] = useState('');

  // Resolve the store + roster whenever the slug changes.
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setSelected(null);
    setPin('');
    setError('');
    (async () => {
      const { data: storeData, error: storeError } = await cloudAuth.getStoreBySlug(slug);
      if (cancelled) return;
      if (storeError || !storeData) {
        setPhase('notfound');
        return;
      }
      setStore(storeData);
      const { data: roster } = await cloudAuth.getStoreRoster(slug);
      if (cancelled) return;
      setMembers(roster || []);
      setPhase('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Owner (email + password) sign-in reuses the existing onboarding screens.
  // Returned after the hooks above so hook order stays stable.
  if (ownerMode) {
    return <Onboarding onBack={() => setOwnerMode(false)} />;
  }

  const handleLanguageChange = (lang) => {
    actions.setLanguage(lang);
    setShowLangMenu(false);
  };

  const handleUserSelect = (member) => {
    setSelected(member);
    setPin('');
    setError('');
  };

  const submitPin = async (value) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const { data, error: loginError } = await cloudAuth.pinLogin({
      slug,
      profileId: selected.id,
      pin: value,
    });
    setBusy(false);
    if (loginError || !data) {
      setError(
        loginError?.reason === 'locked' ? t('accountLocked', language) : t('invalidPin', language)
      );
      setPin('');
      return;
    }
    actions.cloudLogin(data.user, data.membership);
    actions.addToast(t('success', language), 'success');
  };

  const handlePinKey = (key) => {
    if (busy) return;
    if (key === 'del') {
      setPin(pin.slice(0, -1));
      setError('');
    } else if (pin.length < 4) {
      const next = pin + key;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => submitPin(next), 100);
      }
    }
  };

  const handleRetry = (e) => {
    e.preventDefault();
    const next = parseStoreSlug(retryLink);
    if (next && next !== slug) {
      navigate(`/${next}`);
    }
  };

  const roleSections = [
    { role: 'admin', icon: Shield, iconWrap: 'bg-espresso/10 text-espresso', avatar: 'bg-espresso', users: members.filter((m) => m.role === 'admin') },
    { role: 'manager', icon: Briefcase, iconWrap: 'bg-accent/10 text-accent', avatar: 'bg-accent', users: members.filter((m) => m.role === 'manager') },
    { role: 'server', icon: Users, iconWrap: 'bg-success/10 text-success', avatar: 'bg-success', users: members.filter((m) => m.role === 'server') },
  ].filter((section) => section.users.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-espresso via-espresso to-dark-roast flex items-center justify-center p-4">
      {/* Language toggle */}
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
        {/* Header — the store's own name, not just the app's */}
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
            {phase === 'ready' ? store.name : t('appName', language)}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-latte text-lg flex items-center justify-center gap-2"
          >
            {phase === 'ready' && (
              <>
                <Link2 className="w-4 h-4" />
                <span className="font-mono">{store.slug}</span>
              </>
            )}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Loading */}
          {phase === 'loading' && (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-medium-roast font-medium">{t('loadingStore', language)}</p>
            </div>
          )}

          {/* Unknown store link */}
          {phase === 'notfound' && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-error/10 text-error rounded-2xl mb-3">
                  <Search className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold text-dark-roast">
                  {t('storeNotFound', language)}
                </h2>
                <p className="text-sm text-medium-roast mt-1">{t('storeNotFoundHint', language)}</p>
              </div>
              <form onSubmit={handleRetry} className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={retryLink}
                  onChange={(e) => setRetryLink(e.target.value)}
                  placeholder={t('enterStoreLinkHint', language)}
                  className="flex-1 px-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-dark-roast"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors"
                >
                  {t('openYourStore', language)}
                </button>
              </form>
              <div className="text-center mt-6">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 text-sm text-medium-roast hover:text-dark-roast transition-colors"
                >
                  <Home className="w-4 h-4" />
                  {t('goHome', language)}
                </button>
              </div>
            </div>
          )}

          {/* Roster: pick who you are */}
          {phase === 'ready' && !selected && (
            <div className="p-8 space-y-8">
              <p className="text-center text-medium-roast -mt-2">{t('tapNamePin', language)}</p>
              {roleSections.length === 0 && (
                <p className="text-center text-medium-roast">{t('staffEmpty', language)}</p>
              )}
              {roleSections.map(({ role, icon: RoleIcon, iconWrap, avatar, users: roleUsers }) => (
                <div key={role}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconWrap}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-dark-roast">{t(role, language)}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {roleUsers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleUserSelect(member)}
                        className="flex items-center gap-3 p-4 bg-cream rounded-xl hover:bg-latte/20 transition-colors text-left group"
                      >
                        <div className={`w-12 h-12 ${avatar} rounded-xl flex items-center justify-center`}>
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-dark-roast group-hover:text-accent transition-colors">
                            {member.name}
                          </p>
                          <p className="text-sm text-medium-roast">{t(member.role, language)}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-latte group-hover:text-accent transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PIN entry */}
          {phase === 'ready' && selected && (
            <div className="p-8">
              <button
                onClick={() => {
                  setSelected(null);
                  setPin('');
                  setError('');
                }}
                className="flex items-center gap-2 text-medium-roast hover:text-dark-roast mb-6 transition-colors"
              >
                ← {t('back', language)}
              </button>

              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-espresso rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold text-dark-roast mb-1">
                  {selected.name}
                </h2>
                <p className="text-medium-roast">{t(selected.role, language)}</p>
              </div>

              <div className="max-w-xs mx-auto">
                <label className="block text-center text-sm font-medium text-medium-roast mb-3">
                  {t('enterPin', language)}
                </label>

                <div className="flex justify-center gap-3 mb-4">
                  {[0, 1, 2, 3].map((i) => (
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
                {busy && !error && (
                  <div className="flex items-center justify-center gap-2 text-medium-roast mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{t('checking', language)}</span>
                  </div>
                )}

                {/* PIN pad */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((key, i) => (
                    <button
                      key={i}
                      onClick={() => key !== '' && handlePinKey(key)}
                      disabled={key === '' || busy}
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

        {/* Footer: owner email sign-in + home */}
        {phase !== 'loading' && (
          <div className="text-center mt-6 space-y-3">
            <button
              onClick={() => setOwnerMode(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span className="text-sm font-medium">{t('ownerSignIn', language)}</span>
            </button>
            <p className="text-latte/60 text-sm">{t('ownerSignInNote', language)}</p>
            <p className="text-latte/60 text-sm">
              {t('copyright', language).replace('{year}', String(new Date().getFullYear()))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
