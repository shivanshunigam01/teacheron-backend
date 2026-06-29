import Workshop from '../models/Workshop.model.js';
import WorkshopRegistration from '../models/WorkshopRegistration.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import {
  combineDateAndTime,
  isWorkshopUpcoming,
  shapeWorkshop,
} from '../services/workshop.service.js';

function parseWorkshopDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Invalid workshopDate');
  return d;
}

function assertFutureWorkshop(body) {
  const end = combineDateAndTime(parseWorkshopDate(body.workshopDate), body.endTime);
  if (end <= new Date()) {
    throw ApiError.badRequest('Workshop must be scheduled in the future');
  }
}

function buildWorkshopPayload(body, teacher) {
  const isFree = body.isFree !== false && (!body.price || body.price <= 0);
  return {
    title: body.title.trim(),
    category: body.category.trim(),
    description: body.description.trim(),
    teacherId: teacher._id,
    teacherName: teacher.name,
    workshopDate: parseWorkshopDate(body.workshopDate),
    startTime: body.startTime,
    endTime: body.endTime,
    mode: body.mode,
    modeOther: body.mode === 'other' ? (body.modeOther || '').trim() : '',
    meetingLink: body.mode === 'online' ? (body.meetingLink || '').trim() : '',
    location: body.mode === 'offline' ? (body.location || '').trim() : '',
    isFree,
    price: isFree ? 0 : Number(body.price || 0),
    maxStudents: body.maxStudents,
    imageUrl: (body.imageUrl || '').trim(),
    status: 'pending',
    adminRemark: '',
  };
}

async function findWorkshopOrThrow(id) {
  const item = await Workshop.findById(id);
  if (!item) throw ApiError.notFound('Workshop not found');
  return item;
}

/** POST /workshops/request — teacher creates workshop request */
export const requestWorkshop = asyncHandler(async (req, res) => {
  assertFutureWorkshop(req.body);
  const teacher = await User.findById(req.user.id);
  if (!teacher) throw ApiError.notFound('User not found');

  const item = await Workshop.create(buildWorkshopPayload(req.body, teacher));
  ApiResponse.created(res, shapeWorkshop(item, req), 'Workshop request submitted for admin approval');
});

/** GET /workshops/my-workshops — teacher's own workshops */
export const myWorkshops = asyncHandler(async (req, res) => {
  const items = await Workshop.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
  ApiResponse.ok(res, { items: items.map((w) => shapeWorkshop(w, req)) }, 'Your workshops fetched');
});

/** GET /workshops — public approved upcoming workshops */
export const listPublic = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { status: 'approved' };
  if (req.query.category) filter.category = new RegExp(`^${req.query.category}$`, 'i');
  if (req.query.mode) filter.mode = req.query.mode;
  if (req.query.pricing === 'free') filter.isFree = true;
  if (req.query.pricing === 'paid') filter.isFree = false;

  const all = await Workshop.find(filter).sort({ workshopDate: 1, startTime: 1 });
  const upcoming = all.filter((w) => isWorkshopUpcoming(w));
  const total = upcoming.length;
  const items = upcoming.slice(skip, skip + limit).map((w) => shapeWorkshop(w, req));

  ApiResponse.ok(
    res,
    { items, pagination: paginationMeta(page, limit, total) },
    'Workshops fetched',
  );
});

/** GET /workshops/:id — public detail (approved) or owner/admin preview */
export const getById = asyncHandler(async (req, res) => {
  const item = await findWorkshopOrThrow(req.params.id);
  const isOwner = item.teacherId.toString() === req.user?.id;
  const isAdmin = req.user?.role === 'admin';

  if (item.status !== 'approved' && !isOwner && !isAdmin) {
    throw ApiError.notFound('Workshop not found');
  }

  let registered = false;
  if (req.user?.role === 'student') {
    registered = Boolean(
      await WorkshopRegistration.findOne({ workshopId: item._id, userId: req.user.id }),
    );
  }

  const shaped = shapeWorkshop(item, req, { registered });
  if (item.mode === 'online' && !registered && !isOwner && !isAdmin) {
    shaped.meetingLink = '';
  }

  ApiResponse.ok(res, shaped, 'Workshop fetched');
});

