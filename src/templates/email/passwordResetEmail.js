import { emailButton, wrapEmail } from './baseLayout.js';
import { escapeHtml } from './escapeHtml.js';
import { getResetPasswordUrl } from './brand.js';

const copy = {
  teacher: {
    headline: 'Reset your tutor password',
    intro:
      'Hi <strong>{name}</strong>, we received a request to reset the password for your TeachersPoints tutor account. Tap the button below to choose a new password.',
    subject: 'Reset your TeachersPoints tutor password',
    preheader: 'Choose a new password for your tutor account.',
  },
  student: {
    headline: 'Reset your student password',
    intro:
      'Hi <strong>{name}</strong>, we received a request to reset the password for your TeachersPoints student account. Tap the button below to choose a new password.',
    subject: 'Reset your TeachersPoints student password',
    preheader: 'Choose a new password for your student account.',
  },
};

/**
 * @param {{ name: string; token: string; role?: 'student' | 'teacher'; setPassword?: boolean }} params
 */
export function buildPasswordResetEmail({ name, token, role = 'student', setPassword = false }) {
  const resetUrl = getResetPasswordUrl(token);
  const safeName = escapeHtml(name || 'there');
  const c = copy[role === 'teacher' ? 'teacher' : 'student'];
  const headline = setPassword ? c.headline.replace('Reset', 'Set') : c.headline;
  const buttonLabel = setPassword ? 'Set password' : 'Reset password';
  const introHtml = (setPassword
    ? c.intro.replace(
        'reset the password',
        'set a password so you can also sign in with email and password',
      )
    : c.intro
  ).replace('{name}', safeName);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;">${headline}</h1>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#334155;">
      ${introHtml}
    </p>
    ${emailButton(resetUrl, buttonLabel)}
    <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#64748b;text-align:center;">
      This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
    </p>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;text-align:center;">
      ${escapeHtml(resetUrl)}
    </p>
  `;

  const html = wrapEmail({
    title: c.headline,
    preheader: c.preheader,
    bodyHtml,
  });

  const text = [
    c.subject,
    '',
    `Hi ${name || 'there'},`,
    '',
    'Reset your password using this link (expires in 1 hour):',
    resetUrl,
    '',
    'If you did not request this, ignore this email.',
    '',
    '— TeachersPoints',
  ].join('\n');

  return {
    subject: c.subject,
    html,
    text,
  };
}

/** @deprecated Use buildPasswordResetEmail */
export function passwordResetEmail(params) {
  return buildPasswordResetEmail(params).html;
}
