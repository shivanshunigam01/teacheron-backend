/**
 * Mask credentials in a MongoDB connection string for safe logging.
 * @param {string} uri
 */
export function maskMongoUri(uri) {
  if (!uri?.trim()) return '(not set)';
  return uri.trim().replace(/^(mongodb(?:\+srv)?:\/\/)([^@/]+@)/, '$1***@');
}

/**
 * Extract host + database from URI for startup logs (no credentials).
 * @param {string} uri
 */
export function describeMongoTarget(uri) {
  if (!uri?.trim()) return 'unknown';
  const masked = maskMongoUri(uri);
  try {
    const withoutQuery = masked.split('?')[0];
    const afterAt = withoutQuery.includes('@') ? withoutQuery.split('@')[1] : withoutQuery.replace(/^mongodb(?:\+srv)?:\/\//, '');
    return afterAt || 'unknown';
  } catch {
    return 'unknown';
  }
}
