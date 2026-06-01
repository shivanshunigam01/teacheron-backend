import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import logger from '../config/logger.js';

let ready = false;

export function isCloudinaryConfigured() {
  return Boolean(env.cloudinaryUrl || env.cloudinaryCloudName);
}

function applyCloudinaryConfig() {
  const raw = env.cloudinaryUrl;
  const match = raw.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?]+)/i);
  if (match) {
    cloudinary.config({
      api_key: match[1],
      api_secret: match[2],
      cloud_name: match[3],
      secure: true,
    });
    return match[3];
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return env.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME || '';
}

export function initCloudinary() {
  if (!env.cloudinaryUrl && !env.cloudinaryCloudName) return false;
  if (ready) return true;

  const cloudName = applyCloudinaryConfig();
  ready = true;
  logger.info(`Cloudinary ready (cloud: ${cloudName || 'unknown'})`);
  return true;
}

/**
 * @param {Buffer} buffer
 * @param {{ folder?: string; publicId?: string }} opts
 */
export async function uploadImageBuffer(buffer, opts = {}) {
  if (!initCloudinary()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL in backend .env');
  }

  const folder = opts.folder || 'teacherpoint/uploads';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }],
        ...(opts.publicId ? { public_id: opts.publicId, overwrite: true } : {}),
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
}
