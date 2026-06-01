import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isCloudinaryConfigured, uploadImageBuffer } from '../services/cloudinary.service.js';
import logger from '../config/logger.js';

function publicFileUrl(req, filePath) {
  const rel = filePath.replace(/\\/g, '/');
  let base = env.API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');

  if (/localhost|127\.0\.0\.1/i.test(base)) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
    if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
      base = `${proto}://${host}`;
    } else if (/teacherpoint\.in/i.test(process.env.API_BASE_URL || '')) {
      base = 'https://api.teacherpoint.in';
    }
  }

  return `${base}/${rel}`;
}

function cloudinaryFolder(req) {
  const purpose = String(req.query.purpose || req.body?.purpose || '').toLowerCase();
  if (purpose === 'avatar') return 'teacherpoint/avatars';
  return 'teacherpoint/uploads';
}

async function persistUpload(req, file) {
  const mediaType = file.mimetype.startsWith('video/')
    ? 'video'
    : file.mimetype.startsWith('image/')
      ? 'image'
      : 'file';

  if (isCloudinaryConfigured() && file.buffer && mediaType === 'image') {
    const folder = cloudinaryFolder(req);
    const result = await uploadImageBuffer(file.buffer, { folder });
    return {
      url: result.secure_url,
      filename: result.public_id,
      mimetype: file.mimetype,
      size: file.size,
      mediaType,
      provider: 'cloudinary',
    };
  }

  if (!file.path) {
    throw ApiError.internal('Upload storage misconfigured');
  }

  return {
    url: publicFileUrl(req, file.path),
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    mediaType,
    provider: 'local',
  };
}

export const uploadFile = asyncHandler(async (req, res) => {
  const f = req.file;
  if (!f) throw ApiError.badRequest('No file uploaded');

  try {
    const payload = await persistUpload(req, f);
    ApiResponse.created(res, payload, 'File uploaded');
  } catch (err) {
    logger.error(`[upload] failed: ${err.message}`);
    throw ApiError.internal(err.message || 'Upload failed');
  }
});
