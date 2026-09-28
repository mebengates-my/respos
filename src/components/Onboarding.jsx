import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../data/language';
import { cloudAuth } from '../services/cloud';
import CaptchaField from './CaptchaField';
import SuperAdminPanel from './SuperAdminPanel';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Cloud,
  Coffee,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Store,
  User,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

const PHASES = {
  LOADING: 'loading',
  SIGNIN: 'signin',
  SIGNUP: 'signup',
  EMAIL_CONFIRMATION: 'email_confirmation',
  CREATE_APPLICATION: 'create_application',
  APPLICATION_STATUS: 'application_status',
  SELECT_STORE: 'select_store',
  SUPER_ADMIN: 'super_admin',
};

export default function Onboarding({ onBack }) {
  const { state, actions } = useApp();
  const { language } = state;

  const [phase, setPhase] = useState(PHASES.LOADING);
  const [cloudUser, setCloudUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [application, setApplication] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const isDemoMode = !cloudAuth.isEnabled;

  const resetCaptcha = useCallback(() => {
    setCaptchaToken('');
    setCaptchaResetKey((key) => key + 1);
  }, []);

  const changeLanguage = (lang) => {
    actions.setLanguage(lang);
    setShowLangMenu(false);
  };

  const enterStore = useCallback(
    (user, membership) => actions.cloudLogin(user, membership),
    [actions]
  );

  // Resolve platform role, approved memberships, then any outstanding request.
  // This is used after sign-in and by the pending screen's Refresh button.
  const loadAccount = useCallback(
    async (user) => {
      setCloudUser(user);
      setError('');

      // Resolve both independently so a temporary approval-API outage does not
      // lock existing, already-approved owners out of their stores.
      const [accessResult, storesResult] = await Promise.all([
        cloudAuth.isPlatformAdmin(),
        cloudAuth.listMyStores(),
      ]);
      if (accessResult.data?.isPlatformAdmin) {
        setPhase(PHASES.SUPER_ADMIN);
        return;
      }

      const memberships = storesResult.data;
      if (!storesResult.error && memberships?.length === 1) {
        enterStore(user, memberships[0]);
        return;
      }
      if (!storesResult.error && memberships?.length > 1) {
        setStores(memberships);
        setPhase(PHASES.SELECT_STORE);
        return;
      }
      if (storesResult.error) {
        setError(storesResult.error.message);
        setPhase(PHASES.SIGNIN);
        return;
      }
      if (accessResult.error) {
        setError(accessResult.error.message);
        setPhase(PHASES.SIGNIN);
        return;
      }

      const { data: requestData, error: requestError } =
        await cloudAuth.getMyStoreApplication();
      if (requestError) {
        setError(requestError.message);
        setPhase(PHASES.CREATE_APPLICATION);
        return;
      }
      const latest = requestData?.application || null;
      setApplication(latest);
      if (latest) {
        setStoreName(latest.storeName || '');
        setDisplayName(latest.ownerDisplayName || user?.displayName || '');
        setPhase(PHASES.APPLICATION_STATUS);
      } else {
        setDisplayName((current) => current || user?.displayName || '');
        setEmail(user?.email || '');
        setPhase(PHASES.CREATE_APPLICATION);
      }
    },
    [enterStore]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await cloudAuth.getSession();
      if (cancelled) return;
      if (data?.user) await loadAccount(data.user);
      else setPhase(PHASES.SIGNIN);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAccount]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data, error: signInError } = await cloudAuth.signIn({ email, password });
      if (signInError) setError(signInError.message);
      else await loadAccount(data.user);
    } catch {
      setError(t('error', language));
    } finally {
      setBusy(false);
    }
  };

  const prepareCaptchaProof = async (fields) => {
    if (!captchaToken) {
      setError(t('completeCaptcha', language));
      return null;
    }
    const { data, error: captchaError } = await cloudAuth.prepareStoreApplication({
      ...fields,
      captchaToken,
    });
    if (captchaError) {
      setError(captchaError.message);
      resetCaptcha();
      return null;
    }
    return data.captchaProof;
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError('');
    const fields = {
      email: email.trim().toLowerCase(),
      storeName: storeName.trim(),
      displayName: displayName.trim(),
    };
    if (!fields.email || !fields.storeName || !fields.displayName || !password || !confirmPassword) {
      setError(t('enterAllFields', language));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch', language));
      return;
    }

    setBusy(true);
    try {
      // CAPTCHA comes first in the supported flow. More importantly, the API
      // will not accept a pending store request without its signed proof.
      const captchaProof = await prepareCaptchaProof(fields);
      if (!captchaProof) return;

      const { data: userData, error: signUpError } = await cloudAuth.signUp({
        email: fields.email,
        password,
        displayName: fields.displayName,
      });
      if (signUpError) {
        setError(signUpError.message);
        resetCaptcha();
        return;
      }
      if (userData.requiresEmailConfirmation) {
        setCloudUser(userData.user);
        setPhase(PHASES.EMAIL_CONFIRMATION);
        resetCaptcha();
        return;
      }

      // A bootstrap operator may create their Auth account through this screen
      // on a fresh installation. Operators go to the review console and do not
      // accidentally create an application for the placeholder store name.
      const { data: access } = await cloudAuth.isPlatformAdmin();
      if (access?.isPlatformAdmin) {
        setCloudUser(userData.user);
        setPhase(PHASES.SUPER_ADMIN);
        return;
      }

      const { data: requestData, error: requestError } =
        await cloudAuth.submitStoreApplication({ ...fields, captchaProof });
      if (requestError && !requestData?.application) {
        setError(requestError.message);
        resetCaptcha();
        return;
      }
      setCloudUser(userData.user);
      setApplication(requestData.application);
      setPhase(PHASES.APPLICATION_STATUS);
    } catch {
      setError(t('error', language));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateApplication = async (event) => {
    event.preventDefault();
    setError('');
    const fields = {
      email: cloudUser?.email || email.trim().toLowerCase(),
      storeName: storeName.trim(),
      displayName: displayName.trim(),
    };
    if (!fields.email || !fields.storeName || !fields.displayName) {
      setError(t('enterAllFields', language));
      return;
    }

    setBusy(true);
    try {
      const captchaProof = await prepareCaptchaProof(fields);
      if (!captchaProof) return;
      const { data, error: requestError } = await cloudAuth.submitStoreApplication({
        ...fields,
        captchaProof,
      });
      if (requestError && !data?.application) {
        setError(requestError.message);
        resetCaptcha();
        return;
      }
      setApplication(data.application);
      setPhase(PHASES.APPLICATION_STATUS);
    } catch {
      setError(t('error', language));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    await cloudAuth.signOut();
    setCloudUser(null);
    setApplication(null);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setPhase(PHASES.SIGNIN);
    setBusy(false);
  };

  if (phase === PHASES.SUPER_ADMIN) {
    return (
      <SuperAdminPanel
        user={cloudUser}
        language={language}
        onSignOut={signOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-espresso via-espresso to-dark-roast flex items-center justify-center p-4">
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
                className={`w-full px-6 py-3 text-left hover:bg-cream ${language === 'en' ? 'bg-accent/10 text-accent font-medium' : 'text-dark-roast'}`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => changeLanguage('bn')}
                className={`w-full px-6 py-3 text-left hover:bg-cream ${language === 'bn' ? 'bg-accent/10 text-accent font-medium' : 'text-dark-roast'}`}
              >
                🇧🇩 বাংলা
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-latte/80 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{isDemoMode ? t('backToPinLogin', language) : t('back', language)}</span>
        </button>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${isDemoMode ? 'bg-amber-400/20 text-amber-200' : 'bg-success/20 text-success'}`}>
          {isDemoMode ? <Cloud className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {isDemoMode ? t('demoMode', language) : t('cloudConnected', language)}
        </div>
        {isDemoMode && (
          <p className="text-xs text-latte/60 -mt-3 mb-6">
            {t('approvalDemoHint', language)}
          </p>
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
          {phase === PHASES.LOADING && (
            <LoadingCard message={t('loading', language)} />
          )}

          {phase === PHASES.SIGNIN && (
            <form onSubmit={handleSignIn} className="p-8 space-y-5">
              <CardHeading icon={Store} title={t('signInTitle', language)} />
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
              <PrimaryButton busy={busy} busyText={t('signingIn', language)}>
                {t('signIn', language)} <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
              <p className="text-center text-sm text-medium-roast">
                {t('noAccount', language)}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    resetCaptcha();
                    setPhase(PHASES.SIGNUP);
                  }}
                  className="text-accent font-medium hover:underline"
                >
                  {t('applyForStore', language)}
                </button>
              </p>
            </form>
          )}

          {phase === PHASES.SIGNUP && (
            <form onSubmit={handleSignUp} className="p-8 space-y-4">
              <CardHeading icon={Building2} title={t('signUpTitle', language)} />
              <p className="text-sm text-medium-roast text-center -mt-2 mb-2">
                {t('approvalRequiredHint', language)}
              </p>
              <Field icon={<User className="w-5 h-5" />} label={t('displayName', language)} value={displayName} onChange={setDisplayName} placeholder="Aisha Rahman" autoComplete="name" />
              <Field icon={<Store className="w-5 h-5" />} label={t('storeName', language)} value={storeName} onChange={setStoreName} placeholder="My Café" autoComplete="organization" />
              <Field icon={<Mail className="w-5 h-5" />} label={t('email', language)} type="email" value={email} onChange={setEmail} placeholder="owner@example.com" autoComplete="email" />
              <Field icon={<Lock className="w-5 h-5" />} label={t('password', language)} type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="new-password" />
              <Field icon={<Lock className="w-5 h-5" />} label={t('confirmPassword', language)} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" autoComplete="new-password" />
              <CaptchaField value={captchaToken} onChange={setCaptchaToken} resetKey={captchaResetKey} language={language} />
              {error && <ErrorNote message={error} />}
              <PrimaryButton busy={busy} busyText={t('submittingApplication', language)} disabled={!captchaToken}>
                {t('submitApplication', language)} <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
              <p className="text-center text-sm text-medium-roast">
                {t('haveAccount', language)}{' '}
                <button type="button" onClick={() => { setError(''); setPhase(PHASES.SIGNIN); }} className="text-accent font-medium hover:underline">
                  {t('signIn', language)}
                </button>
              </p>
            </form>
          )}

          {phase === PHASES.EMAIL_CONFIRMATION && (
            <div className="p-8 text-center space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 text-accent rounded-2xl">
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-dark-roast">
                  {t('checkYourEmail', language)}
                </h2>
                <p className="text-sm text-medium-roast mt-2 leading-relaxed">
                  {t('emailConfirmationHint', language)}
                </p>
              </div>
              <button onClick={() => setPhase(PHASES.SIGNIN)} className="w-full py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90">
                {t('returnToSignIn', language)}
              </button>
            </div>
          )}

          {phase === PHASES.CREATE_APPLICATION && (
            <form onSubmit={handleCreateApplication} className="p-8 space-y-5">
              <CardHeading icon={Building2} title={t('applyForStore', language)} />
              <p className="text-sm text-medium-roast text-center -mt-2">
                {t('approvalRequiredHint', language)}
              </p>
              <Field icon={<User className="w-5 h-5" />} label={t('displayName', language)} value={displayName} onChange={setDisplayName} placeholder="Aisha Rahman" autoComplete="name" />
              <Field icon={<Store className="w-5 h-5" />} label={t('storeName', language)} value={storeName} onChange={setStoreName} placeholder="My Café" autoComplete="organization" />
              <div className="flex items-center gap-2 px-3 py-2.5 bg-cream rounded-xl text-sm text-medium-roast">
                <Mail className="w-4 h-4" />
                <span className="truncate">{cloudUser?.email}</span>
              </div>
              <CaptchaField value={captchaToken} onChange={setCaptchaToken} resetKey={captchaResetKey} language={language} />
              {error && <ErrorNote message={error} />}
              <PrimaryButton busy={busy} busyText={t('submittingApplication', language)} disabled={!captchaToken}>
                {t('submitApplication', language)} <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
              <button type="button" onClick={signOut} className="w-full text-sm text-medium-roast hover:text-dark-roast">
                {t('signOut', language)}
              </button>
            </form>
          )}

          {phase === PHASES.APPLICATION_STATUS && application && (
            <ApplicationStatus
              application={application}
              language={language}
              busy={busy}
              error={error}
              onRefresh={async () => {
                setBusy(true);
                await loadAccount(cloudUser);
                setBusy(false);
              }}
              onReapply={() => {
                setApplication(null);
                setStoreName('');
                setError('');
                resetCaptcha();
                setPhase(PHASES.CREATE_APPLICATION);
              }}
              onSignOut={signOut}
            />
          )}

          {phase === PHASES.SELECT_STORE && (
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-bold text-dark-roast">{t('chooseStore', language)}</h2>
                <p className="text-sm text-medium-roast mt-1">{t('chooseStoreHint', language)}</p>
              </div>
              <div className="space-y-3">
                {stores.map((store) => (
                  <button key={store.id} onClick={() => enterStore(cloudUser, store)} className="w-full flex items-center gap-4 p-4 bg-cream rounded-2xl hover:bg-latte/20 text-left group">
                    <div className="w-12 h-12 bg-espresso rounded-xl flex items-center justify-center"><Store className="w-6 h-6 text-white" /></div>
                    <div className="flex-1"><p className="font-semibold text-dark-roast group-hover:text-accent">{store.name}</p><p className="text-sm text-medium-roast">{t(store.role, language)}</p></div>
                    <ArrowRight className="w-5 h-5 text-latte group-hover:text-accent" />
                  </button>
                ))}
              </div>
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

function CardHeading({ icon: Icon, title }) {
  return (
    <div className="text-center mb-2">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-2xl mb-3">
        <Icon className="w-7 h-7" />
      </div>
      <h2 className="text-2xl font-display font-bold text-dark-roast">{title}</h2>
    </div>
  );
}

function LoadingCard({ message }) {
  return (
    <div className="p-10 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
      <p className="text-medium-roast font-medium">{message}</p>
    </div>
  );
}

function ApplicationStatus({ application, language, busy, error, onRefresh, onReapply, onSignOut }) {
  const rejected = application.status === 'rejected';
  const approved = application.status === 'approved';
  const Icon = rejected ? XCircle : approved ? CheckCircle2 : Clock3;
  const color = rejected ? 'text-error bg-error/10' : approved ? 'text-success bg-success/10' : 'text-amber-700 bg-amber-100';

  return (
    <div className="p-8 text-center space-y-5">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-2xl font-display font-bold text-dark-roast">
          {rejected ? t('applicationRejected', language) : approved ? t('applicationApproved', language) : t('applicationPending', language)}
        </h2>
        <p className="font-semibold text-dark-roast mt-2">{application.storeName}</p>
        <p className="text-sm text-medium-roast mt-2 leading-relaxed">
          {rejected ? t('applicationRejectedHint', language) : approved ? t('applicationApprovedHint', language) : t('applicationPendingHint', language)}
        </p>
      </div>
      {application.reviewNote && (
        <div className="text-left bg-cream rounded-xl px-4 py-3 text-sm text-medium-roast">
          <strong>{t('reviewNote', language)}:</strong> {application.reviewNote}
        </div>
      )}
      {error && <ErrorNote message={error} />}
      {rejected ? (
        <button onClick={onReapply} className="w-full py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90">
          {t('submitNewApplication', language)}
        </button>
      ) : (
        <button onClick={onRefresh} disabled={busy} className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 disabled:opacity-60">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          {t('checkApprovalStatus', language)}
        </button>
      )}
      <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 text-sm text-medium-roast hover:text-dark-roast">
        <LogOut className="w-4 h-4" /> {t('signOut', language)}
      </button>
    </div>
  );
}

function PrimaryButton({ children, busy, busyText, disabled = false }) {
  return (
    <button type="submit" disabled={busy || disabled} className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 disabled:opacity-60 transition-colors btn-press">
      {busy ? <><Loader2 className="w-5 h-5 animate-spin" />{busyText}</> : children}
    </button>
  );
}

function Field({ icon, label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-medium-roast mb-2">{label}</span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-latte">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
