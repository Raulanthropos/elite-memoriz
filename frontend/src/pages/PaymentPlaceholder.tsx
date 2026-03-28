import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crown, Loader2, ShieldCheck, Star, Zap } from 'lucide-react';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { clearStoredCreateEventDraft, getStoredCreateEventDraft } from '../lib/createEventDraft';
import { createCheckoutSession, fetchPaymentOverview, type PaymentOverview } from '../lib/payments';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { parseTier, type Tier } from '../lib/tiers';

type DraftSummary = {
  title?: string;
  date?: string;
  package?: string;
};

const tierIcons: Record<Tier, JSX.Element> = {
  BASIC: <Star size={24} className="text-slate-200" />,
  PREMIUM: <Zap size={24} className="text-amber-300" />,
  LUXURY: <Crown size={24} className="text-rose-300" />,
};

const tierCardStyles: Record<Tier, string> = {
  BASIC: 'border-slate-700 bg-slate-900/80',
  PREMIUM: 'border-amber-500/30 bg-amber-500/10',
  LUXURY: 'border-rose-500/30 bg-rose-500/10',
};

const copy = {
  el: {
    eyebrow: 'Stripe Checkout',
    title: 'Επιβεβαίωση πακέτου και ασφαλής πληρωμή',
    body:
      'Το πακέτο έχει ήδη επιλεγεί στο προηγούμενο βήμα. Από εδώ συνεχίζεις μόνο στο ασφαλές Stripe Checkout και το ξεκλείδωμα γίνεται μόνο μετά από επιβεβαιωμένο webhook.',
    pendingTitle: 'Η πληρωμή περιμένει ακόμη επιβεβαίωση',
    pendingBody: 'Αν μόλις ολοκλήρωσες το Checkout, μπορούμε να ξαναελέγξουμε την κατάσταση του session χωρίς να ξεκινήσεις νέα πληρωμή.',
    unlockedTitle: 'Το πακέτο σου έχει ήδη ξεκλειδωθεί',
    unlockedBody: 'Δεν χρειάζεται νέα πληρωμή. Μπορείς να συνεχίσεις κατευθείαν στη δημιουργία event.',
    selectedPlan: 'Επιλεγμένο πακέτο',
    draftTitle: 'Τίτλος event',
    draftDate: 'Ημερομηνία event',
    secureNote: 'Το redirect από μόνο του δεν αποτελεί απόδειξη πληρωμής. Η επιβεβαίωση γίνεται μόνο από το backend webhook.',
    changeTierNote: 'Αν θέλεις άλλο πακέτο, γύρνα πίσω στο draft και άλλαξέ το εκεί.',
    payNow: 'Συνέχεια σε ασφαλή πληρωμή',
    continueCreate: 'Συνέχεια στο Create Event',
    checkPending: 'Έλεγχος κατάστασης πληρωμής',
    backToDraft: 'Πίσω στο draft',
    dashboard: 'Dashboard',
    paymentStatus: 'Κατάσταση πληρωμής',
    tiers: {
      BASIC: {
        name: 'Basic',
        price: '€29',
        features: ['Ένα hosted event', 'Έως 100 guests', '10GB storage', 'Διατήρηση για 1 μήνα'],
      },
      PREMIUM: {
        name: 'Premium',
        price: '€79',
        features: ['Ένα hosted event', 'Έως 300 guests', '50GB storage', 'AI stories'],
      },
      LUXURY: {
        name: 'Luxury',
        price: '€129',
        features: ['Ένα hosted event', 'Έως 500 guests', '200GB storage', 'AI stories και 360 view'],
      },
    },
  },
  en: {
    eyebrow: 'Stripe Checkout',
    title: 'Plan confirmation and secure payment',
    body:
      'The tier was already selected on the previous step. This page is only for the secure Stripe Checkout handoff, and unlocking only happens after a verified webhook succeeds.',
    pendingTitle: 'This payment is still waiting for confirmation',
    pendingBody: 'If you just completed Checkout, we can re-check that session instead of starting a new payment.',
    unlockedTitle: 'Your tier is already unlocked',
    unlockedBody: 'No new payment is needed. You can continue straight to event creation.',
    selectedPlan: 'Selected tier',
    draftTitle: 'Event title',
    draftDate: 'Event date',
    secureNote: 'The redirect alone never counts as proof of payment. Unlocking only happens after the backend webhook confirms success.',
    changeTierNote: 'If you want a different tier, go back to the draft and change it there.',
    payNow: 'Continue to secure payment',
    continueCreate: 'Continue to Create Event',
    checkPending: 'Check payment status',
    backToDraft: 'Back to draft',
    dashboard: 'Dashboard',
    paymentStatus: 'Payment status',
    tiers: {
      BASIC: {
        name: 'Basic',
        price: '€29',
        features: ['One hosted event', 'Up to 100 guests', '10GB storage', '1 month retention'],
      },
      PREMIUM: {
        name: 'Premium',
        price: '€79',
        features: ['One hosted event', 'Up to 300 guests', '50GB storage', 'AI stories'],
      },
      LUXURY: {
        name: 'Luxury',
        price: '€129',
        features: ['One hosted event', 'Up to 500 guests', '200GB storage', 'AI stories and 360 view'],
      },
    },
  },
} as const;

