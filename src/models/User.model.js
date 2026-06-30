import mongoose from 'mongoose';

const { Schema } = mongoose;

const childSchema = new Schema({ name: String, age: Number, grade: String }, { _id: false });

const teachingSubjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    fromLevel: { type: String, trim: true },
    toLevel: { type: String, trim: true },
  },
  { _id: false },
);

const educationEntrySchema = new Schema(
  {
    degree: { type: String, trim: true },
    institute: { type: String, trim: true },
    startDate: Date,
    endDate: Date,
    description: { type: String, trim: true },
  },
  { _id: false },
);

const experienceEntrySchema = new Schema(
  {
    title: { type: String, trim: true },
    organization: { type: String, trim: true },
    startDate: Date,
    endDate: Date,
    description: { type: String, trim: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    provider: { type: String, enum: ['local', 'google', 'whatsapp'], default: 'local' },
    role: { type: String, enum: ['student', 'teacher', 'parent', 'admin'], required: true },
    avatarUrl: String,
    phone: String,
    phoneE164: { type: String, unique: true, sparse: true },
    phoneCountryCode: { type: String, default: '+91' },
    phoneVerifiedAt: Date,
    locale: { type: String, default: 'en' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    profileComplete: { type: Boolean, default: false },
    teacherProfile: {
      profilePhoto: String,
      teacherType: {
        type: String,
        enum: ['individual', 'coaching_institute', 'school', 'college', 'freelancer', 'company', 'other'],
      },
      teacherTypeOther: { type: String, trim: true },
      speciality: String,
      bio: String,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      genderOther: { type: String, trim: true },
      birthDate: Date,
      country: String,
      state: String,
      city: String,
      locality: String,
      publicLocation: String,
      location: String,
      yearsOfExperience: Number,
      experience: Number,
      hourlyRate: Number,
      currency: { type: String, default: 'USD' },
      languages: [String],
      availability: String,
      onlineTeaching: { type: Boolean, default: false },
      homeTuition: { type: Boolean, default: false },
      groupClasses: { type: Boolean, default: false },
      assignmentHelp: { type: Boolean, default: false },
      teachingStyle: String,
      profileCompleted: { type: Boolean, default: false },
      subjects: [String],
      teachingSubjects: [teachingSubjectSchema],
      education: [educationEntrySchema],
      experiences: [experienceEntrySchema],
      verified: { type: Boolean, default: false },
      topTen: { type: Boolean, default: false },
      online: { type: Boolean, default: true },
      initials: String,
      gradient: String,
      rating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
    },
    studentProfile: {
      grade: String,
      goals: String,
    },
    parentProfile: { children: [childSchema] },
    savedTutors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    refreshTokens: [{ token: String, expiresAt: Date }],
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationOtpHash: { type: String, select: false },
    emailVerificationExpires: Date,
    emailVerificationSentAt: Date,
    welcomeEmailSent: { type: Boolean, default: false },
    registrationIp: { type: String },
    lastLoginIp: { type: String },
    lastLoginAt: Date,
    ipRiskFlag: { type: Boolean, default: false },
    ipAdminNote: { type: String, default: '' },
  },
  { timestamps: true },
);

userSchema.index({ name: 'text', email: 'text', 'teacherProfile.subjects': 'text' });
userSchema.index({ role: 1, isActive: 1, profileComplete: 1 });
userSchema.index({ 'teacherProfile.country': 1, 'teacherProfile.city': 1 });
userSchema.index({ registrationIp: 1 });
userSchema.index({ lastLoginIp: 1 });
userSchema.index({ ipRiskFlag: 1 });

export default mongoose.model('User', userSchema);
