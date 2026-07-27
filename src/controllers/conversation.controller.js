import mongoose from 'mongoose';
import Conversation from '../models/Conversation.model.js';
import Message from '../models/Message.model.js';
import User from '../models/User.model.js';
import ConnectionRequest from '../models/ConnectionRequest.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON } from '../utils/serialize.js';
import {
  ensureConnection,
  findConnectionByConversation,
  isMessagingLimited,
  learnerMessagesRemaining,
  MAX_LIMITED_LEARNER_MESSAGES,
  shapeConnection,
} from '../services/connection.service.js';

function shapeParticipant(user) {
  if (!user) return null;
  const o = user.toObject ? user.toObject() : user;
  const p = o.teacherProfile || {};
  return {
    id: o._id?.toString?.() || o.id,
    name: o.name || 'User',
    role: o.role,
    avatarUrl: o.avatarUrl || p.profilePhoto || '',
    subject: (p.subjects && p.subjects[0]) || p.speciality || '',
  };
}

function shapeConversation(doc, currentUserId, connection = null) {
  const c = toJSON(doc);
  const participants = (doc.participants || []).map(shapeParticipant).filter(Boolean);
  const other = participants.find((p) => p.id !== String(currentUserId)) || participants[0] || null;
  const shaped = {
    id: c.id,
    participants,
    other,
    lastMessage: c.lastMessage || '',
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  };
  if (connection) {
    shaped.connection = shapeConnection(connection, { viewerRole: null });
    shaped.messagingLimited = isMessagingLimited(connection);
    shaped.messagesRemaining = learnerMessagesRemaining(connection);
    shaped.maxLimitedMessages = MAX_LIMITED_LEARNER_MESSAGES;
    shaped.contactUnlocked = connection.status === 'connected';
    shaped.connectionStatus = connection.status;
  }
  return shaped;
}

function shapeMessage(doc) {
  const m = toJSON(doc);
  return {
    id: m.id,
    conversationId: m.conversationId?.toString?.() || m.conversationId,
    senderId: m.senderId?.toString?.() || m.senderId,
    text: m.text || '',
    createdAt: m.createdAt,
  };
}

async function connectionForConvo(convo, currentUser) {
  let conn = await findConnectionByConversation(convo._id);
  if (conn) return conn;

  const parts = (convo.participants || []).map((p) => String(p._id || p));
  const otherId = parts.find((id) => id !== String(currentUser.id));
  if (!otherId) return null;

  const other = await User.findById(otherId).select('role');
  if (!other) return null;

  // Learner ↔ teacher threads are always gated by a ConnectionRequest
  if (['student', 'parent'].includes(currentUser.role) && other.role === 'teacher') {
    const { conn: created } = await ensureConnection(currentUser, otherId, { source: 'message' });
    return created;
  }
  if (currentUser.role === 'teacher' && ['student', 'parent'].includes(other.role)) {
    return ConnectionRequest.findOne({ learnerId: otherId, teacherId: currentUser.id });
  }
  return null;
}

export const listMine = asyncHandler(async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.id);

  // Only threads with real chat activity — empty shells from "Message" taps clutter the inbox.
  // Optional ?include=<conversationId> keeps a just-opened empty thread visible.
  const includeId = req.query.include ? String(req.query.include) : '';
  const filter = {
    participants: uid,
    $or: [{ lastMessage: { $nin: [null, ''] } }],
  };
  if (includeId && mongoose.Types.ObjectId.isValid(includeId)) {
    filter.$or.push({ _id: new mongoose.Types.ObjectId(includeId) });
  }

  const items = await Conversation.find(filter)
    .sort({ updatedAt: -1 })
    .populate('participants', 'name role avatarUrl teacherProfile.profilePhoto teacherProfile.subjects teacherProfile.speciality')
    .limit(50);

  const convoIds = items.map((c) => c._id);
  const connections = await ConnectionRequest.find({ conversationId: { $in: convoIds } });
  const byConvo = Object.fromEntries(connections.map((c) => [String(c.conversationId), c]));

  ApiResponse.ok(
    res,
    {
      items: items.map((c) => shapeConversation(c, req.user.id, byConvo[String(c._id)] || null)),
    },
    'Conversations fetched',
  );
});

