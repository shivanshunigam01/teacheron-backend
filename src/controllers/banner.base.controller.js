import Banner from '../models/Banner.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';

function normalizePayload(body) {
  const data = { ...body };
  if (data.targetType === 'global') data.targetValue = '';
  if (data.imageUrl === '') data.imageUrl = undefined;
  if (data.videoUrl === '') data.videoUrl = undefined;
  if (data.language === 'any' || data.language === '') data.language = '';
  return data;
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.q) {
    const q = String(req.query.q).trim();
    filter.$or = [
      { title: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { targetValue: new RegExp(q, 'i') },
    ];
  }
  for (const k of ['targetType', 'mediaType', 'placement']) {
    if (req.query[k]) filter[k] = req.query[k];
  }
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';

  const [items, total] = await Promise.all([
    Banner.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit),
    Banner.countDocuments(filter),
  ]);
  ApiResponse.ok(
    res,
    { items: toJSONList(items), pagination: paginationMeta(total, page, limit) },
    'Banners fetched',
  );
});

export const getById = asyncHandler(async (req, res) => {
  const item = await Banner.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, toJSON(item), 'Banner fetched');
});

export const create = asyncHandler(async (req, res) => {
  const item = await Banner.create({
    ...normalizePayload(req.body),
    createdBy: req.user?.id,
  });
  ApiResponse.created(res, toJSON(item), 'Banner created');
});

export const update = asyncHandler(async (req, res) => {
  const item = await Banner.findByIdAndUpdate(req.params.id, normalizePayload(req.body), {
    new: true,
    runValidators: true,
  });
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, toJSON(item), 'Banner updated');
});

export const remove = asyncHandler(async (req, res) => {
  const item = await Banner.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, {}, 'Banner deleted');
});
