import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Crown, ShieldCheck, Star, Upload, UserRoundPlus, X, Zap } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import { DEFAULT_COVERS } from '../utils/image';
import { API_URL } from '../lib/config';
import { parseTier, TIERS } from '../lib/tiers';
import { CREATE_EVENT_DRAFT_STORAGE_KEY } from '../lib/createEventDraft';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';

type EventCategory = 'wedding' | 'baptism' | 'party' | 'other';

type EventDraft = {
  title: string;
  date: string;
  category: EventCategory;
  package: (typeof TIERS)[number];
  coverImage: string;
};

const copy = {
  el: {
    steps: { details: 'Στοιχεία', plan: 'Πακέτο' },
    bannerGuestTitle: 'Στήσε πρώτα το event και μετά δημιούργησε host account.',
    bannerGuestBody:
      'Συμπλήρωσε τα στοιχεία και διάλεξε πακέτο εδώ. Μετά θα δημιουργήσεις hosting account και θα συνεχίσεις στο payment step μόλις ενεργοποιηθεί.',
    bannerHostTitle: 'Το event draft είναι έτοιμο για ολοκλήρωση.',
    bannerHostBody:
      'Το payment step θα μπει τελευταίο. Προς το παρόν, αν είσαι συνδεδεμένος, μπορείς να ολοκληρώσεις το event από εδώ.',
    title: 'Δημιουργία Νέου Event',
    detailsHint: 'Σε αυτό το βήμα συμπληρώνεις τα βασικά στοιχεία. Το πακέτο επιλέγεται αμέσως μετά.',
    eventName: 'Όνομα event',
    eventNamePlaceholder: 'π.χ. Γάμος Γιάννη και Μαρίας',
    eventDate: 'Ημερομηνία event',
    eventType: 'Τύπος event',
    coverImage: 'Cover image',
    uploadCover: 'Ανέβασε custom cover',
    changeImage: 'Αλλαγή εικόνας',
    removeImage: 'Αφαίρεση custom εικόνας',
    uploadLocked: 'Το custom cover ενεργοποιείται μετά τη δημιουργία host account.',
    next: 'Επόμενο: Επιλογή Πακέτου',
    cancel: 'Ακύρωση',
    choosePlan: 'Επίλεξε Πακέτο',
    choosePlanGuestBody: 'Διάλεξε πακέτο και συνέχισε στο registration. Το payment θα είναι το επόμενο βήμα.',
    choosePlanHostBody: 'Διάλεξε πακέτο για αυτό το event και ολοκλήρωσε τη δημιουργία.',
    draftNotice: 'Θα αποθηκευτεί το draft, θα δημιουργήσεις host account και μετά θα περάσεις στο payment page placeholder.',
    continueRegistration: 'Συνέχεια στο Host Registration',
    creating: 'Δημιουργία...',
    createEvent: 'Δημιούργησε Event',
    checkingAccount: 'Έλεγχος λογαριασμού...',
    back: 'Πίσω',
    categories: [
      { id: 'wedding', label: 'Γάμος', helper: 'Για τελετή, δεξίωση και after party' },
      { id: 'baptism', label: 'Βάφτιση', helper: 'Για οικογενειακές και πιο intimate εκδηλώσεις' },
      { id: 'party', label: 'Party', helper: 'Για γενέθλια, private parties και nightlife events' },
      { id: 'other', label: 'Άλλο', helper: 'Για launches, brand activations και custom events' },
    ] as Array<{ id: EventCategory; label: string; helper: string }>,
    tiers: {
      BASIC: {
        name: 'Basic',
        price: '€29',
        features: ['Ένα hosted event', 'Έως 100 καλεσμένοι', '10GB cloud storage', 'Διατήρηση για 1 μήνα'],
      },
      PREMIUM: {
        name: 'Premium',
        price: '€79',
        features: ['Ένα hosted event', 'Έως 300 καλεσμένοι', '50GB cloud storage', 'AI stories', 'Διατήρηση για 3 μήνες'],
      },
      LUXURY: {
        name: 'Luxury',
        price: '€129',
        features: ['Ένα hosted event', 'Έως 500 καλεσμένοι', '200GB cloud storage', 'AI stories', '360 view', 'Διατήρηση για 6 μήνες'],
      },
    },
  },
  en: {
    steps: { details: 'Details', plan: 'Plan' },
    bannerGuestTitle: 'Build the event first, then create the host account.',
    bannerGuestBody:
      'Fill in the event details and choose a plan here. After that you will create the hosting account and continue into the payment step once it is enabled.',
    bannerHostTitle: 'Your event draft is ready to complete.',
    bannerHostBody:
      'The payment step will be added last. For now, signed-in hosts can finish creating the event from here.',
    title: 'Create New Event',
    detailsHint: 'This step is for the core event details. The plan is chosen right after this.',
    eventName: 'Event name',
    eventNamePlaceholder: 'e.g. John and Maria Wedding Celebration',
    eventDate: 'Event date',
    eventType: 'Event type',
    coverImage: 'Cover image',
    uploadCover: 'Upload custom cover',
    changeImage: 'Change image',
    removeImage: 'Remove custom image',
    uploadLocked: 'Custom cover upload unlocks after host account creation.',
    next: 'Next: Select Plan',
    cancel: 'Cancel',
    choosePlan: 'Choose a Plan',
    choosePlanGuestBody: 'Choose a plan and continue to registration. Payment will be the next step.',
    choosePlanHostBody: 'Choose the package for this event and complete the setup.',
    draftNotice: 'This draft will be saved, then you will create the host account and continue to the payment placeholder page.',
    continueRegistration: 'Continue to Host Registration',
    creating: 'Creating...',
    createEvent: 'Create Event',
    checkingAccount: 'Checking account...',
    back: 'Back',
    categories: [
      { id: 'wedding', label: 'Wedding', helper: 'For ceremonies, receptions, and after-parties' },
      { id: 'baptism', label: 'Baptism', helper: 'For family celebrations and smaller gatherings' },
      { id: 'party', label: 'Party', helper: 'For birthdays, private parties, and nightlife events' },
      { id: 'other', label: 'Other', helper: 'For launches, brand activations, and custom events' },
    ] as Array<{ id: EventCategory; label: string; helper: string }>,
    tiers: {
      BASIC: {
        name: 'Basic',
        price: '€29',
        features: ['One hosted event', 'Up to 100 guests', '10GB cloud storage', 'Retained for 1 month'],
      },
      PREMIUM: {
        name: 'Premium',
        price: '€79',
        features: ['One hosted event', 'Up to 300 guests', '50GB cloud storage', 'AI stories', 'Retained for 3 months'],
      },
      LUXURY: {
        name: 'Luxury',
        price: '€129',
        features: ['One hosted event', 'Up to 500 guests', '200GB cloud storage', 'AI stories', '360 view', 'Retained for 6 months'],
      },
    },
  },
} as const;

