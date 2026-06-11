import Subject from '../models/Subject.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { isActive: true };

  if (req.query.group) filter.group = req.query.group;
  if (req.query.popular === 'true') filter.isPopular = true;

  const q = String(req.query.q ?? '').trim();
  let sort = { sortOrder: 1, name: 1 };

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { aliases: regex }];
    sort = { isPopular: -1, sortOrder: 1, name: 1 };
  }

  const [items, total] = await Promise.all([
    Subject.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Subject.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    { items: toJSONList(items), pagination: paginationMeta(total, page, limit) },
    'Subjects fetched',
  );
});

export const popular = asyncHandler(async (req, res) => {
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const items = await Subject.find({ isActive: true, isPopular: true })
    .sort({ sortOrder: 1, name: 1 })
    .limit(limit)
    .lean();

  ApiResponse.ok(res, { items: toJSONList(items) }, 'Popular subjects fetched');
});

export const getBySlug = asyncHandler(async (req, res) => {
  const item = await Subject.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!item) throw ApiError.notFound('Subject not found');
  ApiResponse.ok(res, toJSON(item), 'Subject fetched');
});

export const create = asyncHandler(async (req, res) => {
  const item = await Subject.create(req.body);
  ApiResponse.created(res, toJSON(item), 'Subject created');
});

export const update = asyncHandler(async (req, res) => {
  const item = await Subject.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, toJSON(item), 'Subject updated');
});

export const remove = asyncHandler(async (req, res) => {
  const item = await Subject.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, {}, 'Subject deleted');
});
