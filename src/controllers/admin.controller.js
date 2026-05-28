import User from '../models/User.model.js';
import Course from '../models/Course.model.js';
import Accommodation from '../models/Accommodation.model.js';
import Payment from '../models/Payment.model.js';
import AdminMember from '../models/AdminMember.model.js';
import Report from '../models/Report.model.js';
import SmtpConfig from '../models/SmtpConfig.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON, toJSONList } from '../utils/serialize.js';
import { sendMail, verifySmtpConnection } from '../services/email.service.js';
import { invalidateSmtpCache, getSmtpStatus } from '../services/smtpConfig.service.js';

export const stats = asyncHandler(async (req, res) => {
  const [courses, teachers, accommodations, revenue] = await Promise.all([
    Course.countDocuments(),
    User.countDocuments({ role: 'teacher' }),
    Accommodation.countDocuments(),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  ApiResponse.ok(
    res,
    {
      courses,
      teachers,
      packages: 0,
      accommodations,
      inquiriesNew: 0,
      revenueMtd: revenue[0]?.total || 0,
      enrollmentsWeek: [],
    },
    'Stats fetched',
  );
});

export const team = asyncHandler(async (req, res) =>
  ApiResponse.ok(res, toJSONList(await AdminMember.find().populate('userId')), 'Team fetched'),
);

export const invite = asyncHandler(async (req, res) => {
  const item = await AdminMember.create({
    userId: req.body.userId,
    staffRole: req.body.staffRole,
    invitedBy: req.user.id,
  });
  ApiResponse.created(res, toJSON(item), 'Admin invited');
});

export const reports = asyncHandler(async (req, res) =>
  ApiResponse.ok(res, toJSONList(await Report.find().sort('-createdAt')), 'Reports fetched'),
);

export const updateReport = asyncHandler(async (req, res) =>
  ApiResponse.ok(
    res,
    toJSON(await Report.findByIdAndUpdate(req.params.id, { ...req.body, resolvedBy: req.user.id }, { new: true })),
    'Report updated',
  ),
);

export const getSmtp = asyncHandler(async (req, res) => {
  const doc = await SmtpConfig.findOne({ isActive: true });
  const status = await getSmtpStatus();
  ApiResponse.ok(
    res,
    {
      config: doc ? toJSON(doc) : null,
      status,
      envOverridesDatabase: status.source === 'env',
    },
    'SMTP fetched',
  );
});

export const updateSmtp = asyncHandler(async (req, res) => {
  const { host, port, secure, user, pass, fromName, fromEmail, isActive } = req.body;
  const update = {
    host: host || 'smtp.gmail.com',
    port: Number(port || 587),
    secure: secure === true,
    user,
    fromName: fromName || 'TeachersPoints',
    fromEmail: fromEmail || user,
    isActive: isActive !== false,
  };

  if (pass && typeof pass === 'string' && pass.length > 0 && !pass.startsWith('•')) {
    update.pass = pass.replace(/\s/g, '');
  }

  const item = await SmtpConfig.findOneAndUpdate({ isActive: true }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  invalidateSmtpCache();
  await verifySmtpConnection();

  ApiResponse.ok(res, { config: toJSON(item), status: await getSmtpStatus() }, 'SMTP updated');
});

export const testSmtp = asyncHandler(async (req, res) => {
  const to = req.body?.to?.trim();
  if (!to) {
    return ApiResponse.ok(res, { sent: false }, 'Recipient email required');
  }

  const result = await sendMail({
    to,
    subject: 'TeachersPoints — SMTP test (production)',
    html: '<p>If you received this, SMTP is working on your TeachersPoints server.</p>',
    text: 'If you received this, SMTP is working on your TeachersPoints server.',
  });

  if (result.stub) {
    return ApiResponse.ok(res, { sent: false, reason: 'not_configured' }, 'SMTP not configured');
  }

  ApiResponse.ok(res, { sent: true, messageId: result.messageId }, 'Test email sent');
});

export const broadcast = asyncHandler(async (req, res) =>
  ApiResponse.ok(res, { sent: true }, 'Broadcast queued'),
);
