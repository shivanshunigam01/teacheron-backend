/**
 * End-to-end test: download a sample photo, upload via API (Cloudinary avatar).
 * Run: node scripts/test-profile-photo-upload.js
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '') + '/api/v1';
const SAMPLE_URL = 'https://picsum.photos/seed/teacherpoint-test/400/400.jpg';

async function downloadSamplePhoto(dest) {
  const res = await fetch(SAMPLE_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to download sample photo: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return { path: dest, size: buf.length, contentType: res.headers.get('content-type') || 'image/jpeg' };
}

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Login failed (${res.status})`);
  }
  return json.data.accessToken;
}

async function uploadAvatar(token, filePath, contentType) {
  const fd = new FormData();
  const blob = new Blob([fs.readFileSync(filePath)], { type: contentType });
  fd.append('file', blob, 'profile-test.jpg');

  const res = await fetch(`${API}/upload?purpose=avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Upload failed (${res.status})`);
  }
  return json.data;
}

async function main() {
  const tmpFile = path.join(__dirname, '../uploads/_test-profile-photo.jpg');
  fs.mkdirSync(path.dirname(tmpFile), { recursive: true });

  console.log('1) Downloading random sample photo from picsum.photos…');
  const { size, contentType } = await downloadSamplePhoto(tmpFile);
  console.log(`   Saved ${(size / 1024).toFixed(1)} KB (${contentType})`);

  console.log('2) Logging in as demo tutor…');
  const token = await login('teacher@teacherpoint.com', 'Teacher@123');
  console.log('   Login OK');

  console.log('3) POST /api/v1/upload?purpose=avatar …');
  const result = await uploadAvatar(token, tmpFile, contentType);
  console.log('   Upload OK');
  console.log('   Provider:', result.provider || 'unknown');
  console.log('   Media type:', result.mediaType);
  console.log('   URL:', result.url);

  if (!String(result.url).includes('res.cloudinary.com')) {
    console.warn('   Warning: URL is not Cloudinary — check CLOUDINARY_URL in .env');
  }

  try {
    fs.unlinkSync(tmpFile);
  } catch {
    /* ignore */
  }

  console.log('\nOpen this URL in your browser to view the uploaded photo:');
  console.log(result.url);
}

main().catch((err) => {
  console.error('\nTest failed:', err.message);
  process.exit(1);
});
