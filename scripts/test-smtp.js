import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

try {
  console.log('Verifying SMTP...', process.env.SMTP_HOST, process.env.SMTP_USER);
  await transport.verify();
  console.log('verify: OK');

  const info = await transport.sendMail({
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
    to: process.env.SMTP_USER,
    subject: 'TeachersPoints SMTP test',
    text: 'SMTP test from scripts/test-smtp.js',
  });
  console.log('sent:', info.messageId);
} catch (err) {
  console.error('FAILED:', err.message);
  if (err.code) console.error('code:', err.code);
  if (err.response) console.error('response:', err.response);
  process.exit(1);
}
