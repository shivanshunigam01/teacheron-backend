import Notification from '../models/Notification.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';

async function fetchNotifications(req, userId) {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (userId) filter.userId = userId;
  else if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.read === 'true') filter.read = true;
  if (req.query.read === 'false') filter.read = false;

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort(sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
  ]);
  return { items: toJSONList(items), pagination: paginationMeta(total, page, limit) };
}

export const listMine = asyncHandler(async (req, res) => {
  const data = await fetchNotifications(req, req.user.id);
  ApiResponse.ok(res, data, 'Notifications fetched');
});

export const list = asyncHandler(async (req, res) => {
  const data = await fetchNotifications(req, req.user?.id || null);
  ApiResponse.ok(res, data, 'Fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const item = await Notification.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  if (req.user && String(item.userId) !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  ApiResponse.ok(res, toJSON(item), 'Fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  const title = String(req.body.title || req.body.subject || '').trim();
  const body = String(req.body.body || '').trim();
  if (!title) throw ApiError.badRequest('Title required');
  if (!body) throw ApiError.badRequest('Body required');

  const type = ['course', 'booking', 'certificate', 'system', 'promo'].includes(req.body.type)
    ? req.body.type
    : 'system';
  const link = req.body.link ? String(req.body.link).slice(0, 500) : undefined;

  // Admin broadcast by audience → one notification per matching user
  const audience = String(req.body.audience || '').toLowerCase();
  if (req.user?.role === 'admin' && audience && audience !== 'self') {
    const User = (await import('../models/User.model.js')).default;
    const roleFilter =
      audience === 'all'
        ? { role: { $in: ['student', 'teacher', 'parent', 'admin'] } }
        : audience === 'students'
          ? { role: 'student' }
          : audience === 'teachers'
            ? { role: 'teacher' }
            : audience === 'parents'
              ? { role: 'parent' }
              : audience === 'admins'
                ? { role: 'admin' }
                : null;

    if (!roleFilter) throw ApiError.badRequest('Invalid audience');

    const users = await User.find({ ...roleFilter, isActive: { $ne: false } })
      .select('_id')
      .limit(5000)
      .lean();

    if (!users.length) {
      ApiResponse.created(res, { created: 0, items: [] }, 'No recipients');
      return;
    }

    const docs = users.map((u) => ({
      userId: u._id,
      title,
      body,
      type,
      link,
      read: false,
      metadata: { audience, sentBy: req.user.id },
    }));
    const inserted = await Notification.insertMany(docs);
    ApiResponse.created(
      res,
      { created: inserted.length, audience, sample: toJSON(inserted[0]) },
      `Notification sent to ${inserted.length} users`,
    );
    return;
  }

  const item = await Notification.create({
    title,
    body,
    type,
    link,
    userId: req.body.userId || req.user?.id,
    metadata: req.body.metadata,
  });
  ApiResponse.created(res, toJSON(item), 'Created successfully');
});

export const update = asyncHandler(async (req, res) => {
  const existing = await Notification.findById(req.params.id);
  if (!existing) throw ApiError.notFound();
  if (String(existing.userId) !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  const item = await Notification.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  ApiResponse.ok(res, toJSON(item), 'Updated successfully');
});

export const markRead = asyncHandler(async (req, res) => {
  const existing = await Notification.findById(req.params.id);
  if (!existing) throw ApiError.notFound();
  if (String(existing.userId) !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  existing.read = true;
  await existing.save();
  ApiResponse.ok(res, toJSON(existing), 'Marked as read');
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await Notification.findById(req.params.id);
  if (!existing) throw ApiError.notFound();
  if (String(existing.userId) !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  await Notification.findByIdAndDelete(req.params.id);
  ApiResponse.ok(res, {}, 'Deleted successfully');
});
