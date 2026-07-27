import Ticket from '../models/Ticket.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';

const PRIORITY_MAP = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'High',
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
};

const STATUS_MAP = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  Open: 'Open',
  'In Progress': 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

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

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};

  if (req.user?.role !== 'admin') {
    filter.userId = req.user.id;
  } else if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  if (req.query.status) {
    filter.status = STATUS_MAP[req.query.status] || req.query.status;
  }
  if (req.query.priority) {
    filter.priority = PRIORITY_MAP[req.query.priority] || req.query.priority;
  }
  if (req.query.q) {
    filter.$or = [
      { subject: new RegExp(String(req.query.q), 'i') },
      { ticketNumber: new RegExp(String(req.query.q), 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .sort(sort || { updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    { items: items.map(shapeTicket), pagination: paginationMeta(total, page, limit) },
    'Fetched successfully',
  );
});

export const getById = asyncHandler(async (req, res) => {
  const item = await Ticket.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  if (req.user.role !== 'admin' && String(item.userId) !== req.user.id) {
    throw ApiError.forbidden();
  }
  ApiResponse.ok(res, shapeTicket(item), 'Fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const body = String(req.body.description || req.body.body || req.body.firstMessage || '').trim();
  if (!subject) throw ApiError.badRequest('Subject required');
  if (!body) throw ApiError.badRequest('Description required');

  const priority = PRIORITY_MAP[req.body.priority] || 'Medium';
  const ticketNumber = req.body.ticketNumber || `TCK-${Date.now()}`;

  const item = await Ticket.create({
    userId: req.user.id,
    ticketNumber,
    subject,
    priority,
    status: 'Open',
    category: String(req.body.category || 'general').slice(0, 64),
    requesterName: String(req.body.requesterName || req.user.name || '').slice(0, 120),
    requesterEmail: String(req.body.requesterEmail || req.user.email || '').slice(0, 180),
    messages: [
      {
        authorId: req.user.id,
        authorRole: req.user.role || 'user',
        body,
      },
    ],
  });

  ApiResponse.created(res, shapeTicket(item), 'Created successfully');
});

export const update = asyncHandler(async (req, res) => {
  const existing = await Ticket.findById(req.params.id);
  if (!existing) throw ApiError.notFound();
  if (req.user.role !== 'admin' && String(existing.userId) !== req.user.id) {
    throw ApiError.forbidden();
  }

  const patch = {};
  if (req.body.status != null) patch.status = STATUS_MAP[req.body.status] || req.body.status;
  if (req.body.priority != null) patch.priority = PRIORITY_MAP[req.body.priority] || req.body.priority;
  if (req.body.subject != null) patch.subject = String(req.body.subject).trim();

  const item = await Ticket.findByIdAndUpdate(req.params.id, patch, {
    new: true,
    runValidators: true,
  });
  ApiResponse.ok(res, shapeTicket(item), 'Updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden();
  const item = await Ticket.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, {}, 'Deleted successfully');
});
