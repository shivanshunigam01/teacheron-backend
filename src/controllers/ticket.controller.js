import Ticket from '../models/Ticket.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON } from '../utils/serialize.js';
export * from './ticket.base.controller.js';

function shapeTicket(doc) {
  const t = toJSON(doc);
  const messages = (doc.messages || []).map((m) => {
    const o = m.toObject ? m.toObject() : { ...m };
    return {
      id: o._id?.toString?.() || o.id,
      authorId: o.authorId?.toString?.() || o.authorId,
      authorRole: o.authorRole || 'user',
      body: o.body || '',
      message: o.body || '',
      createdAt: o.createdAt,
    };
  });
  const first = messages[0];
  return {
    id: t.id,
    ticketNumber: t.ticketNumber || t.id,
    subject: t.subject || '',
    priority: String(t.priority || 'Medium').toLowerCase().replace(/\s+/g, '_'),
    status: String(t.status || 'Open')
      .toLowerCase()
      .replace(/\s+/g, '_'),
    userId: t.userId?.toString?.() || t.userId,
    description: first?.body || '',
    messages,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    category: t.category || 'general',
    requesterName: t.requesterName || '',
    requesterEmail: t.requesterEmail || '',
  };
}

export const addMessage = asyncHandler(async (req, res) => {
  const body = String(req.body.body || req.body.message || '').trim();
  if (!body) throw ApiError.badRequest('Message body required');

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw ApiError.notFound();
  if (req.user.role !== 'admin' && String(ticket.userId) !== req.user.id) {
    throw ApiError.forbidden();
  }

  ticket.messages.push({
    authorId: req.user.id,
    authorRole: req.user.role || 'user',
    body,
  });
  if (req.user.role === 'admin' && ticket.status === 'Open') {
    ticket.status = 'In Progress';
  }
  await ticket.save();

  ApiResponse.ok(res, shapeTicket(ticket), 'Message added');
});
