import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import env from '../config/env.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const purpose = String(req.query.purpose || req.body?.purpose || '').toLowerCase();
    const d =
      purpose === 'approved'
        ? path.join(env.uploadDir, 'approved')
        : path.join(
            env.uploadDir,
            String(new Date().getFullYear()),
            String(new Date().getMonth() + 1).padStart(2, '0'),
          );
    fs.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (req, file, cb) =>
    cb(null, `${crypto.randomUUID()}-${file.originalname.replace(/\s+/g, '-')}`),
});

function isAllowedMedia(mimetype) {
  if (mimetype.startsWith('image/')) return true;
  if (mimetype === 'application/pdf') return true;
  if (mimetype.startsWith('video/')) {
    return ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'].includes(mimetype);
  }
  return false;
}

const useCloudinary = Boolean(process.env.CLOUDINARY_URL?.trim());

export const upload = multer({
  storage: useCloudinary ? multer.memoryStorage() : storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedMedia(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type. Use images, PDF, or mp4/webm video.'));
  },
});

export const uploadImageOnly = multer({
  storage: useCloudinary ? multer.memoryStorage() : storage,
  limits: { fileSize: Math.min(env.maxFileSizeMb, 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for profile photos.'));
  },
});
