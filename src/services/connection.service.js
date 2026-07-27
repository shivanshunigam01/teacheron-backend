import ConnectionRequest, {
  MAX_LIMITED_LEARNER_MESSAGES,
} from '../models/ConnectionRequest.model.js';
import Conversation from '../models/Conversation.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { toJSON } from '../utils/serialize.js';
import { sendConnectionRequestEmail, sendConnectionApprovedEmails } from './connectionEmail.service.js';
import Notification from '../models/Notification.model.js';
import logger from '../config/logger.js';

export { MAX_LIMITED_LEARNER_MESSAGES };

async function notifyUser({ userId, title, body, type = 'booking', link }) {
  try {
    if (!userId) return;
    await Notification.create({
      userId,
      title,
      body,
      type,
      link,
      read: false,
    });
  } catch (err) {
    logger.warn(`[connection-notify] failed: ${err.message}`);
  }
}

export function maskTeacherPhone(user) {
  if (!user || typeof user !== 'object') return null;

  const ccRaw = String(user.phoneCountryCode || '').trim().replace(/\s+/g, '');
  const phoneDigits = String(user.phone || '').replace(/\D/g, '');
  const e164Digits = String(user.phoneE164 || '').replace(/\D/g, '');

  if (!phoneDigits && !e164Digits) return null;

  let cc = ccRaw || '+91';
  if (!cc.startsWith('+')) cc = `+${cc}`;

  const ccDigits = cc.replace(/\D/g, '');
  let nationalLen = phoneDigits.length;
  if (!nationalLen && e164Digits) {
    nationalLen = e164Digits.startsWith(ccDigits)
      ? e164Digits.length - ccDigits.length
      : Math.max(0, e164Digits.length - 2);
  }
  if (nationalLen < 6) nationalLen = 10;

  return `${cc}-${'*'.repeat(nationalLen)}`;
}

export function formatTeacherPhone(user) {
  if (!user?.phone?.trim()) return null;
  return [user.phoneCountryCode, user.phone].filter(Boolean).join(' ').trim();
}

export function isFullyConnected(conn) {
  return conn?.status === 'connected';
}

export function isMessagingLimited(conn) {
  return !conn || conn.status !== 'connected';
}

export function learnerMessagesRemaining(conn) {
  if (!isMessagingLimited(conn)) return Infinity;
  const used = Number(conn.learnerMessageCount || 0);
  return Math.max(0, MAX_LIMITED_LEARNER_MESSAGES - used);
}

function teacherRate(teacher) {
  const p = teacher?.teacherProfile || {};
  const amount = Number(p.hourlyRate ?? 0) || 0;
  const currency = p.currency || 'INR';
  return { amount, currency };
}

/**
 * Create or return existing student/parent → teacher connection.
 * On first create: email teacher + ensure conversation exists.
 */
export async function ensureConnection(learnerUser, teacherId, { source = 'message', initialMessage = '' } = {}) {
  if (!['student', 'parent'].includes(learnerUser.role)) {
    throw ApiError.forbidden('Only students and parents can request tutor connections');
  }
  if (String(teacherId) === String(learnerUser.id || learnerUser._id)) {
    throw ApiError.badRequest('Cannot connect with yourself');
  }

  const teacher = await User.findOne({
    _id: teacherId,
    role: 'teacher',
    isActive: { $ne: false },
  });
  if (!teacher) throw ApiError.notFound('Tutor not found');

  let conn = await ConnectionRequest.findOne({
    learnerId: learnerUser.id || learnerUser._id,
    teacherId: teacher._id,
  });

  let created = false;
  let emailSent = false;

  if (!conn) {
    let conversation = await Conversation.findOne({
      participants: { $all: [learnerUser.id || learnerUser._id, teacher._id], $size: 2 },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [learnerUser.id || learnerUser._id, teacher._id],
        lastMessage: '',
      });
    }

    const rate = teacherRate(teacher);
    conn = await ConnectionRequest.create({
      learnerId: learnerUser.id || learnerUser._id,
      learnerRole: learnerUser.role,
      learnerName: learnerUser.name,
      learnerEmail: learnerUser.email,
      teacherId: teacher._id,
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      conversationId: conversation._id,
      status: 'pending',
      source,
      initialMessage: String(initialMessage || '').trim().slice(0, 2000),
      amount: rate.amount,
      currency: rate.currency,
    });
    created = true;

    const mail = await sendConnectionRequestEmail({
      teacherEmail: teacher.email,
      teacherName: teacher.name,
      learnerName: learnerUser.name,
      learnerRole: learnerUser.role,
      source,
    });
    emailSent = Boolean(mail.sent);

    await notifyUser({
      userId: teacher._id,
      title: 'New connection request',
      body: `${learnerUser.name || 'A learner'} wants to ${source === 'hire' ? 'hire you' : source === 'call' ? 'get your number' : 'message you'}. Review is with admin; they can send up to 2 messages for now.`,
      type: 'booking',
      link: '/teacher#connections',
    });
  } else if (!conn.conversationId) {
    let conversation = await Conversation.findOne({
      participants: { $all: [conn.learnerId, conn.teacherId], $size: 2 },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [conn.learnerId, conn.teacherId],
        lastMessage: '',
      });
    }
    conn.conversationId = conversation._id;
    await conn.save();
  }

  return { conn, teacher, created, emailSent };
}

