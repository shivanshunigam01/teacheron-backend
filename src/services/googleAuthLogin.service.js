import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { computeProfileComplete, initialsFromName } from '../utils/profileComplete.js';
import { sendStudentWelcomeIfReady } from '../services/emailVerification.service.js';

function buildTeacherProfile(name) {
  return {
    initials: initialsFromName(name),
    gradient: 'from-blue-500 to-purple-500',
    verified: false,
    online: true,
    subjects: [],
  };
}

/**
 * Find an existing user by email or create a Google-authenticated account.
 * Google users do not require a password.
 *
 * @param {{ googleId: string; email: string; name: string; picture: string }} googleUser
 * @param {{ role?: 'student' | 'teacher' }} options
 */
export async function findOrCreateGoogleUser(googleUser, { role } = {}) {
  let user = await User.findOne({ email: googleUser.email }).select('+passwordHash');
  let isNewUser = false;
  let welcomeEmailSent = false;

  if (!user) {
    const resolvedRole = role && ['student', 'teacher'].includes(role) ? role : 'student';

    user = await User.create({
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.googleId,
      provider: 'google',
      avatarUrl: googleUser.picture || undefined,
      role: resolvedRole,
      isVerified: true,
      profileComplete: false,
      welcomeEmailSent: false,
      teacherProfile: resolvedRole === 'teacher' ? buildTeacherProfile(googleUser.name) : undefined,
      studentProfile: resolvedRole === 'student' ? {} : undefined,
    });
    isNewUser = true;

    if (resolvedRole === 'student') {
      const welcome = await sendStudentWelcomeIfReady(user);
      welcomeEmailSent = Boolean(welcome.sent);
    }

    return { user, isNewUser, welcomeEmailSent };
  }

  if (!['student', 'teacher'].includes(user.role)) {
    throw ApiError.forbidden('Google sign-in is only available for student and tutor accounts');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Account is disabled');
  }
  if (user.googleId && user.googleId !== googleUser.googleId) {
    throw ApiError.conflict('This email is linked to a different Google account');
  }

  if (!user.googleId) {
    user.googleId = googleUser.googleId;
  }
  if (googleUser.picture && !user.avatarUrl) {
    user.avatarUrl = googleUser.picture;
  }
  if (!user.isVerified) {
    user.isVerified = true;
  }

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  return { user, isNewUser, welcomeEmailSent };
}
