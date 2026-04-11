import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import {
  clearIrisPending,
  fetchPurchaseStatus,
  getIrisPending,
} from '../lib/payments';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';

const copy = {
  el: {
    titleChecking: 'Επιβεβαίωση πληρωμής',
    titlePaid: 'Η πληρωμή επιβεβαιώθηκε',
    titlePending: 'Η πληρωμή επεξεργάζεται ακόμη',
    titleFailed: 'Δεν υπάρχει επιβεβαιωμένη πληρωμή ακόμη',
    checkingBody:
      'Ελέγχουμε το backend και περιμένουμε το verified payment state πριν προχωρήσεις.',
    pendingBody:
      'Η εφαρμογή περιμένει ακόμη επιβεβαιωμένο backend αποτέλεσμα. Θα ξαναδοκιμάσουμε αυτόματα.',
    paidBody:
      'Το πακέτο σου έχει ξεκλειδωθεί. Σε λίγο θα μεταφερθείς στη δημιουργία event.',
    failedBody:
      'Αν η πληρωμή ακυρώθηκε ή απέτυχε, μπορείς να επιστρέψεις στο payment και να δοκιμάσεις ξανά με ασφάλεια.',
    missingReference: 'Λείπει το αναγνωριστικό πληρωμής από το URL.',
    continueCta: 'Συνέχεια στο Create Event',
    retryCta: 'Επιστροφή στο Payment',
    dashboardCta: 'Dashboard',
    detailsLabel: 'Κατάσταση πληρωμής',
    methodLabel: 'Μέθοδος',
    selectedTierLabel: 'Επιλεγμένο πακέτο',
    unlockedTierLabel: 'Ξεκλείδωτο πακέτο',
  },
  en: {
    titleChecking: 'Verifying your payment',
    titlePaid: 'Payment confirmed',
    titlePending: 'Payment is still processing',
    titleFailed: 'No confirmed payment yet',
    checkingBody:
      'We are checking the backend and waiting for verified payment state before moving you forward.',
    pendingBody:
      'The app is still waiting for confirmed backend payment state. We will retry automatically.',
    paidBody:
      'Your tier has been unlocked. You will be sent to the event creation page in a moment.',
    failedBody:
      'If the payment was cancelled or failed, you can safely go back and try again.',
    missingReference: 'The payment identifier is missing from the URL.',
    continueCta: 'Continue to Create Event',
    retryCta: 'Back to Payment',
    dashboardCta: 'Dashboard',
    detailsLabel: 'Payment status',
    methodLabel: 'Method',
    selectedTierLabel: 'Selected tier',
    unlockedTierLabel: 'Unlocked tier',
  },
} as const;

type VerificationState = 'checking' | 'pending' | 'paid' | 'failed';

type PaymentDetails = {
  paymentStatus: string;
  selectedTier: string | null;
  unlockedTier: string | null;
  paymentMethodType: string | null;
  creationPath: string | null;
  isUnlocked: boolean;
};

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [verificationState, setVerificationState] = useState<VerificationState>('checking');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageCopy = copy[language];

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  useEffect(() => {
    const purchaseIdParam = searchParams.get('purchase_id')?.trim() || '';
    let purchaseId = Number(purchaseIdParam);

    // Fall back to localStorage for IRIS return flow
    if (!purchaseIdParam || !Number.isInteger(purchaseId) || purchaseId <= 0) {
      const irisPending = getIrisPending();
      if (irisPending) {
        purchaseId = irisPending.purchaseId;
      } else {
        setVerificationState('failed');
        setError(pageCopy.missingReference);
        return;
      }
    }

    let cancelled = false;
    let retryTimeout: number | null = null;
    let redirectTimeout: number | null = null;

    const handlePaidState = (creationPath: string | null) => {
      setVerificationState('paid');
      clearIrisPending();
      if (creationPath) {
        redirectTimeout = window.setTimeout(() => {
          navigate(creationPath, { replace: true });
        }, 1200);
      }
    };

    const verifyPurchase = async () => {
      try {
        const status = await fetchPurchaseStatus(purchaseId);
        if (cancelled) return;

        const details: PaymentDetails = {
          paymentStatus: status.paymentStatus,
          selectedTier: status.selectedTier,
          unlockedTier: status.unlockedTier,
          paymentMethodType: status.paymentMethodType,
          creationPath: status.creationPath,
          isUnlocked: status.isUnlocked,
        };

        setPaymentDetails(details);
        setError(null);

        if (status.isUnlocked && status.creationPath) {
          handlePaidState(status.creationPath);
          return;
        }

        if (status.paymentStatus === 'FAILED' || status.paymentStatus === 'EXPIRED') {
          setVerificationState('failed');
          setError(status.message ?? null);
          clearIrisPending();
          return;
        }

        setVerificationState('pending');
        retryTimeout = window.setTimeout(() => {
          void verifyPurchase();
        }, 2500);
      } catch (err) {
        if (cancelled) return;
        setVerificationState('failed');
        setError(err instanceof Error ? err.message : 'Payment verification failed');
      }
    };

    void verifyPurchase();

    return () => {
      cancelled = true;
      if (retryTimeout != null) window.clearTimeout(retryTimeout);
      if (redirectTimeout != null) window.clearTimeout(redirectTimeout);
    };
  }, [navigate, pageCopy.missingReference, searchParams]);

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

  const retryTier = paymentDetails?.selectedTier
    ? `/payment?tier=${encodeURIComponent(paymentDetails.selectedTier)}`
    : '/payment';

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

          {paymentDetails && (
            <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                {pageCopy.detailsLabel}
              </p>
              <div className="mt-4 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                  <span className="text-gray-500">Payment</span>
                  <p className="mt-1 font-semibold text-white">
                    {paymentDetails.paymentStatus}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                  <span className="text-gray-500">{pageCopy.methodLabel}</span>
                  <p className="mt-1 font-semibold text-white">
                    {paymentDetails.paymentMethodType || 'unknown'}
                  </p>
                </div>
                {paymentDetails.selectedTier && (
                  <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                    <span className="text-gray-500">{pageCopy.selectedTierLabel}</span>
                    <p className="mt-1 font-semibold text-white">
                      {paymentDetails.selectedTier}
                    </p>
                  </div>
                )}
                {paymentDetails.unlockedTier && (
                  <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                    <span className="text-gray-500">{pageCopy.unlockedTierLabel}</span>
                    <p className="mt-1 font-semibold text-white">
                      {paymentDetails.unlockedTier}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {verificationState === 'paid' && paymentDetails?.creationPath && (
              <button
                type="button"
                onClick={() => navigate(paymentDetails.creationPath!, { replace: true })}
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
