import mongoose from 'mongoose';

const { Schema } = mongoose;

const requirementSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, trim: true, lowercase: true },
    posterRole: {
      type: String,
      enum: ['student', 'parent'],
      default: 'student',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    /** True when subject was newly proposed and awaits admin activation in catalog. */
    subjectPendingApproval: { type: Boolean, default: false },
    skills: [{ type: String, trim: true }],
    level: {
      type: String,
      enum: ['elem', 'middle', 'high', 'college', 'pro', 'beginner', 'intermediate', 'advanced', 'other'],
      default: 'high',
    },
    levelOther: { type: String, trim: true },
    jobType: {
      type: String,
      enum: ['tutoring', 'assignment'],
      default: 'tutoring',
    },
    mode: {
      type: String,
      enum: ['online', 'offline', 'both'],
      default: 'online',
    },
    /** Granular meeting options from the post form. */
    meetingOptions: {
      online: { type: Boolean, default: true },
      atMyPlace: { type: Boolean, default: false },
      travelToTutor: { type: Boolean, default: false },
    },
    sessionsPerWeek: Number,
    location: String,
    city: String,
    country: String,
    /** Full formatted address from Places/Geoapify (required for offline meetings). */
    addressFormatted: { type: String, trim: true },
    placeId: { type: String, trim: true },
    locationLat: Number,
    locationLng: Number,
    budgetPerHour: Number,
    currency: { type: String, default: 'USD' },
    budgetUnit: {
      type: String,
      enum: ['hour', 'day', 'week', 'month', 'year', 'fixed'],
      default: 'hour',
    },
    duration: {
      type: String,
      enum: ['once', 'month', 'semester', 'ongoing', 'other'],
      default: 'ongoing',
    },
    durationOther: { type: String, trim: true },
    timeCommitment: {
      type: String,
      enum: ['part-time', 'full-time', 'one-time', 'flexible'],
      default: 'part-time',
    },
    teacherGender: {
      type: String,
      enum: ['any', 'prefer-female', 'prefer-male', 'only-female', 'only-male'],
      default: 'any',
    },
    languages: [{ type: String, trim: true }],
    tutorOrigin: { type: String, trim: true },
    phoneCountryCode: { type: String, trim: true },
    phone: { type: String, trim: true },
    phoneVerifiedAt: Date,
    attachments: [
      {
        url: String,
        name: String,
        mimeType: String,
        size: Number,
      },
    ],
    details: { type: String, required: true, trim: true },
    acceptedTermsAt: Date,
    status: {
      type: String,
      enum: ['pending', 'open', 'rejected', 'matched', 'closed', 'cancelled'],
      default: 'pending',
    },
    approved: { type: Boolean, default: false },
    adminRemark: { type: String, default: '' },
    approvedAt: Date,
    rejectedAt: Date,
    assignedTeacherId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
);

requirementSchema.index({ subject: 1, approved: 1, status: 1 });
requirementSchema.index({ city: 1, country: 1 });

export default mongoose.model('Requirement', requirementSchema);
