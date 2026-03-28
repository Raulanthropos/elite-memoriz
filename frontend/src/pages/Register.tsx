import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { API_URL } from '../lib/config';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';

const copy = {
  el: {
    title: 'Δημιούργησε Host Account',
    subtitle: 'Το επόμενο βήμα μετά την εγγραφή θα είναι το payment page.',
    email: 'Email',
    password: 'Κωδικός',
    confirm: 'Επιβεβαίωση',
    create: 'Δημιουργία Λογαριασμού',
    creating: 'Δημιουργία...',
    signInPrompt: 'Έχεις ήδη λογαριασμό;',
    signIn: 'Σύνδεση',
    mismatch: 'Οι κωδικοί δεν ταιριάζουν',
    shortPassword: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες',
    checkEmail: 'Έλεγξε το email σου για το confirmation link.',
  },
  en: {
    title: 'Create Host Account',
    subtitle: 'The next step after registration will be the payment page.',
    email: 'Email',
    password: 'Password',
    confirm: 'Confirm',
    create: 'Create Account',
    creating: 'Creating...',
    signInPrompt: 'Already have an account?',
    signIn: 'Sign in',
    mismatch: "Passwords don't match",
    shortPassword: 'Password should be at least 6 characters',
    checkEmail: 'Check your email for the confirmation link.',
  },
} as const;

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(pageCopy.mismatch);
      return;
    }

    if (password.length < 6) {
      setError(pageCopy.shortPassword);
      return;
    }

    setLoading(true);

    try {
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
          console.error('Profile creation failed but auth succeeded.');
        }

        navigate(redirectPath, { replace: true });
      } else {
        alert(pageCopy.checkEmail);
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
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

        <div className="space-y-8 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
          <div className="text-center">
            <h2 className="mb-2 text-3xl font-bold text-white">{pageCopy.title}</h2>
            <p className="text-gray-400">{pageCopy.subtitle}</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">{pageCopy.email}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">{pageCopy.password}</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">{pageCopy.confirm}</label>
                  <input
                    type="password"
                    required
                    minLength={6}
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
            <Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
              {pageCopy.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
