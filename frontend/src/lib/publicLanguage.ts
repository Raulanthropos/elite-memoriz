export type PublicLanguage = 'el' | 'en';

export const PUBLIC_LANGUAGE_STORAGE_KEY = 'elite-memoriz-language';

export const getStoredPublicLanguage = (): PublicLanguage => {
  if (typeof window === 'undefined') {
    return 'el';
  }

  return window.localStorage.getItem(PUBLIC_LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'el';
};

export const setStoredPublicLanguage = (language: PublicLanguage) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PUBLIC_LANGUAGE_STORAGE_KEY, language);
};
