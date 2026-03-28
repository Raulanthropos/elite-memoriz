import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, CreditCard, Globe, Image, Lock, QrCode, Sparkles, UserRoundPlus, Users } from 'lucide-react';
import { TIERS, type Tier } from '../lib/tiers';

type Language = 'el' | 'en';

const LANGUAGE_STORAGE_KEY = 'elite-memoriz-language';

const tierMeta: Record<Tier, { price: string; accent: string }> = {
  BASIC: { price: '€29', accent: 'border-stone-300 bg-white' },
  PREMIUM: { price: '€79', accent: 'border-emerald-500 bg-emerald-50' },
  LUXURY: { price: '€129', accent: 'border-amber-400 bg-amber-50' },
};

const copy = {
  el: {
    nav: { how: 'Πως λειτουργεί', plans: 'Πακέτα', login: 'Σύνδεση host' },
    hero: {
      badge: 'Χωρίς app για τους καλεσμένους',
      title: 'Το ιδιωτικό album που γεμίζει',
      accent: 'ζωντανά από το event',
      body:
        'Για γάμους, βαφτίσεις, parties και εταιρικά events. Ο host δίνει ένα QR και συγκεντρώνει όλο το υλικό σε έναν καθαρό χώρο.',
      primary: 'Ξεκίνα τη δημιουργία event',
      secondary: 'Δες τα πακέτα',
      selected: 'Προεπισκόπηση πακέτου',
      preview: 'Τι ξεκινά έτοιμο',
      bullets: ['QR και private link', 'Live gallery για uploads', 'Τελικό download από ένα σημείο'],
    },
    promises: [
      ['Γρήγορο setup', 'Ο host στήνει event, μοιράζεται QR και ξεκινά άμεσα.'],
      ['Πιο καθαρή εμπειρία', 'Οι φωτογραφίες δεν χάνονται σε chats και inboxes.'],
      ['Αληθινό product feel', 'Η αρχική σελίδα εξηγεί ξεκάθαρα το flow και τα πακέτα.'],
    ],
    stepsTitle: 'Πως λειτουργεί στην πράξη',
    steps: [
      ['1. Συμπληρώνεις τα στοιχεία', 'Ορίζεις τίτλο, ημερομηνία και τύπο event.'],
      ['2. Επιλέγεις πακέτο', 'Βλέπεις τα διαθέσιμα tiers μέσα στη φόρμα και διαλέγεις αυτό που θέλεις.'],
      ['3. Δημιουργείς host account', 'Ο επισκέπτης προχωρά σε registration για να συνεχίσει το hosting flow.'],
      ['4. Προχωράς σε payment', 'Το payment step ακολουθεί αμέσως μετά και έπειτα γίνεται η τελική ενεργοποίηση.'],
    ],
    experienceTitle: 'Τι πρέπει να νιώθει ο πελάτης',
    experienceBody:
      'Το Elite Memoriz πρέπει να δείχνει έτοιμο για χρήση. Η landing page πλέον δίνει καθαρή εικόνα για το αποτέλεσμα, τα όρια κάθε tier και το επόμενο βήμα.',
    experienceBullets: [
      'Ιδιωτική πρόσβαση με QR ή direct link',
      'Preview των πακέτων στην αρχική και τελική επιλογή μέσα στο Create Event',
      'Διαφορετικά όρια σε καλεσμένους, storage και διάρκεια διατήρησης ανά πακέτο',
    ],
    pricingTitle: 'Δες τα πακέτα και συνέχισε στο Create Event',
    pricingBody:
      'Κάθε πακέτο καλύπτει ένα hosted event. Εδώ βλέπεις τις διαφορές των tiers και μέσα στο Create Event κάνεις την τελική επιλογή.',
    tiers: {
      BASIC: {
        name: 'Basic',
        audience: 'Για ένα πιο μικρό και άμεσο event',
        description: 'Καθαρή επιλογή για ένα event με όσα χρειάζονται χωρίς περιττή πολυπλοκότητα.',
        features: ['Έως 100 καλεσμένοι', '10 GB cloud storage', 'Διατήρηση δεδομένων για 1 μήνα'],
        cta: 'Συνέχεια στη φόρμα',
      },
      PREMIUM: {
        name: 'Premium',
        audience: 'Για events με μεγαλύτερη ροή και πιο πλούσιο storytelling',
        description: 'Η πιο ισορροπημένη επιλογή όταν θέλεις περισσότερο χώρο και AI stories στο ίδιο event.',
        features: ['Έως 300 καλεσμένοι', '50 GB cloud storage', 'AI stories', 'Διατήρηση δεδομένων για 3 μήνες'],
        cta: 'Συνέχεια στη φόρμα',
      },
      LUXURY: {
        name: 'Luxury',
        audience: 'Για premium παραγωγές και πιο immersive εμπειρία',
        description: 'Το πιο πλήρες πακέτο, με μεγαλύτερη χωρητικότητα, AI stories και 360 προβολή εικόνας.',
        features: ['Έως 500 καλεσμένοι', '200 GB cloud storage', 'AI stories', '360° image view', 'Διατήρηση δεδομένων για 6 μήνες'],
        cta: 'Συνέχεια στη φόρμα',
      },
    },
    current: 'Τρέχουσα προεπισκόπηση',
    continueWith: 'Συνέχεια στη φόρμα',
    faqTitle: 'Πριν ξεκινήσεις',
    faq: [
      ['Χρειάζεται app ο καλεσμένος;', 'Όχι. Μπαίνει από QR ή link και ανεβάζει από browser.'],
      ['Η επιλογή tier εδώ είναι οριστική;', 'Όχι. Εδώ βλέπεις τα πακέτα και η τελική επιλογή γίνεται μέσα στο Create Event.'],
      ['Αν δεν είμαι συνδεδεμένος;', 'Συμπληρώνεις τα στοιχεία, διαλέγεις πακέτο, κάνεις host registration και μετά προχωράς στο payment βήμα.'],
    ],
    finalTitle: 'Ξεκίνα με πιο καθαρό flow',
    finalBody: 'Δες τα tiers, μπες στο Create Event και οδήγησε τον επισκέπτη σε μια καθαρή διαδρομή: στοιχεία, πακέτο, registration και payment.',
    footer: 'Όλα τα δικαιώματα διατηρούνται.',
  },
  en: {
    nav: { how: 'How it works', plans: 'Plans', login: 'Host sign in' },
    hero: {
      badge: 'No app required for guests',
      title: 'The private album that fills',
      accent: 'live during the event',
      body:
        'Built for weddings, baptisms, parties, and corporate events. The host shares one QR and gathers every memory in one clean space.',
      primary: 'Start event setup',
      secondary: 'View plans',
      selected: 'Plan preview',
      preview: 'What starts ready',
      bullets: ['QR and private link', 'Live gallery for uploads', 'Final download from one place'],
    },
    promises: [
      ['Fast setup', 'The host creates the event, shares the QR, and starts immediately.'],
      ['Cleaner experience', 'Photos do not get lost across chats and inboxes.'],
      ['Real product feel', 'The homepage now explains the flow and the plans clearly.'],
    ],
    stepsTitle: 'How it works in practice',
    steps: [
      ['1. Fill in the details', 'Set the title, date, and type of event.'],
      ['2. Choose the plan', 'Review the available tiers inside the form and pick the one that fits best.'],
      ['3. Create the host account', 'The visitor moves into registration to continue the hosting flow.'],
      ['4. Continue to payment', 'Payment comes next, followed by the final activation step.'],
    ],
    experienceTitle: 'How the product should feel',
    experienceBody:
      'Elite Memoriz should look ready to use. The landing page now gives a clearer view of the result, the limits of each tier, and the next step.',
    experienceBullets: [
      'Private access through QR or direct link',
      'Plan previews on the homepage, with the final choice made inside Create Event',
      'Different guest, storage, and retention limits across plans',
    ],
    pricingTitle: 'Review the plans and continue into Create Event',
    pricingBody:
      'Every plan covers one hosted event. The homepage helps users compare the tiers, and the final plan choice happens inside Create Event.',
    tiers: {
      BASIC: {
        name: 'Basic',
        audience: 'For a smaller, straightforward event',
        description: 'A clean choice for one event with the essentials covered.',
        features: ['Up to 100 guests', '10 GB cloud storage', '1 month data retention'],
        cta: 'Continue to the form',
      },
      PREMIUM: {
        name: 'Premium',
        audience: 'For larger events with stronger storytelling needs',
        description: 'The most balanced choice for one event with more room, more storage, and AI stories.',
        features: ['Up to 300 guests', '50 GB cloud storage', 'AI stories', '3 months data retention'],
        cta: 'Continue to the form',
      },
      LUXURY: {
        name: 'Luxury',
        audience: 'For premium productions and immersive delivery',
        description: 'The fullest package for one event, with the highest capacity and 360 image viewing.',
        features: ['Up to 500 guests', '200 GB cloud storage', 'AI stories', '360° image view', '6 months data retention'],
        cta: 'Continue to the form',
      },
    },
    current: 'Current preview',
    continueWith: 'Continue to the form',
    faqTitle: 'Before you begin',
    faq: [
      ['Do guests need an app?', 'No. They join through a QR code or link and upload from the browser.'],
      ['Is the plan choice final here?', 'No. The homepage is for comparison, and the final plan choice happens inside Create Event.'],
      ['What if I am not signed in?', 'The visitor fills in the event details, chooses a plan, creates a host account, and then continues to payment.'],
    ],
    finalTitle: 'Start with a clearer flow',
    finalBody: 'Review the tiers, enter Create Event, and guide the visitor through one clear path: details, plan, registration, and payment.',
    footer: 'All rights reserved.',
  },
} as const;

