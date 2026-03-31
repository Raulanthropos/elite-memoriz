const DEFAULT_REDIRECT_PATH = '/dashboard';

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

export const sanitizeRedirectPath = (requestedRedirect: string | null | undefined) => {
  if (
    requestedRedirect &&
    requestedRedirect.startsWith('/') &&
    !requestedRedirect.startsWith('//')
  ) {
    return requestedRedirect;
  }

  return DEFAULT_REDIRECT_PATH;
};

export const getAuthRedirectBaseUrl = () => {
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL;

  if (configuredSiteUrl) {
    return normalizeBaseUrl(configuredSiteUrl);
  }

  return normalizeBaseUrl(window.location.origin);
};

export const getEmailRedirectUrl = (requestedRedirect: string | null | undefined) => {
  const redirectPath = sanitizeRedirectPath(requestedRedirect);
  return `${getAuthRedirectBaseUrl()}/login?redirect=${encodeURIComponent(redirectPath)}`;
};
