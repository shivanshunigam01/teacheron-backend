import crypto from 'crypto';
import bcrypt from 'bcrypt';
import env from '../config/env.js';
import logger from '../config/logger.js';
import WhatsAppOtp from '../models/WhatsAppOtp.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import {
  normalizePhone,
  phoneE164ToCountryCode,
  phoneE164ToLocal,
} from '../utils/phone.util.js';
import { sendOTP, isWhatsAppConfigured } from './whatsapp.service.js';
import { computeProfileComplete, initialsFromName } from '../utils/profileComplete.js';

const { whatsappOtp } = env;

function generateOtp() {
  const max = 10 ** whatsappOtp.length;
  const min = max / 10;
  return String(crypto.randomInt(min, max));
}

async function hashOtp(otp) {
  return bcrypt.hash(String(otp), env.BCRYPT_ROUNDS);
}

async function getActiveLock(phone) {
  const locked = await WhatsAppOtp.findOne({
    phone,
    lockedUntil: { $gt: new Date() },
  })
    .sort({ lockedUntil: -1 })
    .select('lockedUntil')
    .lean();
  return locked?.lockedUntil ?? null;
}

async function assertNotLocked(phone) {
  const lockedUntil = await getActiveLock(phone);
  if (lockedUntil) {
    const mins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);
    throw ApiError.tooManyRequests(
      `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
    );
  }
}

async function getLatestOtp(phone, purpose) {
  return WhatsAppOtp.findOne({ phone, purpose }).sort({ createdAt: -1 }).select('+otpHash');
}

export async function sendWhatsappOtp(rawPhone, purpose = 'login') {
  if (!isWhatsAppConfigured()) {
    throw ApiError.internal('WhatsApp authentication is not configured on this server');
  }

  const phone = normalizePhone(rawPhone);
  await assertNotLocked(phone);

  const recent = await WhatsAppOtp.findOne({
    phone,
    purpose,
    createdAt: { $gte: new Date(Date.now() - whatsappOtp.resendSeconds * 1000) },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (recent) {
    const wait = Math.ceil(
      (recent.createdAt.getTime() + whatsappOtp.resendSeconds * 1000 - Date.now()) / 1000,
    );
    throw ApiError.tooManyRequests(`Please wait ${Math.max(1, wait)} seconds before requesting another OTP`);
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + whatsappOtp.expiryMinutes * 60_000);

  await WhatsAppOtp.create({
    phone,
    otpHash,
    purpose,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  await sendOTP(phone, otp);

  const result = { sent: true, phone, expiresInSeconds: whatsappOtp.expiryMinutes * 60 };
  if (env.NODE_ENV === 'development') {
    result.devOtp = otp;
    logger.info(`[whatsapp-otp] dev OTP for ${phone}: ${otp}`);
  }
  return result;
}

export async function verifyWhatsappOtp(rawPhone, otp, purpose = 'login') {
  const phone = normalizePhone(rawPhone);
  await assertNotLocked(phone);

  const record = await getLatestOtp(phone, purpose);
  if (!record) {
    throw ApiError.badRequest('No OTP found. Request a new code.');
  }
  if (record.verified) {
    return { verified: true, phone, alreadyVerified: true };
  }
  if (record.expiresAt < new Date()) {
    throw ApiError.badRequest('OTP expired. Request a new code.');
  }
  if (record.attempts >= whatsappOtp.maxAttempts) {
    record.lockedUntil = new Date(Date.now() + whatsappOtp.lockMinutes * 60_000);
    await record.save();
    throw ApiError.tooManyRequests('Too many failed attempts. Try again later.');
  }

  const ok = await bcrypt.compare(String(otp).trim(), record.otpHash);
  if (!ok) {
    record.attempts += 1;
    if (record.attempts >= whatsappOtp.maxAttempts) {
      record.lockedUntil = new Date(Date.now() + whatsappOtp.lockMinutes * 60_000);
    }
    await record.save();
    throw ApiError.badRequest('Invalid OTP');
  }

  record.verified = true;
  record.verifiedAt = new Date();
  await record.save();

  return { verified: true, phone };
}

async function assertRecentlyVerified(phone, purpose) {
  const record = await WhatsAppOtp.findOne({ phone, purpose, verified: true })
    .sort({ verifiedAt: -1 })
    .lean();

  if (!record?.verifiedAt) {
    throw ApiError.badRequest('Verify your phone with OTP first');
  }

  const windowMs = whatsappOtp.expiryMinutes * 60_000;
  if (record.verifiedAt.getTime() < Date.now() - windowMs) {
    throw ApiError.badRequest('OTP verification expired. Request a new code.');
  }

  return record;
}

export async function findUserByPhone(phoneE164) {
  const local = phoneE164ToLocal(phoneE164);
  return User.findOne({
    $or: [{ phoneE164: phoneE164 }, { phone: local, phoneCountryCode: phoneE164ToCountryCode() }],
    isActive: { $ne: false },
  });
}

export async function loginWithVerifiedPhone(rawPhone) {
  const phone = normalizePhone(rawPhone);
  await assertRecentlyVerified(phone, 'login');

  const user = await findUserByPhone(phone);
  if (!user) {
    return { newUser: true, phone };
  }

  if (!['student', 'teacher'].includes(user.role)) {
    throw ApiError.forbidden('WhatsApp login is only available for student and tutor accounts');
  }

  if (!user.phoneE164) {
    user.phoneE164 = phone;
    user.phone = phoneE164ToLocal(phone);
    user.phoneCountryCode = phoneE164ToCountryCode();
    if (!user.phoneVerifiedAt) user.phoneVerifiedAt = new Date();
    await user.save();
  }

  return { user, newUser: false };
}

export async function signupWithVerifiedPhone({ name, phone: rawPhone, role }) {
  const phone = normalizePhone(rawPhone);
  await assertRecentlyVerified(phone, 'signup');

  const existing = await findUserByPhone(phone);
  if (existing) {
    throw ApiError.conflict('An account with this phone number already exists. Try logging in instead.');
  }

  const user = await User.create({
    name: name.trim(),
    email: undefined,
    provider: 'whatsapp',
    role,
    phone: phoneE164ToLocal(phone),
    phoneCountryCode: phoneE164ToCountryCode(),
    phoneE164: phone,
    phoneVerifiedAt: new Date(),
    isVerified: true,
    profileComplete: false,
    welcomeEmailSent: false,
    teacherProfile:
      role === 'teacher'
        ? {
            initials: initialsFromName(name),
            gradient: 'from-blue-500 to-purple-500',
            verified: false,
            online: true,
            onlineTeaching: false,
            homeTuition: false,
            groupClasses: false,
            assignmentHelp: false,
            profileCompleted: false,
            subjects: [],
            teachingSubjects: [],
            education: [],
            experienceEntries: [],
          }
        : undefined,
    studentProfile: role === 'student' ? {} : undefined,
  });

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  return user;
}
