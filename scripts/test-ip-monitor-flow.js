/**
 * Smoke test: IP monitor + deactivate flow
 * Run: node scripts/test-ip-monitor-flow.js
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';
const TEST_IP = '203.0.113.99'; // TEST-NET-3 (documentation IP)

const ts = Date.now();
const userA = { name: 'IP Test A', email: `iptest-a-${ts}@test.local`, password: 'TestPass123!', role: 'student' };
const userB = { name: 'IP Test B', email: `iptest-b-${ts}@test.local`, password: 'TestPass123!', role: 'student' };

const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': TEST_IP };

async function req(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...headers, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function ok(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
    return true;
  }
  console.log(`  ✗ ${msg}`);
  return false;
}

async function main() {
  console.log('\n=== IP Monitor + Deactivate flow test ===\n');
  console.log(`API: ${BASE}\n`);

  // Health
  const health = await req('GET', '/health');
  if (!ok(health.status === 200, `Health (${health.status})`)) {
    console.error('Start backend: cd backend && npm run dev');
    process.exit(1);
  }

  // Admin login
  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@teacherpoint.com',
    password: 'Admin@123',
  });
  const adminToken = adminLogin.json?.data?.accessToken;
  if (!ok(adminToken, 'Admin login')) {
    console.log(adminLogin.json);
    process.exit(1);
  }
  const authH = { Authorization: `Bearer ${adminToken}` };

  // Register two users from same IP
  const regA = await req('POST', '/auth/register', userA);
  const idA = regA.json?.data?.user?.id;
  if (!ok(regA.status === 201 && idA, `Register user A (${regA.status})`)) {
    console.log(regA.json);
    process.exit(1);
  }

  const regB = await req('POST', '/auth/register', userB);
  const idB = regB.json?.data?.user?.id;
  if (!ok(regB.status === 201 && idB, `Register user B (${regB.status})`)) {
    console.log(regB.json);
    process.exit(1);
  }

  // IP monitor groups
  const groups = await req('GET', '/admin/ip-monitor/groups', null, authH);
  const group = groups.json?.data?.find((g) => g.ipAddress === TEST_IP);
  if (!ok(groups.status === 200 && group?.totalUsers >= 2, `Same-IP group found (${group?.totalUsers || 0} users)`)) {
    console.log('Groups sample:', groups.json?.data?.slice(0, 2));
  } else {
    ok(group.riskLevel === 'low', `Risk level low for 2 users (${group.riskLevel})`);
    ok(group.users?.some((u) => u.ipRiskFlag), 'ipRiskFlag set on related users');
  }

  const summary = await req('GET', '/admin/ip-monitor/summary', null, authH);
  ok(summary.status === 200 && summary.json?.data?.totalFlaggedIps >= 1, 'Summary returns flagged IPs');

  const detail = await req('GET', `/admin/ip-monitor/users/${encodeURIComponent(TEST_IP)}`, null, authH);
  ok(detail.status === 200 && detail.json?.data?.users?.length >= 2, 'IP detail has 2+ users');

  const logs = await req('GET', '/admin/ip-monitor/logs?action=register&limit=5', null, authH);
  ok(logs.status === 200 && logs.json?.data?.items?.length >= 1, 'IP logs paginated');

  // Deactivate user A
  const deactivate = await req('PATCH', `/admin/users/${idA}`, { isActive: false }, authH);
  ok(deactivate.status === 200, `Deactivate user A (${deactivate.status})`);

  // User A cannot login
  const loginA = await req('POST', '/auth/login', { email: userA.email, password: userA.password });
  ok(loginA.status === 403 || loginA.json?.message?.toLowerCase().includes('disabled'), `Deactivated user cannot login (${loginA.status})`);

  // User B can still login
  const loginB = await req('POST', '/auth/login', { email: userB.email, password: userB.password });
  ok(loginB.status === 200 && loginB.json?.data?.accessToken, 'Active user B can login');

  // Deactivated user cannot use API with old token (if we had one from register)
  const tokenA = regA.json?.data?.accessToken;
  if (tokenA) {
    const meA = await req('GET', '/auth/me', null, { Authorization: `Bearer ${tokenA}` });
    ok(meA.status === 403, `Deactivated user blocked on /auth/me (${meA.status})`);
  }

  // Reactivate user A
  const reactivate = await req('PATCH', `/admin/users/${idA}`, { isActive: true }, authH);
  ok(reactivate.status === 200, 'Reactivate user A');

  const loginA2 = await req('POST', '/auth/login', { email: userA.email, password: userA.password });
  ok(loginA2.status === 200, 'Reactivated user A can login again');

  // Flag user via ip-monitor endpoint
  const flag = await req(
    'PATCH',
    `/admin/ip-monitor/users/${idB}/flag`,
    { ipRiskFlag: true, ipAdminNote: 'Test flag from script' },
    authH,
  );
  ok(flag.status === 200 && flag.json?.data?.ipRiskFlag === true, 'Manual IP risk flag');

  console.log('\n=== Done ===\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
