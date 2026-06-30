import Proposal from '../models/Proposal.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON } from '../utils/serialize.js';
import {
  approveJobApplication,
  buildAdminProposalFilter,
  createJobApplication,
  rejectJobApplication,
  shapeProposal,
} from '../services/proposal.service.js';
import { sendProposalApprovedEmail } from '../services/proposalEmail.service.js';

export const create = asyncHandler(async (req, res) => {
  const { item } = await createJobApplication(req.user, req.body);
  ApiResponse.created(res, shapeProposal(item), 'Application submitted');
});

export const myApplications = asyncHandler(async (req, res) => {
  const items = await Proposal.find({ teacherId: req.user.id }).sort({ updatedAt: -1 }).lean();
  ApiResponse.ok(res, { items: items.map(shapeProposal) }, 'Your applications fetched');
});

export const getForRequirement = asyncHandler(async (req, res) => {
  const item = await Proposal.findOne({
    requirementId: req.params.requirementId,
    teacherId: req.user.id,
  }).lean();

  ApiResponse.ok(res, item ? shapeProposal(item) : null, 'Application fetched');
});

export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildAdminProposalFilter(req.query);

  const [items, total] = await Promise.all([
    Proposal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Proposal.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    { items: items.map(shapeProposal), pagination: paginationMeta(total, page, limit) },
    'Applications fetched',
  );
});

export const adminGetById = asyncHandler(async (req, res) => {
  const item = await Proposal.findById(req.params.id).lean();
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, shapeProposal(item), 'Application fetched');
});

export const adminApprove = asyncHandler(async (req, res) => {
  const { item, requirement, teacher, alreadyApproved } = await approveJobApplication(
    req.params.id,
    req.body.adminRemark,
  );

  let emailSent = false;
  if (!alreadyApproved && teacher?.email) {
    const result = await sendProposalApprovedEmail({
      teacherEmail: teacher.email,
      teacherName: teacher.name,
      requirementTitle: requirement.title,
      jobUrl: `${process.env.CLIENT_URL || 'https://www.teacherpoint.org'}/teacher`,
    });
    emailSent = result.sent;
  }

  ApiResponse.ok(
    res,
    { ...shapeProposal(item), emailSent },
    alreadyApproved ? 'Already approved' : 'Application approved',
  );
});

export const adminReject = asyncHandler(async (req, res) => {
  const item = await rejectJobApplication(req.params.id, req.body.adminRemark);
  ApiResponse.ok(res, shapeProposal(item), 'Application rejected');
});
