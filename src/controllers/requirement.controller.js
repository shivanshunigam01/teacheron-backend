import Requirement from '../models/Requirement.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import {
  approveRequirement,
  buildJobsFilter,
  canViewRequirement,
  createRequirement,
  findRequirementOrThrow,
  isRequirementOwner,
  rejectRequirement,
  shapeRequirement,
  POSTER_SELECT,
} from '../services/requirement.service.js';
import { sendRequirementApprovedEmail, sendRequirementSubmittedEmail } from '../services/requirementEmail.service.js';

/** GET /requirements/jobs — public approved tutor jobs */
export const listJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const skip = (page - 1) * limit;
  const filter = buildJobsFilter(req.query);
  const [items, total] = await Promise.all([
    Requirement.find(filter)
      .populate('studentId', POSTER_SELECT)
      .sort({ approvedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Requirement.countDocuments(filter),
  ]);
  ApiResponse.ok(
    res,
    {
      items: items.map((item) => shapeRequirement(item, { includeEmail: false })),
      pagination: paginationMeta(total, page, limit),
    },
    'Tutor jobs fetched',
  );
});

/** GET /requirements/facets — subjects/skills/locations for filters */
export const jobFacets = asyncHandler(async (req, res) => {
  const items = await Requirement.find({ approved: true, status: 'open' }).select(
    'subject skills city country mode jobType level',
  );
  const subjects = new Set();
  const skills = new Set();
  const locations = new Set();
  const levels = new Set();
  for (const r of items) {
    if (r.subject) subjects.add(r.subject);
    for (const s of r.skills || []) if (s) skills.add(s);
    if (r.city) locations.add(r.city);
    if (r.country) locations.add(r.country);
    if (r.level) levels.add(r.level);
  }
  ApiResponse.ok(
    res,
    {
      subjects: [...subjects].sort(),
      skills: [...skills].sort(),
      locations: [...locations].sort(),
      levels: [...levels].sort(),
      totalJobs: items.length,
    },
    'Job facets fetched',
  );
});

/** POST /requirements — student posts requirement (pending admin review) */
export const create = asyncHandler(async (req, res) => {
  const shaped = await createRequirement(req.user, req.body);
  const emailResult = await sendRequirementSubmittedEmail({
    studentEmail: shaped.studentEmail || req.user.email,
    studentName: shaped.studentName || req.user.name,
    requirementTitle: shaped.title,
  });
  ApiResponse.created(
    res,
    { ...shaped, emailSent: emailResult.sent },
    'Requirement submitted — pending admin approval',
  );
});

/** GET /requirements/me — current user's requirements */
export const listMine = asyncHandler(async (req, res) => {
  const items = await Requirement.find({ studentId: req.user.id })
    .populate('studentId', POSTER_SELECT)
    .sort({ createdAt: -1 });
  ApiResponse.ok(
    res,
    { items: items.map((item) => shapeRequirement(item, { includeEmail: true })) },
    'Your requirements fetched',
  );
});

/** GET /requirements/:id */
export const getById = asyncHandler(async (req, res) => {
  const item = await findRequirementOrThrow(req.params.id);
  if (!canViewRequirement(item, req.user)) {
    throw ApiError.notFound('Requirement not found');
  }
  const includeEmail =
    req.user?.role === 'admin' || isRequirementOwner(item, req.user);
  ApiResponse.ok(res, shapeRequirement(item, { includeEmail }), 'Requirement fetched');
});

/** GET /admin/requirements */
export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  const status = req.query.status || 'pending';
  if (status === 'pending') filter.status = 'pending';
  else if (status === 'open') filter.status = 'open';
  else if (status === 'rejected') filter.status = 'rejected';
  // status === 'all' → no status filter

  const [items, total] = await Promise.all([
    Requirement.find(filter)
      .populate('studentId', POSTER_SELECT)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Requirement.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    {
      items: items.map((item) => shapeRequirement(item, { includeEmail: true })),
      pagination: paginationMeta(total, page, limit),
    },
    'Requirements fetched',
  );
});

/** PATCH /admin/requirements/:id/approve */
export const adminApprove = asyncHandler(async (req, res) => {
  const { item, student, alreadyApproved } = await approveRequirement(
    req.params.id,
    req.body.adminRemark,
  );

  let emailResult = { sent: false };
  if (!alreadyApproved && student?.email) {
    emailResult = await sendRequirementApprovedEmail({
      studentEmail: student.email,
      studentName: student.name || item.studentName,
      requirementTitle: item.title,
    });
  }

  ApiResponse.ok(
    res,
    { ...shapeRequirement(item, { includeEmail: true }), emailSent: emailResult.sent },
    emailResult.sent
      ? 'Requirement approved — student notified by email'
      : 'Requirement approved',
  );
});

/** PATCH /admin/requirements/:id/reject */
export const adminReject = asyncHandler(async (req, res) => {
  const item = await rejectRequirement(req.params.id, req.body.adminRemark);
  ApiResponse.ok(res, shapeRequirement(item, { includeEmail: true }), 'Requirement rejected');
});
