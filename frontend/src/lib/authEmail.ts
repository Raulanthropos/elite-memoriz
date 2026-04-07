export const normalizeAuthEmail = (value: string) => value.trim().toLowerCase();

const AUTH_EMAIL_STORAGE_KEY = 'elite-memoriz-auth-email';
const hasWindow = () => typeof window !== 'undefined';

export const getStoredAuthEmail = () => {
  if (!hasWindow()) {
    return '';
  }

  return window.localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? '';
};

export const setStoredAuthEmail = (value: string) => {
  if (!hasWindow()) {
    return;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    window.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, normalizedValue);
};

export const clearStoredAuthEmail = () => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
};

export const isExistingAccountError = (message: string | null | undefined) =>
  /already registered|already exists|user already registered|email address is already/i.test(message ?? '');
