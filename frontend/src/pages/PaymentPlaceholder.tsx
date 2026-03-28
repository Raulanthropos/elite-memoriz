import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Hourglass, ShieldCheck } from 'lucide-react';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { CREATE_EVENT_DRAFT_STORAGE_KEY } from '../lib/createEventDraft';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { parseTier } from '../lib/tiers';

type DraftSummary = {
  title?: string;
  date?: string;
  package?: string;
};

const copy = {
  el: {
    eyebrow: 'Payment placeholder',
    title: 'Το payment step θα μπει εδώ',
    body:
      'Η διαδρομή πλέον είναι σωστά στημένη: επιλογή event, δημιουργία host account και μετά payment. Όταν μπει το Stripe, αυτή η σελίδα θα γίνει το επόμενο πραγματικό βήμα.',
    selectedPlan: 'Επιλεγμένο πακέτο',
    draftTitle: 'Όνομα event',
    draftDate: 'Ημερομηνία',
    note: 'Το event draft έχει διατηρηθεί. Μόλις προστεθεί το payment integration, μετά το checkout θα μπορείς να επιστρέφεις για την τελική ενεργοποίηση.',
    stripeNote: 'Το Stripe μπορεί να προστεθεί αργότερα σε αυτό το route χωρίς να αλλάξει η υπόλοιπη δημόσια ροή.',
    returnCta: 'Επιστροφή στο event draft',
    landingCta: 'Επιστροφή στην αρχική',
    status: 'Account created, payment pending',
  },
  en: {
    eyebrow: 'Payment placeholder',
    title: 'The payment step will live here',
    body:
      'The funnel is now set up correctly: event setup, host account creation, then payment. Once Stripe is added, this page becomes the real next step.',
    selectedPlan: 'Selected plan',
    draftTitle: 'Event title',
    draftDate: 'Date',
    note: 'The event draft has been preserved. Once payment integration is added, the user can return here after checkout and continue into final activation.',
    stripeNote: 'Stripe can slot into this route later without changing the rest of the public funnel.',
    returnCta: 'Return to event draft',
    landingCta: 'Back to landing page',
    status: 'Account created, payment pending',
  },
} as const;

const PaymentPlaceholder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [draftSummary, setDraftSummary] = useState<DraftSummary>({});

  const requestedTier = parseTier(searchParams.get('tier')) ?? 'BASIC';
  const pageCopy = copy[language];

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  useEffect(() => {
    const savedDraft = window.sessionStorage.getItem(CREATE_EVENT_DRAFT_STORAGE_KEY);
    if (!savedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as { formData?: DraftSummary };
      setDraftSummary(parsed.formData ?? {});
    } catch {
      window.sessionStorage.removeItem(CREATE_EVENT_DRAFT_STORAGE_KEY);
    }
  }, []);

  const tierLabel = draftSummary.package ?? requestedTier;
  const draftPath = `/create-event?tier=${encodeURIComponent(requestedTier)}`;

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_24px_80px_rgba(41,37,36,0.12)]">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-900/60">{pageCopy.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">{pageCopy.title}</h1>
              <p className="mt-5 text-lg leading-8 text-stone-600">{pageCopy.body}</p>

              <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-900">
                    <Hourglass size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{pageCopy.status}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{pageCopy.note}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(draftPath)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  <ArrowLeft size={16} />
                  {pageCopy.returnCta}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-900"
                >
                  {pageCopy.landingCta}
                </button>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[1.75rem] bg-stone-950 p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-white/10 p-3">
                  <CreditCard size={22} />
                </div>
                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {pageCopy.selectedPlan}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{pageCopy.selectedPlan}</p>
                  <p className="mt-2 text-2xl font-semibold">{tierLabel}</p>
                </div>

                {draftSummary.title && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{pageCopy.draftTitle}</p>
                    <p className="mt-2 text-lg font-medium">{draftSummary.title}</p>
                  </div>
                )}

                {draftSummary.date && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{pageCopy.draftDate}</p>
                    <p className="mt-2 text-lg font-medium">{draftSummary.date}</p>
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-1 text-emerald-300" />
                    <p className="text-sm leading-6 text-stone-200">
                      {pageCopy.stripeNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPlaceholder;
