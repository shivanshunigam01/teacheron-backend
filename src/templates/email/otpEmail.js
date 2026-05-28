import env from '../../config/env.js';
import { escapeHtml } from './escapeHtml.js';
import { wrapEmail } from './baseLayout.js';

/**
 * @param {{ name: string; email: string; otp: string }} params
 */
export function buildOtpEmail({ name, otp }) {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);
  const minutes = 10;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;">Verify your tutor email</h1>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#334155;">
      Hi <strong>${safeName}</strong>, welcome to TeachersPoints! Enter this one-time code to verify your email and continue setting up your tutor profile.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:2px dashed #6366f1;border-radius:16px;padding:28px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6366f1;">Your verification code</p>
          <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:0.35em;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;">${safeOtp}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#64748b;text-align:center;">
      This code expires in <strong>${minutes} minutes</strong>. Do not share it with anyone.
    </p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">
      After verification you will complete your tutor profile. Your welcome email with course highlights is sent once your profile is complete.
    </p>
  `;

  const html = wrapEmail({
    preheader: `Your TeachersPoints verification code is ${otp}`,
    title: 'Verify your email to continue',
    bodyHtml,
  });

  const text = [
    'Verify your tutor email — TeachersPoints',
    '',
    `Hi ${name},`,
    '',
    `Your verification code: ${otp}`,
    '',
    `This code expires in ${minutes} minutes.`,
    '',
    'After verification, complete your tutor profile in the app.',
    'Your welcome email will be sent once your profile is complete.',
    '',
    '— TeachersPoints',
  ].join('\n');

  return {
    subject: `${otp} is your TeachersPoints verification code`,
    html,
    text,
  };
}
