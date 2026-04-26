import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../lib/config';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
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
    brand: 'Elite Memoriz',
    title: 'Σύνδεση Host',
    registerTitle: 'Δημιούργησε Host Account',
    email: 'Email',
    password: 'Κωδικός',
    confirm: 'Επιβεβαίωση',
    signIn: 'Σύνδεση',
    signingIn: 'Σύνδεση...',
    create: 'Δημιουργία Λογαριασμού',
    creating: 'Δημιουργία...',
    switchToRegister: 'Δεν έχεις λογαριασμό; Εγγραφή',
    switchToLogin: 'Έχεις ήδη λογαριασμό; Σύνδεση',
    subtitleLogin: 'Συνδέσου για να συνεχίσεις στο event, στο payment ή στο dashboard.',
    subtitleRegister: 'Μετά τη δημιουργία λογαριασμού θα συνεχίσεις στο επόμενο βήμα της ροής.',
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
    brand: 'Elite Memoriz',
    title: 'Host Sign In',
    registerTitle: 'Create Host Account',
    email: 'Email',
    password: 'Password',
    confirm: 'Confirm Password',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    create: 'Create Account',
    creating: 'Creating...',
    switchToRegister: "Don't have an account? Sign up",
    switchToLogin: 'Already have an account? Sign in',
    subtitleLogin: 'Sign in to continue into your event, payment, or dashboard flow.',
    subtitleRegister: 'After creating the account, you will continue into the next step of the funnel.',
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

const Login = () => {
  const [email, setEmail] = useState(getStoredAuthEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRedirect = searchParams.get('redirectTo') ?? searchParams.get('redirect');
  const redirectPath = sanitizeRedirectPath(requestedRedirect);
  const emailRedirectTo = getEmailRedirectUrl(requestedRedirect);

  const pageCopy = copy[language];
  const passwordRequirements = getPasswordRequirements(password);
  const passwordRequirementKeys = Object.keys(pageCopy.requirements) as PasswordRequirementKey[];

  useDocumentTitle(
    language === 'el'
      ? `Elite Memoriz | ${isRegistering ? 'Εγγραφή Host' : 'Σύνδεση Host'}`
      : `Elite Memoriz | ${isRegistering ? 'Register' : 'Login'}`
  );

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  useEffect(() => {
    setStoredAuthEmail(email);
  }, [email]);

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

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = normalizeAuthEmail(email);
      setStoredAuthEmail(normalizedEmail);
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error(pageCopy.mismatch);
        }

        if (!isPasswordStrong(password)) {
          throw new Error(pageCopy.weakPassword);
        }

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
          setIsRegistering(false);
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (authError) {
          throw authError;
        }

        if (data.session) {
          clearStoredAuthEmail();
          navigate(redirectPath, { replace: true });
        }
      }
    } catch (err: any) {
      setError(isExistingAccountError(err?.message) ? pageCopy.existingAccountHint : err.message);
    } finally {
      setLoading(false);
    }
  };

  const errorMessageId = 'login-error-message';
  const passwordRequirementsId = 'login-password-requirements';
  const errorDescribedBy = error ? errorMessageId : undefined;
  const passwordDescribedBy = isRegistering
    ? (error ? `${passwordRequirementsId} ${errorMessageId}` : passwordRequirementsId)
    : errorDescribedBy;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            <span>{language === 'el' ? 'Επιστροφή στην αρχική' : 'Back to home'}</span>
          </button>

          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="space-y-8 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">{pageCopy.brand}</h1>
            <p className="mt-2 text-sm text-gray-400">
              {isRegistering ? pageCopy.subtitleRegister : pageCopy.subtitleLogin}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {isRegistering ? pageCopy.registerTitle : pageCopy.title}
            </p>
          </div>

          {error && (
            <div
              id={errorMessageId}
              role="alert"
              className="rounded-md border border-red-800 bg-red-900/50 p-4 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleAuth}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">{pageCopy.email}</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={errorDescribedBy}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">{pageCopy.password}</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  minLength={isRegistering ? 8 : undefined}
                  aria-invalid={Boolean(error)}
                  aria-describedby={passwordDescribedBy}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
                {isRegistering && (
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
                )}
              </div>

              {isRegistering && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">{pageCopy.confirm}</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-invalid={Boolean(error)}
                    aria-describedby={errorDescribedBy}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? (isRegistering ? pageCopy.creating : pageCopy.signingIn)
                : (isRegistering ? pageCopy.create : pageCopy.signIn)}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
            >
              {isRegistering ? pageCopy.switchToLogin : pageCopy.switchToRegister}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