/** POST /workshops/:id/register — student registers */
export const register = asyncHandler(async (req, res) => {
  const item = await findWorkshopOrThrow(req.params.id);

  if (item.status !== 'approved') {
    throw ApiError.badRequest('This workshop is not open for registration');
  }
  if (!isWorkshopUpcoming(item)) {
    throw ApiError.badRequest('This workshop has already ended');
  }
  if (item.enrolledStudents >= item.maxStudents) {
    throw ApiError.conflict('This workshop is full');
  }

  const student = await User.findById(req.user.id);
  if (!student) throw ApiError.notFound('User not found');

  const existing = await WorkshopRegistration.findOne({
    workshopId: item._id,
    userId: req.user.id,
  });
  if (existing) {
    throw ApiError.conflict('You are already registered for this workshop');
  }

  await WorkshopRegistration.create({
    workshopId: item._id,
    userId: req.user.id,
    studentName: student.name,
    studentEmail: student.email,
  });

  item.enrolledStudents += 1;
  await item.save();

  ApiResponse.created(
    res,
    {
      workshopId: String(item._id),
      registered: true,
      enrolledStudents: item.enrolledStudents,
      spotsLeft: Math.max(0, item.maxStudents - item.enrolledStudents),
    },
    'Registered for workshop successfully',
  );
});

/** GET /admin/workshops — admin list with filters */
export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Workshop.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Workshop.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    {
      items: items.map((w) => shapeWorkshop(w, req)),
      pagination: paginationMeta(page, limit, total),
    },
    'Workshop requests fetched',
  );
});

/** GET /admin/workshops/:id — admin detail */
export const adminGetById = asyncHandler(async (req, res) => {
  const item = await findWorkshopOrThrow(req.params.id);
  const registrations = await WorkshopRegistration.find({ workshopId: item._id })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(100);

  ApiResponse.ok(
    res,
    {
      ...shapeWorkshop(item, req),
      registrations: registrations.map((r) => ({
        id: String(r._id),
        studentName: r.studentName || r.userId?.name,
        studentEmail: r.studentEmail || r.userId?.email,
        registeredAt: r.createdAt,
      })),
    },
    'Workshop detail fetched',
  );
});

/** PATCH /admin/workshops/:id/approve */
export const adminApprove = asyncHandler(async (req, res) => {
  const item = await findWorkshopOrThrow(req.params.id);
  if (item.status === 'rejected') {
    throw ApiError.badRequest('Rejected workshops cannot be approved — teacher must submit a new request');
  }
  if (!isWorkshopUpcoming(item)) {
    throw ApiError.badRequest('Cannot approve a workshop that has already ended');
  }

  item.status = 'approved';
  item.adminRemark = '';
  await item.save();

  ApiResponse.ok(res, shapeWorkshop(item, req), 'Workshop approved');
});

/** PATCH /admin/workshops/:id/reject */
export const adminReject = asyncHandler(async (req, res) => {
  const item = await findWorkshopOrThrow(req.params.id);
  if (item.status === 'approved') {
    throw ApiError.badRequest('Use status update to deactivate an approved workshop');
  }

  item.status = 'rejected';
  item.adminRemark = req.body.adminRemark.trim();
  await item.save();

  ApiResponse.ok(res, shapeWorkshop(item, req), 'Workshop rejected');
});

/** PATCH /admin/workshops/:id/status — active/inactive toggle for approved workshops */
export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const item = await findWorkshopOrThrow(req.params.id);
  const { status } = req.body;

  if (status === 'approved') {
    if (item.status !== 'inactive' && item.status !== 'approved') {
      throw ApiError.badRequest('Only inactive or approved workshops can be marked active');
    }
    if (!isWorkshopUpcoming(item)) {
      throw ApiError.badRequest('Cannot activate a workshop that has already ended');
    }
    item.status = 'approved';
  } else if (status === 'inactive') {
    if (item.status !== 'approved' && item.status !== 'inactive') {
      throw ApiError.badRequest('Only approved workshops can be marked inactive');
    }
    item.status = 'inactive';
  }

  await item.save();
  ApiResponse.ok(res, shapeWorkshop(item, req), 'Workshop status updated');
});
