import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crown, Loader2, ShieldCheck, Star, Zap } from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Appearance, type StripeElementsOptionsMode } from '@stripe/stripe-js';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { clearStoredCreateEventDraft, getStoredCreateEventDraft } from '../lib/createEventDraft';
import {
  createCustomPaymentAttempt,
  createPaymentIntent,
  fetchPaymentOverview,
  fetchPaymentQuote,
  type PaymentOverview,
  type PaymentQuote,
} from '../lib/payments';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { parseTier, type Tier } from '../lib/tiers';

type DraftSummary = {
  title?: string;
  date?: string;
  package?: string;
};

type ElementsOptionsWithCustomMethods = StripeElementsOptionsMode & {
  customPaymentMethods?: Array<{
    id: string;
    options: {
      type: 'static';
      subtitle?: string;
    };
  }>;
};

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const paymentElementAppearance: Appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#4f46e5',
    colorBackground: '#0b1120',
    colorText: '#f8fafc',
    colorTextSecondary: '#94a3b8',
    colorDanger: '#f87171',
    borderRadius: '18px',
    fontFamily: 'system-ui, sans-serif',
  },
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
    eyebrow: 'Stripe Payment Element',
    title: 'Επιβεβαίωση πακέτου και ασφαλής πληρωμή',
    body:
      'Η σελίδα πληρωμής πλέον μένει μέσα στην εφαρμογή. Υποστηρίζει κάρτα και IRIS επιλογή μέσα από το Stripe Payment Element, αλλά το ξεκλείδωμα γίνεται μόνο μετά από επιβεβαιωμένο backend state.',
    pendingTitle: 'Υπάρχει πληρωμή που περιμένει επιβεβαίωση',
    pendingBody: 'Αν ολοκλήρωσες μόλις την πληρωμή, μπορείς να ξαναελέγξεις την κατάσταση χωρίς να ξεκινήσεις νέο attempt.',
    unlockedTitle: 'Το πακέτο σου έχει ήδη ξεκλειδωθεί',
    unlockedBody: 'Δεν χρειάζεται νέα πληρωμή. Μπορείς να συνεχίσεις κατευθείαν στη δημιουργία event.',
    selectedPlan: 'Επιλεγμένο πακέτο',
    draftTitle: 'Τίτλος event',
    draftDate: 'Ημερομηνία event',
    secureNote:
      'Η frontend επιβεβαίωση δεν αρκεί ποτέ μόνη της. Το backend παραμένει source of truth για unlock και entitlement.',
    changeTierNote: 'Αν θέλεις άλλο πακέτο, γύρνα πίσω στο draft και άλλαξέ το εκεί.',
    continueCreate: 'Συνέχεια στο Create Event',
    checkPending: 'Έλεγχος κατάστασης πληρωμής',
    backToDraft: 'Πίσω στο draft',
    dashboard: 'Dashboard',
    paymentStatus: 'Κατάσταση πληρωμής',
    paymentFormTitle: 'Στοιχεία πληρωμής',
    paymentFormBody:
      'Για κάρτα, η πληρωμή επιβεβαιώνεται μέσω Stripe PaymentIntent και webhook. Για IRIS, η επιλογή εμφανίζεται μέσα στο ίδιο form.',
    loadingStatus: 'Γίνεται έλεγχος κατάστασης πληρωμής...',
    loadingForm: 'Γίνεται φόρτωση ασφαλούς φόρμας πληρωμής...',
    payButton: 'Πληρωμή τώρα',
    irisSubtitle: 'IRIS',
    missingStripeKey: 'Λείπει το VITE_STRIPE_PUBLISHABLE_KEY από το frontend env.',
    tiers: {
      BASIC: {
        name: 'Basic',
        price: 'EUR 29',
        features: ['Ένα hosted event', 'Έως 100 guests', '10GB storage', 'Διατήρηση για 1 μήνα'],
      },
      PREMIUM: {
        name: 'Premium',
        price: 'EUR 79',
        features: ['Ένα hosted event', 'Έως 300 guests', '50GB storage', 'AI stories'],
      },
      LUXURY: {
        name: 'Luxury',
        price: 'EUR 129',
        features: ['Ένα hosted event', 'Έως 500 guests', '200GB storage', 'AI stories και 360 view'],
      },
    },
  },
  en: {
    eyebrow: 'Stripe Payment Element',
    title: 'Plan confirmation and secure payment',
    body:
      'The payment step now stays inside the app. It supports card payments and an IRIS option through the Stripe Payment Element, while the backend remains the only source of truth for unlocking.',
    pendingTitle: 'A payment is still waiting for confirmation',
    pendingBody: 'If you just completed a payment, you can re-check that attempt instead of starting a new one.',
    unlockedTitle: 'Your tier is already unlocked',
    unlockedBody: 'No new payment is needed. You can continue straight to event creation.',
    selectedPlan: 'Selected tier',
    draftTitle: 'Event title',
    draftDate: 'Event date',
    secureNote:
      'Frontend success never unlocks access on its own. The backend remains the source of truth for entitlement changes.',
    changeTierNote: 'If you want a different tier, go back to the draft and change it there.',
    continueCreate: 'Continue to Create Event',
    checkPending: 'Check payment status',
    backToDraft: 'Back to draft',
    dashboard: 'Dashboard',
    paymentStatus: 'Payment status',
    paymentFormTitle: 'Payment details',
    paymentFormBody:
      'Card payments are confirmed through a Stripe PaymentIntent and webhook. The IRIS option is rendered inside the same form.',
    loadingStatus: 'Loading payment status...',
    loadingForm: 'Loading secure payment form...',
    payButton: 'Pay now',
    irisSubtitle: 'IRIS',
    missingStripeKey: 'Missing VITE_STRIPE_PUBLISHABLE_KEY in frontend env.',
    tiers: {
      BASIC: {
        name: 'Basic',
        price: 'EUR 29',
        features: ['One hosted event', 'Up to 100 guests', '10GB storage', '1 month retention'],
      },
      PREMIUM: {
        name: 'Premium',
        price: 'EUR 79',
        features: ['One hosted event', 'Up to 300 guests', '50GB storage', 'AI stories'],
      },
      LUXURY: {
        name: 'Luxury',
        price: 'EUR 129',
        features: ['One hosted event', 'Up to 500 guests', '200GB storage', 'AI stories and 360 view'],
      },
    },
  },
} as const;

