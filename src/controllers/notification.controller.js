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
  const item = await Notification.create({
    ...req.body,
    userId: req.body.userId || req.user?.id,
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
