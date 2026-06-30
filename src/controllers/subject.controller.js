import Subject from '../models/Subject.model.js';
import { slugify } from '../data/subjects.catalog.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';
import { isValidSubjectName, normalizeSubjectName } from '../utils/subjectName.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildListFilter(query, { admin = false } = {}) {
  const filter = admin ? {} : { isActive: true };

  if (query.group) filter.group = query.group;
  if (query.popular === 'true') filter.isPopular = true;
  if (query.popular === 'false') filter.isPopular = false;

  if (admin) {
    if (query.status === 'active') filter.isActive = true;
    if (query.status === 'inactive') filter.isActive = false;
  }

  const q = String(query.q ?? '').trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { aliases: regex }, { slug: regex }];
  }

  return { q, filter };
}

async function findSubjectByName(name) {
  const normalized = normalizeSubjectName(name);
  const slug = slugify(normalized);
  const regex = new RegExp(`^${escapeRegex(normalized)}$`, 'i');

  return Subject.findOne({
    $or: [{ slug }, { name: regex }, { aliases: regex }],
  });
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { q, filter } = buildListFilter(req.query);
  let sort = { sortOrder: 1, name: 1 };

  if (q) sort = { isPopular: -1, sortOrder: 1, name: 1 };

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

/** Public: add a user-entered subject when the name looks valid (not keyboard mash). */
export const ensure = asyncHandler(async (req, res) => {
  const name = normalizeSubjectName(req.body.name);
  if (!isValidSubjectName(name)) {
    throw ApiError.badRequest('Please enter a valid subject or skill name');
  }

  const existing = await findSubjectByName(name);
  if (existing) {
    ApiResponse.ok(res, toJSON(existing), 'Subject found');
    return;
  }

  const slug = slugify(name);
  const slugTaken = await Subject.findOne({ slug }).lean();
  if (slugTaken) {
    ApiResponse.ok(res, toJSON(slugTaken), 'Subject found');
    return;
  }

  const item = await Subject.create({
    name,
    slug,
    group: 'other',
    aliases: [],
    isPopular: false,
    sortOrder: 9000,
    isActive: true,
  });

  ApiResponse.created(res, toJSON(item), 'Subject added');
});

export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { q, filter } = buildListFilter(req.query, { admin: true });
  let sort = { sortOrder: 1, name: 1 };
  if (q) sort = { isPopular: -1, sortOrder: 1, name: 1 };

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

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const item = await Subject.findByIdAndUpdate(
    req.params.id,
    { isActive: req.body.isActive },
    { new: true, runValidators: true },
  );
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, toJSON(item), 'Subject status updated');
});

export const create = asyncHandler(async (req, res) => {
  const name = normalizeSubjectName(req.body.name);
  const slug = req.body.slug?.trim() || slugify(name);
  const item = await Subject.create({ ...req.body, name, slug });
  ApiResponse.created(res, toJSON(item), 'Subject created');
});

export const update = asyncHandler(async (req, res) => {
  const patch = { ...req.body };
  if (patch.name) patch.name = normalizeSubjectName(patch.name);
  if (patch.name && !patch.slug) patch.slug = slugify(patch.name);

  const item = await Subject.findByIdAndUpdate(req.params.id, patch, {
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
