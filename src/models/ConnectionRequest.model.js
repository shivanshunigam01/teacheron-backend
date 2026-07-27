import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Gated student/parent → teacher connection.
 * pending   → admin review; max 2 learner messages; phone masked
 * approved  → admin OK; awaiting payment; still limited until paid
 * connected → paid; full messaging + unmasked contact
 * rejected  → admin declined
 */
const connectionRequestSchema = new Schema(
  {
    learnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    learnerRole: { type: String, enum: ['student', 'parent'], required: true },
    learnerName: { type: String, trim: true },
    learnerEmail: { type: String, trim: true, lowercase: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherName: { type: String, trim: true },
    teacherEmail: { type: String, trim: true, lowercase: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'connected', 'rejected'],
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      enum: ['message', 'call', 'hire'],
      default: 'message',
    },
    initialMessage: { type: String, trim: true, maxlength: 2000, default: '' },
    adminRemark: { type: String, default: '' },
    reviewedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: Date,
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'INR' },
    learnerMessageCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

connectionRequestSchema.index({ learnerId: 1, teacherId: 1 }, { unique: true });

export const MAX_LIMITED_LEARNER_MESSAGES = 2;

export default mongoose.model('ConnectionRequest', connectionRequestSchema);
