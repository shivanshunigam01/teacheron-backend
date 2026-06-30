import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import env from '../config/env.js';
import User from '../models/User.model.js';
import AdminMember from '../models/AdminMember.model.js';
import Category from '../models/Category.model.js';
import Course from '../models/Course.model.js';
import Listing from '../models/Listing.model.js';
import Accommodation from '../models/Accommodation.model.js';
import Banner from '../models/Banner.model.js';
import Subject from '../models/Subject.model.js';
import Workshop from '../models/Workshop.model.js';
import Requirement from '../models/Requirement.model.js';
import { computeProfileComplete } from './profileComplete.js';
import { CATEGORY_SEED, buildCourseSeed } from './seedCourses.js';
import {
  seedTeacherAccounts,
  WORKSHOP_SEEDS,
  REQUIREMENT_SEEDS,
  daysFromNow,
} from './seedTeachers.js';
import { SUBJECT_CATALOG } from '../data/subjects.catalog.js';

await connectDB();
await Promise.all([
  User.deleteMany(),
  AdminMember.deleteMany(),
  Category.deleteMany(),
  Course.deleteMany(),
  Listing.deleteMany(),
  Accommodation.deleteMany(),
  Banner.deleteMany(),
  Subject.deleteMany(),
  Workshop.deleteMany(),
  Requirement.deleteMany(),
]);

const adminAccounts = [
  {
    name: 'Aarav Mehta',
    email: 'aarav@teacherpoint.com',
    password: 'Aarav@Super2026',
    staffRole: 'super_admin',
  },
  {
    name: 'Priya Sharma',
    email: 'priya.admin@teacherpoint.com',
    password: 'Priya@Mgr2026',
    staffRole: 'manager',
  },
  {
    name: 'Omar Khalid',
    email: 'omar@teacherpoint.com',
    password: 'Omar@Mod2026',
    staffRole: 'moderator',
  },
];

for (const acct of adminAccounts) {
  const passwordHash = await bcrypt.hash(acct.password, env.BCRYPT_ROUNDS);
  const adminUser = await User.create({
    name: acct.name,
    email: acct.email,
    passwordHash,
    role: 'admin',
    isVerified: true,
    profileComplete: true,
  });
  await AdminMember.create({ userId: adminUser._id, staffRole: acct.staffRole, isActive: true });
}

// Legacy super-admin alias (same access as Aarav)
const legacyHash = await bcrypt.hash('Admin@123', env.BCRYPT_ROUNDS);
const legacyAdmin = await User.create({
  name: 'Platform Admin',
  email: 'admin@teacherpoint.com',
  passwordHash: legacyHash,
  role: 'admin',
  isVerified: true,
  profileComplete: true,
});
await AdminMember.create({ userId: legacyAdmin._id, staffRole: 'super_admin', isActive: true });

const teacherHash = await bcrypt.hash('Teacher@123', env.BCRYPT_ROUNDS);
const teachers = await seedTeacherAccounts(User, teacherHash, computeProfileComplete);
const teacher = teachers[0];
const teacherByEmail = Object.fromEntries(teachers.map((t) => [t.email, t]));
console.log(`  Teachers: ${teachers.length} complete profiles (public tutor directory ready)`);

const studentHash = await bcrypt.hash('Student@123', env.BCRYPT_ROUNDS);
const student = await User.create({
  name: 'Demo Student',
  email: 'student@teacherpoint.com',
  passwordHash: studentHash,
  role: 'student',
  phone: '+1 555 010 0002',
  isVerified: true,
  studentProfile: { grade: 'Class 12', goals: 'Board exam preparation' },
});
student.profileComplete = computeProfileComplete(student);
await student.save();

await Subject.insertMany(SUBJECT_CATALOG);
console.log(`  Subjects: ${SUBJECT_CATALOG.length} catalog entries`);

