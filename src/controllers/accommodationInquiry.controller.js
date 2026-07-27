import AccommodationInquiry from '../models/AccommodationInquiry.model.js';
import User from '../models/User.model.js';
import Notification from '../models/Notification.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';
import logger from '../config/logger.js';
import {
  sendAccommodationEnquiryOpenedEmail,
  sendAccommodationEnquiryReplyEmail,
} from '../services/accommodationEnquiryEmail.service.js';

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

function learnerAuthorRole(role) {
  if (role === 'teacher') return 'teacher';
  if (role === 'parent') return 'parent';
  return 'student';
}

function dashboardAccommodationPath(role) {
  if (role === 'parent') return '/parent#accommodation';
  if (role === 'teacher') return '/teacher#accommodation';
  return '/student#accommodation';
}

async function loadUserProfile(userId) {
  return User.findById(userId).select('name email phone role').lean();
}

async function notifyUser({ userId, title, body, type = 'system', link }) {
  try {
    if (!userId) return;
    await Notification.create({ userId, title, body, type, link, read: false });
  } catch (err) {
    logger.warn(`[accommodation-notify] failed: ${err.message}`);
  }
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
  const authorRole = learnerAuthorRole(req.user.role);

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

    // First message → email admin + in-app notify admins
    void sendAccommodationEnquiryOpenedEmail({
      learnerName: profile?.name || req.user.name,
      learnerRole: profile?.role || req.user.role,
      learnerEmail: profile?.email,
      learnerPhone: profile?.phone,
      accommodationName: thread.accommodationName,
      city: thread.city,
      country: thread.country,
      message: body.trim(),
    });

    try {
      const admins = await User.find({ role: 'admin', isActive: { $ne: false } })
        .select('_id')
        .limit(50)
        .lean();
      await Promise.all(
        admins.map((a) =>
          notifyUser({
            userId: a._id,
            title: 'New accommodation enquiry',
            body: `${profile?.name || 'A learner'} asked about ${thread.accommodationName || 'a listing'}.`,
            type: 'system',
            link: '/admin#inquiries',
          }),
        ),
      );
    } catch (err) {
      logger.warn(`[accommodation-notify] admin fanout failed: ${err.message}`);
    }

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

  const replyBody = String(req.body.body || '').trim();
  const msg = buildMessage(req.user.id, 'admin', replyBody);
  thread.messages.push(msg);
  thread.message = replyBody;
  if (thread.status === 'new') thread.status = 'contacted';
  await thread.save();

  // Email + in-app notify the student/parent so the reply is visible in their account inbox too
  let learnerRole = 'student';
  if (thread.userId) {
    const learner = await User.findById(thread.userId).select('name email role').lean();
    learnerRole = learner?.role || 'student';
    const toEmail = thread.email || learner?.email;
    const learnerName = thread.studentName || learner?.name;

    void sendAccommodationEnquiryReplyEmail({
      learnerEmail: toEmail,
      learnerName,
      learnerRole,
      accommodationName: thread.accommodationName,
      replyBody,
    });

    await notifyUser({
      userId: thread.userId,
      title: 'Reply on your accommodation enquiry',
      body: `TeacherPoint replied about ${thread.accommodationName || 'your listing'}: ${replyBody.slice(0, 120)}`,
      type: 'system',
      link: dashboardAccommodationPath(learnerRole),
    });
  }

  ApiResponse.ok(
    res,
    { ...toJSON(thread), emailQueued: true },
    'Reply sent — learner will see it in their dashboard and email',
  );
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
