import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { fetchCheckoutSessionStatus, type CheckoutSessionStatus } from '../lib/payments';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';

const copy = {
  el: {
    titleChecking: 'Επιβεβαίωση πληρωμής',
    titlePaid: 'Η πληρωμή επιβεβαιώθηκε',
    titlePending: 'Η πληρωμή επεξεργάζεται ακόμη',
    titleFailed: 'Δεν υπάρχει επιβεβαιωμένη πληρωμή ακόμη',
    checkingBody: 'Ελέγχουμε το backend και περιμένουμε το verified webhook πριν προχωρήσεις.',
    pendingBody: 'Το Stripe redirect ολοκληρώθηκε, αλλά η εφαρμογή περιμένει ακόμη την επιβεβαίωση από το webhook. Θα ξαναδοκιμάσουμε αυτόματα.',
    paidBody: 'Το πακέτο σου έχει ξεκλειδωθεί. Σε λίγο θα μεταφερθείς στη δημιουργία event.',
    failedBody: 'Αν η πληρωμή ακυρώθηκε ή έληξε, μπορείς να επιστρέψεις και να δοκιμάσεις ξανά με ασφάλεια.',
    missingSession: 'Λείπει το session_id από το success URL.',
    continueCta: 'Συνέχεια στο Create Event',
    retryCta: 'Επιστροφή στο Payment',
    dashboardCta: 'Dashboard',
    detailsLabel: 'Κατάσταση session',
  },
  en: {
    titleChecking: 'Verifying your payment',
    titlePaid: 'Payment confirmed',
    titlePending: 'Payment is still processing',
    titleFailed: 'No confirmed payment yet',
    checkingBody: 'We are checking the backend and waiting for the verified webhook before moving you forward.',
    pendingBody: 'Stripe redirected back successfully, but the app is still waiting for webhook confirmation. We will retry automatically.',
    paidBody: 'Your tier has been unlocked. You will be sent to the event creation page in a moment.',
    failedBody: 'If the payment was cancelled or expired, you can safely go back and try again.',
    missingSession: 'The success URL is missing a session_id.',
    continueCta: 'Continue to Create Event',
    retryCta: 'Back to Payment',
    dashboardCta: 'Dashboard',
    detailsLabel: 'Session status',
  },
} as const;

type VerificationState = 'checking' | 'pending' | 'paid' | 'failed';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [verificationState, setVerificationState] = useState<VerificationState>('checking');
  const [sessionStatus, setSessionStatus] = useState<CheckoutSessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageCopy = copy[language];

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id')?.trim() || '';

    if (!sessionId) {
      setVerificationState('failed');
      setError(pageCopy.missingSession);
      return;
    }

    let cancelled = false;
    let retryTimeout: number | null = null;
    let redirectTimeout: number | null = null;

    const verifyPayment = async () => {
      try {
        const nextStatus = await fetchCheckoutSessionStatus(sessionId);
        if (cancelled) {
          return;
        }

        setSessionStatus(nextStatus);

        if (nextStatus.isUnlocked && nextStatus.creationPath) {
          setVerificationState('paid');
          redirectTimeout = window.setTimeout(() => {
            navigate(nextStatus.creationPath!, { replace: true });
          }, 1200);
          return;
        }

        if (nextStatus.paymentStatus === 'FAILED' || nextStatus.paymentStatus === 'EXPIRED') {
          setVerificationState('failed');
          return;
        }

        setVerificationState(nextStatus.paymentStatus === 'PAID' ? 'checking' : 'pending');
        retryTimeout = window.setTimeout(() => {
          void verifyPayment();
        }, 2500);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setVerificationState('failed');
        setError(nextError instanceof Error ? nextError.message : 'Payment verification failed');
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;

      if (retryTimeout != null) {
        window.clearTimeout(retryTimeout);
      }

      if (redirectTimeout != null) {
        window.clearTimeout(redirectTimeout);
      }
    };
  }, [navigate, pageCopy.missingSession, searchParams]);

  const title =
    verificationState === 'paid'
      ? pageCopy.titlePaid
      : verificationState === 'pending'
        ? pageCopy.titlePending
        : verificationState === 'failed'
          ? pageCopy.titleFailed
          : pageCopy.titleChecking;

  const body =
    verificationState === 'paid'
      ? pageCopy.paidBody
      : verificationState === 'pending'
        ? pageCopy.pendingBody
        : verificationState === 'failed'
          ? pageCopy.failedBody
          : pageCopy.checkingBody;

  const selectedTier = sessionStatus?.selectedTier;
  const retryTier = selectedTier ? `/payment?tier=${encodeURIComponent(selectedTier)}` : '/payment';

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div
              className={`rounded-2xl p-4 ${
                verificationState === 'paid'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : verificationState === 'failed'
                    ? 'bg-red-500/15 text-red-300'
                    : 'bg-indigo-500/15 text-indigo-300'
              }`}
            >
              {verificationState === 'paid' ? (
                <CheckCircle2 size={32} />
              ) : verificationState === 'failed' ? (
                <AlertTriangle size={32} />
              ) : (
                <Loader2 size={32} className="animate-spin" />
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">{error || body}</p>
            </div>
          </div>

          {sessionStatus && (
            <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">{pageCopy.detailsLabel}</p>
              <div className="mt-4 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                  <span className="text-gray-500">Payment</span>
                  <p className="mt-1 font-semibold text-white">{sessionStatus.paymentStatus}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                  <span className="text-gray-500">Stripe</span>
                  <p className="mt-1 font-semibold text-white">
                    {sessionStatus.stripeCheckoutStatus || 'unknown'} / {sessionStatus.stripePaymentStatus || 'unknown'}
                  </p>
                </div>
                {selectedTier && (
                  <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                    <span className="text-gray-500">Selected tier</span>
                    <p className="mt-1 font-semibold text-white">{selectedTier}</p>
                  </div>
                )}
                {sessionStatus.unlockedTier && (
                  <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                    <span className="text-gray-500">Unlocked tier</span>
                    <p className="mt-1 font-semibold text-white">{sessionStatus.unlockedTier}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {verificationState === 'paid' && sessionStatus?.creationPath && (
              <button
                type="button"
                onClick={() => navigate(sessionStatus.creationPath!, { replace: true })}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                {pageCopy.continueCta}
              </button>
            )}

            {verificationState !== 'paid' && (
              <button
                type="button"
                onClick={() => navigate(retryTier)}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                {pageCopy.retryCta}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center rounded-full border border-gray-700 bg-transparent px-6 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:text-white"
            >
              {pageCopy.dashboardCta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
