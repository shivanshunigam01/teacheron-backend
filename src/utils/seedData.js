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

const adminHash = await bcrypt.hash('Admin@123', env.BCRYPT_ROUNDS);
const admin = await User.create({
  name: 'Super Admin',
  email: 'admin@teacherpoint.com',
  passwordHash: adminHash,
  role: 'admin',
  isVerified: true,
  profileComplete: true,
});
await AdminMember.create({ userId: admin._id, staffRole: 'super_admin', isActive: true });

const teacherHash = await bcrypt.hash('Teacher@123', env.BCRYPT_ROUNDS);
const teacher = await User.create({
  name: 'Demo Tutor',
  email: 'teacher@teacherpoint.com',
  passwordHash: teacherHash,
  role: 'teacher',
  phone: '+1 555 010 0001',
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
  ['Development', 'AI & ML', 'Maths'].map((name, i) => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    icon: 'BookOpen',
    sortOrder: i + 1,
    isActive: true,
  })),
);

await Course.insertMany([
  {
    title: 'Class 10 Mathematics',
    slug: 'class-10-mathematics',
    instructorId: teacher._id,
    instructorName: teacher.name,
    categoryId: cats[2]._id,
    category: 'Maths',
    level: 'Beginner',
    rating: 4.9,
    reviewCount: 70,
    price: 15,
    duration: '24h',
    lessons: 60,
    students: 1200,
    certificate: true,
    language: 'English',
    gradient: 'from-orange-500 to-red-500',
    description: 'Board exam preparation.',
    status: 'published',
    createdBy: teacher._id,
  },
]);

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
    title: 'Welcome Offer',
    description: 'Explore courses and tutors',
    ctaText: 'Browse',
    ctaLink: '/courses',
    targetType: 'global',
    targetValue: 'global',
    active: true,
    priority: 1,
  },
]);

console.log('Seed completed — test accounts:');
console.log('  Admin:   admin@teacherpoint.com / Admin@123');
console.log('  Tutor:   teacher@teacherpoint.com / Teacher@123');
console.log('  Student: student@teacherpoint.com / Student@123');

await mongoose.connection.close();
