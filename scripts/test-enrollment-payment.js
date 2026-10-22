/**
 * Paid course requires Payment record before enroll.
 * Run: node scripts/test-enrollment-payment.js
 */
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Course from '../src/models/Course.model.js';
import Payment from '../src/models/Payment.model.js';
import User from '../src/models/User.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_PREFIX = '/api/v1';

function apiUrl(base, urlPath) {
  const p = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return `${base.replace(/\/$/, '')}${p}`;
}

async function request(base, method, urlPath, body, headers = {}) {
  const res = await fetch(apiUrl(base, urlPath), {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

let pass = 0;
let fail = 0;
function record(name, ok, detail = '') {
  if (ok) {
    console.log(`PASS  ${name}`);
    pass += 1;
  } else {
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    fail += 1;
  }
}

await mongoose.connect(process.env.MONGO_URI);

const course = await Course.create({
  title: `Paid test ${Date.now()}`,
  slug: `paid-test-${Date.now()}`,
  price: 99,
  status: 'published',
  instructorName: 'Test',
});

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}${API_PREFIX}`;

const ts = Date.now();
const email = `enroll-pay-${ts}@test.local`;
const reg = await request(base, 'POST', '/auth/register', {
  name: 'Enroll Pay Student',
  email,
  password: 'TestPass123!',
  role: 'student',
});
if (reg.status !== 201 && reg.status !== 200) {
  console.error('Register failed', reg.status);
  process.exit(1);
}
const studentId = reg.json?.data?.user?.id;
await User.findByIdAndUpdate(studentId, { profileComplete: true, isVerified: true });

let token = reg.json?.data?.accessToken;
if (!token) {
  const login = await request(base, 'POST', '/auth/login', { email, password: 'TestPass123!', role: 'student' });
  token = login.json?.data?.accessToken;
}
const h = { Authorization: `Bearer ${token}` };
const student = { _id: studentId };

const blocked = await request(base, 'POST', '/enrollments', { courseId: String(course._id) }, h);
record('Enroll paid course without payment → 403', blocked.status === 403, `status ${blocked.status}`);

await Payment.create({
  userId: student._id,
  type: 'course',
  referenceId: course._id,
  amount: 99,
  currency: 'INR',
  method: 'razorpay',
  status: 'paid',
});

const ok = await request(base, 'POST', '/enrollments', { courseId: String(course._id) }, h);
record('Enroll after paid Payment → 201/200', ok.status === 201 || ok.status === 200, `status ${ok.status}`);

await Course.findByIdAndDelete(course._id);
await Payment.deleteMany({ referenceId: course._id });

server.close();
await mongoose.disconnect();
console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
