/**
 * Verifies P0 security fixes (users, notifications, payments, listings).
 * Run: node scripts/test-security-fixes.js
 */
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from '../src/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_PREFIX = '/api/v1';

async function request(base, method, urlPath, body, headers = {}) {
  const url = new URL(urlPath, base);
  const payload = body ? JSON.stringify(body) : undefined;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: payload,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function assert(name, ok, detail = '') {
  if (ok) {
    console.log(`PASS  ${name}`);
    return true;
  }
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  return false;
}

let pass = 0;
let fail = 0;

function record(name, ok, detail) {
  if (assert(name, ok, detail)) pass += 1;
  else fail += 1;
}

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const teacher = await db.collection('users').findOne({
  role: 'teacher',
  isActive: { $ne: false },
});
if (!teacher) {
  console.error('No teacher in DB — seed data required for security tests');
  process.exit(1);
}

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}${API_PREFIX}`;

const teacherId = teacher._id.toString();

// 1) Unauthenticated user profile
const noAuthUser = await request(base, 'GET', `/users/${teacherId}`);
record(
  'GET /users/:id without token returns 401',
  noAuthUser.status === 401,
  `status ${noAuthUser.status}`,
);

// 2) Unauthenticated notifications list
const noAuthNotif = await request(base, 'GET', '/notifications');
record(
  'GET /notifications without token returns 401',
  noAuthNotif.status === 401,
  `status ${noAuthNotif.status}`,
);

// Register temp student for auth tests
const ts = Date.now();
const studentEmail = `sec-student-${ts}@test.local`;
const reg = await request(base, 'POST', '/auth/register', {
  name: 'Sec Test Student',
  email: studentEmail,
  password: 'TestPass123!',
  role: 'student',
});
if (reg.status !== 201 && reg.status !== 200) {
  console.error('Could not register test student', reg.status, reg.json?.message);
  server.close();
  await mongoose.disconnect();
  process.exit(1);
}

let access = reg.json?.data?.accessToken;
if (!access) {
  const login = await request(base, 'POST', '/auth/login', {
    email: studentEmail,
    password: 'TestPass123!',
    role: 'student',
  });
  access = login.json?.data?.accessToken;
}
const studentH = { Authorization: `Bearer ${access}` };

// 3) Student cannot list all notifications
const studentListNotif = await request(base, 'GET', '/notifications', null, studentH);
record(
  'GET /notifications as student returns 403',
  studentListNotif.status === 403,
  `status ${studentListNotif.status}`,
);

// 4) Student can view teacher via authenticated getById (public tutor shape)
const studentViewTeacher = await request(base, 'GET', `/users/${teacherId}`, null, studentH);
record(
  'GET /users/:teacherId as student returns 200 tutor payload',
  studentViewTeacher.status === 200 && studentViewTeacher.json?.data?.id,
  `status ${studentViewTeacher.status}`,
);

// 5) Direct payment bypass disabled
const payBypass = await request(
  base,
  'POST',
  '/payments',
  {
    type: 'tutor_session',
    referenceId: teacherId,
    amount: 1,
    currency: 'INR',
    metadata: { teacherId, connectionId: 'fake' },
  },
  studentH,
);
record(
  'POST /payments without Razorpay blocked (400 or 403)',
  payBypass.status === 400 || payBypass.status === 403,
  `status ${payBypass.status}`,
);

const notifListStudent = await request(base, 'GET', '/notifications', null, studentH);
record(
  'GET /notifications as student returns 403',
  notifListStudent.status === 403,
  `status ${notifListStudent.status}`,
);

server.close();
await mongoose.disconnect();

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
