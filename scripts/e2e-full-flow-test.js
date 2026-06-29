/**
 * Full E2E: register student + teacher → profile → tutor listing → Razorpay order → requirement → admin approve
 * Run: node scripts/e2e-full-flow-test.js
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';
const ts = Date.now();

const studentCreds = {
  name: 'E2E Test Student',
  email: `e2e-student-${ts}@test.local`,
  password: 'TestPass123!',
  role: 'student',
};

const teacherCreds = {
  name: 'E2E Test Tutor',
  email: `e2e-teacher-${ts}@test.local`,
  password: 'TestPass123!',
  role: 'teacher',
};

const teacherProfile = {
  name: 'E2E Test Tutor',
  phone: '9876543210',
  phoneCountryCode: '+91',
  avatarUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  teacherProfile: {
    profilePhoto: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    teacherType: 'individual',
    speciality: 'Mathematics & Physics',
    bio: 'Experienced tutor with over five years helping students excel in board exams and competitive tests. I focus on clear explanations, practice problems, and building confidence through structured weekly sessions tailored to each student.',
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
    teachingStyle: 'Interactive problem-solving',
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
  },
};

const requirementPayload = {
  title: `E2E tutor request ${ts} — Class 10 Math`,
  subject: 'Mathematics',
  skills: ['Algebra', 'Geometry'],
  level: 'high',
  jobType: 'tutoring',
  mode: 'online',
  sessionsPerWeek: 3,
  city: 'Mumbai',
  country: 'India',
  budgetPerHour: 500,
  currency: 'INR',
  duration: 'ongoing',
  details:
    'E2E test requirement: Need help with algebra and geometry for CBSE board exams. Prefer evening sessions three times per week with an experienced tutor.',
};

const results = [];

function log(status, msg, detail) {
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '·';
  console.log(`  ${icon} ${msg}`);
  if (detail) console.log(`      ${detail}`);
  results.push({ status, msg, detail });
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

async function verifyEmail(token, devOtp, label) {
  if (!devOtp) {
    log('fail', `${label}: no devOtp returned (need NODE_ENV=development)`);
    return false;
  }
  const v = await req('POST', '/auth/verify-email', { otp: devOtp }, { Authorization: `Bearer ${token}` });
  if (v.status === 200 && v.json?.data?.user?.isVerified) {
    log('pass', `${label} email verified`);
    return true;
  }
  log('fail', `${label} email verification (${v.status})`, JSON.stringify(v.json?.message || v.json));
  return false;
}

async function main() {
  console.log('\n=== TeacherPoint Full E2E Test ===\n');
  console.log(`API: ${BASE}\n`);

  const health = await req('GET', '/health');
  if (health.status !== 200) {
    console.error('Backend not running. Start: cd backend && npm run dev');
    process.exit(1);
  }
  log('pass', 'Backend health OK');

  // --- Register student ---
  const studentReg = await req('POST', '/auth/register', studentCreds);
  const studentToken = studentReg.json?.data?.accessToken;
  const studentDevOtp = studentReg.json?.data?.devOtp;
  if (studentReg.status !== 201 || !studentToken) {
    log('fail', 'Register student', JSON.stringify(studentReg.json));
    process.exit(1);
  }
  log('pass', `Student registered: ${studentCreds.email}`);
  const studentH = { Authorization: `Bearer ${studentToken}` };
  await verifyEmail(studentToken, studentDevOtp, 'Student');

  // --- Register teacher ---
  const teacherReg = await req('POST', '/auth/register', teacherCreds);
  const teacherToken = teacherReg.json?.data?.accessToken;
  const teacherId = teacherReg.json?.data?.user?.id;
  const teacherDevOtp = teacherReg.json?.data?.devOtp;
  if (teacherReg.status !== 201 || !teacherToken || !teacherId) {
    log('fail', 'Register teacher', JSON.stringify(teacherReg.json));
    process.exit(1);
  }
  log('pass', `Teacher registered: ${teacherCreds.email} (id: ${teacherId})`);
  const teacherH = { Authorization: `Bearer ${teacherToken}` };
  await verifyEmail(teacherToken, teacherDevOtp, 'Teacher');

  // --- Teacher profile ---
  const profileSave = await req('POST', '/teacher/profile', teacherProfile, teacherH);
  if (profileSave.status !== 200 && profileSave.status !== 201) {
    log('fail', 'Save teacher profile', JSON.stringify(profileSave.json));
  } else {
    const complete = profileSave.json?.data?.profileComplete;
    log('pass', `Teacher profile saved (profileComplete=${complete})`);
  }

  // --- Teacher appears in public tutor list ---
  await new Promise((r) => setTimeout(r, 500));
  const tutorsList = await req('GET', '/tutors?page=1&limit=50');
  const tutorVisible = tutorsList.json?.data?.items?.some((t) => t.id === teacherId);
  if (tutorVisible) {
    log('pass', 'Teacher visible on public /tutors list');
  } else {
    log('fail', 'Teacher NOT on /tutors list yet', 'May need profileComplete=true or search index delay');
  }

  const tutorDetail = await req('GET', `/tutors/${teacherId}`);
  if (tutorDetail.status === 200) {
    const price = tutorDetail.json?.data?.hourlyRate ?? tutorDetail.json?.data?.price;
    log('pass', `Tutor detail page API works (rate: ${price} INR)`);
  } else {
    log('fail', `Tutor detail fetch (${tutorDetail.status})`, JSON.stringify(tutorDetail.json?.message));
  }

  // --- Student dashboard APIs ---
  const enrollments = await req('GET', '/enrollments/me', null, studentH);
  log(enrollments.status === 200 ? 'pass' : 'fail', `Student enrollments API (${enrollments.status})`);

  const certs = await req('GET', '/certificates/me', null, studentH);
  log(certs.status === 200 ? 'pass' : 'fail', `Student certificates API (${certs.status})`);

  // --- Teacher dashboard APIs ---
  const teacherMe = await req('GET', '/auth/me', null, teacherH);
  log(teacherMe.status === 200 ? 'pass' : 'fail', `Teacher /auth/me (${teacherMe.status})`);

  const teacherProfileGet = await req('GET', '/teacher/profile', null, teacherH);
  log(teacherProfileGet.status === 200 ? 'pass' : 'fail', `Teacher profile GET (${teacherProfileGet.status})`);

  // --- Razorpay create-order (student pays tutor) ---
  const hourlyRate = tutorDetail.json?.data?.hourlyRate || 500;
  const amountPaise = Math.round(hourlyRate * 100);
  const orderRes = await req(
    'POST',
    '/payments/create-order',
    {
      amount: amountPaise,
      currency: 'INR',
      type: 'tutor_session',
      referenceId: teacherId,
      metadata: { tutorName: teacherCreds.name, displayPrice: hourlyRate },
    },
    studentH,
  );
  const orderId = orderRes.json?.data?.order_id;
  if (orderRes.status === 200 && orderId) {
    log('pass', `Razorpay order created: ${orderId} (₹${hourlyRate})`);
  } else {
    log('fail', `Razorpay create-order (${orderRes.status})`, JSON.stringify(orderRes.json?.message || orderRes.json));
  }

  // verify-payment needs real Razorpay checkout — test signature validation path with invalid sig
  const badVerify = await req(
    'POST',
    '/payments/verify-payment',
    {
      razorpay_order_id: orderId || 'order_fake',
      razorpay_payment_id: 'pay_fake',
      razorpay_signature: 'invalid',
      type: 'tutor_session',
      referenceId: teacherId,
      amount: hourlyRate,
      currency: 'INR',
    },
    studentH,
  );
  if (badVerify.status === 400) {
    log('pass', 'verify-payment correctly rejects invalid signature (checkout step needs browser UI)');
  } else {
    log('fail', `verify-payment unexpected response (${badVerify.status})`);
  }

  // --- Post requirement as student ---
  const reqCreated = await req('POST', '/requirements', requirementPayload, studentH);
  const reqId = reqCreated.json?.data?.id;
  if (reqCreated.status === 201 && reqId) {
    log('pass', `Requirement posted (id: ${reqId}, status: pending)`);
  } else {
    log('fail', `Post requirement (${reqCreated.status})`, JSON.stringify(reqCreated.json));
    process.exit(1);
  }

  const jobsBefore = await req('GET', '/requirements/jobs');
  const visibleBefore = jobsBefore.json?.data?.items?.some((j) => j.id === reqId);
  log(!visibleBefore ? 'pass' : 'fail', 'Requirement hidden from public /tutor-jobs before approval');

  // --- Admin approve ---
  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@teacherpoint.com',
    password: 'Admin@123',
  });
  const adminToken = adminLogin.json?.data?.accessToken;
  if (!adminToken) {
    log('fail', 'Admin login failed — run seed script');
    process.exit(1);
  }
  log('pass', 'Admin logged in');
  const adminH = { Authorization: `Bearer ${adminToken}` };

  const adminPending = await req('GET', '/admin/requirements?status=pending', null, adminH);
  const inAdmin = adminPending.json?.data?.items?.some((r) => r.id === reqId);
  log(inAdmin ? 'pass' : 'fail', 'Requirement visible in admin pending queue');

  const approved = await req('PATCH', `/admin/requirements/${reqId}/approve`, { adminRemark: 'E2E approved' }, adminH);
  const approvedFlag = approved.json?.data?.approved === true;
  const statusOk =
    approved.json?.data?.status === 'approved' || approved.json?.data?.status === 'open';
  if (approved.status === 200 && approvedFlag && statusOk) {
    log('pass', 'Admin approved requirement');
  } else {
    log('fail', 'Admin approve failed', JSON.stringify(approved.json));
  }

  const jobsAfter = await req('GET', '/requirements/jobs');
  const visibleAfter = jobsAfter.json?.data?.items?.some((j) => j.id === reqId);
  log(visibleAfter ? 'pass' : 'fail', 'Requirement visible globally on /tutor-jobs after approval');

  const jobDetail = await req('GET', `/requirements/${reqId}`);
  log(jobDetail.status === 200 ? 'pass' : 'fail', `Public job detail page API (${jobDetail.status})`);

  // Summary
  console.log('\n=== Summary ===\n');
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  console.log(`Passed: ${passed}  Failed: ${failed}\n`);

  console.log('Test accounts created:');
  console.log(`  Student: ${studentCreds.email} / ${studentCreds.password}`);
  console.log(`  Teacher: ${teacherCreds.email} / ${teacherCreds.password}`);
  console.log(`  Tutor profile: http://localhost:5173/tutors/${teacherId}`);
  console.log(`  Tutor job:   http://localhost:5173/tutor-jobs/${reqId}`);
  console.log('\nRazorpay UI checkout: log in as student → open tutor profile → Pay with Razorpay\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