const LandingPage = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'el';
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'el';
  });
  const [selectedTier, setSelectedTier] = useState<Tier>('PREMIUM');

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const pageCopy = copy[language];
  const selectedTierCopy = pageCopy.tiers[selectedTier];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const continueToCreateEvent = () => {
    navigate('/create-event');
  };

  return (
    <div className="min-h-screen bg-[#f7f2e8] text-stone-900 selection:bg-amber-200">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f2e8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/70">Elite Memoriz</p>
            <p className="text-lg font-semibold text-stone-900">Private event memories</p>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-stone-600 lg:flex">
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="hover:text-stone-950">
              {pageCopy.nav.how}
            </button>
            <button type="button" onClick={() => scrollToSection('pricing')} className="hover:text-stone-950">
              {pageCopy.nav.plans}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-stone-300 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setLanguage('el')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${language === 'el' ? 'bg-stone-950 text-white' : 'text-stone-600'}`}
              >
                EL
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${language === 'en' ? 'bg-stone-950 text-white' : 'text-stone-600'}`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hidden rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 sm:inline-flex"
            >
              {pageCopy.nav.login}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm">
              <Globe size={16} />
              {pageCopy.hero.badge}
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight text-stone-950 md:text-7xl">
              {pageCopy.hero.title} <span className="text-emerald-900">{pageCopy.hero.accent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{pageCopy.hero.body}</p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={continueToCreateEvent}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-stone-950/15"
              >
                {pageCopy.hero.primary}
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-7 py-4 text-base font-semibold text-stone-800"
              >
                {pageCopy.hero.secondary}
              </button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {pageCopy.promises.map(([title, description], index) => {
                const Icon = [Sparkles, Camera, Image][index];
                return (
                  <div key={title} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/40">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-white">
                      <Icon size={20} />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-stone-950">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_28px_80px_rgba(41,37,36,0.12)]">
            <div className="rounded-[1.75rem] bg-[#17332c] p-6 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/80">
                    {pageCopy.hero.selected}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {selectedTierCopy.name} • {tierMeta[selectedTier].price}
                  </h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-emerald-50">
                  Elite flow
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_0.95fr]">
                <div className="rounded-[1.5rem] bg-white/10 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#17332c]">
                      <QrCode size={24} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">{pageCopy.hero.preview}</p>
                      <p className="mt-1 text-sm text-emerald-50">{selectedTierCopy.audience}</p>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {pageCopy.hero.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-3 text-sm text-emerald-50">
                        <CheckCircle2 size={16} className="shrink-0 text-amber-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[1.5rem] bg-[#f7f2e8] p-5 text-stone-900">
                  <p className="text-sm font-semibold text-stone-500">{pageCopy.current}</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-950">{selectedTierCopy.name}</p>
                  <ul className="mt-4 space-y-3">
                    {selectedTierCopy.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-stone-700">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={continueToCreateEvent}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white"
                  >
                    {pageCopy.continueWith}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-stone-200 bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">{pageCopy.stepsTitle}</h2>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {pageCopy.steps.map(([title, description], index) => {
                const Icon = [Sparkles, CheckCircle2, UserRoundPlus, CreditCard][index];
                return (
                  <div key={title} className="rounded-[2rem] border border-stone-200 bg-[#f7f2e8] p-8 shadow-lg shadow-stone-200/40">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-950 text-white">
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold text-stone-950">{title}</h3>
                    <p className="mt-3 text-base leading-7 text-stone-600">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#efe5d3] py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div className="rounded-[2rem] bg-stone-950 p-8 text-white shadow-2xl shadow-stone-950/15">
              <h2 className="text-4xl font-semibold tracking-tight">{pageCopy.experienceTitle}</h2>
              <p className="mt-4 text-base leading-7 text-stone-300">{pageCopy.experienceBody}</p>
              <div className="mt-8 space-y-4">
                {pageCopy.experienceBullets.map((bullet) => (
                  <div key={bullet} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-1 shrink-0 text-amber-300" />
                      <p className="text-sm leading-6 text-stone-200">{bullet}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ['Private access', Lock],
                ['Host-first control', Users],
                ['Live gallery', Image],
                ['Clear plan choice', Sparkles],
              ].map(([fallbackTitle, Icon], index) => {
                const title = pageCopy.promises[index]?.[0] ?? fallbackTitle;
                const description = pageCopy.promises[index]?.[1] ?? '';
                const CardIcon = Icon as typeof Lock;
                return (
                  <div key={title} className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900">
                      <CardIcon size={20} />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-stone-900">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">{pageCopy.pricingTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-stone-600">{pageCopy.pricingBody}</p>
            </div>

            <div className="mt-14 grid gap-6 xl:grid-cols-3">
              {TIERS.map((tier) => {
                const tierCopy = pageCopy.tiers[tier];
                const isSelected = selectedTier === tier;
                return (
                  <article
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`cursor-pointer rounded-[2rem] border p-8 shadow-lg transition-all ${
                      isSelected ? 'border-stone-950 bg-stone-950 text-white shadow-stone-950/15' : `${tierMeta[tier].accent} text-stone-900 shadow-stone-200/40`
                    }`}
                  >
                    <h3 className="text-3xl font-semibold">{tierCopy.name}</h3>
                    <p className={`mt-2 text-sm ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>{tierCopy.audience}</p>
                    <div className="mt-8 flex items-end gap-2">
                      <span className="text-5xl font-semibold">{tierMeta[tier].price}</span>
                      <span className={`pb-2 text-sm ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>/ event</span>
                    </div>
                    <p className={`mt-4 text-sm leading-6 ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>{tierCopy.description}</p>

                    <ul className="mt-8 space-y-4">
                      {tierCopy.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 size={18} className={isSelected ? 'shrink-0 text-amber-300' : 'shrink-0 text-emerald-700'} />
                          <span className={isSelected ? 'text-stone-100' : 'text-stone-700'}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        continueToCreateEvent();
                      }}
                      className={`mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                        isSelected ? 'bg-white text-stone-950' : 'bg-stone-950 text-white'
                      }`}
                    >
                      {tierCopy.cta}
                      <ArrowRight size={16} />
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="mt-10 rounded-[2rem] border border-stone-200 bg-[#f7f2e8] p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">{pageCopy.current}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-stone-950">
                    {selectedTierCopy.name} • {tierMeta[selectedTier].price}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={continueToCreateEvent}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white"
                >
                  {pageCopy.continueWith}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-[#17332c] py-24 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">{pageCopy.faqTitle}</h2>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {pageCopy.faq.map(([question, answer]) => (
                <article key={question} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <h3 className="text-xl font-semibold text-white">{question}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-300">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-5xl rounded-[2.5rem] bg-[#efe5d3] px-6 py-12 text-center shadow-xl shadow-stone-200/50 sm:px-12">
            <h2 className="text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">{pageCopy.finalTitle}</h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-stone-700">{pageCopy.finalBody}</p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={continueToCreateEvent}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-7 py-4 text-base font-semibold text-white"
              >
                {pageCopy.continueWith}
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-7 py-4 text-base font-semibold text-stone-800"
              >
                {pageCopy.nav.login}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-stone-950 py-8 text-center text-sm text-stone-400">
        <p>
          &copy; {new Date().getFullYear()} Elite Memoriz. {pageCopy.footer}
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
