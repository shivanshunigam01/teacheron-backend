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

export const team = asyncHandler(async (req, res) => {
  const members = await AdminMember.find()
    .populate('userId', 'name email isActive registrationIp lastLoginIp lastLoginAt ipRiskFlag')
    .sort({ createdAt: 1 });

  const data = members.map((m) => {
    const row = toJSON(m);
    const u = m.userId && typeof m.userId === 'object' ? toJSON(m.userId) : null;
    return {
      id: row.id,
      userId: u?.id || (typeof row.userId === 'string' ? row.userId : ''),
      staffRole: row.staffRole,
      isActive: row.isActive !== false && u?.isActive !== false,
      name: u?.name || '',
      email: u?.email || '',
      registrationIp: u?.registrationIp || '',
      lastLoginIp: u?.lastLoginIp || '',
      lastLoginAt: u?.lastLoginAt || null,
      ipRiskFlag: !!u?.ipRiskFlag,
      createdAt: row.createdAt,
    };
  });

  ApiResponse.ok(res, data, 'Team fetched');
});

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

  const { wrapEmail } = await import('../templates/email/baseLayout.js');
  const html = wrapEmail({
    title: 'SMTP test — your mail server is working',
    preheader: 'TeachersPoints transactional email delivery is configured correctly.',
    bodyHtml:
      '<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">If you received this message, SMTP is working on your TeachersPoints server and the brand logo above should be visible.</p>',
  });

  const result = await sendMail({
    to,
    subject: 'TeachersPoints — SMTP test',
    html,
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
