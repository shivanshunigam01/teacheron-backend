import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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

export const uploadFile = asyncHandler(async (req, res) => {
  const f = req.file;
  if (!f) throw ApiError.badRequest('No file uploaded');
  ApiResponse.created(
    res,
    {
      url: publicFileUrl(req, f.path),
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      mediaType: f.mimetype.startsWith('video/') ? 'video' : f.mimetype.startsWith('image/') ? 'image' : 'file',
    },
    'File uploaded',
  );
});
