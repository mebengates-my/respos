import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { isCloudEnabled } from '../services/cloud';

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
let turnstileScriptPromise;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-respos-turnstile]');
    const script = existing || document.createElement('script');
    const onLoad = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile did not load'));
    };
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load')), {
      once: true,
    });
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.resposTurnstile = 'true';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    turnstileScriptPromise = undefined;
    throw error;
  });
  return turnstileScriptPromise;
}

/**
 * Cloudflare Turnstile in production; a clearly labelled checkbox in the
 * local browser mock. `resetKey` remounts a consumed/expired challenge.
 */
export default function CaptchaField({ value, onChange, resetKey = 0, language = 'en' }) {
  const hostRef = useRef(null);
  const widgetRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const isBangla = language === 'bn';

  useEffect(() => {
    if (!isCloudEnabled || !siteKey) return undefined;
    let cancelled = false;
    setLoadError('');
    onChange('');

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !hostRef.current) return;
        widgetRef.current = turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'flexible',
          language: isBangla ? 'bn' : 'en',
          callback: (token) => onChange(token),
          'expired-callback': () => onChange(''),
          'error-callback': () => {
            onChange('');
            setLoadError(
              isBangla ? 'মানব যাচাই লোড করা যায়নি। আবার চেষ্টা করুন।' : 'Human check failed to load. Please retry.'
            );
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            isBangla ? 'মানব যাচাই লোড করা যায়নি।' : 'Human check could not be loaded.'
          );
        }
      });

    return () => {
      cancelled = true;
      if (widgetRef.current != null && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          // The provider may already have removed an expired widget.
        }
      }
      widgetRef.current = null;
    };
  }, [isBangla, onChange, resetKey]);

  if (!isCloudEnabled) {
    return (
      <label className="flex items-center gap-3 p-3.5 bg-cream border border-latte/30 rounded-xl cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked ? `mock-human-${Date.now()}` : '')}
          className="w-5 h-5 accent-accent"
        />
        <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
        <span className="text-sm font-medium text-dark-roast">
          {isBangla ? 'আমি মানুষ (ডেমো যাচাই)' : 'I am human (demo check)'}
        </span>
      </label>
    );
  }

  if (!siteKey) {
    return (
      <div className="flex items-start gap-2 text-error text-sm bg-error/5 rounded-xl px-3 py-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {isBangla
            ? 'স্টোর আবেদন সাময়িকভাবে বন্ধ: CAPTCHA কনফিগার করা নেই।'
            : 'Store applications are temporarily unavailable: CAPTCHA is not configured.'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={hostRef} className="min-h-[65px]" />
      {value && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isBangla ? 'মানব যাচাই সম্পন্ন' : 'Human check complete'}
        </p>
      )}
      {loadError && (
        <p className="flex items-center gap-1.5 text-xs text-error">
          <AlertCircle className="w-3.5 h-3.5" />
          {loadError}
        </p>
      )}
    </div>
  );
}
