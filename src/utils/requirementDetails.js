/**
 * Client + server shared rules for requirement details text.
 */

const CONTACT_RE =
  /(\+?\d[\d\s().-]{7,}\d)|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(https?:\/\/|www\.)/i;

const WORD_RE = /[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0900-\u097F\u0600-\u06FF0-9]+/g;

export function countWords(text = '') {
  const matches = String(text).match(WORD_RE);
  return matches ? matches.length : 0;
}

export function containsContactDetails(text = '') {
  return CONTACT_RE.test(String(text));
}

/**
 * Reject gibberish / keyboard smash: too few unique chars, low letter ratio, weird runs.
 */
export function looksMeaningful(text = '') {
  const raw = String(text).trim();
  if (raw.length < 40) return false;

  const words = raw.match(WORD_RE) || [];
  if (words.length < 150) return false;

  const letters = (raw.match(/[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0900-\u097F\u0600-\u06FF]/g) || []).length;
  const letterRatio = letters / Math.max(raw.replace(/\s/g, '').length, 1);
  if (letterRatio < 0.55) return false;

  const unique = new Set(raw.toLowerCase().replace(/\s+/g, ''));
  if (unique.size < 12) return false;

  // Long runs of the same character
  if (/(.)\1{6,}/i.test(raw)) return false;

  // Average word length too extreme (smash keys or all one-letter)
  const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  if (avgLen < 2.2 || avgLen > 14) return false;

  // Too many "words" that are pure consonant spam
  const consonantHeavy = words.filter((w) => {
    if (w.length < 5) return false;
    const vowels = (w.match(/[aeiouаеёиоуыэюяاويىَُِ\u0905-\u0914]/gi) || []).length;
    return vowels / w.length < 0.12;
  }).length;
  if (consonantHeavy / words.length > 0.35) return false;

  return true;
}

export function validateRequirementDetails(text = '') {
  const trimmed = String(text).trim();
  if (!trimmed) return { ok: false, code: 'empty', message: 'Please describe your requirement.' };
  if (containsContactDetails(trimmed)) {
    return {
      ok: false,
      code: 'contact',
      message: "Please don't share any contact details (phone, email, website etc) here.",
    };
  }
  const words = countWords(trimmed);
  if (words < 150) {
    return {
      ok: false,
      code: 'short',
      message: `Please write at least 150 words (currently ${words}).`,
    };
  }
  if (!looksMeaningful(trimmed)) {
    return {
      ok: false,
      code: 'gibberish',
      message: 'Please write a clear, meaningful description of what you need.',
    };
  }
  return { ok: true, words };
}
