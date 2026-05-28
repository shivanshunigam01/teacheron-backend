import nodemailer from 'nodemailer';
import env from '../config/env.js';

function createTransport() {
  if (!env.smtp.user || !env.smtp.pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

/**
 * @param {{ to: string; subject: string; html: string; text?: string }} opts
 */
export async function sendMail({ to, subject, html, text }) {
  if (!env.smtp.user || !env.smtp.pass) {
    console.log('[MAIL STUB]', { to, subject });
    return { stub: true };
  }

  const transport = createTransport();
  return transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to,
    subject,
    html,
    text: text || undefined,
  });
}
