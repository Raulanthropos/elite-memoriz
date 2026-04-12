import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Crown,
  Landmark,
  Loader2,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { clearStoredCreateEventDraft, getStoredCreateEventDraft } from '../lib/createEventDraft';
import {
  chargeCardToken,
  createPaymentSession,
  fetchPaymentOverview,
  fetchPaymentQuote,
  getIrisPending,
  storeIrisPending,
  type PaymentOverview,
  type PaymentQuote,
  type PaymentSession,
} from '../lib/payments';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { parseTier, type Tier } from '../lib/tiers';

// ---------------------------------------------------------------------------
// EveryPay script loader
// ---------------------------------------------------------------------------

const EVERYPAY_SCRIPT_URL = 'https://sandbox-js.everypay.gr/v3';

const EVERYPAY_IRIS_FORM_URL =
  'https://sandbox-payform-api.everypay.gr/api/payment-methods/iris';
  

const loadEveryPayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).everypay) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${EVERYPAY_SCRIPT_URL}"]`,
    );

    if (existing) {
      if ((window as any).everypay) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('EveryPay script failed')));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = EVERYPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load EveryPay payment library'));
    document.body.appendChild(script);
  });
};

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type DraftSummary = {
  title?: string;
  date?: string;
  package?: string;
};

type PaymentMethodTab = 'card' | 'iris';

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

// ---------------------------------------------------------------------------
// Copy / translations
// ---------------------------------------------------------------------------

