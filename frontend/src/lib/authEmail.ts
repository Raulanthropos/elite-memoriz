export const normalizeAuthEmail = (value: string) => value.trim().toLowerCase();

export const isExistingAccountError = (message: string | null | undefined) =>
  /already registered|already exists|user already registered|email address is already/i.test(message ?? '');
