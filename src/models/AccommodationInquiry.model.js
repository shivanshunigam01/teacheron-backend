import mongoose from 'mongoose';

const { Schema } = mongoose;

const inquiryMessageSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    authorRole: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const accommodationInquirySchema = new Schema(
  {
    accommodationId: { type: String, required: true, index: true },
    accommodationName: String,
    studentName: String,
    email: String,
    phone: String,
    city: String,
    country: String,
    /** Latest message preview (legacy + list views) */
    message: String,
    messages: [inquiryMessageSchema],
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
);

accommodationInquirySchema.index({ userId: 1, accommodationId: 1 });

export default mongoose.model('AccommodationInquiry', accommodationInquirySchema);
