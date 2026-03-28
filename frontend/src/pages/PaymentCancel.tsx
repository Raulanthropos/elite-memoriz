import { useEffect, useState } from 'react';
import { CircleDashed, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { fetchPaymentOverview, type PaymentOverview } from '../lib/payments';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { parseNullableTier } from '../lib/tiers';

const copy = {
  el: {
    title: 'Η πληρωμή δεν ολοκληρώθηκε',
    body: 'Το redirect από μόνο του δεν χρησιμοποιείται ως απόδειξη πληρωμής. Μπορείς να επιστρέψεις στο payment και να δοκιμάσεις ξανά.',
    paidBody: 'Το backend δείχνει ότι το πακέτο σου έχει ήδη ξεκλειδωθεί, οπότε μπορείς να συνεχίσεις στο create event.',
    retryCta: 'Δοκίμασε ξανά',
    continueCta: 'Create Event',
    dashboardCta: 'Dashboard',
  },
  en: {
    title: 'Payment was not completed',
    body: 'The redirect alone is not treated as proof of payment. You can head back to payment and try again.',
    paidBody: 'The backend shows that your tier is already unlocked, so you can continue to event creation.',
    retryCta: 'Try again',
    continueCta: 'Create Event',
    dashboardCta: 'Dashboard',
  },
} as const;

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [paymentOverview, setPaymentOverview] = useState<PaymentOverview | null>(null);

  const pageCopy = copy[language];
  const requestedTier = parseNullableTier(searchParams.get('tier'));
  const retryTier = requestedTier || paymentOverview?.latestSelectedTier;

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      try {
        const nextOverview = await fetchPaymentOverview();
        if (!cancelled) {
          setPaymentOverview(nextOverview);
        }
      } catch {
        if (!cancelled) {
          setPaymentOverview(null);
        }
      }
    };

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-amber-500/15 p-4 text-amber-300">
              <CircleDashed size={32} />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">{pageCopy.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
                {paymentOverview?.hasPaidTier ? pageCopy.paidBody : pageCopy.body}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {paymentOverview?.hasPaidTier && paymentOverview.creationPath ? (
              <button
                type="button"
                onClick={() => navigate(paymentOverview.creationPath!)}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                {pageCopy.continueCta}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(retryTier ? `/payment?tier=${encodeURIComponent(retryTier)}` : '/payment')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                <RefreshCw size={16} />
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

export default PaymentCancel;
