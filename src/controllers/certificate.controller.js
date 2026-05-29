import Certificate from '../models/Certificate.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';

function shapeCertificate(doc) {
  const c = toJSON(doc);
  return {
    id: c.id,
    enrollmentId: c.enrollmentId?.toString?.() || c.enrollmentId,
    courseId: c.courseId?.toString?.() || c.courseId,
    studentName: c.studentName,
    courseTitle: c.courseTitle,
    instructor: c.instructorName,
    serial: c.certificateNumber,
    issuedAt: c.issuedAt,
  };
}

export const mine = asyncHandler(async (req, res) => {
  const items = await Certificate.find({ userId: req.user.id }).sort({ issuedAt: -1 });
  ApiResponse.ok(res, { items: items.map(shapeCertificate) }, 'Certificates fetched');
});

export const getByNumber = asyncHandler(async (req, res) => {
  const item = await Certificate.findOne({ certificateNumber: req.params.serial });
  if (!item) throw ApiError.notFound('Certificate not found');
  ApiResponse.ok(res, shapeCertificate(item), 'Certificate verified');
});

export const getById = asyncHandler(async (req, res) => {
  const item = await Certificate.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  if (item.userId.toString() !== req.user?.id && req.user?.role !== 'admin') {
    throw ApiError.forbidden();
  }
  ApiResponse.ok(res, shapeCertificate(item), 'Certificate fetched');
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.courseId) filter.courseId = req.query.courseId;
  const [items, total] = await Promise.all([
    Certificate.find(filter).sort(sort).skip(skip).limit(limit),
    Certificate.countDocuments(filter),
  ]);
  ApiResponse.ok(
    res,
    { items: items.map(shapeCertificate), pagination: paginationMeta(total, page, limit) },
    'Certificates fetched',
  );
});
