import ConnectionRequest from '../models/ConnectionRequest.model.js';
import Message from '../models/Message.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import {
  approveConnection,
  buildAdminConnectionFilter,
  ensureConnection,
  findConnectionBetween,
  rejectConnection,
  shapeConnection,
} from '../services/connection.service.js';

async function loadTeacherForShape(teacherId) {
  return User.findById(teacherId).select(
    'name email phone phoneCountryCode phoneE164 teacherProfile.hourlyRate teacherProfile.currency',
  );
}

export const createOrGet = asyncHandler(async (req, res) => {
  const { teacherId, source, initialMessage } = req.body;
  const { conn, created, emailSent } = await ensureConnection(req.user, teacherId, {
    source: source || 'message',
    initialMessage,
  });
  const teacher = await loadTeacherForShape(conn.teacherId);
  ApiResponse.ok(
    res,
    { ...shapeConnection(conn, { viewerRole: req.user.role, teacherUser: teacher }), created, emailSent },
    created ? 'Connection request submitted' : 'Connection already exists',
  );
});

export const listMine = asyncHandler(async (req, res) => {
  const role = req.user.role;
  let filter;
  if (role === 'teacher') {
    filter = { teacherId: req.user.id };
  } else if (role === 'student' || role === 'parent') {
    filter = { learnerId: req.user.id };
  } else {
    throw ApiError.forbidden();
  }

  const items = await ConnectionRequest.find(filter).sort({ updatedAt: -1 }).limit(100);
  const teacherIds = [...new Set(items.map((i) => String(i.teacherId)))];
  const teachers = await User.find({ _id: { $in: teacherIds } }).select(
    'name email phone phoneCountryCode phoneE164',
  );
  const byId = Object.fromEntries(teachers.map((t) => [String(t._id), t]));

  ApiResponse.ok(
    res,
    {
      items: items.map((c) =>
        shapeConnection(c, { viewerRole: role, teacherUser: byId[String(c.teacherId)] }),
      ),
    },
    'Connections fetched',
  );
});

export const getById = asyncHandler(async (req, res) => {
  const conn = await ConnectionRequest.findById(req.params.id);
  if (!conn) throw ApiError.notFound();

  const uid = String(req.user.id);
  const isParty =
    uid === String(conn.learnerId) || uid === String(conn.teacherId) || req.user.role === 'admin';
  if (!isParty) throw ApiError.forbidden();

  const teacher = await loadTeacherForShape(conn.teacherId);
  ApiResponse.ok(
    res,
    shapeConnection(conn, { viewerRole: req.user.role, teacherUser: teacher }),
    'Connection fetched',
  );
});

export const getByTeacher = asyncHandler(async (req, res) => {
  if (!['student', 'parent'].includes(req.user.role)) {
    throw ApiError.forbidden();
  }
  const conn = await findConnectionBetween(req.user.id, req.params.teacherId);
  if (!conn) {
    ApiResponse.ok(res, null, 'No connection yet');
    return;
  }
  const teacher = await loadTeacherForShape(conn.teacherId);
  ApiResponse.ok(
    res,
    shapeConnection(conn, { viewerRole: req.user.role, teacherUser: teacher }),
    'Connection fetched',
  );
});

export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildAdminConnectionFilter(req.query);

  const [items, total] = await Promise.all([
    ConnectionRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ConnectionRequest.countDocuments(filter),
  ]);

  const teacherIds = [...new Set(items.map((i) => String(i.teacherId)))];
  const teachers = await User.find({ _id: { $in: teacherIds } }).select(
    'name email phone phoneCountryCode phoneE164',
  );
  const byId = Object.fromEntries(teachers.map((t) => [String(t._id), t]));

  ApiResponse.ok(
    res,
    {
      items: items.map((c) =>
        shapeConnection(c, { viewerRole: 'admin', teacherUser: byId[String(c.teacherId)] }),
      ),
      pagination: paginationMeta(total, page, limit),
    },
    'Connection requests fetched',
  );
});

export const adminGetById = asyncHandler(async (req, res) => {
  const conn = await ConnectionRequest.findById(req.params.id);
  if (!conn) throw ApiError.notFound();
  const teacher = await loadTeacherForShape(conn.teacherId);

  let messages = [];
  if (conn.conversationId) {
    messages = await Message.find({ conversationId: conn.conversationId })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    messages = messages.map((m) => ({
      id: String(m._id),
      senderId: String(m.senderId),
      text: m.text || '',
      createdAt: m.createdAt,
    }));
  }

  ApiResponse.ok(
    res,
    {
      ...shapeConnection(conn, { viewerRole: 'admin', teacherUser: teacher }),
      messages,
    },
    'Connection fetched',
  );
});

export const adminApprove = asyncHandler(async (req, res) => {
  const { conn, alreadyApproved, email } = await approveConnection(
    req.params.id,
    req.user,
    req.body.adminRemark,
  );
  const teacher = await loadTeacherForShape(conn.teacherId);
  ApiResponse.ok(
    res,
    {
      ...shapeConnection(conn, { viewerRole: 'admin', teacherUser: teacher }),
      emailSent: email.teacherSent || email.learnerSent,
      teacherEmailSent: email.teacherSent,
      learnerEmailSent: email.learnerSent,
    },
    alreadyApproved ? 'Already approved' : 'Connection approved — both parties emailed',
  );
});

export const adminReject = asyncHandler(async (req, res) => {
  const conn = await rejectConnection(req.params.id, req.user, req.body.adminRemark);
  const teacher = await loadTeacherForShape(conn.teacherId);
  ApiResponse.ok(
    res,
    shapeConnection(conn, { viewerRole: 'admin', teacherUser: teacher }),
    'Connection rejected',
  );
});
