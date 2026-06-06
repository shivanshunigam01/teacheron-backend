import Requirement from '../models/Requirement.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';

const LEVEL_LABELS = {
  elem: 'Elementary',
  middle: 'Middle school',
  high: 'High school',
  college: 'College / University',
  pro: 'Professional',
};

export function mapRequirementStatus(doc) {
  if (doc.status === 'pending') return 'pending';
  if (doc.status === 'rejected') return 'rejected';
  if (doc.approved && doc.status === 'open') return 'approved';
  if (['matched', 'closed'].includes(doc.status)) return 'fulfilled';
  return doc.status;
}

export function shapeRequirement(doc) {
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  const location = [o.city, o.country].filter(Boolean).join(', ') || o.location || '';
  return {
    id: o._id?.toString?.() || o.id,
    studentId: o.studentId?.toString?.() || o.studentId,
    studentName: o.studentName || 'Student',
    studentEmail: o.studentEmail || '',
    title: o.title,
    subject: o.subject,
    skills: o.skills || [],
    level: LEVEL_LABELS[o.level] || o.level,
    levelCode: o.level,
    jobType: o.jobType || 'tutoring',
    mode: o.mode,
    sessionsPerWeek: o.sessionsPerWeek,
    location: o.location || location,
    city: o.city || o.location || '',
    country: o.country || '',
    budget: Number(o.budgetPerHour ?? 0),
    budgetPerHour: Number(o.budgetPerHour ?? 0),
    currency: o.currency || 'USD',
    duration: o.duration,
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

  const q = (query.q || '').trim();
  if (q) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { details: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
      ],
    });
  }

  return filter;
}

export async function findRequirementOrThrow(id) {
  const item = await Requirement.findById(id);
  if (!item) throw ApiError.notFound('Requirement not found');
  return item;
}

export function canViewRequirement(item, user) {
  if (item.approved && item.status === 'open') return true;
  if (!user) return false;
  if (user.role === 'admin') return true;
  return String(item.studentId) === String(user.id);
}

export async function createRequirement(user, body) {
  if (!['student', 'parent'].includes(user.role)) {
    throw ApiError.forbidden('Only students or parents can post requirements');
  }

  const skills = Array.isArray(body.skills)
    ? body.skills.map((s) => String(s).trim()).filter(Boolean)
    : body.skill
      ? [String(body.skill).trim()]
      : [];

  const item = await Requirement.create({
    studentId: user.id,
    studentName: user.name,
    studentEmail: user.email,
    title: body.title.trim(),
    subject: body.subject.trim(),
    skills,
    level: body.level || 'high',
    jobType: body.jobType || 'tutoring',
    mode: body.mode || 'online',
    sessionsPerWeek: body.sessionsPerWeek != null ? Number(body.sessionsPerWeek) : undefined,
    location: body.location?.trim() || body.city?.trim() || '',
    city: body.city?.trim() || body.location?.trim() || '',
    country: body.country?.trim() || '',
    budgetPerHour: Number(body.budgetPerHour ?? body.budget ?? 0),
    currency: body.currency || 'USD',
    duration: body.duration || 'ongoing',
    details: body.details.trim(),
    status: 'pending',
    approved: false,
  });

  return shapeRequirement(item);
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

  const student = await User.findById(item.studentId).select('name email');
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
