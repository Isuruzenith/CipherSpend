export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'LKR', 'INR', 'JPY', 'AUD', 'CAD'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: 'EUR ',
  GBP: 'GBP ',
  LKR: 'LKR ',
  INR: 'INR ',
  JPY: 'JPY ',
  AUD: 'AUD ',
  CAD: 'CAD ',
};

export function getCurrencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? `${currency} `;
}
