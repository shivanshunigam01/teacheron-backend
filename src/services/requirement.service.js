import Requirement from '../models/Requirement.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ensureSubjectByName, ensureSubjectNames } from './subject.service.js';
import logger from '../config/logger.js';

const LEVEL_LABELS = {
  elem: 'Elementary',
  middle: 'Middle school',
  high: 'High school',
  college: 'College / University',
  pro: 'Professional',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function mapRequirementStatus(doc) {
  if (doc.status === 'pending') return 'pending';
  if (doc.status === 'rejected') return 'rejected';
  if (doc.approved && doc.status === 'open') return 'approved';
  if (['matched', 'closed'].includes(doc.status)) return 'fulfilled';
  return doc.status;
}

/**
 * Public-safe phone display, e.g. "+91-**********".
 * Never returns the real national digits.
 */
export function maskPosterPhone(user) {
  if (!user || typeof user !== 'object') return null;

  const ccRaw = String(user.phoneCountryCode || '').trim().replace(/\s+/g, '');
  const phoneDigits = String(user.phone || '').replace(/\D/g, '');
  const e164Digits = String(user.phoneE164 || '').replace(/\D/g, '');

  if (!phoneDigits && !e164Digits && !user.phoneVerifiedAt) return null;

  let cc = ccRaw || '+91';
  if (!cc.startsWith('+')) cc = `+${cc}`;

  const ccDigits = cc.replace(/\D/g, '');
  let nationalLen = phoneDigits.length;
  if (!nationalLen && e164Digits) {
    nationalLen = e164Digits.startsWith(ccDigits)
      ? e164Digits.length - ccDigits.length
      : Math.max(0, e164Digits.length - 2);
  }
  if (nationalLen < 6) nationalLen = 10;

  return `${cc}-${'*'.repeat(nationalLen)}`;
}

function posterFromDoc(o) {
  const populated =
    o.studentId && typeof o.studentId === 'object' && (o.studentId.role || o.studentId.name)
      ? o.studentId
      : null;

  const roleRaw = o.posterRole || populated?.role;
  const posterRole = roleRaw === 'parent' ? 'parent' : 'student';
  const posterName =
    (populated?.name || o.studentName || '').trim() ||
    (posterRole === 'parent' ? 'Parent' : 'Student');
  const posterVerified = Boolean(
    populated?.isVerified || populated?.phoneVerifiedAt || o.posterVerified,
  );
  const posterPhoneVerified = Boolean(populated?.phoneVerifiedAt);
  const posterPhoneMasked = maskPosterPhone(populated);

  return { posterRole, posterName, posterVerified, posterPhoneVerified, posterPhoneMasked };
}

/**
 * @param {object} doc
 * @param {{ includeEmail?: boolean }} [opts]
 */
export function shapeRequirement(doc, opts = {}) {
  const { includeEmail = false } = opts;
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  const location = [o.city, o.country].filter(Boolean).join(', ') || o.location || '';
  const {
    posterRole,
    posterName,
    posterVerified,
    posterPhoneVerified,
    posterPhoneMasked,
  } = posterFromDoc(o);
  const studentId =
    o.studentId?._id?.toString?.() ||
    o.studentId?.toString?.() ||
    o.studentId ||
    '';

  const shaped = {
    id: o._id?.toString?.() || o.id,
    studentId,
    studentName: posterName,
    posterName,
    posterRole,
    posterVerified,
    posterPhoneVerified: Boolean(posterPhoneVerified || o.phoneVerifiedAt),
    posterPhoneMasked:
      posterPhoneMasked ||
      maskPosterPhone({
        phoneCountryCode: o.phoneCountryCode,
        phone: o.phone,
        phoneVerifiedAt: o.phoneVerifiedAt || true,
      }) ||
      undefined,
    title: o.title,
    subject: o.subject,
    subjectPendingApproval: !!o.subjectPendingApproval,
    skills: o.skills || [],
    level:
      o.level === 'other' && o.levelOther
        ? o.levelOther
        : LEVEL_LABELS[o.level] || o.level,
    levelCode: o.level,
    levelOther: o.levelOther || undefined,
    jobType: o.jobType || 'tutoring',
    mode: o.mode,
    meetingOptions: {
      online: o.meetingOptions?.online ?? o.mode !== 'offline',
      atMyPlace: o.meetingOptions?.atMyPlace ?? (o.mode === 'offline' || o.mode === 'both'),
      travelToTutor: !!o.meetingOptions?.travelToTutor,
    },
    sessionsPerWeek: o.sessionsPerWeek,
    location: o.addressFormatted || o.location || location,
    addressFormatted: o.addressFormatted || o.location || location,
    city: o.city || o.location || '',
    country: o.country || '',
    budget: Number(o.budgetPerHour ?? 0),
    budgetPerHour: Number(o.budgetPerHour ?? 0),
    budgetUnit: o.budgetUnit || 'hour',
    currency: o.currency || 'USD',
    duration:
      o.duration === 'other' && o.durationOther ? o.durationOther : o.duration,
    durationOther: o.durationOther || undefined,
    timeCommitment: o.timeCommitment || 'part-time',
    teacherGender: o.teacherGender || 'any',
    languages: o.languages || [],
    tutorOrigin: o.tutorOrigin || '',
    attachments: (o.attachments || []).map((a) => ({
      url: a.url,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
    })),
    details: o.details,
    status: mapRequirementStatus(o),
    backendStatus: o.status,
    approved: !!o.approved,
    adminNote: o.adminRemark || '',
    adminRemark: o.adminRemark || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    approvedAt: o.approvedAt,
    rejectedAt: o.rejectedAt,
  };

  if (includeEmail) {
    shaped.studentEmail = o.studentEmail || o.studentId?.email || '';
    shaped.phoneCountryCode = o.phoneCountryCode || '';
    shaped.phone = o.phone || '';
  }

  return shaped;
}

export function buildJobsFilter(query = {}) {
  const filter = { approved: true, status: 'open' };

  const subject = (query.subject || '').trim();
  if (subject) {
    filter.$or = [
      { subject: { $regex: subject, $options: 'i' } },
      { skills: { $elemMatch: { $regex: subject, $options: 'i' } } },
    ];
  }

  const skill = (query.skill || query.skills || '').trim();
  if (skill) {
    filter.skills = { $elemMatch: { $regex: skill, $options: 'i' } };
  }

  const location = (query.location || query.city || '').trim();
  if (location) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { city: { $regex: location, $options: 'i' } },
        { country: { $regex: location, $options: 'i' } },
        { location: { $regex: location, $options: 'i' } },
      ],
    });
  }

  const jobType = (query.jobType || '').trim();
  if (jobType === 'tutoring' || jobType === 'assignment') {
    filter.jobType = jobType;
  }

  const mode = (query.mode || '').trim();
  if (mode === 'online') {
    filter.mode = { $in: ['online', 'both'] };
  } else if (mode === 'home' || mode === 'offline') {
    filter.mode = { $in: ['offline', 'both'] };
  }

  const level = (query.level || '').trim();
  if (['elem', 'middle', 'high', 'college', 'pro', 'other'].includes(level)) {
    filter.level = level;
  }

  const q = (query.q || '').trim();
  if (q) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { details: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { skills: { $elemMatch: { $regex: q, $options: 'i' } } },
      ],
    });
  }

  return filter;
}

