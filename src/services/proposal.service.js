import Proposal from '../models/Proposal.model.js';
import Requirement from '../models/Requirement.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { findRequirementOrThrow } from './requirement.service.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function shapeProposal(doc) {
  if (!doc) return doc;
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  return {
    id: o.id || o._id?.toString?.() || String(o._id ?? ''),
    requirementId: o.requirementId?.toString?.() || o.requirementId,
    requirementTitle: o.requirementTitle || '',
    teacherId: o.teacherId?.toString?.() || o.teacherId,
    teacherName: o.teacherName || '',
    teacherEmail: o.teacherEmail || '',
    message: o.message,
    proposedRate: Number(o.proposedRate ?? 0),
    sessions: Number(o.sessions ?? 1),
    currency: o.currency || 'USD',
    status: o.status,
    adminRemark: o.adminRemark || '',
    reviewedAt: o.reviewedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export async function createJobApplication(user, body) {
  if (user.role !== 'teacher') {
    throw ApiError.forbidden('Only tutors can apply to tutor jobs');
  }

  const requirement = await findRequirementOrThrow(body.requirementId);
  if (!requirement.approved || requirement.status !== 'open') {
    throw ApiError.badRequest('This job is not open for applications');
  }

  const existing = await Proposal.findOne({
    requirementId: requirement._id,
    teacherId: user.id,
  });
  if (existing) {
    throw ApiError.conflict('You have already applied to this job');
  }

  const teacher = await User.findById(user.id).select('name email');
  const item = await Proposal.create({
    requirementId: requirement._id,
    requirementTitle: requirement.title,
    teacherId: user.id,
    teacherName: teacher?.name || user.name,
    teacherEmail: teacher?.email || user.email,
    message: body.message.trim(),
    proposedRate: Number(body.proposedRate ?? requirement.budgetPerHour ?? 0),
    sessions: Number(body.sessions ?? 1),
    currency: requirement.currency || 'USD',
    status: 'pending',
  });

  return { item, requirement };
}

export async function findProposalOrThrow(id) {
  const item = await Proposal.findById(id);
  if (!item) throw ApiError.notFound('Application not found');
  return item;
}

export async function approveJobApplication(id, adminRemark = '') {
  const item = await findProposalOrThrow(id);
  if (item.status === 'rejected') {
    throw ApiError.badRequest('Rejected applications cannot be approved');
  }
  if (item.status === 'approved') {
    return { item, alreadyApproved: true };
  }

  const requirement = await findRequirementOrThrow(item.requirementId);
  item.status = 'approved';
  item.adminRemark = adminRemark?.trim() || '';
  item.reviewedAt = new Date();
  await item.save();

  requirement.status = 'matched';
  requirement.assignedTeacherId = item.teacherId;
  await requirement.save();

  const teacher = await User.findById(item.teacherId).select('name email');
  return { item, requirement, teacher, alreadyApproved: false };
}

export async function rejectJobApplication(id, adminRemark) {
  const item = await findProposalOrThrow(id);
  if (item.status === 'approved') {
    throw ApiError.badRequest('Approved applications cannot be rejected');
  }

  item.status = 'rejected';
  item.adminRemark = adminRemark?.trim() || 'Application not selected';
  item.reviewedAt = new Date();
  await item.save();

  return item;
}

export function buildAdminProposalFilter(query = {}) {
  const filter = {};
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  const q = String(query.q ?? '').trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { teacherName: regex },
      { teacherEmail: regex },
      { requirementTitle: regex },
      { message: regex },
    ];
  }

  return filter;
}
