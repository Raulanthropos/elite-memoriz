import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, SearchX } from 'lucide-react';
import { PublicLanguageToggle } from '../components/PublicLanguageToggle';
import { getStoredPublicLanguage, setStoredPublicLanguage, type PublicLanguage } from '../lib/publicLanguage';

const copy = {
  el: {
    eyebrow: '404',
    title: 'Η σελίδα δεν βρέθηκε.',
    body: 'Ο σύνδεσμος που άνοιξες δεν αντιστοιχεί σε έγκυρη σελίδα του Elite Memoriz.',
    pathLabel: 'Μη έγκυρο URL',
    home: 'Πίσω στην αρχική',
    login: 'Σύνδεση host',
  },
  en: {
    eyebrow: '404',
    title: 'Page not found.',
    body: 'The link you opened does not match a valid page in Elite Memoriz.',
    pathLabel: 'Invalid URL',
    home: 'Back to home',
    login: 'Host sign in',
  },
} as const;

const NotFound = () => {
  const [language, setLanguage] = useState<PublicLanguage>(getStoredPublicLanguage);
  const location = useLocation();
  const pageCopy = copy[language];
  const invalidPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    setStoredPublicLanguage(language);
  }, [language]);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex justify-end">
          <PublicLanguageToggle language={language} onChange={setLanguage} />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900 shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative flex items-center justify-center overflow-hidden border-b border-gray-800 bg-gradient-to-br from-rose-500/20 via-amber-500/10 to-sky-500/10 px-8 py-12 lg:border-b-0 lg:border-r">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_34%)]" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 text-amber-200 shadow-lg shadow-amber-500/10 backdrop-blur">
                <SearchX size={48} />
              </div>
            </div>

            <div className="px-8 py-10 sm:px-10 sm:py-12">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300/80">{pageCopy.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{pageCopy.title}</h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-gray-300">{pageCopy.body}</p>

              <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-950/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">{pageCopy.pathLabel}</p>
                <p className="mt-3 break-all rounded-xl border border-white/5 bg-white/5 px-4 py-3 font-mono text-sm text-gray-200">
                  {invalidPath}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-200"
                >
                  <Home size={16} />
                  <span>{pageCopy.home}</span>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-700 bg-transparent px-6 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800"
                >
                  <ArrowLeft size={16} />
                  <span>{pageCopy.login}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
