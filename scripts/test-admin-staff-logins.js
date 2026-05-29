/**
 * Verify three admin staff logins return correct staffRole.
 * Run: node scripts/test-admin-staff-logins.js
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

const ACCOUNTS = [
  { email: 'aarav@teacherpoint.com', password: 'Aarav@Super2026', staffRole: 'super_admin', label: 'Super Admin' },
  { email: 'priya.admin@teacherpoint.com', password: 'Priya@Mgr2026', staffRole: 'manager', label: 'Manager' },
  { email: 'omar@teacherpoint.com', password: 'Omar@Mod2026', staffRole: 'moderator', label: 'Moderator' },
];

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log('\n=== Admin staff login test ===\n');
  let failed = false;

  for (const acct of ACCOUNTS) {
    const { status, json } = await login(acct.email, acct.password);
    const role = json?.data?.user?.staffRole;
    const ok = status === 200 && role === acct.staffRole;
    console.log(`${ok ? '✓' : '✗'} ${acct.label}: ${acct.email} → staffRole=${role ?? 'missing'} (${status})`);
    if (!ok) {
      failed = true;
      if (status !== 200) console.log('  ', json?.message || json);
    }
  }

  if (failed) {
    console.log('\nRun seed first: npm run seed\n');
    process.exit(1);
  }
  console.log('\nAll staff roles OK.\n');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