const tierIcons = {
  BASIC: <Star size={24} className="text-gray-400" />,
  PREMIUM: <Zap size={24} className="text-yellow-400" />,
  LUXURY: <Crown size={24} className="text-red-400" />,
};

const getDefaultDraft = (tier: (typeof TIERS)[number]): EventDraft => ({
  title: '',
  date: '',
  category: 'wedding',
  package: tier,
  coverImage: '',
});

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTier = parseTier(searchParams.get('tier')) ?? 'BASIC';
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EventDraft>(() => getDefaultDraft(requestedTier));
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const parsed = JSON.parse(savedDraft) as { formData?: Partial<EventDraft>; step?: number };
      const savedTier = parseTier(parsed.formData?.package) ?? requestedTier;
      const nextCategory =
        parsed.formData?.category === 'wedding' ||
        parsed.formData?.category === 'baptism' ||
        parsed.formData?.category === 'party' ||
        parsed.formData?.category === 'other'
          ? parsed.formData.category
          : 'wedding';

      setFormData({
        title: parsed.formData?.title ?? '',
        date: parsed.formData?.date ?? '',
        category: nextCategory,
        package: savedTier,
        coverImage: parsed.formData?.coverImage ?? '',
      });
      setStep(parsed.step === 2 ? 2 : 1);
    } catch {
      window.sessionStorage.removeItem(CREATE_EVENT_DRAFT_STORAGE_KEY);
    }
  }, [requestedTier]);

  useEffect(() => {
    setFormData((current) => (current.package === requestedTier ? current : { ...current, package: requestedTier }));
  }, [requestedTier]);

  useEffect(() => {
    window.sessionStorage.setItem(CREATE_EVENT_DRAFT_STORAGE_KEY, JSON.stringify({ formData, step }));
  }, [formData, step]);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(Boolean(session));
      setAuthLoading(false);
    };

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistDraft = (nextStep = step) => {
    window.sessionStorage.setItem(CREATE_EVENT_DRAFT_STORAGE_KEY, JSON.stringify({ formData, step: nextStep }));
  };

  const clearDraft = () => {
    window.sessionStorage.removeItem(CREATE_EVENT_DRAFT_STORAGE_KEY);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      return;
    }

    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setPreviewUrl(URL.createObjectURL(file));
      setIsCropping(true);
      event.target.value = '';
    }
  };

  const onCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(croppedBlob));
    setIsCropping(false);
  };

  const handleContinueToRegistration = () => {
    persistDraft(2);
    const paymentPath = `/payment?tier=${encodeURIComponent(formData.package)}`;
    navigate(`/register?redirect=${encodeURIComponent(paymentPath)}`);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        handleContinueToRegistration();
        return;
      }

      let finalCoverImage = formData.coverImage;

      if (selectedFile) {
        const fileName = `${Date.now()}-cover.jpg`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, selectedFile);
        if (uploadError) {
          throw uploadError;
        }
        finalCoverImage = fileName;
      } else {
        finalCoverImage = DEFAULT_COVERS[formData.category];
      }

      const response = await fetch(`${API_URL}/api/host/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, coverImage: finalCoverImage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event');
      }

      clearDraft();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const displayPreview = previewUrl || DEFAULT_COVERS[formData.category];
  const primaryButtonLabel = authLoading
    ? pageCopy.checkingAccount
    : isAuthenticated
      ? (loading ? pageCopy.creating : pageCopy.createEvent)
      : pageCopy.continueRegistration;

  return (
    <div className="min-h-screen bg-gray-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="flex items-center justify-between pointer-events-none mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-700'}`}>1</div>
            <span className="font-bold text-sm">{pageCopy.steps.details}</span>
          </div>
          <div className={`h-0.5 flex-1 mx-4 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-800'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-700'}`}>2</div>
            <span className="font-bold text-sm">{pageCopy.steps.plan}</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-6 rounded-lg border border-red-800 bg-red-900/50 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-amber-400/15 p-2 text-amber-200">
                {isAuthenticated ? <ShieldCheck size={18} /> : <UserRoundPlus size={18} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isAuthenticated ? pageCopy.bannerHostTitle : pageCopy.bannerGuestTitle}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-300">
                  {isAuthenticated ? pageCopy.bannerHostBody : pageCopy.bannerGuestBody}
                </p>
              </div>
            </div>
          </div>

          {step === 1 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setStep(2);
              }}
              className="space-y-6"
            >
              <h1 className="text-2xl font-bold">{pageCopy.title}</h1>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
                {pageCopy.detailsHint}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">{pageCopy.eventName}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  placeholder={pageCopy.eventNamePlaceholder}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">{pageCopy.eventDate}</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">{pageCopy.eventType}</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pageCopy.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: category.id })}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        formData.category === category.id
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-800/80'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{category.label}</span>
                      <span className={`mt-1 block text-xs leading-5 ${formData.category === category.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {category.helper}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">{pageCopy.coverImage}</label>
                <div className="group relative aspect-video overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                  <img src={displayPreview} alt="Preview" className="h-full w-full object-cover transition-opacity duration-300" />
                  {isAuthenticated ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white shadow-xl backdrop-blur-md hover:bg-white/20"
                      >
                        <Upload size={18} />
                        {selectedFile ? pageCopy.changeImage : pageCopy.uploadCover}
                      </button>
                    </div>
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="text-sm font-medium text-white">{pageCopy.uploadLocked}</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <X size={12} /> {pageCopy.removeImage}
                  </button>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    clearDraft();
                    navigate(isAuthenticated ? '/dashboard' : '/');
                  }}
                  className="flex-1 rounded-xl bg-gray-800 px-4 py-3 font-bold text-gray-300 transition-all hover:bg-gray-700"
                >
                  {pageCopy.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-indigo-500"
                >
                  {pageCopy.next}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold">{pageCopy.choosePlan}</h1>
              <p className="mt-2 text-sm text-gray-400">
                {isAuthenticated ? pageCopy.choosePlanHostBody : pageCopy.choosePlanGuestBody}
              </p>

              <div className="mt-8 space-y-3">
                {TIERS.map((tierId) => {
                  const tier = pageCopy.tiers[tierId];
                  const isSelected = formData.package === tierId;

                  return (
                    <div
                      key={tierId}
                      onClick={() => setFormData({ ...formData, package: tierId })}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-900/20 ring-1 ring-indigo-500'
                          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="rounded-lg border border-gray-700 bg-gray-800 p-2">
                            {tierIcons[tierId]}
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{tier.name}</h3>
                            <p className="text-xs text-gray-400">{tier.features.join(' / ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-white">{tier.price}</span>
                          {isSelected && <Check size={16} className="ml-auto mt-1 text-indigo-400" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isAuthenticated && (
                <div className="mt-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                  {pageCopy.draftNotice}
                </div>
              )}

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl bg-gray-800 px-4 py-3 font-bold text-gray-300 transition-all hover:bg-gray-700"
                >
                  {pageCopy.back}
                </button>
                <button
                  type="button"
                  onClick={isAuthenticated ? handleSubmit : handleContinueToRegistration}
                  disabled={loading || authLoading}
                  className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {primaryButtonLabel}
                  {!loading && !authLoading && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCropping && previewUrl && (
        <ImageCropper
          imageSrc={previewUrl}
          onCropComplete={onCropComplete}
          onCancel={() => {
            setIsCropping(false);
            setPreviewUrl(null);
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        />
      )}
    </div>
  );
};

export default CreateEvent;
