import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function publicFileUrl(filePath) {
  const rel = filePath.replace(/\\/g, '/');
  const base = env.API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');
  return `${base}/${rel}`;
}

export const uploadFile = asyncHandler(async (req, res) => {
  const f = req.file;
  if (!f) throw ApiError.badRequest('No file uploaded');
  ApiResponse.created(
    res,
    {
      url: publicFileUrl(f.path),
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      mediaType: f.mimetype.startsWith('video/') ? 'video' : f.mimetype.startsWith('image/') ? 'image' : 'file',
    },
    'File uploaded',
  );
});
