import mongoose from 'mongoose';

const { Schema } = mongoose;

const childSchema = new Schema({ name: String, age: Number, grade: String }, { _id: false });

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'teacher', 'parent', 'admin'], required: true },
    avatarUrl: String,
    phone: String,
    locale: { type: String, default: 'en' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    profileComplete: { type: Boolean, default: false },
    teacherProfile: {
      subjects: [String],
      bio: String,
      experience: Number,
      hourlyRate: Number,
      location: String,
      languages: [String],
      gender: { type: String, enum: ['male', 'female', 'other'] },
      verified: { type: Boolean, default: false },
      online: { type: Boolean, default: true },
      availability: String,
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
  },
  { timestamps: true },
);

userSchema.index({ name: 'text', email: 'text', 'teacherProfile.subjects': 'text' });

export default mongoose.model('User', userSchema);
