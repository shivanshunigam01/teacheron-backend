import mongoose from 'mongoose';
import Conversation from '../models/Conversation.model.js';
import Message from '../models/Message.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON } from '../utils/serialize.js';

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

function shapeConversation(doc, currentUserId) {
  const c = toJSON(doc);
  const participants = (doc.participants || []).map(shapeParticipant).filter(Boolean);
  const other = participants.find((p) => p.id !== String(currentUserId)) || participants[0] || null;
  return {
    id: c.id,
    participants,
    other,
    lastMessage: c.lastMessage || '',
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  };
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

export const listMine = asyncHandler(async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.id);
  const items = await Conversation.find({ participants: uid })
    .sort({ updatedAt: -1 })
    .populate('participants', 'name role avatarUrl teacherProfile.profilePhoto teacherProfile.subjects teacherProfile.speciality')
    .limit(50);
  ApiResponse.ok(
    res,
    { items: items.map((c) => shapeConversation(c, req.user.id)) },
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

  let convo = await Conversation.findOne({
    participants: { $all: [req.user.id, participantId], $size: 2 },
  }).populate(
    'participants',
    'name role avatarUrl teacherProfile.profilePhoto teacherProfile.subjects teacherProfile.speciality',
  );

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

  ApiResponse.ok(res, shapeConversation(convo, req.user.id), 'Conversation ready');
});

export const listMessages = asyncHandler(async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw ApiError.notFound();
  const isParticipant = convo.participants.some((p) => String(p) === req.user.id);
  if (!isParticipant) throw ApiError.forbidden();

  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const messages = await Message.find({ conversationId: convo._id })
    .sort({ createdAt: 1 })
    .limit(limit);

  ApiResponse.ok(res, { items: messages.map(shapeMessage) }, 'Messages fetched');
});

export const sendMessage = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) throw ApiError.badRequest('Message text required');
  if (text.length > 4000) throw ApiError.badRequest('Message too long');

  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw ApiError.notFound();
  const isParticipant = convo.participants.some((p) => String(p) === req.user.id);
  if (!isParticipant) throw ApiError.forbidden();

  const msg = await Message.create({
    conversationId: convo._id,
    senderId: req.user.id,
    text,
  });

  convo.lastMessage = text.slice(0, 200);
  await convo.save();

  ApiResponse.created(res, shapeMessage(msg), 'Message sent');
});
