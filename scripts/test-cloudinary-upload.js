/**
 * Smoke test: upload a tiny PNG to Cloudinary.
 * Run from backend/: node scripts/test-cloudinary-upload.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadImageBuffer, initCloudinary, isCloudinaryConfigured } from '../src/services/cloudinary.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** 1x1 red PNG */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function main() {
  if (!isCloudinaryConfigured()) {
    console.error('CLOUDINARY_URL is not set in backend/.env');
    process.exit(1);
  }

  initCloudinary();
  const result = await uploadImageBuffer(TINY_PNG, {
    folder: 'teacherpoint/avatars',
    publicId: `test-upload-${Date.now()}`,
  });

  console.log('Cloudinary upload OK');
  console.log('URL:', result.secure_url);
  console.log('Public ID:', result.public_id);
}

main().catch((err) => {
  console.error('Cloudinary upload failed:', err.message);
  process.exit(1);
});
