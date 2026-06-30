import mongoose from 'mongoose';

const { Schema } = mongoose;

const requirementSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    skills: [{ type: String, trim: true }],
    level: {
      type: String,
      enum: ['elem', 'middle', 'high', 'college', 'pro', 'other'],
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
    sessionsPerWeek: Number,
    location: String,
    city: String,
    country: String,
    budgetPerHour: Number,
    currency: { type: String, default: 'USD' },
    duration: {
      type: String,
      enum: ['once', 'month', 'semester', 'ongoing', 'other'],
      default: 'ongoing',
    },
    durationOther: { type: String, trim: true },
    details: { type: String, required: true, trim: true },
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
