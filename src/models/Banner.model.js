import mongoose from 'mongoose';

const { Schema } = mongoose;

const bannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    ctaLink: { type: String, default: '/courses' },
    imageUrl: { type: String },
    videoUrl: { type: String },
    mediaType: {
      type: String,
      enum: ['banner', 'image', 'video'],
      default: 'banner',
    },
    placement: {
      type: String,
      enum: ['popup', 'hero-strip', 'inline-banner'],
      default: 'popup',
    },
    language: { type: String, default: '' },
    targetType: {
      type: String,
      enum: ['global', 'country', 'city'],
      default: 'global',
    },
    targetValue: { type: String, default: '' },
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    startAt: { type: Date },
    endAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

bannerSchema.index({ active: 1, placement: 1, priority: -1 });
bannerSchema.index({ targetType: 1, targetValue: 1 });

export default mongoose.model('Banner', bannerSchema);
