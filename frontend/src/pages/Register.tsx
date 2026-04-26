import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { API_URL } from '../lib/config';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { getPasswordRequirements, isPasswordStrong, type PasswordRequirementKey } from '../lib/passwordValidation';
import { getEmailRedirectUrl, sanitizeRedirectPath } from '../lib/authRedirect';
import {
  clearStoredAuthEmail,
  getStoredAuthEmail,
  isExistingAccountError,
  normalizeAuthEmail,
  setStoredAuthEmail,
} from '../lib/authEmail';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const copy = {
  el: {
    title: 'Δημιούργησε Host Account',
    subtitle: 'Μετά την εγγραφή θα συνεχίσεις στη δημιουργία του event σου.',
    email: 'Email',
    password: 'Κωδικός',
    confirm: 'Επιβεβαίωση',
    create: 'Δημιουργία Λογαριασμού',
    creating: 'Δημιουργία...',
    signInPrompt: 'Έχεις ήδη λογαριασμό;',
    signIn: 'Σύνδεση',
    mismatch: 'Οι κωδικοί δεν ταιριάζουν',
    weakPassword: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες, 1 κεφαλαίο γράμμα, 1 αριθμό και 1 σύμβολο.',
    passwordHint: 'Ο κωδικός σου πρέπει να πληροί όλα τα παρακάτω:',
    requirements: {
      minLength: 'Τουλάχιστον 8 χαρακτήρες',
      uppercase: 'Τουλάχιστον 1 κεφαλαίο γράμμα',
      number: 'Τουλάχιστον 1 αριθμό',
      symbol: 'Τουλάχιστον 1 σύμβολο',
    } as Record<PasswordRequirementKey, string>,
    checkEmail: 'Αν το email είναι νέο, έλεγξε το inbox σου για το confirmation link. Αν υπάρχει ήδη λογαριασμός, κάνε σύνδεση ή reset κωδικού.',
    existingAccountHint: 'Αν υπάρχει ήδη λογαριασμός με αυτό το email, κάνε σύνδεση ή reset κωδικού.',
  },
  en: {
    title: 'Create Host Account',
    subtitle: 'After registration you will continue to your event setup.',
    email: 'Email',
    password: 'Password',
    confirm: 'Confirm',
    create: 'Create Account',
    creating: 'Creating...',
    signInPrompt: 'Already have an account?',
    signIn: 'Sign in',
    mismatch: "Passwords don't match",
    weakPassword: 'Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 symbol.',
    passwordHint: 'Your password must include all of the following:',
    requirements: {
      minLength: 'At least 8 characters',
      uppercase: 'At least 1 uppercase letter',
      number: 'At least 1 number',
      symbol: 'At least 1 symbol',
    } as Record<PasswordRequirementKey, string>,
    checkEmail: 'If this email is new, check your inbox for the confirmation link. If an account already exists, sign in or reset your password.',
    existingAccountHint: 'If an account already exists for this email, sign in or reset your password.',
  },
} as const;

const Register = () => {
  const [email, setEmail] = useState(getStoredAuthEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRedirect = searchParams.get('redirectTo') ?? searchParams.get('redirect');
  const redirectPath = sanitizeRedirectPath(requestedRedirect);
  const emailRedirectTo = getEmailRedirectUrl(requestedRedirect);
  const existingAccountRedirectPath = redirectPath.startsWith('/payment') ? '/dashboard' : redirectPath;
  const existingAccountLoginHref = `/login?redirect=${encodeURIComponent(existingAccountRedirectPath)}`;

  const pageCopy = copy[language];
  const passwordRequirements = getPasswordRequirements(password);
  const passwordRequirementKeys = Object.keys(pageCopy.requirements) as PasswordRequirementKey[];

  useDocumentTitle(language === 'el' ? 'Elite Memoriz | Εγγραφή Host' : 'Elite Memoriz | Register');

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  useEffect(() => {
    if (import.meta.env.DEV && existingAccountRedirectPath !== redirectPath) {
      console.debug('[Register] Redirecting existing-account sign-in to dashboard instead of payment.', {
        requestedRedirect,
        redirectPath,
        existingAccountRedirectPath,
      });
    }
  }, [existingAccountRedirectPath, redirectPath, requestedRedirect]);

  useEffect(() => {
    let isActive = true;

    const syncAuthenticatedUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (isActive && session) {
        navigate(redirectPath, { replace: true });
      }
    };

    void syncAuthenticatedUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate(redirectPath, { replace: true });
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate, redirectPath]);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalizedEmail = normalizeAuthEmail(email);
    setStoredAuthEmail(normalizedEmail);

    if (password !== confirmPassword) {
      setError(pageCopy.mismatch);
      return;
    }

    if (!isPasswordStrong(password)) {
      setError(pageCopy.weakPassword);
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo,
        },
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        const response = await fetch(`${API_URL}/api/host/register-profile`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          await supabase.auth.signOut();
          throw new Error(errorData?.message || 'Profile creation failed. Please try signing in instead.');
        }

        clearStoredAuthEmail();
        navigate(redirectPath, { replace: true });
      } else {
        alert(pageCopy.checkEmail);
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
      }
    } catch (err: any) {
      setError(isExistingAccountError(err?.message) ? pageCopy.existingAccountHint : err.message);
    } finally {
      setLoading(false);
    }
  };

  const errorMessageId = 'register-error-message';
  const passwordRequirementsId = 'register-password-requirements';
  const errorDescribedBy = error ? errorMessageId : undefined;
  const passwordDescribedBy = error ? `${passwordRequirementsId} ${errorMessageId}` : passwordRequirementsId;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="space-y-8 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">{pageCopy.title}</h1>
            <p className="text-gray-400">{pageCopy.subtitle}</p>
          </div>

          {error && (
            <div
              id={errorMessageId}
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400"
            >
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="space-y-4">
              <div>
                <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-gray-300">{pageCopy.email}</label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={errorDescribedBy}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-gray-300">{pageCopy.password}</label>
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-invalid={Boolean(error)}
                    aria-describedby={passwordDescribedBy}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                  <div id={passwordRequirementsId} className="mt-3 rounded-lg border border-gray-800 bg-gray-950/70 p-3">
                    <p className="text-xs font-medium text-gray-400">{pageCopy.passwordHint}</p>
                    <ul className="mt-3 space-y-2">
                      {passwordRequirementKeys.map((requirementKey) => {
                        const isMet = passwordRequirements[requirementKey];
                        const Icon = isMet ? CheckCircle2 : Circle;

                        return (
                          <li key={requirementKey} className={`flex items-center gap-2 text-xs ${isMet ? 'text-emerald-400' : 'text-gray-500'}`}>
                            <Icon size={14} className="shrink-0" />
                            <span>{pageCopy.requirements[requirementKey]}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                <div>
                  <label htmlFor="register-confirm" className="mb-1 block text-sm font-medium text-gray-300">{pageCopy.confirm}</label>
                  <input
                    id="register-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-invalid={Boolean(error)}
                    aria-describedby={errorDescribedBy}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : pageCopy.create}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400">
            {pageCopy.signInPrompt}{' '}
            <Link to={existingAccountLoginHref} className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
              {pageCopy.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
