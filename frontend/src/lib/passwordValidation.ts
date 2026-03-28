export type PasswordRequirementKey = 'minLength' | 'uppercase' | 'number' | 'symbol';

export type PasswordRequirements = Record<PasswordRequirementKey, boolean>;

const PASSWORD_SYMBOL_REGEX = /[^A-Za-z0-9\s]/;

export const getPasswordRequirements = (password: string): PasswordRequirements => ({
  minLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
  symbol: PASSWORD_SYMBOL_REGEX.test(password),
});

export const isPasswordStrong = (password: string): boolean =>
  Object.values(getPasswordRequirements(password)).every(Boolean);
