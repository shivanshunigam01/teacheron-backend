import mongoose from 'mongoose';

const { Schema } = mongoose;

const workshopSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherName: { type: String, required: true, trim: true },
    workshopDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['online', 'offline', 'other'], required: true },
    modeOther: { type: String, trim: true },
    meetingLink: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    isFree: { type: Boolean, default: true },
    price: { type: Number, default: 0, min: 0 },
    maxStudents: { type: Number, required: true, min: 1, max: 10000 },
    enrolledStudents: { type: Number, default: 0, min: 0 },
    imageUrl: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'inactive'],
      default: 'pending',
      index: true,
    },
    adminRemark: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

workshopSchema.index({ status: 1, workshopDate: 1 });

export default mongoose.model('Workshop', workshopSchema);
