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
import { computeProfileComplete } from './profileComplete.js';
import { CATEGORY_SEED, buildCourseSeed } from './seedCourses.js';

await connectDB();
await Promise.all([
  User.deleteMany(),
  AdminMember.deleteMany(),
  Category.deleteMany(),
  Course.deleteMany(),
  Listing.deleteMany(),
  Accommodation.deleteMany(),
  Banner.deleteMany(),
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
const teacher = await User.create({
  name: 'Demo Tutor',
  email: 'teacher@teacherpoint.com',
  passwordHash: teacherHash,
  role: 'teacher',
  phone: '555 010 0001',
  phoneCountryCode: '+1',
  isVerified: true,
  teacherProfile: {
    subjects: ['Mathematics', 'Physics'],
    bio: 'Experienced tutor for high school and college students.',
    experience: 8,
    hourlyRate: 35,
    location: 'New York, USA',
    languages: ['English'],
    gender: 'male',
    verified: true,
    online: true,
    availability: 'Weekdays · Evenings',
    initials: 'DT',
    gradient: 'from-blue-500 to-purple-500',
    rating: 4.9,
    reviewCount: 48,
  },
});
teacher.profileComplete = computeProfileComplete(teacher);
await teacher.save();

const extraTutorHash = await bcrypt.hash('Teacher@123', env.BCRYPT_ROUNDS);
await User.insertMany([
  {
    name: 'Priya Sharma',
    email: 'priya.tutor@teacherpoint.com',
    passwordHash: extraTutorHash,
    role: 'teacher',
    isVerified: true,
    teacherProfile: {
      subjects: ['Biology', 'Chemistry'],
      bio: 'NEET specialist with 95% student success rate.',
      experience: 6,
      hourlyRate: 22,
      location: 'Delhi, India',
      languages: ['English', 'Hindi'],
      gender: 'female',
      verified: true,
      online: true,
      initials: 'PS',
      gradient: 'from-pink-500 to-rose-500',
      rating: 4.8,
      reviewCount: 167,
      availability: 'Evenings',
    },
  },
  {
    name: 'Rahul Mehta',
    email: 'rahul.tutor@teacherpoint.com',
    passwordHash: extraTutorHash,
    role: 'teacher',
    isVerified: true,
    teacherProfile: {
      subjects: ['Computer Science', 'Python'],
      bio: 'Ex-Google engineer teaching DSA and full-stack development.',
      experience: 10,
      hourlyRate: 30,
      location: 'Bengaluru, India',
      languages: ['English', 'Hindi'],
      gender: 'male',
      verified: true,
      online: true,
      initials: 'RM',
      gradient: 'from-indigo-500 to-violet-500',
      rating: 4.9,
      reviewCount: 421,
      availability: 'Daily',
    },
  },
  {
    name: 'Emma Smith',
    email: 'emma.tutor@teacherpoint.com',
    passwordHash: extraTutorHash,
    role: 'teacher',
    isVerified: true,
    teacherProfile: {
      subjects: ['English Literature', 'Spoken English'],
      bio: 'Award-winning English tutor focused on confident communication.',
      experience: 5,
      hourlyRate: 28,
      location: 'London, UK',
      languages: ['English'],
      gender: 'female',
      verified: true,
      online: false,
      initials: 'ES',
      gradient: 'from-sky-400 to-blue-600',
      rating: 4.7,
      reviewCount: 245,
      availability: 'Weekdays',
    },
  },
  {
    name: 'David Lee',
    email: 'david.tutor@teacherpoint.com',
    passwordHash: extraTutorHash,
    role: 'teacher',
    isVerified: true,
    teacherProfile: {
      subjects: ['Spoken English', 'IELTS'],
      bio: 'Confidence-first English coaching for global learners.',
      experience: 4,
      hourlyRate: 25,
      location: 'online',
      languages: ['English'],
      gender: 'male',
      verified: false,
      online: true,
      initials: 'DL',
      gradient: 'from-teal-400 to-cyan-600',
      rating: 4.6,
      reviewCount: 134,
      availability: 'Flexible',
    },
  },
]);

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
    description: 'Watch how thousands of learners hit their goals with TeachersPoints.',
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
