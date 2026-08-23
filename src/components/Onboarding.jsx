import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../data/language';
import { cloudAuth } from '../services/cloud';
import {
  Coffee,
  Globe,
  Mail,
  Lock,
  Store,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building2,
  Loader2,
  ShieldCheck,
  Cloud,
  Link2,
  Copy,
  Check,
  PartyPopper
} from 'lucide-react';
import { motion } from 'framer-motion';

// Phases of the onboarding flow.
const PHASES = {
  LOADING: 'loading',
  SIGNIN: 'signin',
  SIGNUP: 'signup',
  CREATE_FIRST_STORE: 'create_first_store',
  SELECT_STORE: 'select_store',
  STORE_CREATED: 'store_created',
};

export default function Onboarding({ onBack }) {
  const { state, actions } = useApp();
  const { language } = state;

  const [phase, setPhase] = useState(PHASES.LOADING);
  const [cloudUser, setCloudUser] = useState(null); // the signed-in auth user
  const [stores, setStores] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // ---- Form state ----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [storeName, setStoreName] = useState('');

  // ---- Store-created confirmation (shows the shareable staff link) ----
  const [createdStore, setCreatedStore] = useState(null); // { name, slug, membership }
  const [copied, setCopied] = useState(false);

  const changeLanguage = (lang) => {
    actions.setLanguage(lang);
    setShowLangMenu(false);
  };

  // Enter the app once we know the auth user + their membership in a store.
  const enterStore = useCallback(
    (user, membership) => {
      actions.cloudLogin(user, membership);
    },
    [actions]
  );

  // After a sign-in / session restore, work out what the user should see.
  const loadStoresFor = useCallback(
    async (user) => {
      setCloudUser(user);
      const { data, error: storesError } = await cloudAuth.listMyStores();
      if (storesError) {
        setError(storesError.message);
        setPhase(PHASES.SIGNIN);
        return;
      }
      if (!data || data.length === 0) {
        setPhase(PHASES.CREATE_FIRST_STORE);
        return;
      }
      if (data.length === 1) {
        enterStore(user, data[0]);
        return;
      }
      setStores(data);
      setPhase(PHASES.SELECT_STORE);
    },
    [enterStore]
  );

  // Restore an existing session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await cloudAuth.getSession();
      if (cancelled) return;
      if (data?.user) {
        await loadStoresFor(data.user);
      } else {
        setPhase(PHASES.SIGNIN);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStoresFor]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data, error: signInError } = await cloudAuth.signIn({ email, password });
      if (signInError) {
        setError(signInError.message);
        setBusy(false);
        return;
      }
      await loadStoresFor(data.user);
    } catch {
      setError(t('error', language));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !displayName || !storeName) {
      setError(t('enterAllFields', language));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch', language));
      return;
    }
    setBusy(true);
    try {
      const { data: userData, error: signUpError } = await cloudAuth.signUp({
        email,
        password,
        displayName,
      });
      if (signUpError) {
        setError(signUpError.message);
        setBusy(false);
        return;
      }
      // Owner sign-up creates their first store (register_store equivalent).
      const { data: storeData, error: storeError } = await cloudAuth.registerStore({
        storeName,
        displayName,
      });
      if (storeError) {
        setError(storeError.message);
        setBusy(false);
        return;
      }
      const membership = { id: storeData.store.id, role: 'admin', displayName, slug: storeData.store.slug };
      setCloudUser(userData.user);
      setCreatedStore({ name: storeName, slug: storeData.store.slug, membership });
      setPhase(PHASES.STORE_CREATED);
    } catch {
      setError(t('error', language));
      setBusy(false);
    }
  };

  const handleCreateFirstStore = async (e) => {
    e.preventDefault();
    setError('');
    if (!storeName.trim()) {
      setError(t('enterAllFields', language));
      return;
    }
    setBusy(true);
    try {
      const { data: storeData, error: storeError } = await cloudAuth.registerStore({
        storeName,
        displayName: cloudUser?.displayName || '',
      });
      if (storeError) {
        setError(storeError.message);
        setBusy(false);
        return;
      }
      const membership = {
        id: storeData.store.id,
        role: 'admin',
        displayName: cloudUser?.displayName || '',
        slug: storeData.store.slug,
      };
      setCreatedStore({ name: storeName, slug: storeData.store.slug, membership });
      setPhase(PHASES.STORE_CREATED);
    } catch {
      setError(t('error', language));
      setBusy(false);
    }
  };

  const isDemoMode = !cloudAuth.isEnabled;

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
                onClick={() => changeLanguage('en')}
                className={`w-full px-6 py-3 text-left hover:bg-cream transition-colors ${
                  language === 'en' ? 'bg-accent/10 text-accent font-medium' : 'text-dark-roast'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => changeLanguage('bn')}
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

      <div className="w-full max-w-md">
        {/* Back to staff PIN login */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-latte/80 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {/* In mock mode the staff PIN login is behind this screen; in a real
              cloud deployment it just returns to the store login landing. */}
          <span className="text-sm">{isDemoMode ? t('backToPinLogin', language) : t('back', language)}</span>
        </button>

        {/* Mode badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${
            isDemoMode ? 'bg-amber-400/20 text-amber-200' : 'bg-success/20 text-success'
          }`}
        >
          {isDemoMode ? <Cloud className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {isDemoMode ? t('demoMode', language) : t('cloudConnected', language)}
        </div>
        {isDemoMode && (
          <p className="text-xs text-latte/60 -mt-3 mb-6">{t('demoModeHint', language)}</p>
        )}

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
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Loading */}
          {phase === PHASES.LOADING && (
            <div className="p-10 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-medium-roast font-medium">{t('loading', language)}</p>
            </div>
          )}

          {/* Sign in */}
          {phase === PHASES.SIGNIN && (
            <form onSubmit={handleSignIn} className="p-8 space-y-5">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-2xl mb-3">
                  <Store className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold text-dark-roast">
                  {t('signInTitle', language)}
                </h2>
              </div>

              <Field
                icon={<Mail className="w-5 h-5" />}
                label={t('email', language)}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="owner@example.com"
                autoComplete="email"
              />
              <Field
                icon={<Lock className="w-5 h-5" />}
                label={t('password', language)}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              {error && <ErrorNote message={error} />}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 disabled:opacity-60 transition-colors btn-press"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('signingIn', language)}
                  </>
                ) : (
                  <>
                    {t('signIn', language)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-medium-roast">
                {t('noAccount', language)}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setPhase(PHASES.SIGNUP);
                  }}
                  className="text-accent font-medium hover:underline"
                >
                  {t('signUp', language)}
                </button>
              </p>
            </form>
          )}

          {/* Sign up */}
          {phase === PHASES.SIGNUP && (
            <form onSubmit={handleSignUp} className="p-8 space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-2xl mb-3">
                  <Building2 className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold text-dark-roast">
                  {t('signUpTitle', language)}
                </h2>
              </div>

              <Field
                icon={<User className="w-5 h-5" />}
                label={t('displayName', language)}
                type="text"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Aisha Rahman"
                autoComplete="name"
              />
              <Field
                icon={<Store className="w-5 h-5" />}
                label={t('storeName', language)}
                type="text"
                value={storeName}
                onChange={setStoreName}
                placeholder="My Café"
                autoComplete="organization"
              />
              <Field
                icon={<Mail className="w-5 h-5" />}
                label={t('email', language)}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="owner@example.com"
                autoComplete="email"
              />
              <Field
                icon={<Lock className="w-5 h-5" />}
                label={t('password', language)}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <Field
                icon={<Lock className="w-5 h-5" />}
                label={t('confirmPassword', language)}
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />

              {error && <ErrorNote message={error} />}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 disabled:opacity-60 transition-colors btn-press"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('creatingStore', language)}
                  </>
                ) : (
                  <>
                    {t('signUp', language)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-medium-roast">
                {t('haveAccount', language)}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setPhase(PHASES.SIGNIN);
                  }}
                  className="text-accent font-medium hover:underline"
                >
                  {t('signIn', language)}
                </button>
              </p>
            </form>
          )}

          {/* Create first store */}
          {phase === PHASES.CREATE_FIRST_STORE && (
            <form onSubmit={handleCreateFirstStore} className="p-8 space-y-5">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-2xl mb-3">
                  <Building2 className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold text-dark-roast">
                  {t('createFirstStore', language)}
                </h2>
                <p className="text-sm text-medium-roast mt-1">{t('createFirstStoreHint', language)}</p>
              </div>

              <Field
                icon={<Store className="w-5 h-5" />}
                label={t('storeName', language)}
                type="text"
                value={storeName}
                onChange={setStoreName}
                placeholder="My Café"
              />

              {error && <ErrorNote message={error} />}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 disabled:opacity-60 transition-colors btn-press"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('creatingStore', language)}
                  </>
                ) : (
                  <>
                    {t('continueToStore', language)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Store created — show the shareable staff link */}
          {phase === PHASES.STORE_CREATED && createdStore && (
            <div className="p-8 space-y-5">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-success/10 text-success rounded-2xl mb-3">
                  <PartyPopper className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold text-dark-roast">
                  {t('storeCreatedTitle', language)}
                </h2>
                <p className="text-sm text-medium-roast mt-1 font-medium">{createdStore.name}</p>
              </div>

              <div className="bg-cream border border-latte/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-medium-roast mb-2">
                  <Link2 className="w-4 h-4" />
                  {t('yourStoreLink', language)}
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white border border-latte/30 rounded-lg text-sm text-dark-roast truncate">
                    {`${window.location.origin}/${createdStore.slug}`}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      const link = `${window.location.origin}/${createdStore.slug}`;
                      try {
                        await navigator.clipboard.writeText(link);
                      } catch {
                        // Clipboard may be blocked (insecure context) — the
                        // link stays visible to copy manually.
                      }
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-espresso text-white rounded-lg text-sm font-medium hover:bg-espresso/90 transition-colors shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? t('copied', language) : t('copy', language)}
                  </button>
                </div>
                <p className="text-xs text-medium-roast mt-3 leading-relaxed">
                  {t('staffLinkHint', language)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => enterStore(cloudUser, createdStore.membership)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors btn-press"
              >
                {t('continueToStore', language)}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Store selection */}
          {phase === PHASES.SELECT_STORE && (
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-bold text-dark-roast">
                  {t('chooseStore', language)}
                </h2>
                <p className="text-sm text-medium-roast mt-1">{t('chooseStoreHint', language)}</p>
              </div>

              <div className="space-y-3">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => enterStore(cloudUser, store)}
                    className="w-full flex items-center gap-4 p-4 bg-cream rounded-2xl hover:bg-latte/20 transition-colors text-left group"
                  >
                    <div className="w-12 h-12 bg-espresso rounded-xl flex items-center justify-center">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-dark-roast group-hover:text-accent transition-colors">
                        {store.name}
                      </p>
                      <p className="text-sm text-medium-roast">{t(store.role, language)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-latte group-hover:text-accent transition-colors" />
                  </button>
                ))}
              </div>

              <p className="text-center text-sm text-medium-roast mt-6">
                {t('noAccount', language)}{' '}
                <button
                  onClick={() => {
                    setError('');
                    setPhase(PHASES.CREATE_FIRST_STORE);
                  }}
                  className="text-accent font-medium hover:underline"
                >
                  {t('createFirstStore', language)}
                </button>
              </p>
            </div>
          )}
        </motion.div>

        <p className="text-center text-latte/60 text-sm mt-6">
          {t('copyright', language).replace('{year}', String(new Date().getFullYear()))}
        </p>
      </div>
    </div>
  );
}

// Small controlled text/password input.
function Field({ icon, label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-medium-roast mb-2">{label}</span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-latte">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full pl-12 pr-4 py-3 bg-cream border border-latte/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-dark-roast"
        />
      </div>
    </label>
  );
}

function ErrorNote({ message }) {
  return (
    <div className="flex items-center gap-2 text-error text-sm bg-error/5 rounded-xl px-3 py-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
