import { emailButton, wrapEmail } from './baseLayout.js';
import { escapeHtml } from './escapeHtml.js';
import { getResetPasswordUrl } from './brand.js';

export function passwordResetEmail({ name, token }) {
  const resetUrl = getResetPasswordUrl(token);
  const safeName = escapeHtml(name || 'there');

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#334155;">Hi ${safeName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#334155;">
      We received a request to reset your TeachersPoints password. Use the button below to choose a new password.
    </p>
    ${emailButton(resetUrl, 'Reset password')}
    <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
      This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
    </p>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">
      ${escapeHtml(resetUrl)}
    </p>
  `;

  return wrapEmail({
    title: 'Reset your password',
    preheader: 'Choose a new TeachersPoints password.',
    bodyHtml,
  });
}
