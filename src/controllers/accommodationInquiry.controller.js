import AccommodationInquiry from '../models/AccommodationInquiry.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMessage(authorId, authorRole, body) {
  return {
    authorId,
    authorRole,
    body: body.trim(),
    createdAt: new Date(),
  };
}

async function loadUserProfile(userId) {
  return User.findById(userId).select('name email phone role').lean();
}

export const listMine = asyncHandler(async (req, res) => {
  const items = await AccommodationInquiry.find({ userId: req.user.id })
    .sort({ updatedAt: -1 })
    .lean();

  ApiResponse.ok(res, { items: toJSONList(items) }, 'Inquiries fetched');
});

export const getByAccommodation = asyncHandler(async (req, res) => {
  const thread = await AccommodationInquiry.findOne({
    userId: req.user.id,
    accommodationId: req.params.accommodationId,
  })
    .sort({ updatedAt: -1 })
    .lean();

  ApiResponse.ok(res, thread ? toJSON(thread) : null, 'Inquiry fetched');
});

export const sendToAccommodation = asyncHandler(async (req, res) => {
  const { accommodationId } = req.params;
  const { body, accommodationName, city, country } = req.body;
  const userId = req.user.id;
  const authorRole = req.user.role === 'teacher' ? 'teacher' : 'student';

  let thread = await AccommodationInquiry.findOne({
    userId,
    accommodationId,
    status: { $ne: 'closed' },
  });

  const msg = buildMessage(userId, authorRole, body);

  if (!thread) {
    const profile = await loadUserProfile(userId);
    thread = await AccommodationInquiry.create({
      accommodationId,
      accommodationName: accommodationName?.trim() || undefined,
      city: city?.trim() || undefined,
      country: country?.trim() || undefined,
      studentName: profile?.name,
      email: profile?.email,
      phone: profile?.phone,
      userId,
      message: body.trim(),
      messages: [msg],
      status: 'new',
    });
    ApiResponse.created(res, toJSON(thread), 'Inquiry started');
    return;
  }

  thread.messages.push(msg);
  thread.message = body.trim();
  if (accommodationName && !thread.accommodationName) thread.accommodationName = accommodationName;
  if (city && !thread.city) thread.city = city;
  if (country && !thread.country) thread.country = country;
  await thread.save();

  ApiResponse.ok(res, toJSON(thread), 'Message sent');
});

export const getById = asyncHandler(async (req, res) => {
  const thread = await AccommodationInquiry.findById(req.params.id).lean();
  if (!thread) throw ApiError.notFound();

  const isOwner = String(thread.userId) === String(req.user.id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) throw ApiError.forbidden();

  ApiResponse.ok(res, toJSON(thread), 'Inquiry fetched');
});

export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }

  const q = String(req.query.q ?? '').trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { studentName: regex },
      { email: regex },
      { accommodationName: regex },
      { message: regex },
      { city: regex },
      { country: regex },
    ];
  }

  const [items, total] = await Promise.all([
    AccommodationInquiry.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    AccommodationInquiry.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    { items: toJSONList(items), pagination: paginationMeta(total, page, limit) },
    'Inquiries fetched',
  );
});

export const adminGetById = asyncHandler(async (req, res) => {
  const thread = await AccommodationInquiry.findById(req.params.id).lean();
  if (!thread) throw ApiError.notFound();
  ApiResponse.ok(res, toJSON(thread), 'Inquiry fetched');
});

export const adminReply = asyncHandler(async (req, res) => {
  const thread = await AccommodationInquiry.findById(req.params.id);
  if (!thread) throw ApiError.notFound();

  const msg = buildMessage(req.user.id, 'admin', req.body.body);
  thread.messages.push(msg);
  thread.message = req.body.body.trim();
  if (thread.status === 'new') thread.status = 'contacted';
  await thread.save();

  ApiResponse.ok(res, toJSON(thread), 'Reply sent');
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const thread = await AccommodationInquiry.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true },
  );
  if (!thread) throw ApiError.notFound();
  ApiResponse.ok(res, toJSON(thread), 'Status updated');
});
