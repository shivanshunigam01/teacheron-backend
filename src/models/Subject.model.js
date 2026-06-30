import mongoose from 'mongoose';

const { Schema } = mongoose;

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    group: {
      type: String,
      enum: [
        'academic',
        'language',
        'programming',
        'engineering',
        'business',
        'arts',
        'exam',
        'professional',
        'humanities',
        'medical',
        'law',
        'other',
      ],
      default: 'academic',
      index: true,
    },
    aliases: [{ type: String, trim: true }],
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

subjectSchema.index({ name: 'text', aliases: 'text' });
subjectSchema.index({ isPopular: -1, sortOrder: 1, name: 1 });

export default mongoose.model('Subject', subjectSchema);
