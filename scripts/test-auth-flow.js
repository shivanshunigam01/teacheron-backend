/**
 * Auth flow smoke: duplicate email, role registration, refresh token.
 * Run: node scripts/test-auth-flow.js
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

const ts = Date.now();
const email = `auth-flow-${ts}@test.local`;
const password = 'TestPass123!';

for (const role of ['student', 'teacher', 'parent']) {
  const reg = await request(base, 'POST', '/auth/register', {
    name: `Auth ${role}`,
    email: `${role}-${email}`,
    password,
    role,
  });
  record(`Register ${role}`, reg.status === 201 || reg.status === 200, `status ${reg.status}`);
  record(`${role} role in response`, reg.json?.data?.user?.role === role, reg.json?.data?.user?.role);
}

const dup = await request(base, 'POST', '/auth/register', {
  name: 'Dup',
  email: `student-${email}`,
  password,
  role: 'student',
});
record('Duplicate email → 409', dup.status === 409, `status ${dup.status}`);

const login = await request(base, 'POST', '/auth/login', {
  email: `student-${email}`,
  password,
  role: 'student',
});
const access = login.json?.data?.accessToken;
const refresh = login.json?.data?.refreshToken;
record('Login returns tokens', Boolean(access && refresh), '');

const me = await request(base, 'GET', '/auth/me', null, { Authorization: `Bearer ${access}` });
record('GET /auth/me', me.status === 200, `status ${me.status}`);

const refreshed = await request(base, 'POST', '/auth/refresh', { refreshToken: refresh });
record('Refresh token', refreshed.status === 200 && refreshed.json?.data?.accessToken, `status ${refreshed.status}`);

const logout = await request(base, 'POST', '/auth/logout', { refreshToken: refresh }, {
  Authorization: `Bearer ${access}`,
});
record('Logout', logout.status === 200 || logout.status === 204, `status ${logout.status}`);

server.close();
await mongoose.disconnect();
console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