const cats = await Category.insertMany(
  CATEGORY_SEED.map((c) => ({
    name: c.name,
    slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    icon: c.icon,
    sortOrder: c.sortOrder,
    isActive: true,
    subcategories: c.subcategories.map((name, i) => ({
      subId: `${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sub-${i + 1}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    })),
  })),
);

const catByName = Object.fromEntries(cats.map((c) => [c.name, c._id]));
const courseRows = buildCourseSeed(catByName, teacher._id, teacher.name);
await Course.insertMany(courseRows);
console.log(`  Courses: ${courseRows.length} published with curriculum modules`);
console.log(`  Categories: ${cats.length} with subcategories`);

const workshopRows = WORKSHOP_SEEDS.map((row) => {
  const host = teacherByEmail[row.teacherEmail];
  if (!host) throw new Error(`Workshop seed teacher not found: ${row.teacherEmail}`);
  return {
    title: row.title,
    category: row.category,
    description: row.description,
    teacherId: host._id,
    teacherName: host.name,
    workshopDate: daysFromNow(row.offsetDays),
    startTime: row.startTime,
    endTime: row.endTime,
    mode: row.mode,
    meetingLink: row.meetingLink || '',
    location: row.location || '',
    isFree: row.isFree !== false,
    price: row.isFree === false ? Number(row.price || 0) : 0,
    maxStudents: row.maxStudents,
    status: 'approved',
    adminRemark: '',
  };
});
await Workshop.insertMany(workshopRows);
console.log(`  Workshops: ${workshopRows.length} approved (upcoming)`);

const requirementRows = REQUIREMENT_SEEDS.map((row) => ({
  studentId: student._id,
  studentName: student.name,
  studentEmail: student.email,
  title: row.title,
  subject: row.subject,
  details: row.details,
  mode: row.mode,
  city: row.city,
  country: row.country,
  budgetPerHour: row.budgetPerHour,
  currency: row.currency,
  level: row.level,
  jobType: row.jobType,
  status: 'open',
  approved: true,
  approvedAt: new Date(),
}));
await Requirement.insertMany(requirementRows);
console.log(`  Tutor jobs: ${requirementRows.length} approved requirements`);

await Listing.insertMany([
  {
    sellerId: student._id,
    category: 'materials',
    title: 'Study Notes Bundle',
    description: 'Curated notes for science subjects',
    price: 5,
    city: 'New York',
    country: 'USA',
    status: 'approved',
  },
]);

await Accommodation.insertMany([
  {
    name: 'Campus View PG',
    type: 'PG',
    city: 'New York',
    country: 'USA',
    address: 'Near downtown campus',
    pricePerMonth: 900,
    currency: 'USD',
    amenities: ['WiFi', 'Food'],
    gender: 'co-ed',
    rating: 4.3,
    available: true,
    status: 'active',
  },
]);

await Banner.insertMany([
  {
    title: 'India learners — Spring offers',
    description: 'Up to 40% off NEET, JEE, and spoken English courses for students across India.',
    ctaText: 'Browse Indian deals',
    ctaLink: '/courses',
    mediaType: 'banner',
    placement: 'hero-strip',
    targetType: 'country',
    targetValue: 'India',
    active: true,
    priority: 10,
  },
  {
    title: 'Tech upskilling week',
    description: 'German learners save 25% on AI, data science, and web development programs.',
    ctaText: 'See tech courses',
    ctaLink: '/courses',
    mediaType: 'banner',
    placement: 'inline-banner',
    targetType: 'country',
    targetValue: 'Germany',
    active: true,
    priority: 5,
  },
  {
    title: 'Meet your next mentor',
    description: 'Watch how thousands of learners hit their goals with TeacherPoint.',
    ctaText: 'Start learning',
    ctaLink: '/courses',
    mediaType: 'video',
    videoUrl: '/videos/courses-hero.mp4',
    placement: 'inline-banner',
    targetType: 'global',
    targetValue: '',
    active: true,
    priority: 1,
  },
]);

console.log('Seed completed — test accounts:');
console.log('  Super Admin:  aarav@teacherpoint.com / Aarav@Super2026');
console.log('  Manager:      priya.admin@teacherpoint.com / Priya@Mgr2026');
console.log('  Moderator:    omar@teacherpoint.com / Omar@Mod2026');
console.log('  Legacy admin: admin@teacherpoint.com / Admin@123');
console.log('  Tutor:        teacher@teacherpoint.com / Teacher@123');
console.log('  Student:      student@teacherpoint.com / Student@123');

await mongoose.connection.close();
