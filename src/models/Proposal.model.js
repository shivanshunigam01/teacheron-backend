import mongoose from 'mongoose';

const { Schema } = mongoose;

const proposalSchema = new Schema(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true, index: true },
    requirementTitle: { type: String, trim: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherName: { type: String, trim: true },
    teacherEmail: { type: String, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    proposedRate: { type: Number, min: 0 },
    sessions: { type: Number, min: 1, default: 1 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminRemark: { type: String, default: '' },
    reviewedAt: Date,
  },
  { timestamps: true },
);

proposalSchema.index({ requirementId: 1, teacherId: 1 }, { unique: true });

export default mongoose.model('Proposal', proposalSchema);