const PaymentPlaceholder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [draftSummary, setDraftSummary] = useState<DraftSummary>({});
  const [paymentOverview, setPaymentOverview] = useState<PaymentOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedTier = parseTier(searchParams.get('tier')) ?? 'BASIC';
  const pageCopy = copy[language];

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  useEffect(() => {
    const savedDraft = getStoredCreateEventDraft();
    if (!savedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as { formData?: DraftSummary };
      setDraftSummary(parsed.formData ?? {});
    } catch {
      clearStoredCreateEventDraft();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      try {
        const nextOverview = await fetchPaymentOverview();
        if (!cancelled) {
          setPaymentOverview(nextOverview);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load payment status');
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayTier = paymentOverview?.entitledTier ?? requestedTier;
  const tierCopy = pageCopy.tiers[displayTier];
  const isPaid = Boolean(paymentOverview?.hasPaidTier && paymentOverview.entitledTier);
  const latestPendingSessionId =
    paymentOverview?.latestPaymentStatus === 'PENDING' ? paymentOverview.latestCheckoutSessionId : null;
  const draftPath = draftSummary.package ? '/create-event' : `/create-event?tier=${encodeURIComponent(requestedTier)}`;

  const handlePrimaryAction = async () => {
    if (isPaid && paymentOverview?.creationPath) {
      navigate(paymentOverview.creationPath);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await createCheckoutSession(displayTier);
      window.location.assign(response.checkoutUrl);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to start payment');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300/80">{pageCopy.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">{pageCopy.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300">{pageCopy.body}</p>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {overviewLoading ? (
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-950/70 px-5 py-4 text-sm text-gray-300">
                <Loader2 size={18} className="animate-spin" />
                {language === 'el' ? 'Γίνεται έλεγχος κατάστασης πληρωμής...' : 'Loading payment status...'}
              </div>
            ) : isPaid ? (
              <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{pageCopy.unlockedTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{pageCopy.unlockedBody}</p>
                  </div>
                </div>
              </div>
            ) : latestPendingSessionId ? (
              <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{pageCopy.pendingTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{pageCopy.pendingBody}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <article className={`mt-8 rounded-3xl border p-6 ${tierCardStyles[displayTier]}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  {tierIcons[displayTier]}
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-200">
                  {tierCopy.name}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-4xl font-bold text-white">{tierCopy.price}</p>
                <ul className="mt-5 space-y-3 text-sm text-gray-200">
                  {tierCopy.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <p className="mt-5 text-sm leading-6 text-gray-400">{pageCopy.changeTierNote}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {latestPendingSessionId && !isPaid && (
                <button
                  type="button"
                  onClick={() => navigate(`/payment/success?session_id=${encodeURIComponent(latestPendingSessionId)}`)}
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
                >
                  {pageCopy.checkPending}
                </button>
              )}

              <button
                type="button"
                onClick={() => void handlePrimaryAction()}
                disabled={isSubmitting || overviewLoading}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isPaid ? (
                  pageCopy.continueCreate
                ) : (
                  pageCopy.payNow
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(draftPath)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
              >
                <ArrowLeft size={16} />
                {pageCopy.backToDraft}
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center justify-center rounded-full border border-gray-700 bg-transparent px-6 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:text-white"
              >
                {pageCopy.dashboard}
              </button>
            </div>
          </div>

          <aside className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-200/70">{pageCopy.selectedPlan}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{tierCopy.name}</p>
              <p className="mt-3 text-sm leading-6 text-gray-300">{pageCopy.secureNote}</p>
            </div>

            <div className="mt-6 space-y-4">
              {draftSummary.title && (
                <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{pageCopy.draftTitle}</p>
                  <p className="mt-2 text-lg font-medium text-white">{draftSummary.title}</p>
                </div>
              )}

              {draftSummary.date && (
                <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{pageCopy.draftDate}</p>
                  <p className="mt-2 text-lg font-medium text-white">{draftSummary.date}</p>
                </div>
              )}

              <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{pageCopy.paymentStatus}</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {paymentOverview?.latestPaymentStatus || 'NOT_STARTED'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PaymentPlaceholder;
