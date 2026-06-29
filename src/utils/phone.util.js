import { ApiError } from './ApiError.js';
import { PHONE_DIAL_CODES } from '../data/phone-dial-codes.js';

/** Normalize to E.164 without plus (e.g. 919876543210, 14155552671). */
export function normalizePhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw ApiError.badRequest('Enter a valid phone number with country code');
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw ApiError.badRequest('Enter a valid international phone number');
  }
  return digits;
}

/** @deprecated Use normalizePhone — kept for backwards compatibility */
export function normalizeIndianPhone(input) {
  return normalizePhone(input);
}

export function splitE164Phone(e164) {
  const digits = String(e164 ?? '').replace(/\D/g, '');
  const dial = PHONE_DIAL_CODES.find((code) => digits.startsWith(code));
  if (!dial) {
    return { dialCode: '+', local: digits, phoneCountryCode: '+' };
  }
  return {
    dialCode: dial,
    local: digits.slice(dial.length),
    phoneCountryCode: `+${dial}`,
  };
}

export function phoneE164ToLocal(e164) {
  return splitE164Phone(e164).local;
}

export function phoneE164ToCountryCode(e164) {
  const { phoneCountryCode } = splitE164Phone(e164);
  return phoneCountryCode === '+' ? '+91' : phoneCountryCode;
}
