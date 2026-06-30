import mongoose from 'mongoose';

const { Schema } = mongoose;

const userIpLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, enum: ['student', 'teacher', 'parent', 'admin'] },
    ipAddress: { type: String, required: true },
    action: { type: String, enum: ['register', 'login'], required: true },
    userAgent: String,
    deviceInfo: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

userIpLogSchema.index({ ipAddress: 1, createdAt: -1 });
userIpLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('UserIpLog', userIpLogSchema);