export function shapeConnection(doc, { viewerRole, teacherUser } = {}) {
  const c = toJSON(doc);
  const unlocked = isFullyConnected(doc);
  const limited = isMessagingLimited(doc);
  const remaining = learnerMessagesRemaining(doc);

  let phoneMasked = null;
  let phoneFull = null;
  if (teacherUser) {
    phoneMasked = maskTeacherPhone(teacherUser);
    if (unlocked) phoneFull = formatTeacherPhone(teacherUser);
  }

  return {
    id: c.id,
    learnerId: c.learnerId?.toString?.() || c.learnerId,
    learnerRole: c.learnerRole,
    learnerName: c.learnerName,
    learnerEmail: viewerRole === 'admin' || viewerRole === 'teacher' ? c.learnerEmail : undefined,
    teacherId: c.teacherId?.toString?.() || c.teacherId,
    teacherName: c.teacherName,
    teacherEmail: unlocked || viewerRole === 'admin' ? c.teacherEmail : undefined,
    conversationId: c.conversationId?.toString?.() || c.conversationId || null,
    status: c.status,
    source: c.source,
    initialMessage: c.initialMessage || '',
    adminRemark: c.adminRemark || '',
    reviewedAt: c.reviewedAt,
    amount: c.amount,
    currency: c.currency,
    learnerMessageCount: c.learnerMessageCount || 0,
    maxLimitedMessages: MAX_LIMITED_LEARNER_MESSAGES,
    messagesRemaining: Number.isFinite(remaining) ? remaining : null,
    messagingLimited: limited,
    contactUnlocked: unlocked,
    phoneMasked,
    phone: phoneFull,
    paymentId: c.paymentId?.toString?.() || c.paymentId || null,
    paidAt: c.paidAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function buildAdminConnectionFilter(query = {}) {
  const filter = {};
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.q?.trim()) {
    const q = query.q.trim();
    filter.$or = [
      { learnerName: new RegExp(q, 'i') },
      { teacherName: new RegExp(q, 'i') },
      { learnerEmail: new RegExp(q, 'i') },
      { teacherEmail: new RegExp(q, 'i') },
      { initialMessage: new RegExp(q, 'i') },
    ];
  }
  return filter;
}

export async function approveConnection(id, adminUser, adminRemark = '') {
  const conn = await ConnectionRequest.findById(id);
  if (!conn) throw ApiError.notFound('Connection request not found');

  if (conn.status === 'connected') {
    return { conn, alreadyApproved: true, email: { teacherSent: false, learnerSent: false } };
  }
  if (conn.status === 'rejected') {
    throw ApiError.badRequest('Rejected requests cannot be approved — ask the learner to re-request');
  }

  const alreadyApproved = conn.status === 'approved';
  if (!alreadyApproved) {
    conn.status = 'approved';
    conn.adminRemark = adminRemark || conn.adminRemark || '';
    conn.reviewedAt = new Date();
    conn.reviewedBy = adminUser.id;
    await conn.save();
  }

  let email = { teacherSent: false, learnerSent: false };
  if (!alreadyApproved) {
    email = await sendConnectionApprovedEmails({
      teacherEmail: conn.teacherEmail,
      teacherName: conn.teacherName,
      learnerEmail: conn.learnerEmail,
      learnerName: conn.learnerName,
      amount: conn.amount,
      currency: conn.currency,
      teacherId: conn.teacherId.toString(),
    });

    await notifyUser({
      userId: conn.teacherId,
      title: 'Connection approved',
      body: `Admin approved the request from ${conn.learnerName || 'a learner'}. Full contact unlocks after they pay.`,
      type: 'booking',
      link: '/teacher#connections',
    });
    await notifyUser({
      userId: conn.learnerId,
      title: 'Tutor connection approved',
      body: `Your request to connect with ${conn.teacherName || 'the tutor'} was approved. Pay to unlock unlimited chat and their phone number.`,
      type: 'booking',
      link: `/tutors/${conn.teacherId}`,
    });
  }

  return { conn, alreadyApproved, email };
}

export async function rejectConnection(id, adminUser, adminRemark) {
  const conn = await ConnectionRequest.findById(id);
  if (!conn) throw ApiError.notFound('Connection request not found');
  if (conn.status === 'connected') {
    throw ApiError.badRequest('Cannot reject a paid connection');
  }

  conn.status = 'rejected';
  conn.adminRemark = adminRemark;
  conn.reviewedAt = new Date();
  conn.reviewedBy = adminUser.id;
  await conn.save();
  return conn;
}

/** Mark connection fully unlocked after successful payment. */
export async function unlockConnectionAfterPayment({
  learnerId,
  teacherId,
  connectionId,
  paymentId,
}) {
  let conn = null;
  if (connectionId) {
    conn = await ConnectionRequest.findById(connectionId);
  }
  if (!conn && learnerId && teacherId) {
    conn = await ConnectionRequest.findOne({ learnerId, teacherId });
  }
  if (!conn) return null;
  if (String(conn.learnerId) !== String(learnerId)) return null;

  conn.status = 'connected';
  conn.paymentId = paymentId;
  conn.paidAt = new Date();
  await conn.save();
  return conn;
}

export async function findConnectionBetween(learnerId, teacherId) {
  return ConnectionRequest.findOne({ learnerId, teacherId });
}

export async function findConnectionByConversation(conversationId) {
  return ConnectionRequest.findOne({ conversationId });
}
