import type { SupportedCurrency } from './currency';

const DEFAULT_CURRENCY_KEY = 'cipherspend.defaultCurrency';

export function getDefaultCurrency(): SupportedCurrency {
  const raw = window.localStorage.getItem(DEFAULT_CURRENCY_KEY);
  return (raw as SupportedCurrency) || 'LKR';
}

export function setDefaultCurrency(currency: SupportedCurrency): void {
  window.localStorage.setItem(DEFAULT_CURRENCY_KEY, currency);
}
