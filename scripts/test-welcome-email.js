import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { sendWelcomeEmail } from '../src/services/welcomeEmail.service.js';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const result = await sendWelcomeEmail({
  name: 'Test User',
  email: process.env.SMTP_USER,
  role: 'student',
});
console.log('result:', result);
await mongoose.disconnect();
