import mongoose from 'mongoose';

const { Schema } = mongoose;

const whatsAppOtpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true, select: false },
    purpose: { type: String, enum: ['login', 'signup'], required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    expiresAt: { type: Date, required: true, index: true },
    lockedUntil: Date,
  },
  { timestamps: true },
);

whatsAppOtpSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
whatsAppOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('WhatsAppOtp', whatsAppOtpSchema);
