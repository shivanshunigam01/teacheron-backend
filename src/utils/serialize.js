export function toJSON(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  obj.id = obj._id?.toString?.() || obj.id;
  delete obj._id;
  delete obj.__v;
  delete obj.passwordHash;
  delete obj.refreshTokens;
  delete obj.emailVerificationOtpHash;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  obj.isEmailVerified = Boolean(obj.isVerified);
  return obj;
} export const toJSONList=docs=>docs.map(toJSON);
