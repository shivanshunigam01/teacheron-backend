/**
 * Connection gate flow:
 * student selects teacher → request + email → 2 msgs max + masked phone
 * → admin approve → emails both → payment unlocks full contact
 *
 * Run: node scripts/test-connection-flow.js
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';
const ts = Date.now();

const studentCreds = {
  name: 'Conn Test Student',
  email: `conn-student-${ts}@test.local`,
  password: 'TestPass123!',
  role: 'student',
};

const teacherCreds = {
  name: 'Conn Test Tutor',
  email: `conn-teacher-${ts}@test.local`,
  password: 'TestPass123!',
  role: 'teacher',
};

const teacherProfile = {
  name: 'Conn Test Tutor',
  phone: '9876543210',
  phoneCountryCode: '+91',
  avatarUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  teacherProfile: {
    profilePhoto: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    teacherType: 'individual',
    speciality: 'Mathematics',
    bio: Array(160).fill('word').join(' ') + ' Experienced mathematics tutor helping students with board exams algebra geometry calculus practice feedback weekly sessions online whiteboard homework progress notes parents students confidence.',
    gender: 'male',
    birthDate: '1990-05-15',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    locality: 'Andheri',
    publicLocation: 'Andheri, Mumbai, Maharashtra, India',
    teachingSubjects: [{ name: 'Mathematics', fromLevel: 'Grade 8', toLevel: 'Grade 12' }],
    subjects: ['Mathematics'],
    yearsOfExperience: 5,
    experience: 5,
    hourlyRate: 500,
    currency: 'INR',
    languages: ['English', 'Hindi'],
    availability: 'Weekdays evenings',
    teachingStyle: 'Interactive',
    onlineTeaching: true,
    homeTuition: false,
    groupClasses: true,
    assignmentHelp: true,
    education: [
      {
        degree: 'B.Sc Mathematics',
        institute: 'Mumbai University',
        startDate: '2010-07-01',
        endDate: '2013-06-01',
      },
    ],
    experiences: [
      {
        title: 'Math Tutor',
        organization: 'ABC Coaching',
        startDate: '2015-01-01',
        endDate: '2020-12-01',
      },
    ],
    experienceEntries: [
      {
        title: 'Math Tutor',
        organization: 'ABC Coaching',
        startDate: '2015-01-01',
        endDate: '2020-12-01',
      },
    ],
  },
};

let failed = 0;

function ok(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
    return true;
  }
  console.log(`  ✗ ${msg}`);
  failed += 1;
  return false;
}

async function req(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
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

async function verifyEmail(token, devOtp) {
  if (!devOtp) return false;
  const v = await req('POST', '/auth/verify-email', { otp: devOtp }, { Authorization: `Bearer ${token}` });
  return v.status === 200;
}

async function main() {
  console.log('\n=== Tutor connection gate flow test ===\n');
  console.log(`API: ${BASE}\n`);

  const health = await req('GET', '/health');
  if (!ok(health.status === 200, `Health (${health.status})`)) {
    console.error('Start backend: cd backend && npm run dev');
    process.exit(1);
  }

  // Student
  const studentReg = await req('POST', '/auth/register', studentCreds);
  const studentToken = studentReg.json?.data?.accessToken;
  if (!ok(studentReg.status === 201 && studentToken, `Register student (${studentReg.status})`)) {
    console.log(studentReg.json);
    process.exit(1);
  }
  await verifyEmail(studentToken, studentReg.json?.data?.devOtp);
  const studentH = { Authorization: `Bearer ${studentToken}` };

  const studentProfile = await req(
    'PATCH',
    '/auth/profile',
    { phone: '9123456789', phoneCountryCode: '+91', studentProfile: { grade: 'Grade 10' } },
    studentH,
  );
  ok(
    studentProfile.status === 200 && studentProfile.json?.data?.profileComplete,
    'Student profile complete',
  );

  // Teacher
  const teacherReg = await req('POST', '/auth/register', teacherCreds);
  const teacherToken = teacherReg.json?.data?.accessToken;
  const teacherId = teacherReg.json?.data?.user?.id;
  if (!ok(teacherReg.status === 201 && teacherToken && teacherId, `Register teacher (${teacherReg.status})`)) {
    console.log(teacherReg.json);
    process.exit(1);
  }
  await verifyEmail(teacherToken, teacherReg.json?.data?.devOtp);
  const teacherH = { Authorization: `Bearer ${teacherToken}` };

  // Complete teacher via auth profile (same fields as onboarding) + phone
  const profileSave = await req('PATCH', '/auth/profile', teacherProfile, teacherH);
  if (!ok(
    profileSave.status === 200 && profileSave.json?.data?.profileComplete,
    `Teacher profile complete (${profileSave.status})`,
  )) {
    console.log('progress', JSON.stringify(profileSave.json?.data?.progress || profileSave.json, null, 2));
  }
  ok(Boolean(profileSave.json?.data?.phone), 'Teacher phone saved');

  // Student requests connection
  const connRes = await req(
    'POST',
    '/connections',
    { teacherId, source: 'message', initialMessage: 'Hi, I need help with algebra.' },
    studentH,
  );
  const conn = connRes.json?.data;
  if (!ok(connRes.status === 200 && conn?.id, `Create connection (${connRes.status})`)) {
    console.log(connRes.json);
    process.exit(1);
  }
  ok(conn.status === 'pending', 'Status pending');
  ok(conn.messagingLimited === true, 'Messaging limited');
  ok(conn.contactUnlocked === false, 'Contact locked');
  ok(conn.messagesRemaining === 2, '2 messages remaining');
  ok(Boolean(conn.phoneMasked) && !conn.phone, `Phone masked (${conn.phoneMasked})`);

  // Teacher sees connection
  const teacherList = await req('GET', '/connections', null, teacherH);
  ok(
    teacherList.status === 200 &&
      teacherList.json?.data?.items?.some((c) => c.id === conn.id),
    'Teacher sees connection request',
  );

  // Open conversation + send 2 messages
  const convoRes = await req('POST', '/conversations', { participantId: teacherId }, studentH);
  const convoId = convoRes.json?.data?.id || conn.conversationId;
  ok(convoRes.status === 200 && convoId, 'Conversation ready');

  const m1 = await req('POST', `/conversations/${convoId}/messages`, { text: 'Hello tutor, message 1' }, studentH);
  ok(m1.status === 201, 'Message 1 sent');
  ok(m1.json?.data?.messagesRemaining === 1, '1 message remaining after first');

  const m2 = await req('POST', `/conversations/${convoId}/messages`, { text: 'Message 2 — last free one' }, studentH);
  ok(m2.status === 201, 'Message 2 sent');
  ok(m2.json?.data?.messagesRemaining === 0, '0 messages remaining');

  const m3 = await req('POST', `/conversations/${convoId}/messages`, { text: 'Should be blocked' }, studentH);
  ok(m3.status === 403, `3rd message blocked (${m3.status})`);

  // Phone still locked
  const phoneRes = await req('POST', `/users/tutors/${teacherId}/request-phone`, null, studentH);
  ok(phoneRes.status === 200 && phoneRes.json?.data?.unlocked === false, 'Phone request stays locked');
  ok(Boolean(phoneRes.json?.data?.phoneMasked), 'Masked phone returned');

  // Admin login + report list
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

  const adminList = await req('GET', '/admin/connections?status=pending', null, adminH);
  ok(
    adminList.status === 200 &&
      adminList.json?.data?.items?.some((c) => c.id === conn.id),
    'Admin report shows pending connection',
  );

  const adminDetail = await req('GET', `/admin/connections/${conn.id}`, null, adminH);
  ok(
    adminDetail.status === 200 && (adminDetail.json?.data?.messages?.length || 0) >= 2,
    'Admin can view conversation messages',
  );

  // Approve
  const approved = await req(
    'PATCH',
    `/admin/connections/${conn.id}/approve`,
    { adminRemark: 'Looks good' },
    adminH,
  );
  ok(approved.status === 200 && approved.json?.data?.status === 'approved', 'Admin approved');

  // Still limited until pay
  const m4 = await req('POST', `/conversations/${convoId}/messages`, { text: 'Still blocked until pay' }, studentH);
  ok(m4.status === 403, 'Still blocked after approve (needs payment)');

  // Pay / unlock via manual payment create
  const pay = await req(
    'POST',
    '/payments',
    {
      type: 'tutor_session',
      referenceId: teacherId,
      amount: 500,
      currency: 'INR',
      method: 'manual',
      metadata: { teacherId, connectionId: conn.id, tutorName: 'Conn Test Tutor' },
    },
    studentH,
  );
  ok(pay.status === 201 && pay.json?.data?.connectionUnlocked === true, 'Payment unlocks connection');

  const after = await req('GET', `/connections/by-teacher/${teacherId}`, null, studentH);
  ok(after.status === 200 && after.json?.data?.status === 'connected', 'Status connected');
  ok(after.json?.data?.contactUnlocked === true, 'Contact unlocked');
  ok(Boolean(after.json?.data?.phone), `Full phone visible (${after.json?.data?.phone})`);

  const m5 = await req(
    'POST',
    `/conversations/${convoId}/messages`,
    { text: 'Unlimited chat after payment!' },
    studentH,
  );
  ok(m5.status === 201, 'Unlimited messaging after payment');

  // Teacher can reply
  const teacherReply = await req(
    'POST',
    `/conversations/${convoId}/messages`,
    { text: 'Happy to help!' },
    teacherH,
  );
  ok(teacherReply.status === 201, 'Teacher can reply');

  console.log(failed ? `\n=== Failed: ${failed} check(s) ===\n` : '\n=== All connection flow checks passed ===\n');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
