import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../lib/config';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';

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
    shortPassword: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες',
    checkEmail: 'Έλεγξε το email σου για το confirmation link!',
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
    shortPassword: 'Password must be at least 6 characters',
    checkEmail: 'Check your email for the confirmation link!',
  },
} as const;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRedirect = searchParams.get('redirect');
  const redirectPath =
    requestedRedirect && requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/dashboard';
  const emailRedirectTo = `${window.location.origin}/login?redirect=${encodeURIComponent(redirectPath)}`;

  const pageCopy = copy[language];

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error(pageCopy.mismatch);
        }

        if (password.length < 6) {
          throw new Error(pageCopy.shortPassword);
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
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
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ email }),
          });

          if (!response.ok) {
            console.error('Profile creation failed, but auth succeeded');
          }

          navigate(redirectPath, { replace: true });
        } else {
          alert(pageCopy.checkEmail);
          setIsRegistering(false);
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          throw authError;
        }

        if (data.session) {
          navigate(redirectPath, { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="space-y-8 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">{pageCopy.brand}</h2>
            <p className="mt-2 text-sm text-gray-400">
              {isRegistering ? pageCopy.subtitleRegister : pageCopy.subtitleLogin}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {isRegistering ? pageCopy.registerTitle : pageCopy.title}
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-800 bg-red-900/50 p-4 text-sm text-red-200">
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
                  required
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
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {isRegistering && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">{pageCopy.confirm}</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
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