const formatAmount = (amount: number, currency: string, language: PublicLanguage) => {
  return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

type EmbeddedPaymentFormProps = {
  tier: Tier;
  quote: PaymentQuote;
  language: PublicLanguage;
};

const EmbeddedPaymentForm = ({ tier, quote, language }: EmbeddedPaymentFormProps) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageCopy = copy[language];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submitResult = await elements.submit();

      if (submitResult.error) {
        throw new Error(submitResult.error.message || 'Payment details are incomplete');
      }

      const selectedPaymentMethod =
        'selectedPaymentMethod' in submitResult && typeof submitResult.selectedPaymentMethod === 'string'
          ? submitResult.selectedPaymentMethod
          : null;

      if (selectedPaymentMethod === quote.customPaymentMethodType) {
        const response = await createCustomPaymentAttempt(tier, quote.customPaymentMethodType);
        throw new Error(response.message);
      }

      const paymentIntent = await createPaymentIntent(tier);

      if (!paymentIntent.clientSecret) {
        throw new Error('Payment initialization did not return a client secret');
      }

      const result = await stripe.confirmPayment({
        elements,
        clientSecret: paymentIntent.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?purchase_id=${encodeURIComponent(String(paymentIntent.purchaseId))}`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        throw new Error(result.error.message || 'Payment confirmation failed');
      }

      if (result.paymentIntent) {
        navigate(`/payment/success?purchase_id=${encodeURIComponent(String(paymentIntent.purchaseId))}`, {
          replace: true,
        });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to start payment');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-gray-800 bg-gray-950/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{pageCopy.paymentFormTitle}</p>
          <p className="mt-2 text-sm leading-6 text-gray-400">{pageCopy.paymentFormBody}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-200">
          {formatAmount(quote.amount, quote.currency, language)}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-800 bg-slate-950/80 p-4">
        <PaymentElement
          options={{
            layout: {
              type: 'accordion',
              defaultCollapsed: false,
              radios: 'always',
              spacedAccordionItems: false,
            },
            paymentMethodOrder: ['card', quote.customPaymentMethodType],
          }}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : pageCopy.payButton}
      </button>
    </form>
  );
};

const PaymentPlaceholder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [draftSummary, setDraftSummary] = useState<DraftSummary>({});
  const [paymentOverview, setPaymentOverview] = useState<PaymentOverview | null>(null);
  const [paymentQuote, setPaymentQuote] = useState<PaymentQuote | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(true);
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
  const latestPendingPurchaseId =
    paymentOverview?.latestPaymentStatus === 'PENDING' ? paymentOverview.latestPurchaseId : null;
  const draftPath = draftSummary.package ? '/create-event' : `/create-event?tier=${encodeURIComponent(requestedTier)}`;

  useEffect(() => {
    let cancelled = false;

    const loadQuote = async () => {
      if (isPaid) {
        setPaymentQuote(null);
        setQuoteLoading(false);
        return;
      }

      setQuoteLoading(true);

      try {
        const nextQuote = await fetchPaymentQuote(displayTier);
        if (!cancelled) {
          setPaymentQuote(nextQuote);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load payment form');
        }
      } finally {
        if (!cancelled) {
          setQuoteLoading(false);
        }
      }
    };

    if (!overviewLoading) {
      void loadQuote();
    }

    return () => {
      cancelled = true;
    };
  }, [displayTier, isPaid, overviewLoading]);

  const displayedPrice = useMemo(() => {
    if (!paymentQuote) {
      return tierCopy.price;
    }

    return formatAmount(paymentQuote.amount, paymentQuote.currency, language);
  }, [language, paymentQuote, tierCopy.price]);

  const elementsOptions = useMemo<ElementsOptionsWithCustomMethods | null>(() => {
    if (!paymentQuote) {
      return null;
    }

    return {
      mode: 'payment',
      amount: paymentQuote.amount,
      currency: paymentQuote.currency,
      paymentMethodTypes: ['card'],
      customPaymentMethods: [
        {
          id: paymentQuote.customPaymentMethodType,
          options: {
            type: 'static',
            subtitle: pageCopy.irisSubtitle,
          },
        },
      ],
      appearance: paymentElementAppearance,
    };
  }, [pageCopy.irisSubtitle, paymentQuote]);

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
                {pageCopy.loadingStatus}
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
            ) : latestPendingPurchaseId ? (
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
                <p className="text-4xl font-bold text-white">{displayedPrice}</p>
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

            {!isPaid && (
              <>
                {!stripePromise ? (
                  <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                    {pageCopy.missingStripeKey}
                  </div>
                ) : quoteLoading || !elementsOptions || !paymentQuote ? (
                  <div className="mt-8 flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-950/70 px-5 py-4 text-sm text-gray-300">
                    <Loader2 size={18} className="animate-spin" />
                    {pageCopy.loadingForm}
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={elementsOptions}>
                    <EmbeddedPaymentForm tier={displayTier} quote={paymentQuote} language={language} />
                  </Elements>
                )}
              </>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {latestPendingPurchaseId && !isPaid && (
                <button
                  type="button"
                  onClick={() => navigate(`/payment/success?purchase_id=${encodeURIComponent(String(latestPendingPurchaseId))}`)}
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
                >
                  {pageCopy.checkPending}
                </button>
              )}

              {isPaid && paymentOverview?.creationPath && (
                <button
                  type="button"
                  onClick={() => navigate(paymentOverview.creationPath!, { replace: true })}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  {pageCopy.continueCreate}
                </button>
              )}

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
