export const CREATE_EVENT_DRAFT_STORAGE_KEY = 'elite-memoriz-create-event-draft';

const hasWindow = () => typeof window !== 'undefined';

export const getStoredCreateEventDraft = () => {
  if (!hasWindow()) {
    return null;
  }

  return (
    window.localStorage.getItem(CREATE_EVENT_DRAFT_STORAGE_KEY)
    ?? window.sessionStorage.getItem(CREATE_EVENT_DRAFT_STORAGE_KEY)
  );
};

export const setStoredCreateEventDraft = (value: string) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(CREATE_EVENT_DRAFT_STORAGE_KEY, value);
  window.sessionStorage.setItem(CREATE_EVENT_DRAFT_STORAGE_KEY, value);
};

export const clearStoredCreateEventDraft = () => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(CREATE_EVENT_DRAFT_STORAGE_KEY);
  window.sessionStorage.removeItem(CREATE_EVENT_DRAFT_STORAGE_KEY);
};