const copy = {
  el: {
    eyebrow: 'Ασφαλής Πληρωμή',
    title: 'Επιβεβαίωση πακέτου και πληρωμή',
    body: 'Επίλεξε μέθοδο πληρωμής — κάρτα ή IRIS. Μετά την ολοκλήρωση το πακέτο ξεκλειδώνεται αυτόματα.',
    pendingTitle: 'Υπάρχει πληρωμή σε εξέλιξη',
    pendingBody: 'Αυτός ο λογαριασμός έχει ήδη μια pending πληρωμή. Συνέχισε με το ίδιο πακέτο και την ίδια μέθοδο μέχρι να λυθεί.',
    pendingMethodLocked: 'Όσο η πληρωμή είναι pending δεν μπορείς να αλλάξεις πακέτο ή μέθοδο από εδώ.',
    unlockedTitle: 'Το πακέτο σου έχει ήδη ξεκλειδωθεί',
    unlockedBody: 'Δεν χρειάζεται νέα πληρωμή. Μπορείς να συνεχίσεις κατευθείαν στη δημιουργία event.',
    selectedPlan: 'Επιλεγμένο πακέτο',
    draftTitle: 'Τίτλος event',
    draftDate: 'Ημερομηνία event',
    secureNote:
      'Η πληρωμή επιβεβαιώνεται μόνο μέσω του backend. Καμία ενέργεια στο frontend δεν ξεκλειδώνει πρόσβαση από μόνη της.',
    changeTierNote: 'Αν θέλεις άλλο πακέτο, γύρνα πίσω στο draft και άλλαξέ το εκεί.',
    continueCreate: 'Συνέχεια στο Create Event',
    checkPending: 'Έλεγχος κατάστασης πληρωμής',
    backToDraft: 'Πίσω στο draft',
    dashboard: 'Dashboard',
    paymentStatus: 'Κατάσταση πληρωμής',
    loadingStatus: 'Γίνεται έλεγχος κατάστασης πληρωμής...',
    loadingForm: 'Φόρτωση φόρμας πληρωμής...',
    tabCard: 'Κάρτα',
    tabIris: 'IRIS',
    cardTitle: 'Πληρωμή με κάρτα',
    cardBody: 'Συμπλήρωσε τα στοιχεία της κάρτας σου παρακάτω. Η πληρωμή γίνεται μέσω EveryPay.',
    irisTitle: 'Πληρωμή με IRIS',
    irisBody: 'Θα μεταφερθείς στην τράπεζά σου για να ολοκληρώσεις τη μεταφορά. Μόλις γίνει, γύρνα πίσω για επιβεβαίωση.',
    payWithCard: 'Πληρωμή με κάρτα',
    payWithIris: 'Πληρωμή μέσω IRIS',
    processing: 'Επεξεργασία πληρωμής...',
    initializingCard: 'Γίνεται αρχικοποίηση φόρμας κάρτας...',
    redirectingIris: 'Μεταφορά στην τράπεζα...',
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
    eyebrow: 'Secure Payment',
    title: 'Plan confirmation and payment',
    body: 'Choose your payment method — card or IRIS bank transfer. Your tier unlocks automatically after confirmation.',
    pendingTitle: 'A payment is already in progress',
    pendingBody: 'This account already has a pending payment. Continue with the same tier and payment method until it resolves.',
    pendingMethodLocked: 'While the payment is pending, you cannot switch tier or payment method here.',
    unlockedTitle: 'Your tier is already unlocked',
    unlockedBody: 'No new payment is needed. You can continue straight to event creation.',
    selectedPlan: 'Selected tier',
    draftTitle: 'Event title',
    draftDate: 'Event date',
    secureNote:
      'Payment is confirmed exclusively through the backend. No frontend action unlocks access on its own.',
    changeTierNote: 'If you want a different tier, go back to the draft and change it there.',
    continueCreate: 'Continue to Create Event',
    checkPending: 'Check payment status',
    backToDraft: 'Back to draft',
    dashboard: 'Dashboard',
    paymentStatus: 'Payment status',
    loadingStatus: 'Checking payment status...',
    loadingForm: 'Loading payment form...',
    tabCard: 'Card',
    tabIris: 'IRIS',
    cardTitle: 'Pay with card',
    cardBody: 'Fill in your card details below. Payment is processed securely via EveryPay.',
    irisTitle: 'Pay with IRIS',
    irisBody: 'You will be redirected to your bank to complete the transfer. Once done, return here to confirm.',
    payWithCard: 'Pay with card',
    payWithIris: 'Pay with IRIS',
    processing: 'Processing payment...',
    initializingCard: 'Initializing card form...',
    redirectingIris: 'Redirecting to bank...',
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

const formatAmount = (amount: number, currency: string, language: PublicLanguage) =>
  new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

// ---------------------------------------------------------------------------
// Card payment form (embedded EveryPay payform)
// ---------------------------------------------------------------------------

type CardFormProps = {
  session: PaymentSession;
  language: PublicLanguage;
  onSuccess: (creationPath: string | null) => void;
  onError: (message: string) => void;
};

const CardPaymentForm = ({ session, language, onSuccess, onError }: CardFormProps) => {
  const payformContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [processing, setProcessing] = useState(false);
  const pageCopy = copy[language];

  useEffect(() => {
    if (initializedRef.current) return;
    if (!(window as any).everypay) return;
    if (!payformContainerRef.current) return;

    initializedRef.current = true;

    const payload = {
      pk: session.publicKey,
      amount: session.amount,
      locale: language === 'el' ? 'el' : 'en',
      txnType: 'tds',
    };

    (window as any).everypay.payform(
      payload,
      async (response: any) => {
        if (response.onLoad) return;

        if (response.response === 'success' && response.token) {
          setProcessing(true);
          try {
            const result = await chargeCardToken(session.purchaseId, response.token);
            if (result.success && result.isUnlocked) {
              onSuccess(result.creationPath);
            } else {
              onError(result.message || 'Payment was not captured');
            }
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Payment failed');
          } finally {
            setProcessing(false);
          }
        } else if (response.response === 'error') {
          const msg =
            response.msg?.message ||
            'Card authentication failed. Please try a different card.';
          onError(msg);
        }
      },
    );
  }, [session, language, onSuccess, onError]);

  return (
    <div className="mt-5">
      <div
        id="pay-form"
        ref={payformContainerRef}
        className="min-h-[120px] rounded-2xl border border-gray-800 bg-slate-950/80 p-4"
      />

      {processing && (
        <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-4 text-sm text-indigo-200">
          <Loader2 size={18} className="animate-spin" />
          {pageCopy.processing}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PaymentPlaceholder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [draftSummary, setDraftSummary] = useState<DraftSummary>({});
  const [paymentOverview, setPaymentOverview] = useState<PaymentOverview | null>(null);
  const [paymentQuote, setPaymentQuote] = useState<PaymentQuote | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodTab, setPaymentMethodTab] = useState<PaymentMethodTab>('card');

  const requestedTier = parseTier(searchParams.get('tier')) ?? 'BASIC';
  const pageCopy = copy[language];
  const latestStatusMessage = paymentOverview?.latestPaymentStatus === 'FAILED'
    ? paymentOverview.latestStatusMessage
    : null;

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  // Load saved event draft for the sidebar summary
  useEffect(() => {
    const savedDraft = getStoredCreateEventDraft();
    if (!savedDraft) return;
    try {
      const parsed = JSON.parse(savedDraft) as { formData?: DraftSummary };
      setDraftSummary(parsed.formData ?? {});
    } catch {
      clearStoredCreateEventDraft();
    }
  }, []);

  // Fetch payment overview
  useEffect(() => {
    let cancelled = false;
    const loadOverview = async () => {
      try {
        const next = await fetchPaymentOverview();
        if (!cancelled) setPaymentOverview(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payment status');
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };
    void loadOverview();
    return () => { cancelled = true; };
  }, []);

  const pendingSelectedTier = paymentOverview?.latestPaymentStatus === 'PENDING'
    ? paymentOverview.latestSelectedTier
    : null;
  const displayTier = paymentOverview?.entitledTier ?? pendingSelectedTier ?? requestedTier;
  const tierCopy = pageCopy.tiers[displayTier];
  const isPaid = Boolean(paymentOverview?.hasPaidTier && paymentOverview.entitledTier);

  // Load EveryPay JS only when a new card payment is actually possible
  useEffect(() => {
    if (overviewLoading || isPaid) return;
    loadEveryPayScript()
      .then(() => setScriptLoaded(true))
      .catch(() => setScriptError(true));
  }, [overviewLoading, isPaid]);
  const hasBackendPendingPurchase = Boolean(
    !isPaid
    && paymentOverview?.latestPaymentStatus === 'PENDING'
    && paymentOverview.latestPurchaseId,
  );
  const pendingPaymentMethod = hasBackendPendingPurchase
    ? paymentOverview?.latestPaymentMethodType === 'iris'
      ? 'iris'
      : 'card'
    : null;

  // Check for pending IRIS payment from localStorage
  const irisPending = getIrisPending();
  const shouldUseStoredIrisPending = Boolean(
    !isPaid
    && !hasBackendPendingPurchase
    && !overviewLoading
    && paymentOverview?.latestPaymentStatus === 'NOT_STARTED'
    && irisPending != null,
  );
  const showPendingBanner = hasBackendPendingPurchase || shouldUseStoredIrisPending;
  const pendingStatusPurchaseId = hasBackendPendingPurchase
    ? paymentOverview?.latestPurchaseId ?? null
    : shouldUseStoredIrisPending
      ? irisPending?.purchaseId ?? null
      : null;
  const showPendingStatusButton = Boolean(
    pendingStatusPurchaseId
    && ((hasBackendPendingPurchase && pendingPaymentMethod === 'iris') || shouldUseStoredIrisPending),
  );
  const cardTabDisabled = hasBackendPendingPurchase && pendingPaymentMethod !== 'card';
  const irisTabDisabled = hasBackendPendingPurchase && pendingPaymentMethod !== 'iris';

  const draftPath = draftSummary.package
    ? '/create-event'
    : `/create-event?tier=${encodeURIComponent(displayTier)}`;

  // Reset session when tier changes
  useEffect(() => {
    setPaymentSession(null);
  }, [displayTier]);

  useEffect(() => {
    if (hasBackendPendingPurchase && pendingPaymentMethod) {
      setPaymentMethodTab(pendingPaymentMethod);
    }
  }, [hasBackendPendingPurchase, pendingPaymentMethod]);

  // Fetch tier price quote
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
        const next = await fetchPaymentQuote(displayTier);
        if (!cancelled) setPaymentQuote(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load pricing');
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };
    if (!overviewLoading) void loadQuote();
    return () => { cancelled = true; };
  }, [displayTier, isPaid, overviewLoading]);

  const displayedPrice = useMemo(() => {
    if (paymentSession) return formatAmount(paymentSession.amount, paymentSession.currency, language);
    if (paymentQuote) return formatAmount(paymentQuote.amount, paymentQuote.currency, language);
    return tierCopy.price;
  }, [language, paymentQuote, paymentSession, tierCopy.price]);

  // ---- Card flow ----

  const initializeCardSession = async () => {
    setSessionLoading(true);
    setError(null);
    try {
      const session = await createPaymentSession(displayTier, 'card');
      setPaymentSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCardSuccess = useCallback(
    (creationPath: string | null) => {
      if (creationPath) {
        navigate(creationPath, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    },
    [navigate],
  );

  const handleCardError = useCallback((message: string) => {
    setError(message);
    setPaymentSession(null);
  }, []);

  // ---- IRIS flow ----

  const [irisRedirecting, setIrisRedirecting] = useState(false);

  const initiateIrisPayment = async () => {
    setSessionLoading(true);
    setIrisRedirecting(false);
    setError(null);

    try {
      const session = await createPaymentSession(displayTier, 'iris');

      if (!session.signature) {
        throw new Error('IRIS session did not return a signature');
      }

      storeIrisPending(session.purchaseId, displayTier);
      setIrisRedirecting(true);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = EVERYPAY_IRIS_FORM_URL;
      form.style.display = 'none';

      const fields: Record<string, string> = {
        flow: 'direct',
        token: session.signature,
        pk: session.publicKey,
        amount: String(session.amount),
        currency: session.currency.toUpperCase(),
        uuid: generateUUID(),
      };

      for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start IRIS payment');
      setIrisRedirecting(false);
    } finally {
      setSessionLoading(false);
    }
  };

  // ---- Rendering ----

  const showPaymentForm = !isPaid && !overviewLoading && !quoteLoading && paymentQuote;
  const cardScriptReady = scriptLoaded;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main content */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300/80">
              {pageCopy.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {pageCopy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300">{pageCopy.body}</p>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {!error && latestStatusMessage && (
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                {latestStatusMessage}
              </div>
            )}

            {/* Status banners */}
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
            ) : showPendingBanner ? (
              <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{pageCopy.pendingTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{pageCopy.pendingBody}</p>
                    {hasBackendPendingPurchase && (
                      <p className="mt-2 text-sm leading-6 text-amber-100">{pageCopy.pendingMethodLocked}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Tier card */}
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

            {/* Payment form area */}
            {showPaymentForm && (
              <div className="mt-8 rounded-3xl border border-gray-800 bg-gray-950/70 p-5">
                {/* Tab selector */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (cardTabDisabled) return;
                      setPaymentMethodTab('card');
                      setPaymentSession(null);
                      setError(null);
                    }}
                    disabled={cardTabDisabled}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                      paymentMethodTab === 'card'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <CreditCard size={16} />
                    {pageCopy.tabCard}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (irisTabDisabled) return;
                      setPaymentMethodTab('iris');
                      setPaymentSession(null);
                      setError(null);
                    }}
                    disabled={irisTabDisabled}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                      paymentMethodTab === 'iris'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <Landmark size={16} />
                    {pageCopy.tabIris}
                  </button>
                </div>

                {hasBackendPendingPurchase && (
                  <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {pageCopy.pendingMethodLocked}
                  </div>
                )}

                {/* Card tab */}
                {paymentMethodTab === 'card' && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-white">{pageCopy.cardTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{pageCopy.cardBody}</p>

                    {scriptError ? (
                      <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                        {language === 'el'
                          ? 'Η φόρτωση της βιβλιοθήκης κάρτας απέτυχε. Δοκίμασε να κάνεις ανανέωση ή χρησιμοποίησε IRIS.'
                          : 'Failed to load the card payment library. Try refreshing the page or use IRIS instead.'}
                      </div>
                    ) : !cardScriptReady ? (
                      <div className="mt-5 flex items-center gap-3 text-sm text-gray-400">
                        <Loader2 size={18} className="animate-spin" />
                        {pageCopy.loadingForm}
                      </div>
                    ) : !paymentSession ? (
                      <>
                        <button
                          type="button"
                          onClick={initializeCardSession}
                          disabled={sessionLoading}
                          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sessionLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            pageCopy.payWithCard
                          )}
                        </button>
                        {sessionLoading && (
                          <p className="mt-3 text-center text-sm text-gray-400">
                            {pageCopy.initializingCard}
                          </p>
                        )}
                      </>
                    ) : (
                      <CardPaymentForm
                        session={paymentSession}
                        language={language}
                        onSuccess={handleCardSuccess}
                        onError={handleCardError}
                      />
                    )}
                  </div>
                )}

                {/* IRIS tab */}
                {paymentMethodTab === 'iris' && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-white">{pageCopy.irisTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{pageCopy.irisBody}</p>

                    <button
                      type="button"
                      onClick={initiateIrisPayment}
                      disabled={sessionLoading || irisRedirecting}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sessionLoading || irisRedirecting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          {irisRedirecting ? pageCopy.redirectingIris : pageCopy.initializingCard}
                        </>
                      ) : (
                        <>
                          <Landmark size={16} />
                          {pageCopy.payWithIris}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!showPaymentForm && !isPaid && !overviewLoading && (
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-950/70 px-5 py-4 text-sm text-gray-300">
                <Loader2 size={18} className="animate-spin" />
                {pageCopy.loadingForm}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {showPendingStatusButton && pendingStatusPurchaseId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/payment/success?purchase_id=${encodeURIComponent(String(pendingStatusPurchaseId))}`,
                    )
                  }
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

          {/* Sidebar */}
          <aside className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-200/70">
                {pageCopy.selectedPlan}
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{tierCopy.name}</p>
              <p className="mt-3 text-sm leading-6 text-gray-300">{pageCopy.secureNote}</p>
            </div>

            <div className="mt-6 space-y-4">
              {draftSummary.title && (
                <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    {pageCopy.draftTitle}
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">{draftSummary.title}</p>
                </div>
              )}

              {draftSummary.date && (
                <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    {pageCopy.draftDate}
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">{draftSummary.date}</p>
                </div>
              )}

              <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                  {pageCopy.paymentStatus}
                </p>
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
