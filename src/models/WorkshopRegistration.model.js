import mongoose from 'mongoose';

const { Schema } = mongoose;

const workshopRegistrationSchema = new Schema(
  {
    workshopId: { type: Schema.Types.ObjectId, ref: 'Workshop', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, trim: true },
  },
  { timestamps: true },
);

workshopRegistrationSchema.index({ workshopId: 1, userId: 1 }, { unique: true });

export default mongoose.model('WorkshopRegistration', workshopRegistrationSchema);
