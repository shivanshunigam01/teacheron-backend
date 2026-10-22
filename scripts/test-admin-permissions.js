/**
 * Verifies staff RBAC on /admin/* (BR-001).
 * Requires seed: omar@teacherpoint.com (moderator), aarav@teacherpoint.com (super_admin).
 * Run: node scripts/test-admin-permissions.js
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

async function login(base, email, password) {
  const res = await request(base, 'POST', '/auth/login', { email, password });
  const token = res.json?.data?.accessToken;
  return { status: res.status, token, staffRole: res.json?.data?.user?.staffRole };
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
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}${API_PREFIX}`;

const mod = await login(base, 'omar@teacherpoint.com', 'Omar@Mod2026');
const superA = await login(base, 'aarav@teacherpoint.com', 'Aarav@Super2026');

if (!mod.token || !superA.token) {
  console.error('Seed admin accounts missing — run npm run seed');
  server.close();
  await mongoose.disconnect();
  process.exit(1);
}

record('Moderator login staffRole', mod.staffRole === 'moderator', mod.staffRole);
record('Super admin login staffRole', superA.staffRole === 'super_admin', superA.staffRole);

const modH = { Authorization: `Bearer ${mod.token}` };
const superH = { Authorization: `Bearer ${superA.token}` };

const modSmtp = await request(base, 'PATCH', '/admin/smtp-config', { host: 'x' }, modH);
record('Moderator PATCH /admin/smtp-config → 403', modSmtp.status === 403, `status ${modSmtp.status}`);

const superSmtpGet = await request(base, 'GET', '/admin/smtp-config', null, superH);
record('Super admin GET /admin/smtp-config → 200', superSmtpGet.status === 200, `status ${superSmtpGet.status}`);

const modUsers = await request(base, 'GET', '/admin/users', null, modH);
record('Moderator GET /admin/users → 403', modUsers.status === 403, `status ${modUsers.status}`);

const modReq = await request(base, 'GET', '/admin/requirements', null, modH);
record('Moderator GET /admin/requirements → 200', modReq.status === 200, `status ${modReq.status}`);

server.close();
await mongoose.disconnect();
console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
