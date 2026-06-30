/** Minimum bio length is measured in words (not characters). */
export const BIO_MIN_WORDS = 150;
export const BIO_MAX_CHARS = 3000;

export function countBioWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function isBioValid(bio) {
  const trimmed = String(bio || '').trim();
  if (!trimmed) return false;
  if (trimmed.length > BIO_MAX_CHARS) return false;
  return countBioWords(trimmed) >= BIO_MIN_WORDS;
}