const POSTER_SELECT =
  'name role isVerified phoneVerifiedAt phone phoneCountryCode phoneE164 email';

export async function findRequirementOrThrow(id) {
  const item = await Requirement.findById(id).populate('studentId', POSTER_SELECT);
  if (!item) throw ApiError.notFound('Requirement not found');
  return item;
}

export function canViewRequirement(item, user) {
  if (item.approved && item.status === 'open') return true;
  if (!user) return false;
  if (user.role === 'admin') return true;
  const ownerId = item.studentId?._id || item.studentId;
  return String(ownerId) === String(user.id);
}

export function isRequirementOwner(item, user) {
  if (!user) return false;
  const ownerId = item.studentId?._id || item.studentId;
  return String(ownerId) === String(user.id);
}

export async function createRequirement(user, body) {
  if (!['student', 'parent'].includes(user.role)) {
    throw ApiError.forbidden('Only students or parents can post requirements');
  }

  const dbUser = await User.findById(user.id).select(
    'name email role isVerified phoneVerifiedAt phone phoneCountryCode phoneE164',
  );
  if (!dbUser) throw ApiError.notFound('User not found');

  const skills = Array.isArray(body.skills)
    ? body.skills.map((s) => String(s).trim()).filter(Boolean)
    : body.skill
      ? [String(body.skill).trim()]
      : [];

  const subject = String(body.subject || '').trim();
  const wantPendingSubject = Boolean(body.subjectPendingApproval);

  let subjectPendingApproval = false;
  try {
    const subjectDoc = await ensureSubjectByName(subject, {
      pendingApproval: wantPendingSubject,
      proposedBy: user.id,
    });
    subjectPendingApproval = Boolean(
      wantPendingSubject || subjectDoc?.approvalStatus === 'pending' || subjectDoc?.isActive === false,
    );
    await ensureSubjectNames(skills);
  } catch (err) {
    logger.warn(`[subjects] ensure on requirement create failed: ${err.message}`);
  }

  const meetingOptions = {
    online: Boolean(body.meetingOptions?.online ?? body.mode !== 'offline'),
    atMyPlace: Boolean(body.meetingOptions?.atMyPlace),
    travelToTutor: Boolean(body.meetingOptions?.travelToTutor),
  };
  if (!meetingOptions.online && !meetingOptions.atMyPlace && !meetingOptions.travelToTutor) {
    meetingOptions.online = true;
  }

  let mode = body.mode || 'online';
  if (meetingOptions.online && (meetingOptions.atMyPlace || meetingOptions.travelToTutor)) {
    mode = 'both';
  } else if (!meetingOptions.online && (meetingOptions.atMyPlace || meetingOptions.travelToTutor)) {
    mode = 'offline';
  } else if (meetingOptions.online) {
    mode = 'online';
  }

  const addressFormatted = String(body.addressFormatted || body.location || body.city || '').trim();
  const posterRole = dbUser.role === 'parent' ? 'parent' : 'student';
  const posterName = (dbUser.name || '').trim() || (posterRole === 'parent' ? 'Parent' : 'Student');

  const phoneCountryCode = String(body.phoneCountryCode || dbUser.phoneCountryCode || '+91').trim();
  const phone = String(body.phone || '').replace(/\D/g, '');

  // Persist phone on user if missing (helps masked display later)
  if (phone && (!dbUser.phone || !dbUser.phoneVerifiedAt)) {
    dbUser.phoneCountryCode = phoneCountryCode.startsWith('+')
      ? phoneCountryCode
      : `+${phoneCountryCode}`;
    dbUser.phone = phone;
    try {
      await dbUser.save();
    } catch (err) {
      logger.warn(`[requirement] could not sync user phone: ${err.message}`);
    }
  }

  const item = await Requirement.create({
    studentId: dbUser._id,
    studentName: posterName,
    studentEmail: dbUser.email,
    posterRole,
    title: body.title.trim(),
    subject,
    subjectPendingApproval,
    skills,
    level: body.level || 'high',
    levelOther: body.level === 'other' ? body.levelOther?.trim() : undefined,
    jobType: body.jobType || 'tutoring',
    mode,
    meetingOptions,
    sessionsPerWeek: body.sessionsPerWeek != null ? Number(body.sessionsPerWeek) : undefined,
    location: addressFormatted,
    addressFormatted,
    placeId: body.placeId?.trim() || undefined,
    locationLat: body.locationLat != null ? Number(body.locationLat) : undefined,
    locationLng: body.locationLng != null ? Number(body.locationLng) : undefined,
    city: body.city?.trim() || addressFormatted.split(',')[0]?.trim() || '',
    country: body.country?.trim() || '',
    budgetPerHour: Number(body.budgetPerHour ?? body.budget ?? 0),
    budgetUnit: body.budgetUnit || 'hour',
    currency: body.currency || 'USD',
    duration: body.duration || 'ongoing',
    durationOther: body.duration === 'other' ? body.durationOther?.trim() : undefined,
    timeCommitment: body.timeCommitment || 'part-time',
    teacherGender: body.teacherGender || 'any',
    languages: Array.isArray(body.languages)
      ? body.languages.map((l) => String(l).trim()).filter(Boolean)
      : [],
    tutorOrigin: body.tutorOrigin?.trim() || '',
    phoneCountryCode: phoneCountryCode.startsWith('+') ? phoneCountryCode : `+${phoneCountryCode}`,
    phone,
    phoneVerifiedAt: dbUser.phoneVerifiedAt || undefined,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    details: body.details.trim(),
    acceptedTermsAt: new Date(),
    status: 'pending',
    approved: false,
  });

  item.studentId = dbUser;
  return shapeRequirement(item, { includeEmail: true });
}

export async function approveRequirement(id, adminRemark = '') {
  const item = await findRequirementOrThrow(id);
  if (item.status === 'rejected') {
    throw ApiError.badRequest('Rejected requirements cannot be approved — ask the student to post again');
  }
  if (item.approved && item.status === 'open') {
    return { item, alreadyApproved: true };
  }

  item.status = 'open';
  item.approved = true;
  item.adminRemark = adminRemark?.trim() || '';
  item.approvedAt = new Date();
  item.rejectedAt = undefined;
  await item.save();

  const student = await User.findById(item.studentId?._id || item.studentId).select('name email');
  return { item, student, alreadyApproved: false };
}

export async function rejectRequirement(id, adminRemark = '') {
  const item = await findRequirementOrThrow(id);
  if (item.approved && item.status === 'open') {
    throw ApiError.badRequest('Approved requirements cannot be rejected — close them instead');
  }

  item.status = 'rejected';
  item.approved = false;
  item.adminRemark = adminRemark?.trim() || 'Does not meet posting guidelines';
  item.rejectedAt = new Date();
  await item.save();

  return item;
}

export { POSTER_SELECT };
