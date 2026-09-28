import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Coffee,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { cloudAuth } from '../services/cloud';

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
};

export default function SuperAdminPanel({ user, language = 'en', onSignOut }) {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState('');
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const bn = language === 'bn';

  const copy = (english, bangla) => (bn ? bangla : english);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await cloudAuth.listStoreApplications();
    if (loadError) setError(loadError.message);
    else setApplications(data?.applications || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const counts = useMemo(
    () =>
      applications.reduce(
        (result, application) => {
          result[application.status] = (result[application.status] || 0) + 1;
          return result;
        },
        { pending: 0, approved: 0, rejected: 0 }
      ),
    [applications]
  );

  const visible = applications.filter(
    (application) => filter === 'all' || application.status === filter
  );

  const review = async (application, decision) => {
    const verb = decision === 'approved'
      ? copy('approve', 'অনুমোদন')
      : copy('reject', 'প্রত্যাখ্যান');
    if (!window.confirm(copy(
      `Are you sure you want to ${verb} “${application.storeName}”?`,
      `আপনি কি “${application.storeName}” ${verb} করতে চান?`
    ))) return;

    setBusyId(application.id);
    setError('');
    setMessage('');
    const { data, error: reviewError } = await cloudAuth.reviewStoreApplication({
      applicationId: application.id,
      decision,
      reviewNote: notes[application.id] || '',
    });
    if (reviewError) {
      setError(reviewError.message);
    } else {
      setApplications((current) =>
        current.map((entry) =>
          entry.id === application.id ? data.application : entry
        )
      );
      setMessage(
        decision === 'approved'
          ? copy(`${application.storeName} is now live.`, `${application.storeName} এখন চালু হয়েছে।`)
          : copy(`${application.storeName} was rejected.`, `${application.storeName} প্রত্যাখ্যান করা হয়েছে।`)
      );
    }
    setBusyId('');
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-espresso text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center">
            <Coffee className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-bold">
                {copy('Platform approvals', 'প্ল্যাটফর্ম অনুমোদন')}
              </h1>
              <ShieldCheck className="w-5 h-5 text-success" />
            </div>
            <p className="text-latte/80 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={loadApplications}
            disabled={loading}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl disabled:opacity-50"
            title={copy('Refresh', 'রিফ্রেশ')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{copy('Sign out', 'সাইন আউট')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-1">
              {copy('Super user console', 'সুপার ইউজার কনসোল')}
            </p>
            <h2 className="text-3xl font-display font-bold text-dark-roast">
              {copy('Store applications', 'স্টোর আবেদন')}
            </h2>
            <p className="text-medium-roast mt-1">
              {copy(
                'Review every owner before their store and staff link are created.',
                'স্টোর ও স্টাফ লিংক তৈরির আগে প্রতিটি মালিককে যাচাই করুন।'
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              ['pending', copy('Pending', 'অপেক্ষমাণ')],
              ['approved', copy('Approved', 'অনুমোদিত')],
              ['rejected', copy('Rejected', 'প্রত্যাখ্যাত')],
              ['all', copy('All', 'সব')],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-espresso text-white'
                    : 'bg-white border border-latte/30 text-medium-roast hover:border-accent'
                }`}
              >
                {label}{value !== 'all' ? ` (${counts[value] || 0})` : ''}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 bg-error/5 text-error rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="mb-5 flex items-center gap-2 bg-success/10 text-success rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-3 text-medium-roast">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            {copy('Loading applications…', 'আবেদন লোড হচ্ছে…')}
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-latte/20">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <h3 className="font-semibold text-dark-roast">
              {copy('Nothing to review', 'যাচাই করার কিছু নেই')}
            </h3>
            <p className="text-sm text-medium-roast mt-1">
              {copy('New applications will appear here.', 'নতুন আবেদন এখানে দেখা যাবে।')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visible.map((application) => {
              const pending = application.status === 'pending';
              const reviewing = busyId === application.id;
              return (
                <article
                  key={application.id}
                  className="bg-white rounded-2xl border border-latte/20 shadow-sm p-5 sm:p-6"
                >
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 bg-espresso/10 text-espresso rounded-xl flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-dark-roast">
                              {application.storeName}
                            </h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[application.status]}`}>
                              {application.status}
                            </span>
                          </div>
                          <p className="text-medium-roast font-medium mt-1">
                            {application.ownerDisplayName}
                          </p>
                          <p className="text-sm text-medium-roast break-all">
                            {application.ownerEmail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-medium-roast mt-4">
                        <Clock3 className="w-4 h-4" />
                        <span>
                          {copy('Applied', 'আবেদন')}{' '}
                          {new Date(application.createdAt).toLocaleString(bn ? 'bn-BD' : 'en-GB')}
                        </span>
                      </div>
                      {!pending && application.reviewNote && (
                        <div className="mt-4 px-3 py-2.5 bg-cream rounded-xl text-sm text-medium-roast">
                          <strong>{copy('Review note:', 'পর্যালোচনা নোট:')}</strong>{' '}
                          {application.reviewNote}
                        </div>
                      )}
                    </div>

                    {pending && (
                      <div className="lg:w-80 space-y-3">
                        <label className="block">
                          <span className="block text-xs font-medium text-medium-roast mb-1.5">
                            {copy('Review note (optional)', 'পর্যালোচনা নোট (ঐচ্ছিক)')}
                          </span>
                          <textarea
                            value={notes[application.id] || ''}
                            onChange={(event) =>
                              setNotes((current) => ({
                                ...current,
                                [application.id]: event.target.value,
                              }))
                            }
                            maxLength={1000}
                            rows={3}
                            placeholder={copy('Reason or internal context…', 'কারণ বা মন্তব্য…')}
                            className="w-full px-3 py-2.5 bg-cream border border-latte/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => review(application, 'rejected')}
                            disabled={reviewing}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error/10 text-error font-semibold hover:bg-error/20 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            {copy('Reject', 'প্রত্যাখ্যান')}
                          </button>
                          <button
                            onClick={() => review(application, 'approved')}
                            disabled={reviewing}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success text-white font-semibold hover:bg-success/90 disabled:opacity-50"
                          >
                            {reviewing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            {copy('Approve', 'অনুমোদন')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
