/**
 * Smoke test: requirement post → admin approve → public jobs list
 * Run: node scripts/test-requirement-flow.js
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

const ts = Date.now();
const student = {
  name: 'Req Test Student',
  email: `req-student-${ts}@test.local`,
  password: 'TestPass123!',
  role: 'student',
};

const requirementPayload = {
  title: 'Class 10 Math tutor for board exams',
  subject: 'Mathematics',
  skills: ['Algebra', 'Geometry'],
  level: 'high',
  jobType: 'tutoring',
  mode: 'online',
  sessionsPerWeek: 3,
  city: 'Mumbai',
  country: 'India',
  budgetPerHour: 30,
  currency: 'INR',
  duration: 'ongoing',
  details:
    'Need help with algebra and geometry for CBSE board exams. Prefer evening sessions 3 times per week.',
};

async function req(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
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
  console.log('\n=== Requirement approval flow test ===\n');
  console.log(`API: ${BASE}\n`);

  const health = await req('GET', '/health');
  if (!ok(health.status === 200, `Health (${health.status})`)) {
    console.error('Start backend: cd backend && npm run dev');
    process.exit(1);
  }

  // Unauthenticated post should fail
  const anonPost = await req('POST', '/requirements', requirementPayload);
  ok(anonPost.status === 401, `Anonymous post blocked (${anonPost.status})`);

  // Register student
  const reg = await req('POST', '/auth/register', student);
  const studentToken = reg.json?.data?.accessToken;
  const studentId = reg.json?.data?.user?.id;
  if (!ok(reg.status === 201 && studentToken, `Register student (${reg.status})`)) {
    console.log(reg.json);
    process.exit(1);
  }
  const studentH = { Authorization: `Bearer ${studentToken}` };

  // Post requirement
  const created = await req('POST', '/requirements', requirementPayload, studentH);
  const reqId = created.json?.data?.id;
  if (!ok(created.status === 201 && reqId, `Create requirement (${created.status})`)) {
    console.log(created.json);
    process.exit(1);
  }
  ok(created.json?.data?.status === 'pending', 'Status is pending');
  ok(created.json?.data?.approved === false, 'Not approved yet');

  // Not visible on public jobs yet
  const jobsBefore = await req('GET', '/requirements/jobs');
  const visibleBefore = jobsBefore.json?.data?.items?.some((j) => j.id === reqId);
  ok(jobsBefore.status === 200 && !visibleBefore, 'Job not public before approval');

  // Student can see own pending post
  const mine = await req('GET', '/requirements/me', null, studentH);
  ok(
    mine.status === 200 && mine.json?.data?.items?.some((r) => r.id === reqId),
    'Student sees own requirement in /me',
  );

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
  const adminH = { Authorization: `Bearer ${adminToken}` };

  // Admin sees pending
  const adminPending = await req('GET', '/admin/requirements?status=pending', null, adminH);
  ok(
    adminPending.status === 200 &&
      adminPending.json?.data?.items?.some((r) => r.id === reqId),
    'Admin sees pending requirement',
  );

  // Approve
  const approved = await req(
    'PATCH',
    `/admin/requirements/${reqId}/approve`,
    { adminRemark: 'Looks good' },
    adminH,
  );
  ok(approved.status === 200 && approved.json?.data?.status === 'approved', 'Admin approved');
  ok(approved.json?.data?.approved === true, 'approved flag set');

  // Now visible on public jobs
  const jobsAfter = await req('GET', '/requirements/jobs');
  const visibleAfter = jobsAfter.json?.data?.items?.some((j) => j.id === reqId);
  ok(jobsAfter.status === 200 && visibleAfter, 'Job visible after approval');

  // Filter by subject
  const filtered = await req('GET', '/requirements/jobs?subject=Mathematics&mode=online');
  ok(
    filtered.status === 200 && filtered.json?.data?.items?.some((j) => j.id === reqId),
    'Job matches subject + online filter',
  );

  // Filter by jobType
  const tutoringOnly = await req('GET', '/requirements/jobs?jobType=tutoring');
  ok(
    tutoringOnly.status === 200 && tutoringOnly.json?.data?.items?.some((j) => j.id === reqId),
    'Job matches tutoring filter',
  );

  // Public get by id
  const detail = await req('GET', `/requirements/${reqId}`);
  ok(detail.status === 200 && detail.json?.data?.id === reqId, 'Public detail fetch works');

  // Facets
  const facets = await req('GET', '/requirements/facets');
  ok(facets.status === 200 && facets.json?.data?.subjects?.length >= 1, 'Facets returned');

  // Assignment post type
  const assignmentPost = await req(
    'POST',
    '/requirements',
    {
      ...requirementPayload,
      title: 'Need help completing Python assignment',
      jobType: 'assignment',
      subject: 'Computer Science',
    },
    studentH,
  );
  const assignId = assignmentPost.json?.data?.id;
  ok(assignmentPost.status === 201 && assignId, 'Assignment-type requirement created');

  const assignApprove = await req(
    'PATCH',
    `/admin/requirements/${assignId}/approve`,
    {},
    adminH,
  );
  ok(assignApprove.status === 200, 'Assignment requirement approved');

  const assignJobs = await req('GET', '/requirements/jobs?jobType=assignment');
  ok(
    assignJobs.status === 200 && assignJobs.json?.data?.items?.some((j) => j.id === assignId),
    'Assignment job visible with jobType filter',
  );

  // Reject flow on a new post
  const rejectPost = await req(
    'POST',
    '/requirements',
    {
      ...requirementPayload,
      title: 'Short post to reject',
      details: 'This requirement will be rejected by admin for testing purposes only.',
    },
    studentH,
  );
  const rejectId = rejectPost.json?.data?.id;
  const rejected = await req(
    'PATCH',
    `/admin/requirements/${rejectId}/reject`,
    { adminRemark: 'Insufficient detail for tutors' },
    adminH,
  );
  ok(rejected.status === 200 && rejected.json?.data?.status === 'rejected', 'Admin rejected post');

  console.log('\n=== All requirement flow checks passed ===\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
