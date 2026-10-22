import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMail } from '../services/email.service.js';
import { escapeHtml } from '../templates/email/escapeHtml.js';

export const contact = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const subject = String(req.body.subject || 'Contact form').trim();
  const message = String(req.body.message || '').trim();

  await sendMail({
    to: process.env.MAIL_FROM_EMAIL || 'support@teacherpoint.org',
    subject: `[Contact] ${subject}`,
    html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message)}</p>`,
  });

  ApiResponse.created(res, { submitted: true }, 'Contact submitted');
});
