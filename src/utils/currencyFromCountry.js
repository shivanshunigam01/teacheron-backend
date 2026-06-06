/** ISO 3166-1 alpha-2 (and common aliases) → ISO 4217 currency codes. */
export const COUNTRY_TO_CURRENCY = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  UK: 'GBP',
  IE: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  HR: 'EUR',
  IN: 'INR',
  AE: 'AED',
  SA: 'SAR',
  AU: 'AUD',
  SG: 'SGD',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  ZA: 'ZAR',
  BR: 'BRL',
  MX: 'MXN',
  NZ: 'NZD',
  TR: 'TRY',
  RU: 'RUB',
  KR: 'KRW',
  TH: 'THB',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  EG: 'EGP',
  NG: 'NGN',
  KE: 'KES',
};

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AED: 'د.إ',
  SAR: '﷼',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  PKR: '₨',
  BDT: '৳',
  LKR: 'Rs',
  NPR: '₨',
  JPY: '¥',
  CNY: '¥',
  HKD: 'HK$',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  ZAR: 'R',
  BRL: 'R$',
  MXN: '$',
  NZD: 'NZ$',
  TRY: '₺',
  RUB: '₽',
  KRW: '₩',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  EGP: '£',
  NGN: '₦',
  KES: 'KSh',
};

const SUPPORTED = new Set(Object.values(COUNTRY_TO_CURRENCY));

export function normalizeCountryCode(code) {
  const upper = String(code || '')
    .trim()
    .toUpperCase();
  if (!upper) return '';
  if (upper === 'UK') return 'GB';
  return upper;
}

export function getCurrencyForCountryCode(countryCode) {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return 'USD';
  const currency = COUNTRY_TO_CURRENCY[normalized];
  if (currency && SUPPORTED.has(currency)) return currency;
  return 'USD';
}

export function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code || '$';
}