export const getOrCreate = asyncHandler(async (req, res) => {
  const participantId = req.body.participantId || req.body.tutorId;
  if (!participantId) throw ApiError.badRequest('participantId required');
  if (participantId === req.user.id) throw ApiError.badRequest('Cannot message yourself');

  const other = await User.findById(participantId).select(
    'name role avatarUrl isActive teacherProfile.profilePhoto teacherProfile.subjects teacherProfile.speciality',
  );
  if (!other || !other.isActive) throw ApiError.notFound('User not found');

  let connection = null;

  // Student/parent messaging a teacher → create gated connection first
  if (['student', 'parent'].includes(req.user.role) && other.role === 'teacher') {
    const ensured = await ensureConnection(req.user, participantId, {
      source: req.body.source || 'message',
      initialMessage: req.body.initialMessage,
    });
    connection = ensured.conn;
  }

  let convo = null;
  if (connection?.conversationId) {
    convo = await Conversation.findById(connection.conversationId).populate(
      'participants',
      'name role avatarUrl teacherProfile.profilePhoto teacherProfile.subjects teacherProfile.speciality',
    );
  }

  if (!convo) {
    convo = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId], $size: 2 },
    }).populate(
      'participants',
      'name role avatarUrl teacherProfile.profilePhoto teacherProfile.subjects teacherProfile.speciality',
    );
  }

  if (!convo) {
    convo = await Conversation.create({
      participants: [req.user.id, participantId],
      lastMessage: '',
    });
    convo = await Conversation.findById(convo._id).populate(
      'participants',
      'name role avatarUrl teacherProfile.profilePhoto teacherProfile.subjects teacherProfile.speciality',
    );
  }

  if (connection && !connection.conversationId) {
    connection.conversationId = convo._id;
    await connection.save();
  }

  if (!connection) {
    connection = await connectionForConvo(convo, req.user);
  }

  ApiResponse.ok(res, shapeConversation(convo, req.user.id, connection), 'Conversation ready');
});

export const listMessages = asyncHandler(async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw ApiError.notFound();
  const isParticipant = convo.participants.some((p) => String(p) === req.user.id);
  if (!isParticipant && req.user.role !== 'admin') throw ApiError.forbidden();

  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const messages = await Message.find({ conversationId: convo._id })
    .sort({ createdAt: 1 })
    .limit(limit);

  const connection = await findConnectionByConversation(convo._id);

  ApiResponse.ok(
    res,
    {
      items: messages.map(shapeMessage),
      connection: connection
        ? shapeConnection(connection, { viewerRole: req.user.role })
        : null,
      messagingLimited: connection ? isMessagingLimited(connection) : false,
      messagesRemaining: connection ? learnerMessagesRemaining(connection) : null,
      maxLimitedMessages: MAX_LIMITED_LEARNER_MESSAGES,
      contactUnlocked: connection?.status === 'connected',
    },
    'Messages fetched',
  );
});

export const sendMessage = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) throw ApiError.badRequest('Message text required');
  if (text.length > 4000) throw ApiError.badRequest('Message too long');

  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw ApiError.notFound();
  const isParticipant = convo.participants.some((p) => String(p) === req.user.id);
  if (!isParticipant) throw ApiError.forbidden();

  let connection = await connectionForConvo(convo, req.user);

  // Enforce 2-message cap for learners until connection is paid/unlocked
  if (
    connection &&
    ['student', 'parent'].includes(req.user.role) &&
    isMessagingLimited(connection)
  ) {
    const remaining = learnerMessagesRemaining(connection);
    if (remaining <= 0) {
      throw ApiError.forbidden(
        connection.status === 'approved'
          ? 'Message limit reached. Pay the tutor fee to unlock unlimited messaging.'
          : connection.status === 'rejected'
            ? 'This connection was rejected by admin. You cannot send more messages.'
            : 'Message limit reached (2). Wait for admin approval, then pay to unlock full chat.',
      );
    }
  }

  if (connection?.status === 'rejected' && ['student', 'parent'].includes(req.user.role)) {
    throw ApiError.forbidden('This connection was rejected by admin.');
  }

  const msg = await Message.create({
    conversationId: convo._id,
    senderId: req.user.id,
    text,
  });

  if (
    connection &&
    ['student', 'parent'].includes(req.user.role) &&
    String(connection.learnerId) === String(req.user.id)
  ) {
    connection.learnerMessageCount = Number(connection.learnerMessageCount || 0) + 1;
    await connection.save();
  }

  convo.lastMessage = text.slice(0, 200);
  await convo.save();

  ApiResponse.created(
    res,
    {
      ...shapeMessage(msg),
      connection: connection
        ? shapeConnection(connection, { viewerRole: req.user.role })
        : null,
      messagesRemaining: connection ? learnerMessagesRemaining(connection) : null,
      messagingLimited: connection ? isMessagingLimited(connection) : false,
    },
    'Message sent',
  );
});
