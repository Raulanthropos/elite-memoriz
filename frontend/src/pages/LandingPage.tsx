import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  CreditCard,
  Globe,
  Image,
  Lock,
  QrCode,
  Sparkles,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { TIERS, type Tier } from '../lib/tiers';
import { useDocumentTitle } from '../lib/useDocumentTitle';

type Language = 'el' | 'en';

const LANGUAGE_STORAGE_KEY = 'elite-memoriz-language';

const tierMeta: Record<Tier, { price: string }> = {
  BASIC: { price: '€29' },
  PREMIUM: { price: '€79' },
  LUXURY: { price: '€129' },
};

const DOT_BG: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, #29252480 1px, transparent 1px)',
  backgroundSize: '28px 28px',
};

const copy = {
  el: {
    nav: { how: 'Πως λειτουργεί', plans: 'Πακέτα', about: 'Σχετικά με εμάς', login: 'Σύνδεση host', register: 'Εγγραφή host' },
    hero: {
      badge: 'Χωρίς app για τους καλεσμένους',
      title: 'Το ιδιωτικό album που γεμίζει',
      accent: 'ζωντανά από το event',
      body: 'Για γάμους, βαφτίσεις, parties και εταιρικά events. Ο host δίνει ένα QR και συγκεντρώνει όλο το υλικό σε έναν καθαρό χώρο.',
      primary: 'Δημιούργησε host account',
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
      ['1. Δημιουργείς host account', 'Ο host ξεκινά με registration για να μπει σωστά στο onboarding flow.'],
      ['2. Στήνεις το event', 'Ορίζεις τίτλο, ημερομηνία και τύπο event μέσα από το Create Event.'],
      ['3. Επιλέγεις πακέτο', 'Βλέπεις τα διαθέσιμα tiers μέσα στη φόρμα και κλειδώνεις αυτό που θέλεις.'],
      ['4. Προχωράς σε payment', 'Το payment step ακολουθεί αμέσως μετά για την τελική ενεργοποίηση.'],
    ],
    experienceTitle: 'Τι πρέπει να νιώθει ο πελάτης',
    experienceBody:
      'Το Elite Memoriz πρέπει να δείχνει έτοιμο για χρήση. Η landing page πλέον δίνει καθαρή εικόνα για το αποτέλεσμα, τα όρια κάθε tier και το επόμενο βήμα.',
    experienceBullets: [
      'Ιδιωτική πρόσβαση με QR ή direct link',
      'Preview των πακέτων στην αρχική και τελική επιλογή μέσα στο Create Event',
      'Διαφορετικά όρια σε καλεσμένους, storage και διάρκεια διατήρησης ανά πακέτο',
    ],
    experienceCards: [
      ['Private access', 'Οι καλεσμένοι μπαίνουν σε προστατευμένο χώρο χωρίς να χάνεται η απλότητα του flow.'],
      ['Host-first control', 'Ο host κρατά τον έλεγχο του event, του πακέτου και της τελικής ενεργοποίησης.'],
      ['Live gallery', 'Το υλικό συγκεντρώνεται σε ένα καθαρό album που γεμίζει ζωντανά κατά τη διάρκεια του event.'],
      ['Καθαρή επιλογή πακέτου', 'Ο επισκέπτης καταλαβαίνει άμεσα τι περιλαμβάνει κάθε tier και ποιο βήμα ακολουθεί.'],
    ],
    pricingTitle: 'Δες τα πακέτα πριν την τελική επιλογή',
    pricingBody:
      'Κάθε πακέτο καλύπτει ένα hosted event. Η landing page λειτουργεί ως preview και η τελική επιλογή γίνεται αργότερα μέσα στο Create Event.',
    tiers: {
      BASIC: {
        name: 'Basic',
        audience: 'Για ένα πιο μικρό και άμεσο event',
        description: 'Καθαρή επιλογή για ένα event με όσα χρειάζονται χωρίς περιττή πολυπλοκότητα.',
        features: ['Έως 100 καλεσμένοι', '10 GB cloud storage', 'Διατήρηση δεδομένων για 1 μήνα'],
        cta: 'Προεπισκόπηση πακέτου',
      },
      PREMIUM: {
        name: 'Premium',
        audience: 'Για events με μεγαλύτερη ροή και πιο πλούσιο storytelling',
        description: 'Η πιο ισορροπημένη επιλογή όταν θέλεις περισσότερο χώρο και AI stories στο ίδιο event.',
        features: ['Έως 300 καλεσμένοι', '50 GB cloud storage', 'AI stories', 'Διατήρηση δεδομένων για 3 μήνες'],
        cta: 'Προεπισκόπηση πακέτου',
      },
      LUXURY: {
        name: 'Luxury',
        audience: 'Για premium παραγωγές και πιο immersive εμπειρία',
        description: 'Το πιο πλήρες πακέτο, με μεγαλύτερη χωρητικότητα, AI stories και 360 προβολή εικόνας.',
        features: ['Έως 500 καλεσμένοι', '200 GB cloud storage', 'AI stories', '360° image view', 'Διατήρηση δεδομένων για 6 μήνες'],
        cta: 'Προεπισκόπηση πακέτου',
      },
    },
    current: 'Τρέχουσα προεπισκόπηση',
    continueWith: 'Δημιούργησε host account',
    faqTitle: 'Πριν ξεκινήσεις',
    faq: [
      ['Χρειάζεται app ο καλεσμένος;', 'Όχι. Μπαίνει από QR ή link και ανεβάζει από browser.'],
      ['Η επιλογή tier εδώ είναι οριστική;', 'Όχι. Εδώ βλέπεις τα πακέτα και η τελική επιλογή γίνεται μέσα στο Create Event.'],
      ['Αν δεν είμαι συνδεδεμένος;', 'Ξεκινάς με host registration, μετά στήνεις το event, διαλέγεις πακέτο και τέλος προχωράς στο payment βήμα.'],
    ],
    aboutTitle: 'Σχετικά με εμάς',
    aboutBody: [
      'Το Elite Memoriz δεν είναι απλώς μια υπηρεσία. Είναι ένας νέος τρόπος να ζεις και να ξαναζείς τις πιο σημαντικές στιγμές της ζωής σου.',
      'Μέσα από μοναδικές ψηφιακές εμπειρίες, κάθε εκδήλωση αποκτά τη δική της "ζωντανή μνήμη". Με ένα απλό scan, οι καλεσμένοι συμμετέχουν, μοιράζονται φωτογραφίες, βίντεο και ευχές, δημιουργώντας ένα συλλογικό αποτύπωμα συναισθημάτων.',
      'Η τεχνολογία συναντά την τέχνη: οι στιγμές μετατρέπονται σε ιστορίες, σε κινηματογραφικά βίντεο, σε διαδραστικές εμπειρίες που εξελίσσονται με τον χρόνο. Από weddings και private celebrations μέχρι corporate events, κάθε περίσταση αποκτά βάθος, διάρκεια και αξία.',
      'Γιατί στο Elite Memoriz, οι στιγμές σας δεν αποθηκεύονται απλώς - ζωντανεύουν.',
    ],
    finalTitle: 'Ξεκίνα με registration-first flow',
    finalBody: 'Κάνε πρώτα host registration και μετά οδήγησε τον host σε μια καθαρή διαδρομή: Create Event, επιλογή πακέτου και payment.',
    footer: 'Όλα τα δικαιώματα διατηρούνται.',
  },
  en: {
    nav: { how: 'How it works', plans: 'Plans', about: 'About Us', login: 'Host sign in', register: 'Host register' },
    hero: {
      badge: 'No app required for guests',
      title: 'The private album that fills',
      accent: 'live during the event',
      body: 'Built for weddings, baptisms, parties, and corporate events. The host shares one QR and gathers every memory in one clean space.',
      primary: 'Create host account',
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
      ['1. Create the host account', 'The host starts with registration to enter the onboarding flow correctly.'],
      ['2. Build the event', 'Set the title, date, and type of event inside Create Event.'],
      ['3. Choose the plan', 'Review the available tiers inside the form and lock the one that fits best.'],
      ['4. Continue to payment', 'Payment comes next for the final activation step.'],
    ],
    experienceTitle: 'How the product should feel',
    experienceBody:
      'Elite Memoriz should look ready to use. The landing page now gives a clearer view of the result, the limits of each tier, and the next step.',
    experienceBullets: [
      'Private access through QR or direct link',
      'Plan previews on the homepage, with the final choice made inside Create Event',
      'Different guest, storage, and retention limits across plans',
    ],
    experienceCards: [
      ['Private access', 'Guests enter a protected space without adding friction to the sharing flow.'],
      ['Host-first control', 'The host stays in control of the event, the selected plan, and the final activation steps.'],
      ['Live gallery', 'Memories collect inside one clean album that fills in real time during the event.'],
      ['Clear plan choice', 'Visitors should understand what each tier includes and what the next step will be.'],
    ],
    pricingTitle: 'Review the plans before the final choice',
    pricingBody:
      'Every plan covers one hosted event. The homepage is for comparison only, and the final plan choice happens later inside Create Event.',
    tiers: {
      BASIC: {
        name: 'Basic',
        audience: 'For a smaller, straightforward event',
        description: 'A clean choice for one event with the essentials covered.',
        features: ['Up to 100 guests', '10 GB cloud storage', '1 month data retention'],
        cta: 'Preview this plan',
      },
      PREMIUM: {
        name: 'Premium',
        audience: 'For larger events with stronger storytelling needs',
        description: 'The most balanced choice for one event with more room, more storage, and AI stories.',
        features: ['Up to 300 guests', '50 GB cloud storage', 'AI stories', '3 months data retention'],
        cta: 'Preview this plan',
      },
      LUXURY: {
        name: 'Luxury',
        audience: 'For premium productions and immersive delivery',
        description: 'The fullest package for one event, with the highest capacity and 360 image viewing.',
        features: ['Up to 500 guests', '200 GB cloud storage', 'AI stories', '360° image view', '6 months data retention'],
        cta: 'Preview this plan',
      },
    },
    current: 'Current preview',
    continueWith: 'Create host account',
    faqTitle: 'Before you begin',
    faq: [
      ['Do guests need an app?', 'No. They join through a QR code or link and upload from the browser.'],
      ['Is the plan choice final here?', 'No. The homepage is for comparison, and the final plan choice happens inside Create Event.'],
      ['What if I am not signed in?', 'Start with host registration, then create the event, choose a plan, and continue to payment.'],
    ],
    aboutTitle: 'About Us',
    aboutBody: [
      'Elite Memoriz is not just a service. It is a new way to experience and relive life\'s most meaningful moments.',
      'Through unique digital experiences, every event becomes a living memory. With a simple scan, guests can participate, sharing photos, videos, and wishes, creating a collective imprint of emotions.',
      'Technology meets artistry: moments are transformed into stories, cinematic videos, and interactive experiences that evolve over time. From weddings and private celebrations to corporate events, every occasion gains depth, longevity, and meaning.',
      'Because at Elite Memoriz, your moments are not simply stored; they come to life.',
    ],
    finalTitle: 'Start with a registration-first flow',
    finalBody: 'Begin with host registration, then guide the host through Create Event, plan selection, and payment in one clear path.',
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
  const [hasExplicitTierSelection, setHasExplicitTierSelection] = useState(false);

  useDocumentTitle(language === 'el' ? 'Elite Memoriz | Αρχική' : 'Elite Memoriz | Home');

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const pageCopy = copy[language];
  const selectedTierCopy = pageCopy.tiers[selectedTier];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectTier = (tier: Tier) => {
    setSelectedTier(tier);
    setHasExplicitTierSelection(true);
  };

  const selectedTierRedirectTo = `/create-event?tier=${encodeURIComponent(selectedTier)}`;
  const encodedSelectedTierRedirectTo = encodeURIComponent(selectedTierRedirectTo);

  const goToRegister = () => navigate('/register');
  const goToLogin = () => navigate('/login');
  const continueToSelectedTierRegister = () => {
    if (!hasExplicitTierSelection) {
      goToRegister();
      return;
    }

    navigate(`/register?redirectTo=${encodedSelectedTierRedirectTo}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f3eb] font-sans text-stone-900 selection:bg-amber-200">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-[#f8f3eb]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Brand wordmark */}
            <div className="shrink-0">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-800/70">
                Elite Memoriz
              </p>
              <p className="font-serif text-lg italic text-stone-600">Private event memories</p>
            </div>

            {/* Centre nav — desktop only */}
            <nav className="hidden items-center gap-8 lg:flex">
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-stone-900"
              >
                {pageCopy.nav.how}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-stone-900"
              >
                {pageCopy.nav.plans}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about-us')}
                className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-stone-900"
              >
                {pageCopy.nav.about}
              </button>
            </nav>

            {/* Right cluster */}
            <div className="flex items-center gap-3">
              {/* Language pill */}
              <div className="flex items-center rounded-full border border-stone-200 bg-white p-0.5 shadow-sm">
                {(['el', 'en'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      language === lang
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Auth buttons — desktop */}
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
                >
                  {pageCopy.nav.login}
                </button>
                <button
                  type="button"
                  onClick={goToRegister}
                  className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
                >
                  {pageCopy.nav.register}
                </button>
              </div>
            </div>
          </div>

          {/* Auth buttons — mobile row */}
          <div className="flex justify-center gap-2 pb-3 sm:hidden">
            <button
              type="button"
              onClick={goToRegister}
              className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              {pageCopy.nav.register}
            </button>
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700"
            >
              {pageCopy.nav.login}
            </button>
          </div>
        </div>
      </header>

      <main>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#f8f3eb] pb-24 pt-20 lg:pb-36 lg:pt-28">
          {/* Dot grid texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={DOT_BG} />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-16 lg:grid-cols-[1.15fr_0.85fr]">

              {/* ── Left ── */}
              <div>
                {/* Eyebrow */}
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-emerald-700/40" />
                  <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-800">
                    <Globe size={13} />
                    {pageCopy.hero.badge}
                  </span>
                </div>

                {/* Headline */}
                <h1 className="mt-6 font-serif text-[3.5rem] font-semibold leading-[1.06] tracking-tight text-stone-950 md:text-7xl xl:text-[5.25rem]">
                  {pageCopy.hero.title}{' '}
                  <span className="italic text-emerald-900">{pageCopy.hero.accent}</span>
                </h1>

                <p className="mt-7 max-w-lg text-lg leading-8 text-stone-600">
                  {pageCopy.hero.body}
                </p>

                {/* CTAs */}
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={goToRegister}
                    className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-950 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-stone-950/20 transition-all hover:bg-stone-800 hover:shadow-xl hover:shadow-stone-950/25"
                  >
                    {pageCopy.hero.primary}
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('pricing')}
                    className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/70 px-8 py-4 text-base font-semibold text-stone-800 backdrop-blur-sm transition-colors hover:bg-white"
                  >
                    {pageCopy.hero.secondary}
                  </button>
                </div>

                {/* Promise mini-cards */}
                <div className="mt-12 grid gap-3 sm:grid-cols-3">
                  {pageCopy.promises.map(([title, description], index) => {
                    const Icon = [Sparkles, Camera, Image][index];
                    return (
                      <div
                        key={title}
                        className="rounded-2xl border border-stone-200/80 bg-white/60 p-5 shadow-sm backdrop-blur-sm"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-emerald-50">
                          <Icon size={17} />
                        </div>
                        <p className="mt-3 text-base font-semibold text-stone-900">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Right — interactive plan preview card ── */}
              <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl shadow-stone-950/10">

                {/* Card header row */}
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-400">
                    {pageCopy.hero.selected}
                  </p>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5">
                    <QrCode size={13} className="text-emerald-700" />
                    <span className="text-xs font-semibold text-emerald-800">Elite flow</span>
                  </div>
                </div>

                {/* Tier tabs */}
                <div className="flex gap-1 rounded-2xl bg-stone-100 p-1">
                  {TIERS.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => selectTier(tier)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        selectedTier === tier
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      {pageCopy.tiers[tier].name}
                    </button>
                  ))}
                </div>

                {/* Selected tier detail */}
                <div className="mt-5 rounded-2xl bg-[#17332c] p-6 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-serif text-3xl font-semibold">{selectedTierCopy.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-emerald-200/70">{selectedTierCopy.audience}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-serif text-4xl font-semibold leading-none">
                        {tierMeta[selectedTier].price}
                      </p>
                      <p className="mt-1 text-xs text-emerald-200/60">/ event</p>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {selectedTierCopy.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-base text-emerald-50">
                        <CheckCircle2 size={16} className="shrink-0 text-amber-300" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Primary CTA */}
                <button
                  type="button"
                  onClick={continueToSelectedTierRegister}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  {pageCopy.continueWith}
                  <ArrowRight size={16} />
                </button>

                {/* Quick-start bullets */}
                <div className="mt-4 rounded-2xl bg-stone-50 px-5 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">
                    {pageCopy.hero.preview}
                  </p>
                  <ul className="space-y-2.5">
                    {pageCopy.hero.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2.5 text-sm text-stone-600">
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-700" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
        <section id="how-it-works" className="bg-[#17332c] py-28 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            <div className="mb-16 flex items-center gap-4">
              <span className="h-px w-12 bg-amber-400/50" />
              <h2 className="font-serif text-4xl font-semibold italic text-white md:text-5xl">
                {pageCopy.stepsTitle}
              </h2>
            </div>

            <div className="grid lg:grid-cols-4">
              {pageCopy.steps.map(([title, description], index) => {
                const Icon = [UserRoundPlus, Sparkles, CheckCircle2, CreditCard][index];
                return (
                  <div
                    key={title}
                    className="group border-t border-white/10 p-8 lg:border-l lg:border-t-0 lg:first:border-l-0"
                  >
                    <p className="font-serif text-7xl font-semibold leading-none text-white/10 transition-colors group-hover:text-white/20">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-amber-300">
                      <Icon size={17} />
                    </div>
                    <h3 className="mt-5 font-serif text-xl font-semibold leading-snug text-white">{title}</h3>
                    <p className="mt-3 text-base leading-7 text-emerald-100/55">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── EXPERIENCE ───────────────────────────────────────────── */}
        <section className="bg-[#ede3cf] py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">

              {/* Left — dark statement card */}
              <div className="rounded-3xl bg-stone-950 p-10 text-white shadow-2xl">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px w-8 bg-amber-400/60" />
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400/80">
                    Experience
                  </span>
                </div>
                <h2 className="font-serif text-4xl font-semibold leading-tight text-white">
                  {pageCopy.experienceTitle}
                </h2>
                <p className="mt-5 text-base leading-7 text-stone-400">{pageCopy.experienceBody}</p>
                <div className="mt-8 space-y-3">
                  {pageCopy.experienceBullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4"
                    >
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-amber-400" />
                      <p className="text-base leading-7 text-stone-300">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — 2 × 2 feature cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {pageCopy.experienceCards.map(([title, description], index) => {
                  const CardIcon = [Lock, Users, Image, Sparkles][index] as typeof Lock;
                  return (
                    <div
                      key={title}
                      className="rounded-2xl border border-stone-200/60 bg-white p-7 shadow-md shadow-stone-200/30"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
                        <CardIcon size={19} />
                      </div>
                      <h3 className="mt-5 font-serif text-xl font-semibold text-stone-900">{title}</h3>
                      <p className="mt-2 text-base leading-7 text-stone-500">{description}</p>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────── */}
        <section id="pricing" className="bg-[#fdfaf6] py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-10 bg-stone-400/60" />
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-400">
                  Plans
                </span>
              </div>
              <h2 className="font-serif text-4xl font-semibold text-stone-950 md:text-5xl">
                {pageCopy.pricingTitle}
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-500">{pageCopy.pricingBody}</p>
            </div>

            {/* Cards */}
            <div className="mt-14 grid gap-5 xl:grid-cols-3">
              {TIERS.map((tier) => {
                const tierCopy = pageCopy.tiers[tier];
                const isSelected = selectedTier === tier;
                const isPremium = tier === 'PREMIUM';

                return (
                  <article
                    key={tier}
                    onClick={() => selectTier(tier)}
                    className={`relative cursor-pointer rounded-3xl border p-8 shadow-lg transition-all duration-200 ${
                      isSelected
                        ? 'border-stone-950 bg-stone-950 text-white shadow-stone-950/20'
                        : 'border-stone-200 bg-white text-stone-900 shadow-stone-100/50 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-100/80'
                    }`}
                  >
                    {isPremium && (
                      <span
                        className={`absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                          isSelected
                            ? 'bg-amber-400 text-stone-900'
                            : 'bg-emerald-800 text-white'
                        }`}
                      >
                        Popular
                      </span>
                    )}

                    <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${isSelected ? 'text-stone-500' : 'text-stone-400'}`}>
                      {tierCopy.audience}
                    </p>
                    <h3 className="mt-2 font-serif text-3xl font-semibold">{tierCopy.name}</h3>

                    <div className="mt-6 flex items-end gap-1.5">
                      <span className="font-serif text-5xl font-semibold leading-none">
                        {tierMeta[tier].price}
                      </span>
                      <span className={`mb-1 text-sm ${isSelected ? 'text-stone-500' : 'text-stone-400'}`}>
                        / event
                      </span>
                    </div>

                    <p className={`mt-4 text-base leading-7 ${isSelected ? 'text-stone-400' : 'text-stone-500'}`}>
                      {tierCopy.description}
                    </p>

                    <div className={`my-6 h-px ${isSelected ? 'bg-white/10' : 'bg-stone-100'}`} />

                    <ul className="space-y-3">
                      {tierCopy.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-base">
                          <CheckCircle2
                            size={16}
                            className={isSelected ? 'shrink-0 text-amber-400' : 'shrink-0 text-emerald-700'}
                          />
                          <span className={isSelected ? 'text-stone-200' : 'text-stone-700'}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); selectTier(tier); }}
                      className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold transition-colors ${
                        isSelected
                          ? 'bg-white text-stone-950 hover:bg-stone-100'
                          : 'bg-stone-950 text-white hover:bg-stone-800'
                      }`}
                    >
                      {tierCopy.cta}
                      <ArrowRight size={16} />
                    </button>
                  </article>
                );
              })}
            </div>

            {/* Selected plan summary bar */}
            <div className="mt-8 flex flex-col gap-5 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-400">
                  {pageCopy.current}
                </p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-950">
                  {selectedTierCopy.name} — {tierMeta[selectedTier].price}
                </h3>
              </div>
              <button
                type="button"
                onClick={continueToSelectedTierRegister}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-stone-800"
              >
                {pageCopy.continueWith}
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section className="bg-stone-950 py-28 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            <div className="mb-14 flex items-center gap-4">
              <span className="h-px w-12 bg-amber-400/50" />
              <h2 className="font-serif text-4xl font-semibold italic text-white md:text-5xl">
                {pageCopy.faqTitle}
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {pageCopy.faq.map(([question, answer]) => (
                <article
                  key={question}
                  className="rounded-2xl border border-white/10 bg-white/5 p-8"
                >
                  <h3 className="font-serif text-xl font-semibold text-white">{question}</h3>
                  <p className="mt-4 text-base leading-7 text-stone-400">{answer}</p>
                </article>
              ))}
            </div>

            <div
              id="about-us"
              className="mt-16 rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl shadow-black/20 sm:p-10 lg:p-12"
            >
              <div className="grid gap-10 lg:grid-cols-[0.45fr_1fr] lg:items-start">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-px w-10 bg-amber-400/60" />
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400/80">
                      Elite Memoriz
                    </span>
                  </div>
                  <h2 className="font-serif text-4xl font-semibold leading-tight text-white md:text-5xl">
                    {pageCopy.aboutTitle}
                  </h2>
                </div>

                <div className="space-y-5">
                  {pageCopy.aboutBody.map((paragraph, index) => (
                    <p
                      key={paragraph}
                      className={`text-base leading-8 text-stone-300 ${
                        index === pageCopy.aboutBody.length - 1
                          ? 'font-serif text-2xl leading-9 text-amber-100'
                          : ''
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#f8f3eb] py-36">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={DOT_BG} />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">

            <div className="mb-8 flex items-center justify-center gap-4">
              <span className="h-px w-16 bg-stone-400/50" />
              <span className="text-xs font-semibold uppercase tracking-[0.42em] text-stone-400">
                Elite Memoriz
              </span>
              <span className="h-px w-16 bg-stone-400/50" />
            </div>

            <h2 className="font-serif text-5xl font-semibold leading-tight text-stone-950 md:text-6xl">
              {pageCopy.finalTitle}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              {pageCopy.finalBody}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goToRegister}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-950 px-9 py-4 text-lg font-semibold text-white shadow-xl shadow-stone-950/20 transition-all hover:bg-stone-800"
              >
                {pageCopy.continueWith}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={goToLogin}
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/70 px-9 py-4 text-lg font-semibold text-stone-800 backdrop-blur-sm transition-colors hover:bg-white"
              >
                {pageCopy.nav.login}
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#0c1a17] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-stone-500">
                Elite Memoriz
              </p>
              <p className="font-serif text-lg italic text-stone-600">Private event memories</p>
            </div>
            <p className="text-sm text-stone-600">
              &copy; {new Date().getFullYear()} Elite Memoriz. {pageCopy.footer}
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
